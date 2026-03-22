import { useState } from "react";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { custom } from "viem";

const C = {
  accessController: import.meta.env.VITE_ACCESS_CONTROLLER,
};

const CLAIM_META = {
  github_ownership:     { label:"GitHub Ownership",   icon:"⬡", desc:"User owns a GitHub account" },
  age_over_18:          { label:"Age Verified (18+)", icon:"◈", desc:"User is 18 or older" },
  professional_license: { label:"Pro License",        icon:"◉", desc:"User holds professional certification" },
  domain_ownership:     { label:"Domain Ownership",   icon:"◎", desc:"User owns a domain" },
  kyc_lite:             { label:"KYC Lite",            icon:"◐", desc:"User passed light identity check" },
};

const RISK_LEVELS = ["low","medium","high","critical"];
const RISK_DESC = { low:"Only low-risk identities", medium:"Low and medium risk", high:"Up to high risk", critical:"All risk levels" };

async function glWrite(client, contract, method, args = []) {
  const result = await client.sendTransaction({ contract, method, args });
  await new Promise(r => setTimeout(r, 12000));
  return result;
}

function Spinner() {
  return <div style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.1)", borderTopColor:"#00e5a0", borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }}/>;
}

function Step({ n, active, done }) {
  return (
    <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      background: done ? "#00e5a0" : active ? "rgba(0,229,160,.15)" : "rgba(255,255,255,.05)",
      border: `1px solid ${done ? "#00e5a0" : active ? "rgba(0,229,160,.5)" : "rgba(255,255,255,.1)"}`,
      fontSize:11, fontFamily:"'Space Mono',monospace", fontWeight:700,
      color: done ? "#000" : active ? "#00e5a0" : "rgba(255,255,255,.3)",
    }}>
      {done ? "✓" : n}
    </div>
  );
}

export default function ProtocolPortal() {
  const [wallet, setWallet] = useState(null);
  const [client, setClient] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [step, setStep] = useState(1); // 1=policy, 2=metadata, 3=review, 4=done
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    resource_id: "",
    name: "",
    description: "",
    logo_url: "",
    website_url: "",
    min_score: 60,
    required_claims: [],
    require_all_claims: true,
    max_risk_level: "medium",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleClaim = (ct) => {
    set("required_claims", form.required_claims.includes(ct)
      ? form.required_claims.filter(c => c !== ct)
      : [...form.required_claims, ct]
    );
  };

  const connectWallet = async () => {
    setConnecting(true); setError(null);
    try {
      const accounts = await window.ethereum.request({ method:"eth_requestAccounts" });
      const addr = accounts[0];
      setWallet(addr);
      const bradbury = { ...testnetBradbury, id:4221, name:"GenLayer Bradbury", nativeCurrency:{ name:"Gen", symbol:"GEN", decimals:18 }, rpcUrls:{ default:{ http:["https://zksync-os-testnet-genlayer.zksync.dev"] }, public:{ http:["https://zksync-os-testnet-genlayer.zksync.dev"] } } };
      setClient(createClient({ chain:bradbury, transport:custom(window.ethereum), account:addr }));
    } catch(e) { setError(e.message); }
    finally { setConnecting(false); }
  };

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    try {
      const hash = await glWrite(client, C.accessController, "register_resource", [
        form.resource_id,
        form.min_score,
        form.required_claims.join("|"),
        form.require_all_claims,
        form.max_risk_level,
        form.name,
        form.description,
        form.logo_url,
        form.website_url,
      ]);
      setTxHash(hash);
      setStep(4);
    } catch(e) { setError(e.message || String(e)); }
    finally { setSubmitting(false); }
  };

  const inputStyle = {
    width:"100%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
    borderRadius:6, padding:"11px 14px", color:"#fff", fontFamily:"'Space Mono',monospace",
    fontSize:12, outline:"none", boxSizing:"border-box", transition:"border-color .2s",
  };
  const labelStyle = {
    fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.35)",
    display:"block", marginBottom:7, fontFamily:"'Space Mono',monospace",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} body{background:#080a0d}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateX(-50%) translateY(12px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        input:focus,select:focus{border-color:rgba(0,229,160,.4) !important}
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
        select option{background:#0d0f13;color:#fff}
      `}</style>

      <div style={{ minHeight:"100vh", background:"#080a0d", color:"#fff", fontFamily:"'DM Sans',sans-serif" }}>

        {/* Grid bg */}
        <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", backgroundImage:"linear-gradient(rgba(127,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(127,255,255,.015) 1px,transparent 1px)", backgroundSize:"52px 52px" }}/>
        <div style={{ position:"fixed", top:-200, left:-100, width:600, height:600, background:"radial-gradient(circle,rgba(0,229,160,.04) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>

        {/* Header */}
        <header style={{ position:"sticky", top:0, zIndex:50, borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(8,10,13,.9)", backdropFilter:"blur(24px)" }}>
          <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 32px", display:"flex", alignItems:"center", justifyContent:"space-between", height:58 }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <polygon points="12,2 21,7.5 21,16.5 12,22 3,16.5 3,7.5" stroke="rgba(0,229,160,.75)" strokeWidth="1.5" fill="rgba(0,229,160,.04)"/>
                  <circle cx="12" cy="12" r="2.5" fill="rgba(0,229,160,.8)"/>
                </svg>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:2, color:"rgba(255,255,255,.6)" }}>SOVEREIGN<span style={{ color:"#00e5a0" }}>ID</span></span>
              </div>
              <div style={{ width:1, height:18, background:"rgba(255,255,255,.1)" }}/>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:2, color:"rgba(255,255,255,.35)" }}>PROTOCOL PORTAL</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <a href="#docs" style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.35)", textDecoration:"none", letterSpacing:1 }}>DOCS</a>
              <a href="#sdk" style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.35)", textDecoration:"none", letterSpacing:1 }}>SDK</a>
              {wallet ? (
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", border:"1px solid rgba(255,255,255,.08)", borderRadius:4 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:"#00e5a0", boxShadow:"0 0 6px #00e5a0" }}/>
                  <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.5)" }}>{wallet.slice(0,8)}…{wallet.slice(-6)}</span>
                </div>
              ) : (
                <button onClick={connectWallet} disabled={connecting} style={{ padding:"7px 16px", borderRadius:4, border:"1px solid rgba(0,229,160,.3)", background:"rgba(0,229,160,.06)", color:"rgba(0,229,160,.9)", fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:1.5, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
                  {connecting&&<Spinner/>}{connecting?"CONNECTING…":"CONNECT WALLET"}
                </button>
              )}
            </div>
          </div>
        </header>

        <div style={{ maxWidth:1100, margin:"0 auto", padding:"52px 32px 100px", position:"relative", zIndex:1 }}>

          {/* Hero */}
          <div style={{ marginBottom:56, animation:"fadeUp .6s ease" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"4px 14px", border:"1px solid rgba(0,229,160,.2)", borderRadius:20, marginBottom:20, background:"rgba(0,229,160,.04)" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#00e5a0" }}/>
              <span style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:"rgba(0,229,160,.8)", letterSpacing:1.5 }}>BRADBURY TESTNET</span>
            </div>
            <h1 style={{ fontFamily:"'Space Mono',monospace", fontSize:40, fontWeight:700, color:"#fff", letterSpacing:1, lineHeight:1.1, marginBottom:16 }}>
              Integrate identity<br/><span style={{ color:"#00e5a0" }}>into your protocol</span>
            </h1>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", lineHeight:1.9, maxWidth:560, fontWeight:300 }}>
              Register your protocol on SovereignID to gate access with AI-verified identity claims. One boolean. Zero PII. Full Sybil resistance.
            </p>
          </div>

          {/* How it works */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:56 }}>
            {[
              { n:"01", title:"Define Your Policy", body:"Set minimum trust score, required claim types, and maximum risk level. Choose AND/OR logic for multiple claims.", color:"rgba(0,229,160,.8)" },
              { n:"02", title:"Users Verify Once", body:"Users complete verification through SovereignID's OAuth flow. They control exactly what you can see.", color:"rgba(127,255,255,.8)" },
              { n:"03", title:"Gate With One Call", body:"Call has_valid_access(addr, resource_id) in your contract or backend. Returns a boolean. Nothing else leaks.", color:"rgba(245,197,24,.8)" },
            ].map(s=>(
              <div key={s.n} style={{ padding:24, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10 }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:28, fontWeight:700, color:s.color, marginBottom:14, opacity:.4 }}>{s.n}</div>
                <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,.8)", marginBottom:8 }}>{s.title}</div>
                <p style={{ fontSize:13, color:"rgba(255,255,255,.35)", lineHeight:1.8 }}>{s.body}</p>
              </div>
            ))}
          </div>

          {/* Code examples */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:56 }}>
            <div style={{ padding:24, background:"rgba(0,0,0,.4)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10 }}>
              <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:14 }}>SOLIDITY CONTRACT</div>
              <pre style={{ fontSize:11, color:"rgba(127,255,255,.7)", fontFamily:"'Space Mono',monospace", lineHeight:1.9, overflow:"auto" }}>{`interface ISovereignID {
  function has_valid_access(
    address user,
    string memory resource_id
  ) external view returns (bool);
}

contract MyDAO {
  ISovereignID sid = ISovereignID(
    0xEb884097...
  );

  function castVote(uint id) external {
    require(
      sid.has_valid_access(
        msg.sender,
        "dao:governance"
      ),
      "SovereignID required"
    );
    // ... voting logic
  }
}`}</pre>
            </div>
            <div style={{ padding:24, background:"rgba(0,0,0,.4)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10 }}>
              <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:14 }}>JAVASCRIPT / NODE.JS</div>
              <pre style={{ fontSize:11, color:"rgba(127,255,255,.7)", fontFamily:"'Space Mono',monospace", lineHeight:1.9, overflow:"auto" }}>{`import { SovereignID } from "@sovereignid/sdk";

const sid = new SovereignID({
  network: "bradbury",
  accessController: "0xEb884097..."
});

// Gate API endpoint
app.post("/premium", async (req, res) => {
  const { wallet } = req.body;

  const allowed = await sid.hasAccess(
    wallet,
    "app:premium-api"
  );

  if (!allowed) return res.status(403)
    .json({ error: "Identity required" });

  // ... handle request
});`}</pre>
            </div>
          </div>

          {/* Registration form */}
          <div id="register" style={{ scrollMarginTop:80 }}>
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:"#fff", marginBottom:6 }}>Register Your Protocol</h2>
              <p style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>Deploy your access policy to GenLayer Bradbury Testnet.</p>
            </div>

            {/* Step indicator */}
            {step < 4 && (
              <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:36 }}>
                {[["1","Access Policy"],["2","Protocol Info"],["3","Review & Deploy"]].map(([n,label],i)=>(
                  <div key={n} style={{ display:"flex", alignItems:"center", flex: i<2?1:0 }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                      <Step n={n} active={step===i+1} done={step>i+1}/>
                      <span style={{ fontSize:9, letterSpacing:1.5, fontFamily:"'Space Mono',monospace", color:step>=i+1?"rgba(255,255,255,.5)":"rgba(255,255,255,.2)", whiteSpace:"nowrap" }}>{label.toUpperCase()}</span>
                    </div>
                    {i<2&&<div style={{ flex:1, height:1, background:step>i+1?"#00e5a0":"rgba(255,255,255,.1)", margin:"0 12px", marginBottom:22, transition:"background .4s" }}/>}
                  </div>
                ))}
              </div>
            )}

            {/* Connect wall */}
            {!wallet && step < 4 && (
              <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:32, textAlign:"center", marginBottom:24 }}>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:16 }}>Connect your wallet to deploy a protocol registration</div>
                {error&&<div style={{ fontSize:12, color:"#ff6b8a", marginBottom:12, fontFamily:"'Space Mono',monospace" }}>{error}</div>}
                {!window.ethereum
                  ? <p style={{ fontSize:13, color:"rgba(255,255,255,.3)" }}>MetaMask not detected. Install it and refresh.</p>
                  : <button onClick={connectWallet} disabled={connecting} style={{ padding:"11px 28px", borderRadius:6, border:"none", background:"rgba(0,229,160,.9)", color:"#000", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:2, fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:8 }}>
                      {connecting&&<Spinner/>}{connecting?"CONNECTING…":"CONNECT METAMASK"}
                    </button>
                }
              </div>
            )}

            {wallet && step < 4 && (
              <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:32, animation:"fadeUp .3s ease" }}>

                {/* ── STEP 1: Access Policy ── */}
                {step===1 && (
                  <div>
                    <div style={{ marginBottom:24 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:4 }}>Access Policy</div>
                      <p style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>Define what users need to qualify for your resource.</p>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:22 }}>
                      <div>
                        <label style={labelStyle}>RESOURCE ID *</label>
                        <input value={form.resource_id} onChange={e=>set("resource_id",e.target.value)} placeholder="dao:governance" style={inputStyle}/>
                        <p style={{ fontSize:10, color:"rgba(255,255,255,.2)", marginTop:5 }}>Unique identifier. Use format category:name</p>
                      </div>
                      <div>
                        <label style={labelStyle}>MINIMUM TRUST SCORE (0–100)</label>
                        <div style={{ position:"relative" }}>
                          <input type="range" min={0} max={100} value={form.min_score} onChange={e=>set("min_score",parseInt(e.target.value))} style={{ width:"100%", accentColor:"#00e5a0", cursor:"pointer", marginBottom:6 }}/>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace" }}>0</span>
                            <span style={{ fontSize:16, fontFamily:"'Space Mono',monospace", fontWeight:700, color:"#00e5a0" }}>{form.min_score}</span>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace" }}>100</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom:22 }}>
                      <label style={labelStyle}>MAXIMUM RISK LEVEL</label>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                        {RISK_LEVELS.map(r=>(
                          <button key={r} onClick={()=>set("max_risk_level",r)} style={{ padding:"10px 0", borderRadius:6, border:`1px solid ${form.max_risk_level===r?"rgba(0,229,160,.4)":"rgba(255,255,255,.08)"}`, background:form.max_risk_level===r?"rgba(0,229,160,.08)":"transparent", cursor:"pointer", textAlign:"center" }}>
                            <div style={{ fontSize:11, fontFamily:"'Space Mono',monospace", fontWeight:700, color:form.max_risk_level===r?"#00e5a0":"rgba(255,255,255,.4)", letterSpacing:1 }}>{r.toUpperCase()}</div>
                            <div style={{ fontSize:10, color:"rgba(255,255,255,.25)", marginTop:3 }}>{RISK_DESC[r]}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom:24 }}>
                      <label style={labelStyle}>REQUIRED IDENTITY CLAIMS</label>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                        {Object.entries(CLAIM_META).map(([k,v])=>{
                          const sel = form.required_claims.includes(k);
                          return (
                            <button key={k} onClick={()=>toggleClaim(k)} style={{ padding:"9px 16px", borderRadius:20, border:`1px solid ${sel?"rgba(0,229,160,.4)":"rgba(255,255,255,.1)"}`, background:sel?"rgba(0,229,160,.08)":"transparent", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:14 }}>{v.icon}</span>
                              <div style={{ textAlign:"left" }}>
                                <div style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:sel?"#00e5a0":"rgba(255,255,255,.5)", letterSpacing:.5 }}>{v.label}</div>
                                <div style={{ fontSize:10, color:"rgba(255,255,255,.25)" }}>{v.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {form.required_claims.length > 1 && (
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={()=>set("require_all_claims",true)} style={{ padding:"7px 16px", borderRadius:4, border:`1px solid ${form.require_all_claims?"rgba(0,229,160,.4)":"rgba(255,255,255,.08)"}`, background:form.require_all_claims?"rgba(0,229,160,.08)":"transparent", color:form.require_all_claims?"#00e5a0":"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace", fontSize:10, cursor:"pointer" }}>ALL REQUIRED (AND)</button>
                          <button onClick={()=>set("require_all_claims",false)} style={{ padding:"7px 16px", borderRadius:4, border:`1px solid ${!form.require_all_claims?"rgba(0,229,160,.4)":"rgba(255,255,255,.08)"}`, background:!form.require_all_claims?"rgba(0,229,160,.08)":"transparent", color:!form.require_all_claims?"#00e5a0":"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace", fontSize:10, cursor:"pointer" }}>ANY ONE REQUIRED (OR)</button>
                        </div>
                      )}
                    </div>

                    <button onClick={()=>setStep(2)} disabled={!form.resource_id} style={{ padding:"12px 28px", borderRadius:6, border:"none", background:!form.resource_id?"rgba(255,255,255,.06)":"rgba(0,229,160,.9)", color:!form.resource_id?"rgba(255,255,255,.25)":"#000", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1.5, fontWeight:700, cursor:!form.resource_id?"not-allowed":"pointer" }}>
                      NEXT: PROTOCOL INFO →
                    </button>
                  </div>
                )}

                {/* ── STEP 2: Protocol Info ── */}
                {step===2 && (
                  <div>
                    <div style={{ marginBottom:24 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:4 }}>Protocol Information</div>
                      <p style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>This metadata will be shown to users in the Access Manager when they review your access request.</p>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
                      <div>
                        <label style={labelStyle}>PROTOCOL NAME *</label>
                        <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="GenLayer DAO" style={inputStyle}/>
                      </div>
                      <div>
                        <label style={labelStyle}>WEBSITE URL</label>
                        <input value={form.website_url} onChange={e=>set("website_url",e.target.value)} placeholder="https://your-protocol.com" style={inputStyle}/>
                      </div>
                      <div style={{ gridColumn:"1/-1" }}>
                        <label style={labelStyle}>DESCRIPTION</label>
                        <input value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Short description shown to users (max 128 chars)" style={inputStyle}/>
                      </div>
                      <div style={{ gridColumn:"1/-1" }}>
                        <label style={labelStyle}>LOGO URL</label>
                        <input value={form.logo_url} onChange={e=>set("logo_url",e.target.value)} placeholder="https://your-protocol.com/logo.png (HTTPS only)" style={inputStyle}/>
                      </div>
                    </div>

                    {/* Preview */}
                    {(form.name||form.description) && (
                      <div style={{ marginBottom:20 }}>
                        <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:10 }}>PREVIEW — AS SHOWN TO USERS</div>
                        <div style={{ padding:"14px 18px", background:"rgba(0,0,0,.3)", border:"1px solid rgba(255,255,255,.08)", borderRadius:8, display:"flex", gap:14, alignItems:"center" }}>
                          <div style={{ width:40, height:40, borderRadius:6, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            {form.logo_url ? <img src={form.logo_url} alt="" style={{ width:28, height:28, borderRadius:3, objectFit:"contain" }} onError={e=>e.target.style.display="none"}/> : <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"rgba(255,255,255,.4)" }}>{form.name?.slice(0,2).toUpperCase()||"??"}</span>}
                          </div>
                          <div>
                            <div style={{ fontSize:14, fontFamily:"'Space Mono',monospace", fontWeight:700, color:"rgba(255,255,255,.85)" }}>{form.name||"Protocol Name"}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:3 }}>{form.description||"No description"}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display:"flex", gap:10 }}>
                      <button onClick={()=>setStep(1)} style={{ padding:"12px 20px", borderRadius:6, border:"1px solid rgba(255,255,255,.1)", background:"transparent", color:"rgba(255,255,255,.4)", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1, cursor:"pointer" }}>← BACK</button>
                      <button onClick={()=>setStep(3)} disabled={!form.name} style={{ padding:"12px 28px", borderRadius:6, border:"none", background:!form.name?"rgba(255,255,255,.06)":"rgba(0,229,160,.9)", color:!form.name?"rgba(255,255,255,.25)":"#000", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1.5, fontWeight:700, cursor:!form.name?"not-allowed":"pointer" }}>
                        NEXT: REVIEW →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Review ── */}
                {step===3 && (
                  <div>
                    <div style={{ marginBottom:24 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:4 }}>Review & Deploy</div>
                      <p style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>Review your configuration before deploying to Bradbury Testnet.</p>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
                      {[
                        ["RESOURCE ID", form.resource_id],
                        ["PROTOCOL NAME", form.name],
                        ["MIN SCORE", `${form.min_score}/100`],
                        ["MAX RISK", form.max_risk_level.toUpperCase()],
                        ["REQUIRED CLAIMS", form.required_claims.length ? form.required_claims.map(c=>CLAIM_META[c]?.label||c).join(", ") : "None"],
                        ["CLAIM LOGIC", form.required_claims.length > 1 ? (form.require_all_claims?"ALL required (AND)":"Any one (OR)") : "N/A"],
                        ["WEBSITE", form.website_url||"—"],
                        ["DESCRIPTION", form.description||"—"],
                      ].map(([l,v])=>(
                        <div key={l} style={{ padding:"12px 14px", background:"rgba(0,0,0,.25)", border:"1px solid rgba(255,255,255,.06)", borderRadius:6 }}>
                          <div style={{ fontSize:9, letterSpacing:1.5, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:5 }}>{l}</div>
                          <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", fontFamily:"'Space Mono',monospace" }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ padding:16, background:"rgba(0,229,160,.04)", border:"1px solid rgba(0,229,160,.15)", borderRadius:8, marginBottom:20 }}>
                      <p style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.8, fontFamily:"'Space Mono',monospace" }}>
                        This will deploy a transaction to GenLayer Bradbury Testnet. MetaMask will prompt for signature. You will need GEN for gas.
                      </p>
                    </div>

                    {error && (
                      <div style={{ padding:14, background:"rgba(255,45,85,.08)", border:"1px solid rgba(255,45,85,.25)", borderRadius:8, marginBottom:16, fontSize:12, color:"#ff6b8a", fontFamily:"'Space Mono',monospace", lineHeight:1.7 }}>
                        {error}
                      </div>
                    )}

                    <div style={{ display:"flex", gap:10 }}>
                      <button onClick={()=>setStep(2)} style={{ padding:"12px 20px", borderRadius:6, border:"1px solid rgba(255,255,255,.1)", background:"transparent", color:"rgba(255,255,255,.4)", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1, cursor:"pointer" }}>← BACK</button>
                      <button onClick={handleSubmit} disabled={submitting} style={{ flex:1, padding:"12px 0", borderRadius:6, border:"none", background:submitting?"rgba(0,229,160,.3)":"rgba(0,229,160,.9)", color:submitting?"rgba(255,255,255,.4)":"#000", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1.5, fontWeight:700, cursor:submitting?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        {submitting&&<Spinner color="#000"/>}{submitting?"DEPLOYING TO BRADBURY…":"DEPLOY PROTOCOL"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Done ── */}
            {step===4 && (
              <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(0,229,160,.2)", borderRadius:10, padding:40, textAlign:"center", animation:"fadeUp .5s ease" }}>
                <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(0,229,160,.1)", border:"2px solid #00e5a0", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:24 }}>✓</div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:"#fff", marginBottom:8 }}>Protocol Deployed</div>
                <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.8, marginBottom:28 }}>
                  <strong style={{ color:"rgba(255,255,255,.7)" }}>{form.name}</strong> is now registered on GenLayer Bradbury.<br/>
                  Users can now verify and grant access via SovereignID.
                </p>
                {txHash && (
                  <div style={{ padding:"10px 16px", background:"rgba(0,0,0,.3)", border:"1px solid rgba(255,255,255,.07)", borderRadius:6, marginBottom:24, display:"inline-flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)", fontFamily:"'Space Mono',monospace" }}>TX HASH</span>
                    <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(127,255,255,.7)" }}>{txHash.slice(0,12)}…{txHash.slice(-10)}</span>
                  </div>
                )}
                <div style={{ background:"rgba(0,0,0,.3)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:20, textAlign:"left", marginBottom:24 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:12 }}>YOUR RESOURCE ID</div>
                  <div style={{ fontSize:16, fontFamily:"'Space Mono',monospace", color:"#00e5a0", marginBottom:16 }}>{form.resource_id}</div>
                  <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.2)", fontFamily:"'Space Mono',monospace", marginBottom:8 }}>QUICK START</div>
                  <pre style={{ fontSize:11, color:"rgba(127,255,255,.6)", fontFamily:"'Space Mono',monospace", lineHeight:1.8 }}>{`const allowed = await sid.hasAccess(
  userWallet,
  "${form.resource_id}"
);`}</pre>
                </div>
                <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                  <button onClick={()=>{setStep(1);setForm({resource_id:"",name:"",description:"",logo_url:"",website_url:"",min_score:60,required_claims:[],require_all_claims:true,max_risk_level:"medium"});setTxHash(null);setError(null);}} style={{ padding:"11px 24px", borderRadius:6, border:"1px solid rgba(255,255,255,.1)", background:"transparent", color:"rgba(255,255,255,.5)", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1.5, cursor:"pointer" }}>
                    REGISTER ANOTHER
                  </button>
                  <button style={{ padding:"11px 24px", borderRadius:6, border:"none", background:"rgba(0,229,160,.9)", color:"#000", fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1.5, fontWeight:700, cursor:"pointer" }}>
                    VIEW DOCS →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer style={{ borderTop:"1px solid rgba(255,255,255,.06)", padding:"28px 32px" }}>
          <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="12,2 21,7.5 21,16.5 12,22 3,16.5 3,7.5" stroke="rgba(0,229,160,.5)" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="2" fill="rgba(0,229,160,.6)"/></svg>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:2, color:"rgba(255,255,255,.2)" }}>SOVEREIGNID PROTOCOL PORTAL</span>
            </div>
            <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,.2)" }}>GenLayer Bradbury Testnet · Chain 4221</span>
          </div>
        </footer>
      </div>
    </>
  );
}
