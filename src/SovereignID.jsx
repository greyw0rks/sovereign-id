import { useState } from "react";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { custom } from "viem";

const C = {
  identityRegistry: import.meta.env.VITE_IDENTITY_REGISTRY,
  claimVerifier:    import.meta.env.VITE_CLAIM_VERIFIER,
  reputationScorer: import.meta.env.VITE_REPUTATION_SCORER,
  accessController: import.meta.env.VITE_ACCESS_CONTROLLER,
};

const CLAIM_META = {
  github_ownership:     { label:"GitHub Ownership",   icon:"⬡", desc:"Proves you own a GitHub account" },
  age_over_18:          { label:"Age Verified (18+)", icon:"◈", desc:"Confirms you are 18 or older" },
  professional_license: { label:"Pro License",        icon:"◉", desc:"Proves professional certification" },
  domain_ownership:     { label:"Domain Ownership",   icon:"◎", desc:"Proves you own a domain" },
  kyc_lite:             { label:"KYC Lite",            icon:"◐", desc:"Light identity verification" },
};

const TABS = ["identity","claims","reputation","access"];

function safeJson(str, fallback = null) {
  if (str === null || str === undefined) return fallback;
  if (typeof str === "object") {
    if (str.result !== undefined) str = str.result;
    else if (str.data !== undefined) str = str.data;
    else return str;
  }
  if (typeof str !== "string") return str ?? fallback;
  const t = str.trim();
  if (!t) return fallback;
  try { return JSON.parse(t); } catch { return fallback; }
}
function unwrapResult(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object" && raw.result !== undefined) return raw.result;
  if (typeof raw === "object" && raw.data !== undefined) return raw.data;
  return raw;
}
function short(addr, n = 6) {
  if (!addr) return "";
  return `${addr.slice(0,n+2)}…${addr.slice(-n)}`;
}
function scoreColor(s) {
  if (s >= 80) return "#00e5a0";
  if (s >= 60) return "#7fffff";
  if (s >= 40) return "#f5c518";
  return "#ff2d55";
}
function parseSybilError(msg) {
  if (!msg) return null;
  if (msg.includes("SYBIL_REJECTED") && msg.includes("evidence"))
    return { title:"Evidence Already Claimed", detail:"This evidence has already been used on a different identity. Evidence nullifiers prevent reuse across wallets.", icon:"🔒" };
  if (msg.includes("SYBIL_REJECTED") && msg.includes("Biometric"))
    return { title:"Identity Already Verified", detail:"Your biometric fingerprint matches an identity on a different wallet. One SovereignID per person is enforced.", icon:"🧬" };
  if (msg.includes("DUPLICATE_IDENTITY"))
    return { title:"Identity Already Exists", detail:"This wallet already has a registered sovereign identity.", icon:"👤" };
  if (msg.includes("DUPLICATE_CLAIM"))
    return { title:"Claim Already Verified", detail:"You already have a verified claim of this type. Revoke it first.", icon:"✓" };
  if (msg.includes("USER_PREFERENCE_DENIED"))
    return { title:"Claim Disabled", detail:"You have disabled this claim type in your preferences. Re-enable it in the Access Manager.", icon:"⚙️" };
  return null;
}

async function glRead(client, contract, method, args = []) {
  const raw = await client.readContract({ contract, method, args });
  return unwrapResult(raw);
}
async function glWrite(client, contract, method, args = []) {
  console.log("[glWrite]", method, args);
  const result = await client.sendTransaction({ contract, method, args });
  console.log("[glWrite] tx:", result);
  await new Promise(r => setTimeout(r, 12000));
  return result;
}

// ── UI Components ─────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 130 }) {
  const r = size/2-10, circ = 2*Math.PI*r, filled = (score/100)*circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={7}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        style={{ transform:"rotate(-90deg)", transformOrigin:"50% 50%", transition:"stroke-dasharray 1s ease" }}/>
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
        style={{ fill:color, fontSize:size*.26, fontFamily:"'Space Mono',monospace", fontWeight:700 }}>{score}</text>
    </svg>
  );
}
function Spinner({ size=13, color="#00e5a0" }) {
  return <div style={{ width:size, height:size, border:`2px solid rgba(255,255,255,.1)`, borderTopColor:color, borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }}/>;
}
function Tag({ children, color="rgba(255,255,255,.07)", text="rgba(255,255,255,.4)" }) {
  return <span style={{ fontSize:9, padding:"2px 8px", borderRadius:20, letterSpacing:1, background:color, color:text, fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap" }}>{children}</span>;
}
function SybilBanner({ error, onDismiss }) {
  if (!error) return null;
  return (
    <div style={{ background:"rgba(255,45,85,.06)", border:"1px solid rgba(255,45,85,.3)", borderRadius:8, padding:18, marginBottom:18, animation:"fadeUp .3s ease" }}>
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <span style={{ fontSize:20, flexShrink:0 }}>{error.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#ff6b8a", fontFamily:"'Space Mono',monospace", marginBottom:5 }}>{error.title}</div>
          <p style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.8 }}>{error.detail}</p>
        </div>
        <button onClick={onDismiss} style={{ background:"none", border:"none", color:"rgba(255,255,255,.2)", cursor:"pointer", fontSize:18 }}>×</button>
      </div>
    </div>
  );
}
function ClaimCard({ claim, onRevoke }) {
  const [open, setOpen] = useState(false);
  const meta = CLAIM_META[claim.claim_type] || { label:claim.claim_type, icon:"◦" };
  const isSybil = claim.verifier_note?.includes("SYBIL_REJECTED");
  return (
    <div onClick={()=>setOpen(o=>!o)} style={{ background:claim.is_verified?"rgba(0,229,160,.04)":isSybil?"rgba(255,45,85,.04)":"rgba(255,255,255,.02)", border:`1px solid ${claim.is_verified?"rgba(0,229,160,.2)":isSybil?"rgba(255,45,85,.2)":"rgba(255,255,255,.07)"}`, borderRadius:8, padding:"13px 16px", cursor:"pointer" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:18, opacity:.6, flexShrink:0 }}>{isSybil?"🔒":meta.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.85)" }}>{meta.label}</span>
            <Tag color={claim.is_verified?"rgba(0,229,160,.12)":isSybil?"rgba(255,45,85,.12)":"rgba(255,255,255,.07)"} text={claim.is_verified?"#00e5a0":isSybil?"#ff2d55":"rgba(255,255,255,.3)"}>
              {claim.is_verified?"VERIFIED":isSybil?"SYBIL BLOCKED":"FAILED"}
            </Tag>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.28)", marginTop:2 }}>Claim #{claim.claim_id}</div>
        </div>
        <div style={{ width:44, height:4, background:"rgba(255,255,255,.07)", borderRadius:2, overflow:"hidden", flexShrink:0 }}>
          <div style={{ width:`${claim.confidence}%`, height:"100%", background:scoreColor(claim.confidence), transition:"width .6s ease" }}/>
        </div>
        <span style={{ fontSize:10, color:"rgba(255,255,255,.2)" }}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,.06)" }}>
          <p style={{ fontSize:12, color:"rgba(255,255,255,.45)", lineHeight:1.7 }}>{claim.verifier_note}</p>
          {claim.is_verified && <button onClick={e=>{e.stopPropagation();onRevoke(claim.claim_id);}} style={{ marginTop:10, fontSize:11, color:"#ff2d55", background:"rgba(255,45,85,.08)", border:"1px solid rgba(255,45,85,.25)", borderRadius:4, padding:"4px 12px", cursor:"pointer", fontFamily:"'Space Mono',monospace" }}>Revoke Claim</button>}
        </div>
      )}
    </div>
  );
}

// ── Access Manager: Protocol Row ──────────────────────────────────────────────
function ProtocolRow({ grant, onRevoke }) {
  const [open, setOpen] = useState(false);
  const claims = grant.claims_shared ? grant.claims_shared.split("|").filter(Boolean) : [];
  return (
    <div style={{ background:"rgba(255,255,255,.025)", border:`1px solid ${grant.is_valid?"rgba(0,229,160,.15)":"rgba(255,255,255,.06)"}`, borderRadius:8, overflow:"hidden" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"14px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:14 }}>
        {/* Protocol icon */}
        <div style={{ width:36, height:36, borderRadius:6, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {grant.protocol_logo ? (
            <img src={grant.protocol_logo} alt="" style={{ width:24, height:24, borderRadius:3, objectFit:"contain" }} onError={e=>e.target.style.display="none"}/>
          ) : (
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:"rgba(255,255,255,.4)", letterSpacing:.5 }}>
              {grant.protocol_name?.slice(0,2).toUpperCase()||"??"}
            </span>
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.85)", fontWeight:700 }}>
              {grant.protocol_name||grant.resource_id}
            </span>
            <Tag color={grant.is_valid?"rgba(0,229,160,.1)":"rgba(255,255,255,.05)"} text={grant.is_valid?"#00e5a0":"rgba(255,255,255,.25)"}>
              {grant.is_valid?"ACCESS GRANTED":"REVOKED"}
            </Tag>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:3 }}>
            {grant.resource_id} · Score {grant.score_at_grant}/100 at grant
          </div>
        </div>
        {/* Shared claims pills */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end", maxWidth:160 }}>
          {claims.map(ct => (
            <Tag key={ct} color="rgba(127,255,255,.08)" text="rgba(127,255,255,.6)">
              {CLAIM_META[ct]?.icon||"◦"} {CLAIM_META[ct]?.label||ct}
            </Tag>
          ))}
        </div>
        <span style={{ fontSize:10, color:"rgba(255,255,255,.2)", flexShrink:0 }}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{ padding:"14px 18px", borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(0,0,0,.2)" }}>
          {grant.protocol_desc && <p style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.7, marginBottom:14 }}>{grant.protocol_desc}</p>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:5 }}>SHARING WITH THIS PROTOCOL</div>
              {claims.length > 0 ? claims.map(ct=>(
                <div key={ct} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ fontSize:14 }}>{CLAIM_META[ct]?.icon||"◦"}</span>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.6)" }}>{CLAIM_META[ct]?.label||ct}</span>
                  <span style={{ marginLeft:"auto", fontSize:9, color:"#00e5a0", fontFamily:"'Space Mono',monospace" }}>SHARED</span>
                </div>
              )) : <p style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>No specific claims shared</p>}
            </div>
            <div>
              <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:5 }}>PROTOCOL DETAILS</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.8 }}>
                <div>Grant ID: #{grant.grant_id}</div>
                <div>Resource: {grant.resource_id}</div>
                {grant.protocol_site && <div><a href={grant.protocol_site} target="_blank" rel="noopener" style={{ color:"rgba(127,255,255,.6)" }}>{grant.protocol_site.replace("https://","")}</a></div>}
              </div>
            </div>
          </div>
          {grant.is_valid && (
            <button onClick={()=>onRevoke(grant.grant_id, grant.resource_id)} style={{ fontSize:11, color:"#ff2d55", background:"rgba(255,45,85,.08)", border:"1px solid rgba(255,45,85,.25)", borderRadius:4, padding:"7px 16px", cursor:"pointer", fontFamily:"'Space Mono',monospace", letterSpacing:.5 }}>
              Revoke Access
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Claim Preference Toggle ────────────────────────────────────────────────────
function ClaimToggle({ claimType, enabled, onToggle, loading }) {
  const meta = CLAIM_META[claimType];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", background:"rgba(255,255,255,.025)", border:`1px solid ${enabled?"rgba(255,255,255,.07)":"rgba(255,45,85,.2)"}`, borderRadius:8 }}>
      <span style={{ fontSize:16, flexShrink:0 }}>{meta?.icon||"◦"}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.8)" }}>{meta?.label||claimType}</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>{meta?.desc||""}</div>
      </div>
      {loading ? <Spinner/> : (
        <div onClick={()=>onToggle(claimType, !enabled)} style={{ width:44, height:24, borderRadius:12, background:enabled?"rgba(0,229,160,.25)":"rgba(255,255,255,.08)", border:`1px solid ${enabled?"rgba(0,229,160,.4)":"rgba(255,255,255,.12)"}`, cursor:"pointer", position:"relative", transition:"all .25s", flexShrink:0 }}>
          <div style={{ width:18, height:18, borderRadius:"50%", background:enabled?"#00e5a0":"rgba(255,255,255,.3)", position:"absolute", top:2, left:enabled?22:2, transition:"all .25s", boxShadow:enabled?"0 0 8px rgba(0,229,160,.5)":"none" }}/>
        </div>
      )}
      <Tag color={enabled?"rgba(0,229,160,.1)":"rgba(255,45,85,.1)"} text={enabled?"#00e5a0":"#ff2d55"}>
        {enabled?"SHARING":"DISABLED"}
      </Tag>
    </div>
  );
}

// ── Protocol Registration Form ────────────────────────────────────────────────
function ProtocolForm({ onSubmit, loading }) {
  const [form, setForm] = useState({ resource_id:"", name:"", description:"", logo_url:"", website_url:"", min_score:60, required_claims:"", require_all_claims:true, max_risk_level:"medium" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const RISK_LEVELS = ["low","medium","high","critical"];
  const inputStyle = { width:"100%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", borderRadius:6, padding:"10px 12px", color:"#fff", fontFamily:"'Space Mono',monospace", fontSize:12, outline:"none", boxSizing:"border-box" };
  const labelStyle = { fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)", display:"block", marginBottom:6, fontFamily:"'Space Mono',monospace" };
  return (
    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:24 }}>
      <div style={{ fontSize:9, letterSpacing:2.5, color:"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace", marginBottom:20 }}>REGISTER YOUR PROTOCOL</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div>
          <label style={labelStyle}>RESOURCE ID *</label>
          <input value={form.resource_id} onChange={e=>set("resource_id",e.target.value)} placeholder="dao:governance" style={inputStyle}/>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.2)", marginTop:4 }}>Unique identifier for your resource</div>
        </div>
        <div>
          <label style={labelStyle}>PROTOCOL NAME *</label>
          <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="GenLayer DAO" style={inputStyle}/>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <label style={labelStyle}>DESCRIPTION</label>
          <input value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Short description of your protocol (max 128 chars)" style={inputStyle}/>
        </div>
        <div>
          <label style={labelStyle}>LOGO URL</label>
          <input value={form.logo_url} onChange={e=>set("logo_url",e.target.value)} placeholder="https://your-protocol.com/logo.png" style={inputStyle}/>
        </div>
        <div>
          <label style={labelStyle}>WEBSITE URL</label>
          <input value={form.website_url} onChange={e=>set("website_url",e.target.value)} placeholder="https://your-protocol.com" style={inputStyle}/>
        </div>
        <div>
          <label style={labelStyle}>MINIMUM SCORE (0-100)</label>
          <input type="number" min={0} max={100} value={form.min_score} onChange={e=>set("min_score",parseInt(e.target.value)||0)} style={inputStyle}/>
        </div>
        <div>
          <label style={labelStyle}>MAX RISK LEVEL</label>
          <div style={{ display:"flex", gap:6 }}>
            {RISK_LEVELS.map(r=>(
              <button key={r} onClick={()=>set("max_risk_level",r)} style={{ flex:1, padding:"9px 0", borderRadius:5, border:`1px solid ${form.max_risk_level===r?"rgba(0,229,160,.4)":"rgba(255,255,255,.1)"}`, background:form.max_risk_level===r?"rgba(0,229,160,.1)":"transparent", color:form.max_risk_level===r?"#00e5a0":"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:1, cursor:"pointer" }}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <label style={labelStyle}>REQUIRED CLAIMS</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {Object.entries(CLAIM_META).map(([k,v])=>{
              const selected = form.required_claims.includes(k);
              const toggle = () => {
                const parts = form.required_claims ? form.required_claims.split("|").filter(Boolean) : [];
                const next = selected ? parts.filter(p=>p!==k) : [...parts,k];
                set("required_claims", next.join("|"));
              };
              return (
                <button key={k} onClick={toggle} style={{ padding:"7px 14px", borderRadius:20, border:`1px solid ${selected?"rgba(0,229,160,.4)":"rgba(255,255,255,.1)"}`, background:selected?"rgba(0,229,160,.1)":"transparent", color:selected?"#00e5a0":"rgba(255,255,255,.35)", fontFamily:"'Space Mono',monospace", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                  <span>{v.icon}</span> {v.label}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop:10, display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>set("require_all_claims",true)} style={{ padding:"6px 14px", borderRadius:4, border:`1px solid ${form.require_all_claims?"rgba(0,229,160,.4)":"rgba(255,255,255,.1)"}`, background:form.require_all_claims?"rgba(0,229,160,.1)":"transparent", color:form.require_all_claims?"#00e5a0":"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace", fontSize:9, cursor:"pointer" }}>ALL (AND)</button>
            <button onClick={()=>set("require_all_claims",false)} style={{ padding:"6px 14px", borderRadius:4, border:`1px solid ${!form.require_all_claims?"rgba(0,229,160,.4)":"rgba(255,255,255,.1)"}`, background:!form.require_all_claims?"rgba(0,229,160,.1)":"transparent", color:!form.require_all_claims?"#00e5a0":"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace", fontSize:9, cursor:"pointer" }}>ANY ONE (OR)</button>
            <span style={{ fontSize:10, color:"rgba(255,255,255,.25)" }}>Logic for multiple claims</span>
          </div>
        </div>
      </div>
      <button onClick={()=>onSubmit(form)} disabled={loading||!form.resource_id||!form.name} style={{ marginTop:20, width:"100%", padding:"12px 0", borderRadius:6, border:"none", background:loading||!form.resource_id||!form.name?"rgba(255,255,255,.06)":"rgba(0,229,160,.9)", color:loading||!form.resource_id||!form.name?"rgba(255,255,255,.25)":"#000", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1.5, fontWeight:700, cursor:loading?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        {loading&&<Spinner color="#000"/>}{loading?"DEPLOYING TO BRADBURY…":"REGISTER PROTOCOL"}
      </button>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:300, background:toast.type==="success"?"rgba(0,229,160,.95)":toast.type==="error"?"rgba(255,45,85,.9)":"rgba(20,24,32,.97)", color:["success","error"].includes(toast.type)?"#000":"#fff", padding:"10px 22px", borderRadius:9, fontSize:12, fontFamily:"'Space Mono',monospace", boxShadow:"0 12px 40px rgba(0,0,0,.5)", animation:"slideUp .25s ease", whiteSpace:"nowrap" }}>{toast.msg}</div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function SovereignID() {
  const [tab, setTab] = useState("identity");
  const [wallet, setWallet] = useState(null);
  const [client, setClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [claims, setClaims] = useState([]);
  const [score, setScore] = useState(null);
  const [grants, setGrants] = useState([]);
  const [disabledClaims, setDisabledClaims] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [computing, setComputing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prefLoading, setPrefLoading] = useState(null);
  const [revokeLoading, setRevokeLoading] = useState(null);
  const [error, setError] = useState(null);
  const [sybilError, setSybilError] = useState(null);
  const [claimType, setClaimType] = useState("github_ownership");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const showToast = (msg, type="info") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };
  const handleError = (e, setter=null) => {
    const msg = e?.message||String(e);
    const sybil = parseSybilError(msg);
    if (sybil) { (setter||setSybilError)(sybil); showToast(sybil.title,"error"); }
    else showToast(msg.slice(0,80),"error");
  };

  const connectWallet = async () => {
    try {
      setLoading(true); setError(null);
      const accounts = await window.ethereum.request({ method:"eth_requestAccounts" });
      const addr = accounts[0];
      setWallet(addr);
      const bradbury = { ...testnetBradbury, id:4221, name:"GenLayer Bradbury", nativeCurrency:{ name:"Gen", symbol:"GEN", decimals:18 }, rpcUrls:{ default:{ http:["https://zksync-os-testnet-genlayer.zksync.dev"] }, public:{ http:["https://zksync-os-testnet-genlayer.zksync.dev"] } } };
      const gl = createClient({ chain:bradbury, transport:custom(window.ethereum), account:addr });
      setClient(gl);
      showToast("Wallet connected","success");
      await loadData(gl, addr);
    } catch(e) { setError(e.message); showToast("Connection failed","error"); }
    finally { setLoading(false); }
  };

  const loadData = async (gl, addr) => {
    try {
      setLoading(true);
      let registered = false;
      try { registered = await glRead(gl, C.identityRegistry, "is_registered", [addr]); } catch { registered = false; }
      if (!registered) { setIdentity(null); setClaims([]); setScore(null); setGrants([]); return; }

      try { const r = await glRead(gl, C.identityRegistry, "get_identity", [addr]); setIdentity(safeJson(r)); } catch(e) { console.warn(e); }

      try {
        const rawIds = await glRead(gl, C.claimVerifier, "get_claims_for_address", [addr]);
        const ids = safeJson(rawIds, []);
        if (Array.isArray(ids) && ids.length > 0) {
          const cd = await Promise.all(ids.map(id=>glRead(gl,C.claimVerifier,"get_claim",[id]).then(r=>safeJson(r)).catch(()=>null)));
          setClaims(cd.filter(Boolean));
        } else setClaims([]);
      } catch(e) { console.warn(e); setClaims([]); }

      try { const r = await glRead(gl,C.reputationScorer,"get_score",[addr]); setScore(safeJson(r)); } catch { setScore(null); }

      try { const r = await glRead(gl,C.accessController,"get_user_grants_detailed",[addr]); setGrants(safeJson(r,[])); } catch(e) { console.warn(e); setGrants([]); }

      try { const r = await glRead(gl,C.accessController,"get_user_disabled_claims",[addr]); setDisabledClaims(safeJson(r,[])); } catch(e) { console.warn(e); setDisabledClaims([]); }

    } catch(e) { setError("Failed to load: "+e.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    try { setLoading(true); await glWrite(client,C.identityRegistry,"register_identity",["QmW2WQi7j6c7UaJkARcFfBUPmJqPuoE3iDdSf8VXQP4EHe","greyw0rks"]); showToast("Identity registered ✓","success"); await loadData(client,wallet); } catch(e) { handleError(e); } finally { setLoading(false); }
  };

  const handleSubmitClaim = async () => {
    if (!evidenceUrl) return;
    setModalLoading(true); setSybilError(null);
    try { await glWrite(client,C.claimVerifier,"submit_claim",[claimType,evidenceUrl]); setShowModal(false); showToast("Claim submitted — validators reaching consensus…","success"); setTimeout(()=>loadData(client,wallet),20000); }
    catch(e) { handleError(e); } finally { setModalLoading(false); }
  };

  const handleRevokeClaim = async (claimId) => {
    try { setLoading(true); await glWrite(client,C.claimVerifier,"revoke_claim",[claimId]); showToast("Claim revoked"); await loadData(client,wallet); } catch(e) { handleError(e); } finally { setLoading(false); }
  };

  const handleComputeScore = async () => {
    setComputing(true);
    try {
      const verified = claims.filter(c=>c.is_verified);
      const types = [...new Set(verified.map(c=>c.claim_type))];
      const avgConf = verified.length?Math.round(verified.reduce((a,c)=>a+c.confidence,0)/verified.length):0;
      const summary = JSON.stringify({ total_claims:claims.length, verified_claims:verified.length, claim_types:types, avg_confidence:avgConf, has_contradictions:false });
      await glWrite(client,C.reputationScorer,"compute_score",[wallet,summary]);
      showToast("Score submitted — AI computing…","success");
      setTimeout(()=>loadData(client,wallet),20000);
    } catch(e) { handleError(e); } finally { setComputing(false); }
  };

  const handleRevokeAccess = async (grantId, resourceId) => {
    setRevokeLoading(grantId);
    try {
      await glWrite(client,C.accessController,"revoke_all_access_for_resource",[resourceId]);
      showToast("Access revoked","success");
      await loadData(client,wallet);
    } catch(e) { handleError(e); } finally { setRevokeLoading(null); }
  };

  const handleClaimToggle = async (ct, enabled) => {
    setPrefLoading(ct);
    try {
      await glWrite(client,C.accessController,"set_claim_preference",[ct,enabled]);
      showToast(`${CLAIM_META[ct]?.label||ct} ${enabled?"enabled":"disabled"}`,enabled?"success":"info");
      await loadData(client,wallet);
    } catch(e) { handleError(e); } finally { setPrefLoading(null); }
  };



  const verifiedClaims = claims.filter(c=>c.is_verified);
  const avgConf = verifiedClaims.length?Math.round(verifiedClaims.reduce((a,c)=>a+c.confidence,0)/verifiedClaims.length):0;
  const activeGrants = grants.filter(g=>g.is_valid);

  // ── Connect Screen ─────────────────────────────────────────────────────────
  if (!wallet) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} body{background:#080a0d}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateX(-50%) translateY(12px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
      `}</style>
      <div style={{ minHeight:"100vh", background:"#080a0d", display:"flex", fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(127,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(127,255,255,.018) 1px,transparent 1px)", backgroundSize:"44px 44px", pointerEvents:"none" }}/>
        <div style={{ position:"fixed", top:-160, right:-80, width:700, height:700, background:"radial-gradient(circle,rgba(0,229,160,.055) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ width:"44%", background:"#0d0f13", borderRight:"1px solid rgba(255,255,255,.05)", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:52, minHeight:"100vh", position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="12,2 21,7.5 21,16.5 12,22 3,16.5 3,7.5" stroke="rgba(0,229,160,.75)" strokeWidth="1.5" fill="rgba(0,229,160,.04)"/><circle cx="12" cy="12" r="2.5" fill="rgba(0,229,160,.8)"/></svg>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:2.5, color:"rgba(255,255,255,.4)" }}>SOVEREIGNID</span>
          </div>
          <div style={{ animation:"fadeUp .6s ease" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:48, lineHeight:.95, color:"#fff", letterSpacing:1, marginBottom:20, fontWeight:700 }}>OWN YOUR<br/><span style={{ color:"#00e5a0" }}>IDENTITY</span></div>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.35)", lineHeight:1.9, marginBottom:36, maxWidth:300, fontWeight:300 }}>Decentralized identity with Sybil resistance. AI consensus verifies claims. Full control over who sees your proofs.</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              {[["AI Verified","LLM consensus on claims"],["Sybil Proof","One identity per person"],["Your Control","Revoke access anytime"],["Bradbury","GenLayer Testnet"]].map(([t,d])=>(
                <div key={t}><div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.6)", fontFamily:"'Space Mono',monospace" }}>{t}</div><div style={{ fontSize:11, color:"rgba(255,255,255,.25)", marginTop:3, lineHeight:1.6 }}>{d}</div></div>
              ))}
            </div>
          </div>
          <div style={{ height:1, background:"rgba(255,255,255,.07)" }}/>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:52, position:"relative", zIndex:1 }}>
          <div style={{ width:"100%", maxWidth:360, animation:"fadeUp .6s .1s ease both" }}>
            <div style={{ fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>Connect wallet</div>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.35)", lineHeight:1.7, marginBottom:32 }}>Connect MetaMask to access your sovereign identity on GenLayer Bradbury Testnet.</p>
            {error && <div style={{ background:"rgba(255,45,85,.1)", border:"1px solid rgba(255,45,85,.25)", borderRadius:6, padding:"11px 14px", marginBottom:16, fontSize:12, color:"#ff6b8a", fontFamily:"'Space Mono',monospace" }}>{error}</div>}
            {!window.ethereum
              ? <div style={{ border:"1px solid rgba(255,255,255,.08)", borderRadius:6, padding:18, fontSize:13, color:"rgba(255,255,255,.35)", lineHeight:1.7 }}>MetaMask not detected. Install the extension and refresh.</div>
              : <button onClick={connectWallet} disabled={loading} style={{ width:"100%", padding:"13px 0", borderRadius:6, border:"none", background:loading?"rgba(255,255,255,.06)":"rgba(0,229,160,.9)", color:loading?"rgba(255,255,255,.25)":"#000", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:2, fontWeight:700, cursor:loading?"wait":"pointer", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {loading&&<Spinner/>}{loading?"CONNECTING…":"CONNECT METAMASK"}
                </button>
            }
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#00e5a0", boxShadow:"0 0 8px #00e5a0" }}/>
              <span style={{ fontSize:10, color:"rgba(255,255,255,.25)", fontFamily:"'Space Mono',monospace" }}>BRADBURY · CHAIN 4221 · GEN</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} body{background:#080a0d}
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateX(-50%) translateY(12px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes validating{0%,100%{transform:translateX(-100%)}50%{transform:translateX(0)}}
      `}</style>
      <div style={{ minHeight:"100vh", background:"#080a0d", color:"#fff", fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", backgroundImage:"linear-gradient(rgba(127,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(127,255,255,.018) 1px,transparent 1px)", backgroundSize:"44px 44px" }}/>
        <div style={{ position:"fixed", top:-160, right:-80, width:700, height:700, background:"radial-gradient(circle,rgba(0,229,160,.055) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>

        {/* Nav */}
        <header style={{ position:"sticky", top:0, zIndex:50, borderBottom:"1px solid rgba(255,255,255,.055)", background:"rgba(8,10,13,.88)", backdropFilter:"blur(24px)" }}>
          <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:54 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="12,2 21,7.5 21,16.5 12,22 3,16.5 3,7.5" stroke="rgba(0,229,160,.75)" strokeWidth="1.5" fill="rgba(0,229,160,.04)"/><circle cx="12" cy="12" r="2.5" fill="rgba(0,229,160,.8)"/></svg>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:2.5, color:"rgba(255,255,255,.85)" }}>SOVEREIGN<span style={{ color:"#00e5a0" }}>ID</span></span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {loading&&<Spinner/>}
              {activeGrants.length>0&&<Tag color="rgba(0,229,160,.08)" text="rgba(0,229,160,.7)">{activeGrants.length} ACTIVE GRANTS</Tag>}
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", border:"1px solid rgba(255,255,255,.08)", borderRadius:4 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:"#00e5a0", boxShadow:"0 0 6px #00e5a0" }}/>
                <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.4)" }}>{short(wallet)}</span>
              </div>
              <Tag color="rgba(127,255,255,.05)" text="rgba(127,255,255,.55)">BRADBURY</Tag>
            </div>
          </div>
        </header>

        <div style={{ maxWidth:1060, margin:"0 auto", padding:"28px 24px 80px", display:"grid", gridTemplateColumns:"210px 1fr", gap:24, position:"relative", zIndex:1 }}>
          {/* Sidebar */}
          <div>
            <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, overflow:"hidden", position:"sticky", top:74 }}>
              {TABS.map((t,i)=>(
                <button key={t} onClick={()=>setTab(t)} style={{ width:"100%", padding:"13px 18px", border:"none", borderBottom:i<TABS.length-1?"1px solid rgba(255,255,255,.05)":"none", borderLeft:`2px solid ${tab===t?"#00e5a0":"transparent"}`, background:tab===t?"rgba(0,229,160,.06)":"transparent", cursor:"pointer", textAlign:"left", fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:1.5, textTransform:"uppercase", color:tab===t?"#00e5a0":"rgba(255,255,255,.3)", transition:"all .15s" }}>
                  {t === "access" ? `access ${activeGrants.length>0?`(${activeGrants.length})`:""}` : t}
                </button>
              ))}
              <div style={{ padding:"14px 18px", borderTop:"1px solid rgba(255,255,255,.05)", background:"rgba(255,255,255,.015)" }}>
                <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:5 }}>SYBIL PROTECTION</div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:"#00e5a0", boxShadow:"0 0 5px #00e5a0" }}/>
                  <span style={{ fontSize:10, color:"#00e5a0", fontFamily:"'Space Mono',monospace" }}>ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ animation:"fadeUp .3s ease", minWidth:0 }}>
            {sybilError&&<SybilBanner error={sybilError} onDismiss={()=>setSybilError(null)}/>}

            {/* ── IDENTITY ── */}
            {tab==="identity" && (
              <div>
                <div style={{ marginBottom:24 }}><h1 style={{ fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Space Mono',monospace" }}>Identity</h1><p style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginTop:4 }}>Your sovereign on-chain identity</p></div>
                {!identity ? (
                  <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:"48px 32px", textAlign:"center" }}>
                    <p style={{ fontSize:13, color:"rgba(255,255,255,.3)", marginBottom:20 }}>No identity registered yet.</p>
                    <button onClick={handleRegister} disabled={loading} style={{ padding:"11px 28px", borderRadius:6, border:"none", background:loading?"rgba(255,255,255,.05)":"rgba(0,229,160,.9)", color:loading?"rgba(255,255,255,.2)":"#000", fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:2, fontWeight:700, cursor:loading?"wait":"pointer", display:"inline-flex", alignItems:"center", gap:8 }}>
                      {loading&&<Spinner/>}{loading?"REGISTERING…":"REGISTER IDENTITY"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:24, marginBottom:14 }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
                        <div>
                          <div style={{ fontSize:9, letterSpacing:2.5, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>SOVEREIGN IDENTITY</div>
                          <div style={{ fontSize:24, fontWeight:700, color:"#fff", fontFamily:"'Space Mono',monospace" }}>{identity.display_name||"Anonymous"}</div>
                          <div style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.3)", marginTop:6 }}>{short(identity.owner||wallet,10)}</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                          <Tag color={identity.is_active?"rgba(0,229,160,.12)":"rgba(255,255,255,.07)"} text={identity.is_active?"#00e5a0":"rgba(255,255,255,.3)"}>{identity.is_active?"● ACTIVE":"○ INACTIVE"}</Tag>
                          <Tag color="rgba(0,229,160,.06)" text="rgba(0,229,160,.6)">🔒 SYBIL PROOF</Tag>
                        </div>
                      </div>
                      <div style={{ padding:"12px 14px", background:"rgba(0,0,0,.3)", borderRadius:6, border:"1px solid rgba(255,255,255,.05)" }}>
                        <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:5 }}>IPFS METADATA HASH</div>
                        <div style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(127,255,255,.6)", wordBreak:"break-all", lineHeight:1.7 }}>{identity.metadata_hash}</div>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                      {[
                        { label:"TRUST SCORE",    val:score?score.score:"—",     sub:score?"/100":"",        color:score?scoreColor(score.score):"rgba(255,255,255,.2)" },
                        { label:"VERIFIED",       val:verifiedClaims.length,     sub:`/${claims.length}`,    color:"#00e5a0" },
                        { label:"ACTIVE GRANTS",  val:activeGrants.length,       sub:"protocols",            color:"rgba(127,255,255,.8)" },
                        { label:"AVG CONFIDENCE", val:avgConf?avgConf+"%":"—",   sub:"",                     color:avgConf>=70?"#00e5a0":"rgba(255,255,255,.2)" },
                      ].map(s=>(
                        <div key={s.label} style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"16px 18px" }}>
                          <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:10 }}>{s.label}</div>
                          <div style={{ fontSize:26, fontFamily:"'Space Mono',monospace", fontWeight:700, color:s.color }}>{s.val}<span style={{ fontSize:12, opacity:.4 }}>{s.sub}</span></div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── CLAIMS ── */}
            {tab==="claims" && (
              <div>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22 }}>
                  <div><h1 style={{ fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Space Mono',monospace" }}>Claims</h1><p style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginTop:4 }}>AI-verified identity assertions</p></div>
                  <button onClick={()=>setShowModal(true)} style={{ padding:"8px 18px", borderRadius:6, border:"none", background:"rgba(0,229,160,.9)", color:"#000", fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:1.5, fontWeight:700, cursor:"pointer" }}>+ ADD CLAIM</button>
                </div>
                {claims.length===0
                  ? <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"48px 32px", textAlign:"center" }}><p style={{ fontSize:13, color:"rgba(255,255,255,.3)" }}>No claims yet. Add your first identity claim above.</p></div>
                  : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{claims.map(c=><ClaimCard key={c.claim_id} claim={c} onRevoke={handleRevokeClaim}/>)}</div>
                }
                <div style={{ marginTop:18, padding:16, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:8 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>SYBIL RESISTANCE</div>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,.35)", lineHeight:1.8 }}>Every verified claim stores an on-chain nullifier. The same evidence cannot verify any other wallet. For age and KYC claims, AI validators also extract a biometric fingerprint to prevent multiple identities per person.</p>
                </div>
              </div>
            )}

            {/* ── REPUTATION ── */}
            {tab==="reputation" && (
              <div>
                <div style={{ marginBottom:22 }}><h1 style={{ fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Space Mono',monospace" }}>Reputation</h1><p style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginTop:4 }}>AI-computed trust score</p></div>
                {!score ? (
                  <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"48px 32px", textAlign:"center" }}>
                    <p style={{ fontSize:13, color:"rgba(255,255,255,.3)", marginBottom:20 }}>{claims.length===0?"Add claims before computing your score.":"Compute your AI reputation score."}</p>
                    <button onClick={handleComputeScore} disabled={computing||claims.length===0} style={{ padding:"10px 24px", borderRadius:6, border:"1px solid rgba(127,255,255,.2)", background:"rgba(127,255,255,.06)", color:computing||claims.length===0?"rgba(255,255,255,.2)":"rgba(127,255,255,.8)", fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:1.5, cursor:computing?"wait":"pointer", display:"inline-flex", alignItems:"center", gap:8 }}>
                      {computing&&<Spinner/>}{computing?"COMPUTING…":"COMPUTE SCORE"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:16, alignItems:"start" }}>
                    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:20, textAlign:"center" }}>
                      <ScoreRing score={score.score} size={128}/>
                      <div style={{ marginTop:8, fontSize:9, letterSpacing:2, fontFamily:"'Space Mono',monospace", color:{low:"#00e5a0",medium:"#f5c518",high:"#ff8c42",critical:"#ff2d55"}[score.risk_level]||"rgba(255,255,255,.4)" }}>{score.risk_level?.toUpperCase()} RISK</div>
                      <button onClick={handleComputeScore} disabled={computing} style={{ marginTop:12, width:"100%", padding:"7px 0", border:"1px solid rgba(255,255,255,.08)", borderRadius:4, background:"transparent", color:computing?"rgba(255,255,255,.2)":"rgba(255,255,255,.4)", fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:1.5, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                        {computing&&<Spinner/>}{computing?"…":"RECOMPUTE"}
                      </button>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:18 }}>
                        <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:10 }}>AI RATIONALE</div>
                        <p style={{ fontSize:13, color:"rgba(255,255,255,.55)", lineHeight:1.8 }}>{score.rationale}</p>
                      </div>
                      {score.fraud_flags&&<div style={{ background:"rgba(255,140,66,.05)", border:"1px solid rgba(255,140,66,.2)", borderRadius:8, padding:16 }}><div style={{ fontSize:9, letterSpacing:2, color:"#ff8c42", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>FRAUD FLAGS</div><div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{score.fraud_flags.split("|").map(f=><span key={f} style={{ fontSize:10, padding:"2px 8px", background:"rgba(255,140,66,.1)", color:"#ff8c42", border:"1px solid rgba(255,140,66,.2)", borderRadius:3, fontFamily:"'Space Mono',monospace" }}>{f}</span>)}</div></div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ACCESS MANAGER ── */}
            {tab==="access" && (
              <div>
                <div style={{ marginBottom:24 }}>
                  <h1 style={{ fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Space Mono',monospace" }}>Access Manager</h1>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginTop:4 }}>Control which protocols can access your identity and what they can see</p>
                </div>

                {/* Connected Protocols */}
                <div style={{ marginBottom:28 }}>
                  <div style={{ fontSize:9, letterSpacing:2.5, color:"rgba(255,255,255,.25)", fontFamily:"'Space Mono',monospace", marginBottom:14 }}>CONNECTED PROTOCOLS</div>
                  {grants.length===0 ? (
                    <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:8, padding:24, textAlign:"center" }}>
                      <p style={{ fontSize:13, color:"rgba(255,255,255,.3)" }}>No protocols have accessed your identity yet.</p>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {grants.map(g=>(
                        <div key={g.grant_id} style={{ position:"relative" }}>
                          {revokeLoading===g.grant_id&&<div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 }}><Spinner/></div>}
                          <ProtocolRow grant={g} onRevoke={handleRevokeAccess}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Claim Preferences */}
                <div>
                  <div style={{ fontSize:9, letterSpacing:2.5, color:"rgba(255,255,255,.25)", fontFamily:"'Space Mono',monospace", marginBottom:6 }}>PROOF SHARING PREFERENCES</div>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,.3)", marginBottom:14, lineHeight:1.7 }}>
                    Disable a claim type to prevent any protocol from accessing it — even if they request it. Your verified claims remain on-chain; you simply choose not to share them.
                  </p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {Object.keys(CLAIM_META).map(ct=>(
                      <ClaimToggle
                        key={ct}
                        claimType={ct}
                        enabled={!disabledClaims.includes(ct)}
                        onToggle={handleClaimToggle}
                        loading={prefLoading===ct}
                      />
                    ))}
                  </div>
                  <div style={{ marginTop:16, padding:14, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:8 }}>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,.25)", fontFamily:"'Space Mono',monospace", lineHeight:1.7 }}>
                      Preference changes take effect immediately on-chain. Any protocol attempting to use a disabled claim type will be denied, and you'll see a USER_PREFERENCE_DENIED error in their access log.
                    </p>
                  </div>
                </div>
              </div>
            )}


      <Toast toast={toast}/>

      {/* Claim modal */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,.8)", backdropFilter:"blur(16px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ width:"min(460px,100%)", background:"#0d0f13", border:"1px solid rgba(127,255,255,.2)", borderRadius:14, padding:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <span style={{ fontSize:10, letterSpacing:3, color:"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace" }}>SUBMIT IDENTITY CLAIM</span>
              <button onClick={()=>{setShowModal(false);setSybilError(null);}} style={{ background:"none", border:"none", color:"rgba(255,255,255,.3)", cursor:"pointer", fontSize:18 }}>×</button>
            </div>
            {sybilError&&<SybilBanner error={sybilError} onDismiss={()=>setSybilError(null)}/>}
            <p style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginBottom:16, lineHeight:1.75 }}>AI validators fetch your evidence and reach consensus via Optimistic Democracy. Evidence is permanently linked via nullifier.</p>
            <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:6, padding:"10px 14px", marginBottom:18, display:"flex", gap:8 }}>
              <span>🔒</span><p style={{ fontSize:11, color:"rgba(255,255,255,.25)", fontFamily:"'Space Mono',monospace", lineHeight:1.6 }}>Sybil protection active — one identity per person enforced on-chain.</p>
            </div>
            <label style={{ fontSize:10, letterSpacing:2, color:"rgba(255,255,255,.3)", display:"block", marginBottom:7, fontFamily:"'Space Mono',monospace" }}>CLAIM TYPE</label>
            <select value={claimType} onChange={e=>setClaimType(e.target.value)} style={{ width:"100%", background:"#0a0c10", border:"1px solid rgba(255,255,255,.1)", borderRadius:7, padding:"10px 12px", color:"#fff", fontFamily:"'Space Mono',monospace", fontSize:12, marginBottom:18, outline:"none" }}>
              {Object.entries(CLAIM_META).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <label style={{ fontSize:10, letterSpacing:2, color:"rgba(255,255,255,.3)", display:"block", marginBottom:7, fontFamily:"'Space Mono',monospace" }}>EVIDENCE URL</label>
            <input value={evidenceUrl} onChange={e=>setEvidenceUrl(e.target.value)} placeholder={{ github_ownership:"https://github.com/greyw0rks", age_over_18:"https://verify.example.com/age", kyc_lite:"https://kyc.example.com", professional_license:"https://licensing.gov/lookup", domain_ownership:"https://yourdomain.com" }[claimType]}
              style={{ width:"100%", background:"#0a0c10", border:"1px solid rgba(255,255,255,.1)", borderRadius:7, padding:"10px 12px", color:"#fff", fontFamily:"'Space Mono',monospace", fontSize:12, marginBottom:20, outline:"none", boxSizing:"border-box" }}/>
            <button onClick={handleSubmitClaim} disabled={modalLoading||!evidenceUrl} style={{ width:"100%", padding:"11px 0", borderRadius:7, border:"none", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1.5, fontWeight:700, cursor:modalLoading||!evidenceUrl?"not-allowed":"pointer", background:modalLoading||!evidenceUrl?"rgba(255,255,255,.06)":"rgba(0,229,160,.9)", color:modalLoading||!evidenceUrl?"rgba(255,255,255,.25)":"#000", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {modalLoading&&<Spinner color="#000"/>}{modalLoading?"VALIDATORS REACHING CONSENSUS…":"SUBMIT TO AI VALIDATORS"}
            </button>
            {modalLoading&&<div style={{ display:"flex", gap:4, marginTop:12 }}>{[0,1,2,3,4].map(i=><div key={i} style={{ flex:1, height:2, background:"rgba(0,229,160,.15)", overflow:"hidden", borderRadius:1 }}><div style={{ height:"100%", background:"#00e5a0", animation:`validating 1.5s ${i*.2}s infinite` }}/></div>)}</div>}
            <p style={{ marginTop:12, fontSize:10, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", textAlign:"center" }}>5 validators · Optimistic Democracy · ~10–40s</p>
          </div>
        </div>
      )}
    </>
  );
}
