import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://16.171.21.181:4001";

const glRead = async (contract, method, args = []) => {
  const res = await fetch(`${API}/api/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contract, method, args }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
};

const glWrite = async (contract, method, args = []) => {
  const res = await fetch(`${API}/api/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contract, method, args }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
};

const CLAIM_META = {
  github_ownership:     { label: "GitHub Ownership",     icon: "⬡" },
  age_over_18:          { label: "Age Verified (18+)",   icon: "◈" },
  professional_license: { label: "Professional License", icon: "◉" },
  domain_ownership:     { label: "Domain Ownership",     icon: "◎" },
  kyc_lite:             { label: "KYC Lite",              icon: "◐" },
};

const RISK_COLORS = {
  low: "#00e5a0", medium: "#f5c518", high: "#ff8c42", critical: "#ff2d55",
};

const CONTRACTS_DISPLAY = {
  identityRegistry: import.meta.env.VITE_IDENTITY_REGISTRY,
  claimVerifier:    import.meta.env.VITE_CLAIM_VERIFIER,
  reputationScorer: import.meta.env.VITE_REPUTATION_SCORER,
  accessController: import.meta.env.VITE_ACCESS_CONTROLLER,
};

function hexScore(s) {
  if (s >= 80) return "#00e5a0";
  if (s >= 60) return "#7fffff";
  if (s >= 40) return "#f5c518";
  return "#ff2d55";
}

function truncate(addr) {
  if (!addr) return "";
  return addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

function safeJson(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val;
  const cleaned = val.replace(/Address\("([^"]+)"\)/g, '"$1"');
  try { return JSON.parse(cleaned); } catch { return fallback; }
}

function ScoreRing({ score, size = 130 }) {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = hexScore(score);
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        style={{ transform:"rotate(-90deg)", transformOrigin:"50% 50%", transition:"stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}/>
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
        style={{ fill:color, fontSize:size*.26, fontFamily:"'Space Mono',monospace", fontWeight:700 }}>{score}</text>
    </svg>
  );
}

function ConfBar({ val }) {
  const color = val >= 80 ? "#00e5a0" : val >= 60 ? "#7fffff" : val >= 40 ? "#f5c518" : "#ff2d55";
  return (
    <div style={{ width:44, height:4, background:"rgba(255,255,255,.07)", borderRadius:2, overflow:"hidden", flexShrink:0 }}>
      <div style={{ width:`${val}%`, height:"100%", background:color, borderRadius:2, transition:"width .6s ease" }}/>
    </div>
  );
}

function ClaimBadge({ claim, onRevoke }) {
  const meta = CLAIM_META[claim.claim_type] || { label: claim.claim_type, icon: "◦" };
  const [expanded, setExpanded] = useState(false);
  return (
    <div onClick={() => setExpanded(e => !e)} style={{
      background: claim.is_verified ? "rgba(0,229,160,.04)" : "rgba(255,255,255,.02)",
      border: `1px solid ${claim.is_verified ? "rgba(0,229,160,.2)" : "rgba(255,255,255,.07)"}`,
      borderRadius:8, padding:"13px 16px", cursor:"pointer",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:18, opacity:.6, flexShrink:0 }}>{meta.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.85)" }}>{meta.label}</span>
            <span style={{
              fontSize:9, padding:"1px 7px", borderRadius:20, letterSpacing:1,
              background: claim.is_verified ? "rgba(0,229,160,.12)" : "rgba(255,45,85,.1)",
              color: claim.is_verified ? "#00e5a0" : "#ff2d55",
            }}>{claim.is_verified ? "VERIFIED" : "FAILED"}</span>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.28)", marginTop:2 }}>
            ID #{claim.claim_id} · {claim.confidence}% confidence
          </div>
        </div>
        <ConfBar val={claim.confidence}/>
        <span style={{ fontSize:11, color:"rgba(255,255,255,.2)", flexShrink:0 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,.06)" }}>
          <p style={{ fontSize:12, color:"rgba(255,255,255,.45)", lineHeight:1.7 }}>{claim.verifier_note}</p>
          {claim.is_verified && (
            <button onClick={e => { e.stopPropagation(); onRevoke(claim.claim_id); }}
              style={{ marginTop:10, fontSize:11, color:"#ff2d55", background:"rgba(255,45,85,.08)", border:"1px solid rgba(255,45,85,.25)", borderRadius:4, padding:"4px 12px", cursor:"pointer", fontFamily:"'Space Mono',monospace" }}>
              Revoke Claim
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ResourceRow({ res }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:14, padding:"11px 16px", borderRadius:7,
      background: res.has_access ? "rgba(0,229,160,.03)" : "rgba(255,255,255,.02)",
      border: `1px solid ${res.has_access ? "rgba(0,229,160,.18)" : "rgba(255,255,255,.06)"}`,
    }}>
      <span style={{ fontSize:15, color: res.has_access ? "#00e5a0" : "rgba(255,255,255,.2)", flexShrink:0 }}>
        {res.has_access ? "✓" : "✗"}
      </span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.8)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{res.resource_id}</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.28)", marginTop:1 }}>
          Min score {res.min_score} · Claims: <span style={{ color:"rgba(127,255,255,.5)" }}>{res.required_claims || "none"}</span>
        </div>
      </div>
      <span style={{
        fontSize:9, padding:"2px 10px", borderRadius:12, letterSpacing:.8, flexShrink:0,
        background: res.has_access ? "rgba(0,229,160,.1)" : "rgba(255,255,255,.04)",
        color: res.has_access ? "#00e5a0" : "rgba(255,255,255,.25)",
      }}>{res.has_access ? "GRANTED" : "DENIED"}</span>
    </div>
  );
}

function ClaimModal({ onClose, onSubmit, loading }) {
  const [claimType, setClaimType] = useState("github_ownership");
  const [url, setUrl] = useState("");
  const examples = {
    github_ownership: "https://github.com/greyw0rks",
    age_over_18: "https://verify.example.com/age/proof",
    kyc_lite: "https://kyc.example.com/attestation",
    professional_license: "https://licensing.board.gov/lookup",
    domain_ownership: "https://example.com",
  };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,.8)", backdropFilter:"blur(16px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"min(460px,100%)", background:"#0d0f13", border:"1px solid rgba(127,255,255,.2)", borderRadius:14, padding:28 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <span style={{ fontSize:10, letterSpacing:3, color:"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace" }}>SUBMIT IDENTITY CLAIM</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,.3)", cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
        <p style={{ fontSize:12, color:"rgba(255,255,255,.38)", marginBottom:22, lineHeight:1.75 }}>
          GenLayer AI validators will independently fetch your evidence URL and reach consensus via Optimistic Democracy.
        </p>
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:10, letterSpacing:2, color:"rgba(255,255,255,.35)", display:"block", marginBottom:7 }}>CLAIM TYPE</label>
          <select value={claimType} onChange={e => setClaimType(e.target.value)}
            style={{ width:"100%", background:"#0a0c10", border:"1px solid rgba(255,255,255,.1)", borderRadius:7, padding:"10px 12px", color:"#fff", fontFamily:"'Space Mono',monospace", fontSize:12, outline:"none" }}>
            {Object.entries(CLAIM_META).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:22 }}>
          <label style={{ fontSize:10, letterSpacing:2, color:"rgba(255,255,255,.35)", display:"block", marginBottom:7 }}>EVIDENCE URL</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder={examples[claimType]}
            style={{ width:"100%", background:"#0a0c10", border:"1px solid rgba(255,255,255,.1)", borderRadius:7, padding:"10px 12px", color:"#fff", fontFamily:"'Space Mono',monospace", fontSize:12, outline:"none", boxSizing:"border-box" }}/>
        </div>
        <button onClick={() => url && onSubmit(claimType, url)} disabled={loading || !url}
          style={{ width:"100%", padding:"11px 0", borderRadius:7, border:"none", fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:1.5, fontWeight:700, cursor: loading || !url ? "not-allowed" : "pointer",
            background: loading || !url ? "rgba(255,255,255,.06)" : "rgba(0,229,160,.9)",
            color: loading || !url ? "rgba(255,255,255,.25)" : "#000" }}>
          {loading ? "▪ VALIDATORS REACHING CONSENSUS…" : "SUBMIT TO AI VALIDATORS"}
        </button>
        {loading && (
          <div style={{ marginTop:14, display:"flex", gap:6 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ flex:1, height:3, borderRadius:2, background:"rgba(0,229,160,.15)", overflow:"hidden" }}>
                <div style={{ height:"100%", background:"#00e5a0", borderRadius:2, animation:`validating 1.5s ${i*.2}s infinite` }}/>
              </div>
            ))}
          </div>
        )}
        <p style={{ marginTop:14, fontSize:11, color:"rgba(255,255,255,.2)", lineHeight:1.6 }}>5 validators · Optimistic Democracy · ~10–40s on Bradbury</p>
      </div>
    </div>
  );
}

export default function SovereignID() {
  const [tab, setTab] = useState("identity");
  const [wallet, setWallet] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [claims, setClaims] = useState([]);
  const [score, setScore] = useState(null);
  const [resources] = useState([
    { resource_id: "dao:governance",        min_score: 60, required_claims: "age_over_18",                   has_access: false },
    { resource_id: "app:premium-api",       min_score: 80, required_claims: "kyc_lite|professional_license", has_access: false },
    { resource_id: "defi:lending-pool",     min_score: 70, required_claims: "kyc_lite",                      has_access: false },
    { resource_id: "forum:verified-member", min_score: 40, required_claims: "github_ownership",              has_access: false },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [computing, setComputing] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [error, setError] = useState(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const connectWallet = async () => {
    try {
      setAppLoading(true);
      setError(null);
      if (!window.ethereum) throw new Error("MetaMask not detected");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts[0];
      setWallet(addr);
      showToast("Wallet connected ✓", "success");
      await loadData(addr);
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
      showToast("Connection failed", "error");
    } finally {
      setAppLoading(false);
    }
  };

  const loadData = async (addr) => {
    try {
      setAppLoading(true);
      const registered = await glRead("identityRegistry", "is_registered", [addr]);
      const isReg = registered === "True" || registered === true || registered === "true";
      if (!isReg) { setIdentity(null); setClaims([]); setScore(null); return; }

      const rawId = await glRead("identityRegistry", "get_identity", [addr]);
      setIdentity(safeJson(rawId));

      const rawIds = await glRead("claimVerifier", "get_claims_for_address", [addr]);
      const ids = safeJson(rawIds, []);
      const claimData = await Promise.all(
        ids.map(id => glRead("claimVerifier", "get_claim", [id]).then(r => safeJson(r)).catch(() => null))
      );
      setClaims(claimData.filter(Boolean));

      try {
        const rawScore = await glRead("reputationScorer", "get_score", [addr]);
        setScore(safeJson(rawScore));
      } catch { /* not scored yet */ }

    } catch (err) {
      setError("Failed to load data: " + err.message);
      showToast("Data load failed", "error");
    } finally {
      setAppLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!wallet) return;
    try {
      setAppLoading(true);
      await glWrite("identityRegistry", "register_identity", [
        "QmW2WQi7j6c7UaJkARcFfBUPmJqPuoE3iDdSf8VXQP4EHe",
        "greyw0rks",
      ]);
      showToast("Identity registered on Bradbury ✓", "success");
      await loadData(wallet);
    } catch (err) {
      showToast("Registration failed: " + err.message, "error");
    } finally {
      setAppLoading(false);
    }
  };

  const handleSubmitClaim = async (claimType, url) => {
    if (!wallet) return;
    setModalLoading(true);
    try {
      await glWrite("claimVerifier", "submit_claim", [claimType, url]);
      showToast("Claim accepted — AI validators verified it ✓", "success");
      setShowModal(false);
      await loadData(wallet);
    } catch (err) {
      showToast("Claim failed: " + err.message, "error");
    } finally {
      setModalLoading(false);
    }
  };

  const handleRevoke = async (claimId) => {
    if (!wallet) return;
    try {
      await glWrite("claimVerifier", "revoke_claim", [claimId]);
      showToast("Claim revoked ✓", "success");
      await loadData(wallet);
    } catch (err) {
      showToast("Revoke failed: " + err.message, "error");
    }
  };

  const handleComputeScore = async () => {
    if (!wallet) return;
    setComputing(true);
    try {
      const verified = claims.filter(c => c.is_verified);
      const types = [...new Set(verified.map(c => c.claim_type))];
      const avgConf = verified.length
        ? Math.round(verified.reduce((a, c) => a + c.confidence, 0) / verified.length)
        : 0;
      const summary = JSON.stringify({
        total_claims: claims.length,
        verified_claims: verified.length,
        claim_types: types,
        avg_confidence: avgConf,
        has_contradictions: false,
      });
      await glWrite("reputationScorer", "compute_score", [wallet, summary]);
      showToast("Score computed ✓", "success");
      await loadData(wallet);
    } catch (err) {
      showToast("Score failed: " + err.message, "error");
    } finally {
      setComputing(false);
    }
  };

  const verifiedClaims = claims.filter(c => c.is_verified);
  const avgConf = verifiedClaims.length
    ? Math.round(verifiedClaims.reduce((a, c) => a + c.confidence, 0) / verifiedClaims.length)
    : 0;
  const tabs = ["identity", "claims", "reputation", "access"];

  if (!wallet) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap'); * { box-sizing:border-box; margin:0; padding:0; }`}</style>
        <div style={{ minHeight:"100vh", background:"#07090c", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", color:"#fff", padding:24 }}>
          <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(127,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(127,255,255,.018) 1px,transparent 1px)", backgroundSize:"44px 44px", pointerEvents:"none" }}/>
          <div style={{ position:"fixed", top:-160, right:-80, width:700, height:700, background:"radial-gradient(circle,rgba(0,229,160,.055) 0%,transparent 70%)", pointerEvents:"none" }}/>
          <div style={{ textAlign:"center", maxWidth:400, position:"relative", zIndex:1 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" style={{ marginBottom:20 }}>
              <polygon points="12,2 21,7.5 21,16.5 12,22 3,16.5 3,7.5" stroke="rgba(0,229,160,.75)" strokeWidth="1.5" fill="rgba(0,229,160,.04)"/>
              <polygon points="12,6.5 17,9.5 17,14.5 12,17.5 7,14.5 7,9.5" stroke="rgba(0,229,160,.3)" strokeWidth="1" fill="none"/>
              <circle cx="12" cy="12" r="2.5" fill="rgba(0,229,160,.8)"/>
            </svg>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, letterSpacing:3, marginBottom:8 }}>SOVEREIGN<span style={{ color:"#00e5a0" }}>ID</span></div>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:10, lineHeight:1.7 }}>Decentralized identity on GenLayer Bradbury Testnet</p>
            <div style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(127,255,255,.5)", background:"rgba(127,255,255,.05)", border:"1px solid rgba(127,255,255,.12)", padding:"4px 12px", borderRadius:4, display:"inline-block", marginBottom:32 }}>BRADBURY TESTNET</div>
            <br/>
            {error && <div style={{ background:"rgba(255,45,85,.1)", border:"1px solid rgba(255,45,85,.25)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#ff6b8a" }}>{error}</div>}
            {!window.ethereum
              ? <div style={{ background:"rgba(245,197,24,.08)", border:"1px solid rgba(245,197,24,.2)", borderRadius:8, padding:16, fontSize:12, color:"rgba(245,197,24,.8)", lineHeight:1.7 }}>MetaMask not detected.<br/>Install MetaMask and refresh.</div>
              : <button onClick={connectWallet} disabled={appLoading} style={{ padding:"14px 36px", borderRadius:9, border:"none", background:"rgba(0,229,160,.9)", color:"#000", fontFamily:"'Space Mono',monospace", fontSize:13, letterSpacing:1.5, fontWeight:700, cursor: appLoading ? "wait" : "pointer" }}>
                  {appLoading ? "CONNECTING…" : "CONNECT WALLET"}
                </button>
            }
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px; }
        select option { background:#0d0f13; color:#fff; }
        @keyframes validating { 0%,100%{width:0} 50%{width:100%} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slideUp { from{transform:translateX(-50%) translateY(16px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
      `}</style>
      <div style={{ minHeight:"100vh", background:"#07090c", color:"#fff", fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", backgroundImage:"linear-gradient(rgba(127,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(127,255,255,.018) 1px,transparent 1px)", backgroundSize:"44px 44px" }}/>
        <div style={{ position:"fixed", top:-160, right:-80, width:700, height:700, background:"radial-gradient(circle,rgba(0,229,160,.055) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>
        <header style={{ position:"sticky", top:0, zIndex:50, borderBottom:"1px solid rgba(255,255,255,.055)", background:"rgba(7,9,12,.88)", backdropFilter:"blur(24px)" }}>
          <div style={{ maxWidth:980, margin:"0 auto", padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:54 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 21,7.5 21,16.5 12,22 3,16.5 3,7.5" stroke="rgba(0,229,160,.75)" strokeWidth="1.5" fill="rgba(0,229,160,.04)"/>
                <polygon points="12,6.5 17,9.5 17,14.5 12,17.5 7,14.5 7,9.5" stroke="rgba(0,229,160,.3)" strokeWidth="1" fill="none"/>
                <circle cx="12" cy="12" r="2.5" fill="rgba(0,229,160,.8)"/>
              </svg>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:14, letterSpacing:2.5 }}>SOVEREIGN<span style={{ color:"#00e5a0" }}>ID</span></span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {appLoading && <div style={{ width:14, height:14, border:"2px solid rgba(0,229,160,.3)", borderTopColor:"#00e5a0", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>}
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#00e5a0", boxShadow:"0 0 8px #00e5a0" }}/>
              <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.4)" }}>{truncate(wallet)}</span>
              <span style={{ fontSize:9, letterSpacing:1.5, color:"rgba(127,255,255,.55)", background:"rgba(127,255,255,.05)", border:"1px solid rgba(127,255,255,.12)", padding:"2px 9px", borderRadius:4 }}>BRADBURY</span>
            </div>
          </div>
        </header>
        <main style={{ maxWidth:980, margin:"0 auto", padding:"24px 20px 60px", position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", gap:3, marginBottom:24, background:"rgba(255,255,255,.025)", borderRadius:9, padding:4 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:"8px 0", borderRadius:6, border:"none", cursor:"pointer", background: tab===t ? "rgba(255,255,255,.07)" : "transparent", color: tab===t ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.28)", fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:2, transition:"all .15s" }}>{t.toUpperCase()}</button>
            ))}
          </div>

          {tab === "identity" && (
            <div style={{ animation:"fadeIn .3s ease" }}>
              {!identity ? (
                <div style={{ textAlign:"center", padding:"48px 24px", background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14 }}>
                  <div style={{ fontSize:32, marginBottom:16 }}>◈</div>
                  <div style={{ fontSize:14, color:"rgba(255,255,255,.5)", marginBottom:8 }}>No identity registered yet</div>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,.3)", marginBottom:24, lineHeight:1.7 }}>Register your sovereign identity on GenLayer Bradbury to begin building verified claims.</p>
                  <button onClick={handleRegister} disabled={appLoading} style={{ padding:"11px 28px", borderRadius:8, border:"none", background:"rgba(0,229,160,.9)", color:"#000", fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:1.5, fontWeight:700, cursor:"pointer" }}>
                    {appLoading ? "REGISTERING…" : "REGISTER IDENTITY"}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:24, marginBottom:16 }}>
                    <div style={{ fontSize:9, letterSpacing:3, color:"rgba(255,255,255,.25)", marginBottom:18, fontFamily:"'Space Mono',monospace" }}>SOVEREIGN IDENTITY</div>
                    <div style={{ display:"flex", alignItems:"center", gap:18 }}>
                      <div style={{ width:56, height:56, borderRadius:10, background:"linear-gradient(135deg,rgba(0,229,160,.25),rgba(127,255,255,.08))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, border:"1px solid rgba(0,229,160,.2)", flexShrink:0 }}>◈</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:22, fontWeight:500 }}>{identity.display_name || "Anonymous"}</div>
                        <div style={{ fontSize:12, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.3)", marginTop:3 }}>{truncate(identity.owner || wallet)}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:9, letterSpacing:1.5, color: identity.is_active ? "#00e5a0" : "#ff2d55", background: identity.is_active ? "rgba(0,229,160,.09)" : "rgba(255,45,85,.09)", padding:"3px 10px", borderRadius:20, display:"inline-block", marginBottom:5 }}>
                          {identity.is_active ? "● ACTIVE" : "○ INACTIVE"}
                        </div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.28)" }}>{verifiedClaims.length} verified claims</div>
                      </div>
                    </div>
                    <div style={{ marginTop:18, padding:14, background:"rgba(0,0,0,.35)", borderRadius:8, border:"1px solid rgba(255,255,255,.05)" }}>
                      <div style={{ fontSize:9, letterSpacing:2.5, color:"rgba(255,255,255,.22)", marginBottom:6 }}>IPFS METADATA HASH</div>
                      <div style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(127,255,255,.6)", wordBreak:"break-all", lineHeight:1.7 }}>{identity.metadata_hash}</div>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
                    {[
                      { label:"TRUST SCORE",    val: score?.score ?? "—",   sub: score ? "/100" : "", color: score ? hexScore(score.score) : "rgba(255,255,255,.3)" },
                      { label:"RISK LEVEL",     val: score ? score.risk_level.toUpperCase() : "—", sub:"", color: score ? RISK_COLORS[score.risk_level] : "rgba(255,255,255,.3)" },
                      { label:"VERIFIED",       val: verifiedClaims.length, sub:`/${claims.length} claims`, color:"#7fffff" },
                      { label:"AVG CONFIDENCE", val: avgConf ? avgConf+"%" : "—", sub:"", color: hexScore(avgConf) },
                    ].map(s => (
                      <div key={s.label} style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.055)", borderRadius:10, padding:18 }}>
                        <div style={{ fontSize:9, letterSpacing:2.5, color:"rgba(255,255,255,.22)", marginBottom:10, fontFamily:"'Space Mono',monospace" }}>{s.label}</div>
                        <div style={{ fontSize:28, fontFamily:"'Space Mono',monospace", fontWeight:700, color:s.color }}>{s.val}<span style={{ fontSize:13, opacity:.5 }}>{s.sub}</span></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "claims" && (
            <div style={{ animation:"fadeIn .3s ease" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <span style={{ fontSize:9, letterSpacing:3, color:"rgba(255,255,255,.25)", fontFamily:"'Space Mono',monospace" }}>IDENTITY CLAIMS</span>
                <button onClick={() => setShowModal(true)} style={{ fontSize:10, letterSpacing:1.5, background:"rgba(0,229,160,.9)", color:"#000", border:"none", padding:"6px 14px", borderRadius:6, cursor:"pointer", fontFamily:"'Space Mono',monospace", fontWeight:700 }}>+ ADD CLAIM</button>
              </div>
              {claims.length === 0
                ? <div style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,.3)", fontSize:13 }}>No claims yet. Add your first identity claim above.</div>
                : <div style={{ display:"flex", flexDirection:"column", gap:9 }}>{claims.map(c => <ClaimBadge key={c.claim_id} claim={c} onRevoke={handleRevoke}/>)}</div>
              }
              <div style={{ marginTop:20, padding:16, background:"rgba(127,255,255,.025)", border:"1px solid rgba(127,255,255,.1)", borderRadius:9 }}>
                <div style={{ fontSize:9, letterSpacing:2.5, color:"rgba(127,255,255,.4)", marginBottom:8, fontFamily:"'Space Mono',monospace" }}>HOW VERIFICATION WORKS</div>
                <p style={{ fontSize:12, color:"rgba(255,255,255,.38)", lineHeight:1.75 }}>Each claim triggers 5 GenLayer validators running different LLMs. They independently fetch your evidence URL and vote to consensus via Optimistic Democracy. Results are final and stored on Bradbury.</p>
              </div>
            </div>
          )}

          {tab === "reputation" && (
            <div style={{ animation:"fadeIn .3s ease" }}>
              <div style={{ fontSize:9, letterSpacing:3, color:"rgba(255,255,255,.25)", marginBottom:16, fontFamily:"'Space Mono',monospace" }}>AI REPUTATION SCORE</div>
              {!score ? (
                <div style={{ textAlign:"center", padding:40, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:12, marginBottom:16 }}>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:16 }}>No score computed yet</div>
                  <button onClick={handleComputeScore} disabled={computing || claims.length === 0}
                    style={{ padding:"10px 24px", borderRadius:7, border:"1px solid rgba(127,255,255,.25)", background:"rgba(127,255,255,.08)", color:"rgba(127,255,255,.9)", fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:1, cursor:"pointer" }}>
                    {computing ? "COMPUTING…" : "COMPUTE SCORE"}
                  </button>
                  {claims.length === 0 && <p style={{ fontSize:11, color:"rgba(255,255,255,.25)", marginTop:10 }}>Add claims first before computing a score.</p>}
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:20, alignItems:"start" }}>
                  <div style={{ textAlign:"center" }}>
                    <ScoreRing score={score.score} size={138}/>
                    <div style={{ marginTop:8, fontSize:9, letterSpacing:2, color: RISK_COLORS[score.risk_level], fontFamily:"'Space Mono',monospace" }}>{score.risk_level.toUpperCase()} RISK</div>
                  </div>
                  <div>
                    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.06)", borderRadius:9, padding:16, marginBottom:12 }}>
                      <div style={{ fontSize:9, letterSpacing:2.5, color:"rgba(255,255,255,.22)", marginBottom:8, fontFamily:"'Space Mono',monospace" }}>AI RATIONALE</div>
                      <p style={{ fontSize:12, color:"rgba(255,255,255,.55)", lineHeight:1.75 }}>{score.rationale}</p>
                    </div>
                    {score.fraud_flags && (
                      <div style={{ background:"rgba(255,140,66,.05)", border:"1px solid rgba(255,140,66,.2)", borderRadius:8, padding:16, marginBottom:12 }}>
                        <div style={{ fontSize:9, letterSpacing:2, color:"#ff8c42", marginBottom:6 }}>FRAUD FLAGS</div>
                        {score.fraud_flags.split("|").map(f => <span key={f} style={{ display:"inline-block", fontSize:11, background:"rgba(255,140,66,.1)", color:"#ff8c42", padding:"2px 8px", borderRadius:4, marginRight:6 }}>{f}</span>)}
                      </div>
                    )}
                    <button onClick={handleComputeScore} disabled={computing}
                      style={{ width:"100%", padding:"10px 0", borderRadius:7, border:"1px solid rgba(127,255,255,.2)", background:"rgba(127,255,255,.05)", color: computing ? "rgba(255,255,255,.25)" : "rgba(127,255,255,.85)", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1.5, cursor: computing ? "wait" : "pointer" }}>
                      {computing ? "▪ COMPUTING VIA AI CONSENSUS…" : "RECOMPUTE SCORE"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "access" && (
            <div style={{ animation:"fadeIn .3s ease" }}>
              <div style={{ fontSize:9, letterSpacing:3, color:"rgba(255,255,255,.25)", marginBottom:6, fontFamily:"'Space Mono',monospace" }}>RESOURCE ACCESS</div>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.32)", marginBottom:18, lineHeight:1.75 }}>
                Relying parties call <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:"rgba(127,255,255,.6)" }}>has_valid_access(addr, resource_id)</span> — a single boolean. Your identity data stays private.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                {resources.map(r => <ResourceRow key={r.resource_id} res={r}/>)}
              </div>
              <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.055)", borderRadius:9, padding:18 }}>
                <div style={{ fontSize:9, letterSpacing:2.5, color:"rgba(255,255,255,.2)", marginBottom:12, fontFamily:"'Space Mono',monospace" }}>DEPLOYED CONTRACTS · BRADBURY</div>
                {Object.entries(CONTRACTS_DISPLAY).map(([k, v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:4 }}>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{k}</span>
                    <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(127,255,255,.6)" }}>{truncate(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {toast && (
          <div style={{ position:"fixed", bottom:24, left:"50%", zIndex:300,
            background: toast.type==="success" ? "rgba(0,229,160,.95)" : toast.type==="error" ? "rgba(255,45,85,.9)" : "rgba(20,24,32,.97)",
            color: ["success","error"].includes(toast.type) ? "#000" : "#fff",
            padding:"10px 22px", borderRadius:9, fontSize:12, fontFamily:"'Space Mono',monospace",
            boxShadow:"0 12px 40px rgba(0,0,0,.5)", animation:"slideUp .25s ease",
            transform:"translateX(-50%)" }}>{toast.msg}</div>
        )}
        {showModal && <ClaimModal onClose={() => setShowModal(false)} onSubmit={handleSubmitClaim} loading={modalLoading}/>}
      </div>
    </>
  );
}
