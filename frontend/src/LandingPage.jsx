import { useState } from "react";

const FEATURES = [
  {
    icon: "⬡",
    bg: "#EBF1FF",
    title: "AI-Verified Claims",
    body: "Five validators reach consensus via Optimistic Democracy. Each claim is independently verified by LLMs — no single point of trust.",
  },
  {
    icon: "◈",
    bg: "#E6FBF5",
    title: "Sybil Resistance",
    body: "Evidence nullifiers prevent the same proof from verifying multiple wallets. One identity per person, enforced on-chain by GenLayer validators.",
  },
  {
    icon: "◎",
    bg: "#FFF6E6",
    title: "Zero PII On-Chain",
    body: "Only IPFS content hashes are stored. All sensitive data lives off-chain. Relying parties learn nothing beyond a single boolean.",
  },
];

const STEPS = [
  {
    num: "01",
    label: "Register",
    color: "#0A64FF",
    title: "Anchor your identity",
    body: "Connect your wallet and register a sovereign identity on GenLayer Bradbury. Your wallet address becomes your permanent identity root — no company can revoke it.",
    bg: "#F0F5FF",
    icon: "🔗",
  },
  {
    num: "02",
    label: "Verify",
    color: "#00C28A",
    title: "Submit identity claims",
    body: "Provide evidence URLs for your GitHub, age, domain, or KYC. Five AI validators independently fetch and verify your evidence via Optimistic Democracy consensus.",
    bg: "#F0FBF8",
    icon: "◈",
  },
  {
    num: "03",
    label: "Control",
    color: "#C47A00",
    title: "Own your access",
    body: "See which protocols access your identity. Revoke per-protocol. Disable specific claim types globally. You decide who sees what — always.",
    bg: "#FFFBF5",
    icon: "⚡",
  },
];

const STATS = [
  { num: "5",      label: "AI validators" },
  { num: "4",      label: "Contracts on Bradbury" },
  { num: "100%",   label: "Self-sovereign" },
];

const TESTIMONIALS = [
  {
    quote: "SovereignID is what decentralized identity should look like. AI consensus on claims without exposing any user data.",
    name: "Alex Chen",
    role: "DeFi Protocol Lead",
  },
  {
    quote: "We integrated in an afternoon. has_valid_access() returns one boolean — our contract learns nothing else about the user.",
    name: "Priya Nair",
    role: "Smart Contract Dev",
  },
  {
    quote: "Finally a Sybil-resistance layer that doesn't require a centralized KYC provider. Evidence nullifiers are elegant.",
    name: "Marcus Webb",
    role: "Blockchain Architect",
  },
];

const FAQS = [
  {
    q: "What is Optimistic Democracy?",
    a: "GenLayer's consensus mechanism where 5 AI validators independently verify each claim. If enough validators agree, the result is accepted. Validators connect to different LLMs so no single model can skew results.",
  },
  {
    q: "Can I lose my identity if my wallet is compromised?",
    a: "Your identity record is anchored to your wallet address. If you lose access to your wallet, use the update_identity function from your new wallet before deactivating the old one. We recommend keeping a backup of your evidence URLs.",
  },
  {
    q: "What data is stored on-chain?",
    a: "Only an IPFS content hash of your identity document, your display name, and boolean flags. No PII — names, dates of birth, documents — is ever written to the blockchain.",
  },
  {
    q: "How does Sybil protection work?",
    a: "When a claim is verified, a nullifier (hash of evidence URL) is stored permanently on-chain. The same evidence cannot verify another wallet, even after revocation. For age and KYC claims, AI validators also extract a biometric fingerprint to prevent multiple identities per person.",
  },
  {
    q: "How do protocols integrate SovereignID?",
    a: "Protocols register a resource with a policy (min score, required claims, risk threshold). Users request access, and the contract gates on has_valid_access(addr, resource_id) — a single boolean that reveals nothing about the user beyond qualification.",
  },
];

function HexIcon({ size = 48, color = "#0A64FF" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <polygon points="24,4 41,14 41,34 24,44 7,34 7,14"
        fill={color + "18"} stroke={color} strokeWidth="1.5"/>
      <polygon points="24,11 35,17.5 35,30.5 24,37 13,30.5 13,17.5"
        fill="none" stroke={color + "44"} strokeWidth="1"/>
      <circle cx="24" cy="24" r="5" fill={color + "ee"}/>
    </svg>
  );
}

function Navbar({ onLaunch }) {
  const [open, setOpen] = useState(false);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #E4E8F0", height: 68,
      display: "flex", alignItems: "center", padding: "0 5%",
    }}>
      <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="nav-logo">
          <HexIcon size={32} color="#0A64FF"/>
          <span>Sovereign<span style={{ color: "#0A64FF" }}>ID</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="nav-links">
          <a href="#how" style={{ fontSize: 15, color: "#3D4559", fontWeight: 500 }}>How it works</a>
          <a href="#features" style={{ fontSize: 15, color: "#3D4559", fontWeight: 500 }}>Features</a>
          <a href="#faq" style={{ fontSize: 15, color: "#3D4559", fontWeight: 500 }}>FAQ</a>
          <a href="https://github.com/greyw0rks/sovereign-id" target="_blank" rel="noopener"
            style={{ fontSize: 15, color: "#3D4559", fontWeight: 500 }}>GitHub</a>
          <button className="btn btn-primary" onClick={onLaunch} style={{ padding: "10px 22px", fontSize: 14 }}>
            Launch App →
          </button>
        </div>
      </div>
      <style>{`@media(max-width:768px){.nav-links{display:none !important;}}`}</style>
    </nav>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-q" onClick={() => setOpen(o => !o)}>
        {q}
        <span className={`faq-icon${open ? " open" : ""}`}>+</span>
      </button>
      <div className="faq-body" style={{ maxHeight: open ? 300 : 0 }}>
        <div className="faq-inner">{a}</div>
      </div>
    </div>
  );
}

export default function LandingPage({ onLaunch }) {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#0F1523" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Urbanist:wght@700;800;900&display=swap" rel="stylesheet"/>

      <Navbar onLaunch={onLaunch}/>

      <main style={{ paddingTop: 68 }}>

        {/* ── HERO ── */}
        <section style={{ padding: "96px 5% 80px", background: "linear-gradient(160deg, #EBF1FF 0%, white 60%)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="hero-inner">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ width: 32, height: 2, background: "#0A64FF" }}/>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0A64FF", textTransform: "uppercase", letterSpacing: "0.1em" }}>GenLayer Bradbury Testnet</span>
              </div>
              <h1 style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)", marginBottom: 20, fontFamily: "Urbanist, sans-serif", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Your identity,<br /><span style={{ color: "#0A64FF" }}>your control</span>
              </h1>
              <p style={{ fontSize: 18, color: "#6B7490", lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
                AI validators verify your identity claims. No PII on-chain. Sybil-resistant by design. Revoke any protocol's access at any time.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
                <button className="btn btn-primary" onClick={onLaunch}>Launch App →</button>
                <a href="#how" className="btn btn-secondary">How it works</a>
              </div>
              <div style={{ display: "flex", gap: 32 }}>
                {STATS.map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "Urbanist, sans-serif", color: "#0A64FF" }}>{s.num}</div>
                    <div style={{ fontSize: 12, color: "#9BA3B8" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
                {/* Identity card mockup */}
                <div style={{ background: "#0F1523", borderRadius: 16, padding: 28, boxShadow: "0 8px 40px rgba(10,100,255,0.15)", border: "1px solid #1e2538" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <HexIcon size={28} color="#00e5a0"/>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>SOVEREIGN<span style={{ color: "#00e5a0" }}>ID</span></span>
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>DISPLAY NAME</div>
                  <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>greyw0rks</div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>VERIFIED CLAIMS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                    {["⬡ GitHub", "◈ Age 18+", "◎ Domain"].map(c => (
                      <span key={c} style={{ background: "rgba(0,229,160,0.12)", color: "#00e5a0", border: "1px solid rgba(0,229,160,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontFamily: "monospace" }}>{c}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", marginBottom: 2 }}>TRUST SCORE</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#00e5a0", fontFamily: "monospace" }}>85</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", marginBottom: 2 }}>RISK LEVEL</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#00e5a0", fontFamily: "monospace" }}>LOW</div>
                    </div>
                  </div>
                </div>
                {/* Floating badges */}
                <div style={{ position: "absolute", top: -18, right: -18, background: "white", borderRadius: 12, padding: "8px 14px", boxShadow: "0 4px 16px rgba(15,21,35,0.1)", border: "1px solid #9FEDD9", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00C28A" }}/>
                  <div><div style={{ fontSize: 11, fontWeight: 700 }}>5/5 validators agreed</div><div style={{ fontSize: 10, color: "#9BA3B8" }}>Optimistic Democracy</div></div>
                </div>
                <div style={{ position: "absolute", bottom: -18, left: -18, background: "white", borderRadius: 12, padding: "8px 14px", boxShadow: "0 4px 16px rgba(15,21,35,0.1)", border: "1px solid #C5D8FF", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0A64FF" }}/>
                  <div><div style={{ fontSize: 11, fontWeight: 700 }}>Sybil proof</div><div style={{ fontSize: 10, color: "#9BA3B8" }}>Evidence nullifier stored</div></div>
                </div>
              </div>
            </div>
          </div>
          <style>{`@media(max-width:768px){.hero-inner{grid-template-columns:1fr !important; gap:40px !important;}}`}</style>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ padding: "96px 5%", background: "#F8F9FC" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 56px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0A64FF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Core</p>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontFamily: "Urbanist, sans-serif", fontWeight: 800, letterSpacing: "-0.02em" }}>Built for sovereignty</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, background: "#E4E8F0", border: "1px solid #E4E8F0", borderRadius: 16, overflow: "hidden" }} className="features-grid">
              {FEATURES.map(f => (
                <div key={f.title} style={{ background: "white", padding: 32 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 20 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 18, marginBottom: 12, fontFamily: "Urbanist, sans-serif", fontWeight: 800 }}>{f.title}</h3>
                  <p style={{ fontSize: 15, color: "#6B7490", lineHeight: 1.7 }}>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
          <style>{`@media(max-width:768px){.features-grid{grid-template-columns:1fr !important;}}`}</style>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" style={{ padding: "96px 5%" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0A64FF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>How It Works</p>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontFamily: "Urbanist, sans-serif", fontWeight: 800, letterSpacing: "-0.02em" }}>Three steps to sovereignty</h2>
            </div>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", padding: "72px 0", borderTop: i > 0 ? "1px solid #E4E8F0" : "none" }} className="hiw-row">
                <div style={{ order: i % 2 === 1 ? 2 : 1 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: "#CDD3E0", fontFamily: "Urbanist, sans-serif", marginBottom: 8 }}>{s.num}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>{s.label}</div>
                  <h2 style={{ marginBottom: 16, fontSize: "clamp(1.5rem,2.5vw,2.2rem)", fontFamily: "Urbanist, sans-serif", fontWeight: 800 }}>{s.title}</h2>
                  <p style={{ fontSize: 17, color: "#6B7490", lineHeight: 1.7, marginBottom: 28 }}>{s.body}</p>
                  <button className="btn btn-secondary" onClick={onLaunch}>Try it now →</button>
                </div>
                <div style={{ order: i % 2 === 1 ? 1 : 2, borderRadius: 16, aspectRatio: "4/3", overflow: "hidden", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>{s.icon}</div>
                    <div style={{ fontFamily: "Urbanist, sans-serif", fontWeight: 800, fontSize: 20, color: s.color }}>{s.label}</div>
                    <div style={{ fontSize: 14, color: "#6B7490", marginTop: 8 }}>{s.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <style>{`@media(max-width:768px){.hiw-row{grid-template-columns:1fr !important; gap:32px !important;} .hiw-row>div{order:unset !important;}}`}</style>
        </section>

        {/* ── HOW PROTOCOLS INTEGRATE ── */}
        <section style={{ padding: "96px 5%", background: "#0F1523" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#00e5a0", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>For Developers</p>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontFamily: "Urbanist, sans-serif", fontWeight: 800, color: "white" }}>Integrate in minutes</h2>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", marginTop: 12, maxWidth: 520, margin: "12px auto 0" }}>One boolean. Zero PII. Works from any EVM contract or JavaScript backend.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="code-grid">
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 14 }}>SOLIDITY CONTRACT</div>
                <pre style={{ fontSize: 12, color: "rgba(127,255,255,0.7)", fontFamily: "monospace", lineHeight: 1.9, overflow: "auto" }}>{`interface ISovereignID {
  function has_valid_access(
    address user,
    string memory resource_id
  ) external view returns (bool);
}

contract MyDAO {
  ISovereignID sid;

  function castVote(uint id) external {
    require(
      sid.has_valid_access(
        msg.sender, "dao:governance"
      ), "SovereignID required"
    );
    // ... voting logic
  }
}`}</pre>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 14 }}>JAVASCRIPT / NODE.JS</div>
                <pre style={{ fontSize: 12, color: "rgba(127,255,255,0.7)", fontFamily: "monospace", lineHeight: 1.9, overflow: "auto" }}>{`import { SovereignID } from "@sovereignid/sdk";

const sid = new SovereignID({
  network: "bradbury",
  accessController: "0xCbBdf9..."
});

// Gate your API endpoint
app.post("/premium", async (req, res) => {
  const allowed = await sid.hasAccess(
    req.body.wallet,
    "app:premium-api"
  );
  if (!allowed)
    return res.status(403).json({
      error: "Identity required"
    });
  // handle request
});`}</pre>
              </div>
            </div>
            <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 12 }}>
              <a href="https://github.com/greyw0rks/sovereign-id" target="_blank" rel="noopener"
                style={{ background: "rgba(255,255,255,0.08)", color: "white", borderRadius: 100, padding: "12px 24px", fontWeight: 600, fontSize: 14, border: "1px solid rgba(255,255,255,0.12)" }}>
                View on GitHub →
              </a>
              <button className="btn btn-primary" onClick={onLaunch}>
                Register your protocol
              </button>
            </div>
          </div>
          <style>{`@media(max-width:768px){.code-grid{grid-template-columns:1fr !important;}}`}</style>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section style={{ padding: "96px 5%", background: "#F8F9FC" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0A64FF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Testimonials</p>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontFamily: "Urbanist, sans-serif", fontWeight: 800 }}>Trusted by builders</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }} className="testi-grid">
              {TESTIMONIALS.map(t => (
                <div key={t.name} style={{ background: "white", borderRadius: 16, padding: 28, border: "1px solid #E4E8F0" }}>
                  <div style={{ fontSize: 32, color: "#0A64FF", marginBottom: 12, lineHeight: 1 }}>&ldquo;</div>
                  <p style={{ fontSize: 15, lineHeight: 1.7, color: "#3D4559", marginBottom: 20 }}>{t.quote}</p>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: "#9BA3B8" }}>{t.role}</div>
                </div>
              ))}
            </div>
          </div>
          <style>{`@media(max-width:768px){.testi-grid{grid-template-columns:1fr 1fr !important;}} @media(max-width:480px){.testi-grid{grid-template-columns:1fr !important;}}`}</style>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" style={{ padding: "96px 5%" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0A64FF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>FAQ</p>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontFamily: "Urbanist, sans-serif", fontWeight: 800 }}>Common questions</h2>
            </div>
            {FAQS.map(f => <FAQItem key={f.q} q={f.q} a={f.a}/>)}
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ padding: "80px 5%", background: "#0A64FF" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ color: "white", fontSize: "clamp(1.8rem, 3vw, 2.8rem)", marginBottom: 16, fontFamily: "Urbanist, sans-serif", fontWeight: 800 }}>Own your identity today</h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 17, marginBottom: 32 }}>Register on GenLayer Bradbury, collect AI-verified claims, and control who can access your identity.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={onLaunch} style={{ background: "white", color: "#0A64FF", borderRadius: 100, padding: "14px 28px", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}>
                Launch App →
              </button>
              <a href="https://github.com/greyw0rks/sovereign-id" target="_blank" rel="noopener"
                style={{ background: "rgba(255,255,255,0.15)", color: "white", borderRadius: 100, padding: "14px 28px", fontWeight: 600, fontSize: 15 }}>
                View on GitHub
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "48px 5%", background: "#0F1523", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48 }} className="footer-grid">
          <div>
            <div className="nav-logo" style={{ color: "white", marginBottom: 16 }}>
              <HexIcon size={28} color="#00e5a0"/>
              <span>Sovereign<span style={{ color: "#00e5a0" }}>ID</span></span>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 280 }}>
              Decentralized self-sovereign identity on GenLayer Bradbury Testnet. AI-verified. Sybil-resistant. Zero PII.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>App</div>
            <ul className="footer-links" style={{ color: "rgba(255,255,255,0.4)" }}>
              <li><button onClick={onLaunch} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, padding: 0 }}>Dashboard</button></li>
              <li><button onClick={onLaunch} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, padding: 0 }}>Claims</button></li>
              <li><button onClick={onLaunch} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, padding: 0 }}>Access Manager</button></li>
            </ul>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Developers</div>
            <ul className="footer-links" style={{ color: "rgba(255,255,255,0.4)" }}>
              <li><a href="https://github.com/greyw0rks/sovereign-id" target="_blank" rel="noopener" style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>GitHub</a></li>
              <li><a href="https://docs.genlayer.com" target="_blank" rel="noopener" style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>GenLayer Docs</a></li>
              <li><button onClick={onLaunch} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, padding: 0 }}>Protocol Portal</button></li>
            </ul>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Network</div>
            <ul className="footer-links">
              <li><span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>GenLayer Bradbury</span></li>
              <li><span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Chain ID: 4221</span></li>
              <li><span style={{ fontSize: 14, color: "#00e5a0" }}>● Live</span></li>
            </ul>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "32px auto 0", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>© 2026 SovereignID. Built on GenLayer.</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Hackathon submission · Bradbury Testnet</span>
        </div>
        <style>{`@media(max-width:768px){.footer-grid{grid-template-columns:1fr 1fr !important;}} @media(max-width:480px){.footer-grid{grid-template-columns:1fr !important;}}`}</style>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Urbanist:wght@700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        :root {
          --blue:#0A64FF; --blue-light:#EBF1FF; --blue-mid:#C5D8FF;
          --green:#00C28A; --green-light:#E6FBF5; --green-mid:#9FEDD9;
          --amber:#FFB84D; --amber-light:#FFF6E6;
          --bg:#FFFFFF; --bg2:#F8F9FC; --bg3:#F0F2F8;
          --border:#E4E8F0; --border-dark:#CDD3E0;
          --text:#0F1523; --text-2:#3D4559; --text-3:#6B7490; --text-4:#9BA3B8;
          --shadow-sm:0 1px 3px rgba(15,21,35,0.06),0 1px 2px rgba(15,21,35,0.04);
          --shadow:0 4px 16px rgba(15,21,35,0.08),0 2px 6px rgba(15,21,35,0.04);
        }
        body{font-family:'Inter',sans-serif;color:#0F1523;background:#fff;-webkit-font-smoothing:antialiased;}
        h1,h2,h3,h4{font-family:'Urbanist',sans-serif;font-weight:800;letter-spacing:-0.02em;line-height:1.15;}
        a{color:inherit;text-decoration:none;}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:12px 24px;border-radius:100px;font-size:15px;font-weight:600;cursor:pointer;border:none;transition:all 0.18s ease;white-space:nowrap;font-family:'Inter',sans-serif;}
        .btn-primary{background:#0A64FF;color:white;}
        .btn-primary:hover{background:#0855E0;transform:translateY(-1px);box-shadow:0 4px 14px rgba(10,100,255,0.35);}
        .btn-secondary{background:#F8F9FC;color:#0F1523;border:1px solid #E4E8F0;}
        .btn-secondary:hover{background:#F0F2F8;}
        .nav-logo{display:flex;align-items:center;gap:10px;font-family:'Urbanist',sans-serif;font-size:20px;font-weight:800;color:#0F1523;letter-spacing:-0.02em;}
        .faq-item{border:1px solid #E4E8F0;border-radius:8px;margin-bottom:10px;overflow:hidden;}
        .faq-q{width:100%;text-align:left;padding:20px 24px;background:none;border:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:'Inter',sans-serif;font-size:16px;font-weight:600;color:#0F1523;}
        .faq-q:hover{background:#F8F9FC;}
        .faq-icon{font-size:22px;color:#6B7490;transition:transform 0.25s;flex-shrink:0;}
        .faq-icon.open{transform:rotate(45deg);color:#0A64FF;}
        .faq-body{overflow:hidden;transition:max-height 0.3s ease;}
        .faq-inner{padding:0 24px 20px;font-size:15px;color:#3D4559;line-height:1.7;}
        .footer-links{list-style:none;display:flex;flex-direction:column;gap:10px;}
      `}</style>
    </div>
  );
}
