/**
 * SovereignID :: GenLayer Client
 * ================================
 * Typed integration layer wrapping genlayer-js for all four contracts.
 *
 * Usage:
 *   import { createSovereignClient } from './genlayer-client'
 *   const client = createSovereignClient({ wallet, contracts })
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClaimType =
  | "age_over_18"
  | "professional_license"
  | "github_ownership"
  | "domain_ownership"
  | "kyc_lite";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface IdentityRecord {
  owner: string;
  metadata_hash: string;
  display_name: string;
  is_active: boolean;
  claim_count: number;
}

export interface Claim {
  claim_id: number;
  subject: string;
  claim_type: ClaimType;
  is_verified: boolean;
  confidence: number;
  verifier_note: string;
}

export interface ScoreRecord {
  subject: string;
  score: number;
  risk_level: RiskLevel;
  fraud_flags: string;
  rationale: string;
  claim_count: number;
}

export interface AccessPolicy {
  resource_id: string;
  min_score: number;
  required_claims: string;
  require_all_claims: boolean;
  max_risk_level: RiskLevel;
  is_active: boolean;
}

export interface ContractAddresses {
  identityRegistry: string;
  claimVerifier: string;
  reputationScorer: string;
  accessController: string;
}

export interface ClaimSummary {
  total_claims: number;
  verified_claims: number;
  claim_types: ClaimType[];
  avg_confidence: number;
  has_contradictions: boolean;
}

// ─── Client Factory ──────────────────────────────────────────────────────────

export function createSovereignClient(
  glClient: any, // GenLayer client instance from genlayer-js
  addresses: ContractAddresses
) {
  // ── Identity Registry ──────────────────────────────────────────────────────

  async function registerIdentity(
    metadataHash: string,
    displayName: string
  ): Promise<string> {
    return glClient.sendTransaction({
      contract: addresses.identityRegistry,
      method: "register_identity",
      args: [metadataHash, displayName],
    });
  }

  async function updateIdentity(
    metadataHash: string,
    displayName: string
  ): Promise<string> {
    return glClient.sendTransaction({
      contract: addresses.identityRegistry,
      method: "update_identity",
      args: [metadataHash, displayName],
    });
  }

  async function getIdentity(addr: string): Promise<IdentityRecord | null> {
    try {
      const raw = await glClient.readContract({
        contract: addresses.identityRegistry,
        method: "get_identity",
        args: [addr],
      });
      return JSON.parse(raw) as IdentityRecord;
    } catch {
      return null;
    }
  }

  async function isRegistered(addr: string): Promise<boolean> {
    return glClient.readContract({
      contract: addresses.identityRegistry,
      method: "is_registered",
      args: [addr],
    });
  }

  async function getTotalRegistered(): Promise<number> {
    return glClient.readContract({
      contract: addresses.identityRegistry,
      method: "get_total_registered",
      args: [],
    });
  }

  // ── Claim Verifier ─────────────────────────────────────────────────────────

  async function submitClaim(
    claimType: ClaimType,
    evidenceUrl: string
  ): Promise<string> {
    return glClient.sendTransaction({
      contract: addresses.claimVerifier,
      method: "submit_claim",
      args: [claimType, evidenceUrl],
    });
  }

  async function getClaim(claimId: number): Promise<Claim | null> {
    try {
      const raw = await glClient.readContract({
        contract: addresses.claimVerifier,
        method: "get_claim",
        args: [claimId],
      });
      return JSON.parse(raw) as Claim;
    } catch {
      return null;
    }
  }

  async function getClaimsForAddress(addr: string): Promise<number[]> {
    const raw = await glClient.readContract({
      contract: addresses.claimVerifier,
      method: "get_claims_for_address",
      args: [addr],
    });
    return JSON.parse(raw) as number[];
  }

  async function getVerifiedClaimTypes(addr: string): Promise<ClaimType[]> {
    const raw = await glClient.readContract({
      contract: addresses.claimVerifier,
      method: "get_verified_claim_types",
      args: [addr],
    });
    return JSON.parse(raw) as ClaimType[];
  }

  async function hasVerifiedClaim(
    addr: string,
    claimType: ClaimType
  ): Promise<boolean> {
    return glClient.readContract({
      contract: addresses.claimVerifier,
      method: "has_verified_claim",
      args: [addr, claimType],
    });
  }

  async function revokeClaim(claimId: number): Promise<string> {
    return glClient.sendTransaction({
      contract: addresses.claimVerifier,
      method: "revoke_claim",
      args: [claimId],
    });
  }

  // ── Reputation Scorer ──────────────────────────────────────────────────────

  async function buildClaimSummary(addr: string): Promise<ClaimSummary> {
    const claimIds = await getClaimsForAddress(addr);
    const claims: Claim[] = [];

    for (const id of claimIds) {
      const c = await getClaim(id);
      if (c) claims.push(c);
    }

    const verified = claims.filter((c) => c.is_verified);
    const types = [...new Set(verified.map((c) => c.claim_type))];
    const avgConf =
      verified.length > 0
        ? Math.round(
            verified.reduce((sum, c) => sum + c.confidence, 0) / verified.length
          )
        : 0;

    return {
      total_claims: claims.length,
      verified_claims: verified.length,
      claim_types: types,
      avg_confidence: avgConf,
      has_contradictions: false, // Could add logic here
    };
  }

  async function computeScore(subject: string): Promise<string> {
    const summary = await buildClaimSummary(subject);
    return glClient.sendTransaction({
      contract: addresses.reputationScorer,
      method: "compute_score",
      args: [subject, JSON.stringify(summary)],
    });
  }

  async function getScore(addr: string): Promise<ScoreRecord | null> {
    try {
      const raw = await glClient.readContract({
        contract: addresses.reputationScorer,
        method: "get_score",
        args: [addr],
      });
      return JSON.parse(raw) as ScoreRecord;
    } catch {
      return null;
    }
  }

  async function getTrustScore(addr: string): Promise<number> {
    return glClient.readContract({
      contract: addresses.reputationScorer,
      method: "get_trust_score",
      args: [addr],
    });
  }

  // ── Access Controller ──────────────────────────────────────────────────────

  async function registerResource(
    resourceId: string,
    minScore: number,
    requiredClaims: string,
    requireAllClaims: boolean,
    maxRiskLevel: RiskLevel
  ): Promise<string> {
    return glClient.sendTransaction({
      contract: addresses.accessController,
      method: "register_resource",
      args: [resourceId, minScore, requiredClaims, requireAllClaims, maxRiskLevel],
    });
  }

  async function requestAccess(resourceId: string, addr: string): Promise<string> {
    const [scoreData, claimTypes] = await Promise.all([
      getScore(addr),
      getVerifiedClaimTypes(addr),
    ]);

    const score = scoreData?.score ?? 0;
    const riskLevel = scoreData?.risk_level ?? "high";
    const claimsJson = JSON.stringify(claimTypes);

    return glClient.sendTransaction({
      contract: addresses.accessController,
      method: "request_access",
      args: [resourceId, score, riskLevel, claimsJson],
    });
  }

  async function hasValidAccess(addr: string, resourceId: string): Promise<boolean> {
    return glClient.readContract({
      contract: addresses.accessController,
      method: "has_valid_access",
      args: [addr, resourceId],
    });
  }

  async function getPolicy(resourceId: string): Promise<AccessPolicy | null> {
    try {
      const raw = await glClient.readContract({
        contract: addresses.accessController,
        method: "get_policy",
        args: [resourceId],
      });
      return JSON.parse(raw) as AccessPolicy;
    } catch {
      return null;
    }
  }

  return {
    // Identity
    registerIdentity,
    updateIdentity,
    getIdentity,
    isRegistered,
    getTotalRegistered,
    // Claims
    submitClaim,
    getClaim,
    getClaimsForAddress,
    getVerifiedClaimTypes,
    hasVerifiedClaim,
    revokeClaim,
    // Reputation
    buildClaimSummary,
    computeScore,
    getScore,
    getTrustScore,
    // Access
    registerResource,
    requestAccess,
    hasValidAccess,
    getPolicy,
  };
}

export type SovereignClient = ReturnType<typeof createSovereignClient>;
