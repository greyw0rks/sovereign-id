# SOVEREIGN ID
### Decentralized Self-Sovereign Identity on GenLayer Bradbury Testnet

> *Own your identity. Control your claims. Govern your data.*

SovereignID is a decentralized identity system built on [GenLayer](https://genlayer.com) — the first Intelligent Blockchain. It uses AI-powered smart contracts to issue, verify, and score identity claims without any central authority.

---

## LIVE DEPLOYMENT — BRADBURY TESTNET

| Contract | Address |
|---|---|
| `IdentityRegistry` | `0x2498Af3E61c8Ae6C57C72327B29bc9Becb31b517` |
| `ClaimVerifier` | `0x62D515dac94e342152b038509f98Ff4729D39298` |
| `ReputationScorer` | `0x90Dc489FB423f6689DbE0F92B5D53b0496Fe12a2` |
| `AccessController` | `0x1D1CDe8f2AC464347B230fc4E161349f1b5391C4` |

**Network:** GenLayer Bradbury Testnet · **Chain ID:** 4221

---

## WHAT IT DOES

SovereignID gives users full ownership of their digital identity through four intelligent contracts that work together:

**IdentityRegistry** — The core identity store. Users register a DID (Decentralized Identifier) on-chain. Only the owner can update or revoke their identity record.

**ClaimVerifier** — AI-powered claim verification. Submit a claim (e.g. "I am over 18", "I hold a degree in X") along with evidence. GenLayer's validator network uses LLMs to assess the claim and reach consensus on whether it passes.

**ReputationScorer** — Builds a trust score from verified claims over time. The score is publicly readable but the underlying claims remain private unless the owner chooses to disclose them.

**AccessController** — Governs which addresses can read which claims. Users grant and revoke selective disclosure permissions — no third party can access your data without explicit on-chain permission.

---

## HOW IT WORKS

GenLayer's Intelligent Contracts can run AI inference as part of consensus. When a claim is submitted for verification:

1. A leader validator executes the contract and calls an LLM to assess the evidence
2. Four other validators independently run the same inference
3. The `eq_principle.prompt_non_comparative` equivalence check determines if all validators reached the same conclusion
4. If consensus is reached, the claim is written to state

This means **subjective identity claims** — things traditional smart contracts can't handle — can be verified trustlessly.

```python
# Example: AI-powered claim verification in GenVM
def verify_claim(self, claim_id: str, evidence: str):
    subject = self.claims.get(claim_id).subject
    claim_text = self.claims.get(claim_id).claim_text

    def assess():
        prompt = f"""
        Assess whether the following evidence supports this identity claim.
        Claim: {claim_text}
        Evidence: {evidence}
        Return JSON: {{"verified": true/false, "reasoning": "..."}}
        """
        result = gl.nondet.exec_prompt(prompt)
        return result.replace("```json", "").replace("```", "").strip()

    result = gl.eq_principle.prompt_non_comparative(
        assess,
        task="Verify an identity claim based on submitted evidence",
        criteria="Must return valid JSON with verified boolean and reasoning string"
    )
    decision = json.loads(result)
    # write to state...
```

---

## CONTRACT ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                    USER / DAPP                       │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
       ┌───────▼──────┐     ┌─────────▼────────┐
       │   Identity   │     │    Access         │
       │   Registry   │     │    Controller     │
       └───────┬──────┘     └─────────┬─────────┘
               │                      │
       ┌───────▼──────┐     ┌─────────▼────────┐
       │    Claim     │     │   Reputation      │
       │   Verifier   │     │    Scorer         │
       │  (AI + LLM)  │     │                   │
       └──────────────┘     └──────────────────-┘
               │
       ┌───────▼───────────────────────┐
       │   GenLayer Validator Network  │
       │   (5 validators, LLM consensus)│
       └───────────────────────────────┘
```

---

## REPO STRUCTURE

```
sovereign-id/
├── contracts/
│   ├── identity_registry.gpy      # Core DID registry
│   ├── claim_verifier.gpy         # AI claim verification
│   ├── reputation_scorer.gpy      # Trust score aggregator
│   └── access_controller.gpy     # Selective disclosure
├── frontend/                      # React + Vite frontend
├── src/                           # Source files
├── public/                        # Static assets
└── .env.example                   # Environment config template
```

---

## RUNNING LOCALLY

### Prerequisites
- Node.js 18+
- Docker 26+
- GenLayer Studio (local or hosted)

### 1. Clone and install
```bash
git clone https://github.com/greyw0rks/sovereign-id.git
cd sovereign-id
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your contract addresses and RPC URL
```

### 3. Configure `.env`
```env
VITE_IDENTITY_REGISTRY=0x2498Af3E61c8Ae6C57C72327B29bc9Becb31b517
VITE_CLAIM_VERIFIER=0x62D515dac94e342152b038509f98Ff4729D39298
VITE_REPUTATION_SCORER=0x90Dc489FB423f6689DbE0F92B5D53b0496Fe12a2
VITE_ACCESS_CONTROLLER=0x1D1CDe8f2AC464347B230fc4E161349f1b5391C4
VITE_RPC_URL=https://studio.genlayer.com/api
```

### 4. Run the frontend
```bash
npm run dev
```

### 5. Deploy contracts (optional — already live on Bradbury)
```bash
# Set network to Bradbury testnet
genlayer network set testnet-bradbury

# Deploy each contract
genlayer deploy --contract contracts/identity_registry.gpy
genlayer deploy --contract contracts/claim_verifier.gpy
genlayer deploy --contract contracts/reputation_scorer.gpy
genlayer deploy --contract contracts/access_controller.gpy
```

---

## RUNNING GENLAYER STUDIO LOCALLY

If you want to run a local GenLayer node instead of using the hosted studio:

```bash
# Clone the studio
git clone https://github.com/yeagerai/genlayer-studio.git ~/genlayer-studio
cd ~/genlayer-studio

# Configure
cp .env.example .env
# Add your LLM provider key (Heurist is free: https://dev-api-form.heurist.ai/)
echo "HEURISTAIKEY=your_key_here" >> .env

# Create database and start
docker compose -p genlayer up -d postgres
docker exec -it genlayer-postgres-1 psql -U postgres -c "CREATE DATABASE genlayer_state;"
docker compose -p genlayer run --rm database-migration
docker compose -p genlayer --profile frontend up -d
```

Studio runs at `http://localhost:8080`

---

## KEY TECHNICAL NOTES

This project targets the **GenLayer Bradbury testnet** and uses the current GenVM runtime API:

```python
# Correct API (runtime-verified)
gl.nondet.exec_prompt(prompt)
gl.eq_principle.prompt_non_comparative(fn, task="...", criteria="...")

# Note: docs.genlayer.com shows outdated examples — trust the runtime
```

**GenVM patterns used:**
- `TreeMap[Address, DataClass]` for on-chain storage
- `@allow_storage` + `@dataclass` for storage classes
- Claim IDs prefixed with `"c"` to prevent CLI integer parsing errors
- All storage values extracted into locals before entering nondet blocks

---

## BUILT WITH

- [GenLayer](https://genlayer.com) — Intelligent Blockchain
- [GenVM](https://docs.genlayer.com) — Python-based smart contract runtime
- React + Vite + TypeScript — Frontend
- Heurist AI — LLM provider for validator consensus

---

## LINKS

- **Deployed frontend:** https://sovereign-id-delta.vercel.app
- **GenLayer Studio:** https://studio.genlayer.com
- **GenLayer Docs:** https://docs.genlayer.com
- **Discord:** https://discord.gg/8Jm4v89VAu

---

*Built for the GenLayer Bradbury Hackathon*
