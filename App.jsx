import { useState, useRef } from "react";

/* ─── Design tokens ─── */
const C = {
  cream:"#F7F0E8", warm:"#FDFAF6", blush:"#E8C4B0",
  terra:"#C4714A", deep:"#15100C", mid:"#3D2E22",
  soft:"#7A5E4E", gold:"#C9A96E", pale:"#F0E4D6",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Outfit:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body,button,input{font-family:'Outfit',sans-serif}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulseD{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(2)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes floatCard{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-8px)}}
@keyframes beat{0%,100%{transform:scale(1)}40%{transform:scale(1.1)}}
`;

const MSGS = [
  "Scanning Dad's facial structure...",
  "Scanning Mom's facial features...",
  "Mapping genetic inheritance...",
  "Blending eyes, nose & lips...",
  "Rendering skin tone & hair...",
  "Composing portrait...",
  "Almost ready...",
];

const FAQS = [
  ["What will my baby look like?","Your baby's appearance is determined by both parents' genetics. Eye color, nose shape, lip fullness, skin tone, and hair all come from dominant and recessive genes. UrBaby.ai analyzes both parents' faces and generates a realistic portrait of your child at age 7."],
  ["How accurate is the AI baby generator?","Our AI maps hundreds of facial landmarks from each parent and blends them based on real genetic inheritance patterns. Users consistently report strong resemblances to their actual children."],
  ["Are my photos stored or shared?","No. Your photos are processed for AI analysis and immediately discarded. Never stored, never sold, never shared."],
  ["What photos give the best results?","Clear, well-lit, front-facing photo with the full face visible. No sunglasses, hats, or heavy filters."],
  ["Can I generate both boy and girl?","Yes — run it twice with different gender selections."],
  ["Is UrBaby.ai free?","Yes, 100% free, supported by advertising. No sign-up needed."],
];

const POSTS = [
  { tag:"Science", title:"What Will My Baby Look Like? The Science of Facial Genetics", excerpt:"Facial features are determined by hundreds of genes from both parents. Dominant traits like dark eyes appear first, but recessive traits can produce surprising results...", full:"Facial genetics is one of the most fascinating areas of modern biology. When two people have a child, the baby inherits roughly half of its DNA from each parent. This DNA contains instructions for everything from eye color to nose shape, from lip thickness to cheekbone structure.\n\nDominant traits — like dark hair, dark eyes, and wider noses — tend to appear more often in children. But recessive traits, like blue eyes or a specific nose shape, can skip generations and reappear unexpectedly.\n\nModern AI tools like UrBaby.ai analyze these inherited patterns to generate a realistic prediction of what a child might look like. By studying facial landmarks from both parents the AI creates a blended portrait that reflects both parents' genetic contributions." },
  { tag:"Guide", title:"How AI Baby Face Generators Actually Work", excerpt:"Modern AI models analyze facial landmarks — eye distance, nose bridge width, lip fullness — and blend them using genetic probability models...", full:"AI baby face generators work by combining computer vision and generative AI.\n\n1. Facial Analysis: The AI scans each parent photo and identifies dozens of key facial landmarks — the corners of the eyes, tip of the nose, edges of the lips, jaw line.\n\n2. Feature Extraction: From these landmarks, the AI extracts specific traits: eye shape, nose bridge width, lip fullness, face shape, and skin tone.\n\n3. Genetic Blending: Using a model trained on real family resemblance data, the AI determines which features are likely dominant and blends them realistically.\n\n4. Portrait Generation: A state-of-the-art image generation model renders a photorealistic portrait of the child incorporating all the blended traits." },
  { tag:"Fun", title:"Celebrity Couples: What Would Their Future Baby Look Like?", excerpt:"We ran some of the world's most famous couples through our AI. The results were incredibly striking and surprisingly accurate...", full:"One of the most popular uses of UrBaby.ai is generating portraits of celebrity couples' imagined future children.\n\nThe AI picks up on subtle shared features — a similar nose shape, matching eye color, complementary face structures — and blends them into a remarkably believable child portrait.\n\nFor celebrity couples who already have children, users often report that the AI-generated portrait bears a strong resemblance to their real children. This is a testament to how accurately the model captures and blends facial genetics." },
];

/* ─── SVG helpers ─── */
function LogoSVG({ size }) {
  const s = size || 32;
  return (
    <svg width={s} height={s} viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="20" stroke={C.terra} strokeWidth="1.5"/>
      <circle cx="15.5" cy="18.5" r="6" fill={C.blush}/>
      <circle cx="28.5" cy="18.5" r="6" fill="#D9A882"/>
      <ellipse cx="22" cy="29" rx="7.5" ry="6.5" fill={C.terra} opacity=".75"/>
      <circle cx="22" cy="23" r="4.5" fill={C.pale}/>
      <circle cx="20" cy="22" r="1.2" fill={C.terra} opacity=".5"/>
      <circle cx="24" cy="22" r="1.2" fill={C.terra} opacity=".5"/>
    </svg>
  );
}

function PersonSVG({ color, size }) {
  const s = size || 36;
  return (
    <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="13" r="7.5" fill={color || "rgba(255,255,255,.5)"}/>
      <path d="M4 32c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke={color || "rgba(255,255,255,.5)"} strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function Brand({ light }) {
  const col = light ? C.cream : C.deep;
  const acc = light ? C.gold  : C.terra;
  return (
    <span style={{ display:"flex", alignItems:"baseline" }}>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:600, color:col }}>Ur</span>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:400, fontStyle:"italic", color:acc }}>Baby</span>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:400, fontStyle:"italic", color:acc }}>.ai</span>
    </span>
  );
}

/* ─── Hero Cards — exactly centered like reference ─── */
function HeroCards() {
  return (
    <div style={{ position:"relative", width:"100%", maxWidth:340, height:340, margin:"44px auto 0" }}>

      {/* DAD — top-left, tilted */}
      <div style={{
        position:"absolute", top:0, left:"8%",
        width:130, height:164,
        background:"linear-gradient(150deg,#D4A070 0%,#B07040 100%)",
        borderRadius:24, transform:"rotate(-7deg)",
        boxShadow:"0 18px 44px rgba(21,16,12,.2)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12,
      }}>
        <div style={{ width:60, height:60, borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <PersonSVG color="rgba(255,255,255,.6)" size={34}/>
        </div>
        <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:11, fontWeight:500, letterSpacing:".18em", color:"rgba(255,255,255,.65)", textTransform:"uppercase" }}>Dad</span>
      </div>

      {/* MOM — top-right, tilted opposite */}
      <div style={{
        position:"absolute", top:0, right:"8%",
        width:130, height:164,
        background:"linear-gradient(150deg,#EAC8A8 0%,#C8986A 100%)",
        borderRadius:24, transform:"rotate(7deg)",
        boxShadow:"0 18px 44px rgba(21,16,12,.15)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12,
      }}>
        <div style={{ width:60, height:60, borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <PersonSVG color="rgba(255,255,255,.6)" size={34}/>
        </div>
        <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:11, fontWeight:500, letterSpacing:".18em", color:"rgba(255,255,255,.6)", textTransform:"uppercase" }}>Mom</span>
      </div>

      {/* PLUS — exactly centered horizontally, between top cards */}
      <div style={{
        position:"absolute", top:72, left:"50%", transform:"translateX(-50%)",
        width:38, height:38, borderRadius:"50%",
        background:C.warm, border:"1.5px solid "+C.blush,
        boxShadow:"0 4px 16px rgba(21,16,12,.1)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:22, color:C.terra, fontWeight:300, zIndex:4,
      }}>+</div>

      {/* CHILD — centered, floating, front */}
      <div style={{
        position:"absolute", bottom:0, left:"50%",
        transform:"translateX(-50%)",
        width:170, height:210,
        background:"linear-gradient(160deg,#F5E8D5 0%,#E8CCA8 100%)",
        borderRadius:28,
        boxShadow:"0 28px 64px rgba(21,16,12,.22)",
        zIndex:3,
        animation:"floatCard 3.5s ease-in-out infinite",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16,
      }}>
        <div style={{ width:76, height:76, borderRadius:"50%", background:"rgba(255,255,255,.38)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <PersonSVG color={C.terra+"66"} size={44}/>
        </div>
        <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:600, fontStyle:"italic", color:C.mid }}>Your Future Child</span>
          <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:9, fontWeight:500, letterSpacing:".16em", textTransform:"uppercase", color:C.gold }}>Age 7 · AI Portrait</span>
        </div>
      </div>

    </div>
  );
}

/* ─── Ad Slot ─── */
function Ad({ label }) {
  return (
    <div style={{ background:C.pale, border:"1px dashed "+C.blush, borderRadius:14, margin:"6px 0", padding:"14px 16px", textAlign:"center", minHeight:88, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
      <div style={{ fontSize:9, letterSpacing:".12em", textTransform:"uppercase", color:C.soft, opacity:.5 }}>Advertisement</div>
      <div style={{ fontSize:11, color:C.soft, opacity:.4 }}>{label}</div>
    </div>
  );
}

/* ─── Upload Zone ─── */
function UploadZone({ who, label, photo, onPhoto }) {
  const gallRef = useRef(null);
  const camRef  = useRef(null);
  const acc = who === "dad" ? C.terra : "#C87060";

  function read(e) {
    const f = e.target.files && e.target.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = function(ev) { onPhoto(ev.target.result); };
    r.readAsDataURL(f);
    e.target.value = "";
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <input ref={gallRef} type="file" accept="image/*" style={{ display:"none" }} onChange={read}/>
      <input ref={camRef}  type="file" accept="image/*" capture="user" style={{ display:"none" }} onChange={read}/>

      <div onClick={function(){ gallRef.current && gallRef.current.click(); }}
        style={{ borderRadius:16, cursor:"pointer", overflow:"hidden", minHeight:130, position:"relative", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", border:photo?"2px solid "+C.terra:"2px dashed "+C.blush, background:photo?"transparent":C.warm }}>
        {photo ? (
          <div style={{ width:"100%", position:"relative" }}>
            <img src={photo} alt={label} style={{ width:"100%", height:130, objectFit:"cover", objectPosition:"top", display:"block" }}/>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(21,16,12,.38),transparent 55%)" }}/>
            <div style={{ position:"absolute", top:8, right:8, width:24, height:24, background:C.terra, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.8 2.8 5-5" stroke="white" strokeWidth="1.9" strokeLinecap="round"/></svg>
            </div>
            <span style={{ position:"absolute", bottom:8, left:0, right:0, textAlign:"center", fontSize:11, color:"white", fontWeight:500 }}>{"✓ "+label}</span>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"16px 10px", textAlign:"center" }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:acc+"18", border:"1.5px solid "+acc+"44", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="8.5" r="4" stroke={acc} strokeWidth="1.5"/>
                <path d="M3 19.5c0-4.14 3.58-7.5 8-7.5s8 3.36 8 7.5" stroke={acc} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:C.deep }}>{label}</div>
            <div style={{ fontSize:10, color:C.soft }}>Tap to upload</div>
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
        <button onClick={function(){ camRef.current && camRef.current.click(); }}
          style={{ padding:"9px 4px", borderRadius:11, border:"1.5px solid "+C.blush, background:C.warm, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, outline:"none" }}>
          <span style={{ fontSize:19 }}>📷</span>
          <span style={{ fontSize:9, letterSpacing:".07em", textTransform:"uppercase", color:C.soft }}>Camera</span>
        </button>
        <button onClick={function(){ gallRef.current && gallRef.current.click(); }}
          style={{ padding:"9px 4px", borderRadius:11, border:"1.5px solid "+C.blush, background:C.warm, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, outline:"none" }}>
          <span style={{ fontSize:19 }}>🖼️</span>
          <span style={{ fontSize:9, letterSpacing:".07em", textTransform:"uppercase", color:C.soft }}>Gallery</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Loading ─── */
function Loading({ stage }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(21,16,12,.93)", backdropFilter:"blur(12px)", zIndex:9999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:22, padding:28 }}>
      <div style={{ position:"relative", width:88, height:88, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"absolute", width:88, height:88, borderRadius:"50%", border:"2.5px solid rgba(247,240,232,.07)", borderTopColor:C.terra, animation:"spin 1.1s linear infinite" }}/>
        <div style={{ animation:"beat 1.5s ease infinite" }}><LogoSVG size={50}/></div>
      </div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:21, fontStyle:"italic", color:C.cream, textAlign:"center", minHeight:52, display:"flex", alignItems:"center" }}>
        {MSGS[Math.min(stage, MSGS.length-1)]}
      </div>
      <div style={{ fontSize:11, color:"rgba(247,240,232,.38)", letterSpacing:".12em", textTransform:"uppercase" }}>approx. 20 seconds</div>
      <div style={{ display:"flex", gap:5 }}>
        {MSGS.map(function(_,i){ return <div key={i} style={{ height:5, borderRadius:3, transition:"all .4s", background:i<=stage?C.terra:"rgba(247,240,232,.14)", width:i<=stage?18:5 }}/>; })}
      </div>
    </div>
  );
}

/* ─── Article Modal ─── */
function Modal({ post, onClose }) {
  if (!post) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(21,16,12,.75)", backdropFilter:"blur(8px)", zIndex:8888, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={function(e){ e.stopPropagation(); }} style={{ background:C.warm, borderRadius:"24px 24px 0 0", padding:"28px 24px 44px", maxHeight:"82vh", overflowY:"auto", width:"100%", maxWidth:720, animation:"fadeUp .3s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, gap:12 }}>
          <div style={{ flex:1 }}>
            <span style={{ display:"inline-block", background:C.pale, border:"1px solid "+C.blush, padding:"3px 11px", borderRadius:100, fontSize:10, letterSpacing:".09em", textTransform:"uppercase", color:C.terra, marginBottom:10 }}>{post.tag}</span>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:600, color:C.deep, lineHeight:1.3 }}>{post.title}</h2>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:"50%", background:C.pale, border:"none", cursor:"pointer", flexShrink:0, fontSize:17, color:C.soft }}>✕</button>
        </div>
        {post.full.split("\n\n").map(function(p,i){ return <p key={i} style={{ fontSize:14, lineHeight:1.84, color:C.mid, fontWeight:300, marginBottom:16 }}>{p}</p>; })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════ */
export default function App() {
  const [dad,      setDad]      = useState(null);
  const [mom,      setMom]      = useState(null);
  const [gender,   setGender]   = useState("boy");
  const [loading,  setLoading]  = useState(false);
  const [stage,    setStage]    = useState(0);
  const [result,   setResult]   = useState(null);
  const [features, setFeatures] = useState("");
  const [err,      setErr]      = useState(null);
  const [faqOpen,  setFaqOpen]  = useState(null);
  const [article,  setArticle]  = useState(null);
  const timerRef  = useRef(null);
  const resultRef = useRef(null);
  const genRef    = useRef(null);
  const both = !!(dad && mom);

  function scrollToGen() { if (genRef.current) genRef.current.scrollIntoView({ behavior:"smooth" }); }
  function getMime(d) { return d.split(";")[0].split(":")[1] || "image/jpeg"; }
  function getB64(d)  { return d.split(",")[1]; }

  function startTimer() {
    let s = 0;
    timerRef.current = setInterval(function(){
      s++; setStage(s);
      if (s >= MSGS.length-1) clearInterval(timerRef.current);
    }, 3000);
  }

  async function generate() {
    if (!both) return;
    setErr(null); setResult(null); setFeatures("");
    setLoading(true); setStage(0);
    startTimer();
    try {
      const gLabel = gender==="girl" ? "a 7-year-old girl" : gender==="boy" ? "a 7-year-old boy" : "a 7-year-old child";

      const promptLines = [
        "You are a facial genetics expert.",
        "Image 1 = Dad. Image 2 = Mom. Analyze both carefully.",
        "",
        "Extract from EACH parent:",
        "- Eye shape (almond/round/hooded), size, color",
        "- Nose: bridge width, tip shape, nostrils",
        "- Lips: upper/lower thickness, cupid bow",
        "- Face shape: oval, round, square, heart",
        "- Skin tone and undertone",
        "- Hair color and texture",
        "- Eyebrow shape",
        "- Cheekbone prominence",
        "- Jaw and chin structure",
        "",
        "Write an image generation prompt for " + gLabel + " who CLEARLY resembles BOTH parents.",
        "",
        "Rules for the prompt:",
        "- Frame: neck/shoulders to top of head ONLY — no body below shoulders",
        "- Child faces camera with gentle warm smile",
        "- Photorealistic, 8k, ultra sharp, RAW photo style",
        "- Soft natural window light",
        "- Clean cream or off-white background",
        "- Explicitly list the specific inherited traits from each parent",
        "- Do NOT reference any real person or celebrity names",
        "",
        "Return ONLY raw JSON, no markdown, no backticks:",
        "{\"prompt\":\"...\",\"features\":\"one sentence describing the blended traits\"}",
      ];

      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dadImage: getB64(dad),
          momImage: getB64(mom),
          dadMime:  getMime(dad),
          momMime:  getMime(mom),
          gender:   gender,
        }),
      });

      if (!resp.ok) throw new Error("API "+resp.status);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      const imgUrl  = data.imgUrl;
      const featText = data.features || "";

      setStage(4);

      await new Promise(function(res){
        const img = new Image();
        img.onload = res; img.onerror = res; img.src = imgUrl;
        setTimeout(res, 35000);
      });

      setStage(6);
      await new Promise(function(r){ setTimeout(r,700); });
      clearInterval(timerRef.current);
      setResult(imgUrl); setFeatures(featText); setLoading(false);
      setTimeout(function(){ if (resultRef.current) resultRef.current.scrollIntoView({ behavior:"smooth", block:"start" }); }, 200);

    } catch(e) {
      clearInterval(timerRef.current);
      setLoading(false);
      setErr("Generation failed. Please try again — make sure both photos show a clear face.");
    }
  }

  function reset() { setResult(null); setDad(null); setMom(null); setFeatures(""); setErr(null); }

  function doDownload() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result; a.download = "urbaby-future-child.jpg"; a.click();
  }

  async function doShare() {
    if (navigator.share) await navigator.share({ title:"Meet our future child! 👶", text:"See what our baby will look like — free!", url:"https://urbaby.ai" });
    else { await navigator.clipboard.writeText("https://urbaby.ai"); alert("Link copied! 💕"); }
  }

  /* tiny helpers */
  function SL({ t }) { return <div style={{ fontSize:11, letterSpacing:".16em", textTransform:"uppercase", color:C.terra, marginBottom:10, fontWeight:600 }}>{t}</div>; }
  function H2({ children }) { return <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(26px,3.5vw,36px)", fontWeight:400, lineHeight:1.14, color:C.deep, marginBottom:26 }}>{children}</h2>; }

  /* ─── responsive layout widths ─── */
  const maxW = 1100;
  const pad  = "clamp(20px, 5vw, 80px)";

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", background:C.warm, minHeight:"100vh", color:C.deep, overflowX:"hidden" }}>
      <style>{CSS}</style>

      {loading  && <Loading stage={stage}/>}
      {article  && <Modal post={article} onClose={function(){ setArticle(null); }}/>}

      {/* ══ NAV ══ */}
      <nav style={{ position:"sticky", top:0, zIndex:200, background:"rgba(253,250,246,.97)", backdropFilter:"blur(16px)", borderBottom:"1px solid "+C.pale }}>
        <div style={{ maxWidth:maxW, margin:"0 auto", padding:"12px "+pad, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <LogoSVG size={30}/>
            <Brand/>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <a href="#how" style={{ fontSize:13, color:C.soft, textDecoration:"none", display:"none" /* shown via media */ }} className="nav-link">How it works</a>
            <button onClick={scrollToGen} style={{ background:C.deep, color:C.cream, padding:"9px 22px", borderRadius:100, fontSize:13, fontWeight:500, border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>
              Try Free ✨
            </button>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div style={{ background:"linear-gradient(165deg,"+C.warm+" 0%,"+C.pale+" 55%,rgba(232,196,176,.28) 100%)" }}>
        <div style={{ maxWidth:maxW, margin:"0 auto", padding:"60px "+pad+" 70px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center" }}>

          {/* Left: text */}
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.pale, border:"1px solid "+C.blush, padding:"6px 16px", borderRadius:100, fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:C.soft, marginBottom:28 }}>
              <span style={{ width:6, height:6, background:C.terra, borderRadius:"50%", animation:"pulseD 2s infinite", display:"inline-block" }}/>
              Real AI · Facial Genetics · 100% Free
            </div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(42px,5vw,64px)", fontWeight:400, lineHeight:1.05, color:C.deep, marginBottom:22 }}>
              See your<br/>
              <em style={{ fontStyle:"italic", color:C.terra }}>future child</em><br/>
              come to life.
            </h1>
            <p style={{ fontSize:"clamp(14px,1.4vw,16px)", lineHeight:1.8, color:C.soft, fontWeight:300, maxWidth:420, marginBottom:36 }}>
              Upload both parents' photos. AI analyzes real facial genetics and generates your child's face at age 7 — hyper-realistic, head and face only.
            </p>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={scrollToGen} style={{ display:"inline-flex", alignItems:"center", gap:10, background:C.deep, color:C.cream, padding:"15px 32px", borderRadius:100, fontSize:15, fontWeight:500, border:"none", cursor:"pointer", boxShadow:"0 10px 30px rgba(21,16,12,.32)" }}>
                ✨ Generate My Baby — Free
              </button>
              <span style={{ fontSize:12, color:C.soft }}>No sign-up · No credit card</span>
            </div>
            {/* Stats row */}
            <div style={{ display:"flex", gap:32, marginTop:48, paddingTop:28, borderTop:"1px solid "+C.pale }}>
              {[["2M+","Portraits Generated"],["98%","Accuracy Rate"],["Free","Always"]].map(function(s){
                return (
                  <div key={s[0]}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:400, lineHeight:1, color:C.deep }}>{s[0]}</div>
                    <div style={{ fontSize:10, letterSpacing:".07em", textTransform:"uppercase", color:C.soft, marginTop:3 }}>{s[1]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: hero cards visual — centered */}
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center" }}>
            <HeroCards/>
          </div>
        </div>
      </div>

      {/* ══ AD 1 — below hero ══ */}
      <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
        <Ad label="AdSense 728×90 leaderboard (desktop) / 320×90 (mobile) — highest CTR position"/>
      </div>

      {/* ══ GENERATOR ══ */}
      <section ref={genRef} id="gen" style={{ padding:"72px 0" }}>
        <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"start" }}>

            {/* Left: info */}
            <div>
              <SL t="Try It Free"/>
              <H2>Upload &amp; meet your<br/><em style={{ fontStyle:"italic", color:C.terra }}>future child</em></H2>
              <div style={{ background:C.pale, borderRadius:16, padding:"16px 18px", marginBottom:24, border:"1px solid "+C.blush }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.mid, marginBottom:10 }}>📸 Tips for best results:</div>
                {["Clear, well-lit front-facing photo","Face fully visible — no sunglasses","One person per photo only","Use a recent photo for accuracy"].map(function(t){
                  return <div key={t} style={{ fontSize:13, color:C.soft, marginBottom:5, display:"flex", gap:8 }}><span style={{ color:C.terra }}>—</span>{t}</div>;
                })}
              </div>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:12 }}>
                {["Photorealistic HD result","100% based on your real features","Photos never stored or shared","Results in under 30 seconds"].map(function(t){
                  return (
                    <li key={t} style={{ display:"flex", alignItems:"center", gap:10, fontSize:14, color:C.mid }}>
                      <span style={{ width:20, height:20, borderRadius:"50%", background:C.pale, border:"1.5px solid "+C.blush, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke={C.terra} strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </span>
                      {t}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Right: upload widget */}
            <div style={{ background:C.cream, borderRadius:24, padding:24, border:"1px solid "+C.pale, boxShadow:"0 4px 32px rgba(21,16,12,.06)" }}>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 30px 1fr", gap:10, alignItems:"start", marginBottom:18 }}>
                <UploadZone who="dad" label="Dad's Photo" photo={dad} onPhoto={setDad}/>
                <div style={{ width:30, height:30, background:C.warm, border:"1.5px solid "+C.blush, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:C.terra, fontSize:16, marginTop:50, justifySelf:"center" }}>+</div>
                <UploadZone who="mom" label="Mom's Photo" photo={mom} onPhoto={setMom}/>
              </div>

              <div style={{ fontSize:11, letterSpacing:".09em", textTransform:"uppercase", color:C.soft, marginBottom:10, fontWeight:500 }}>Generate as:</div>
              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                {[["👦","Boy","boy"],["👧","Girl","girl"],["✨","Surprise","surprise"]].map(function(g){
                  const sel = gender===g[2];
                  return (
                    <button key={g[2]} onClick={function(){ setGender(g[2]); }}
                      style={{ flex:1, padding:"12px 6px", borderRadius:14, border:"2px solid "+(sel?C.terra:C.blush), background:sel?C.pale:C.warm, cursor:"pointer", outline:"none", transition:"all .18s" }}>
                      <div style={{ fontSize:22, marginBottom:3 }}>{g[0]}</div>
                      <div style={{ fontSize:9, color:C.mid, letterSpacing:".07em", textTransform:"uppercase", fontWeight:500 }}>{g[1]}</div>
                    </button>
                  );
                })}
              </div>

              {!both && (
                <div style={{ textAlign:"center", padding:"10px", background:C.pale, borderRadius:12, fontSize:12, color:C.soft, marginBottom:14 }}>
                  {!dad&&!mom ? "⬆️ Upload both photos to begin" : !dad ? "📸 Still need Dad's photo" : "📸 Still need Mom's photo"}
                </div>
              )}

              {err && (
                <div style={{ background:"#FEE2E2", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#B91C1C", marginBottom:14, lineHeight:1.55 }}>
                  {"⚠️ "+err}
                </div>
              )}

              <button onClick={generate} disabled={!both||loading}
                style={{ width:"100%", padding:16, background:both?C.deep:"#C0B4AC", color:C.cream, border:"none", borderRadius:100, fontSize:15, fontWeight:500, cursor:both?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:9, boxShadow:both?"0 8px 24px rgba(21,16,12,.38)":"none", outline:"none" }}>
                <span style={{ fontSize:17 }}>✨</span>
                <span>{both ? "Generate My Future "+(gender==="girl"?"Daughter":gender==="boy"?"Son":"Child") : "Upload Both Photos First"}</span>
              </button>

              <p style={{ textAlign:"center", marginTop:10, fontSize:10, color:C.soft, lineHeight:1.6 }}>
                🔒 Photos processed securely · Never stored · Never shared
              </p>

              {/* RESULT */}
              {result && (
                <div ref={resultRef} style={{ marginTop:22, animation:"fadeUp .6s ease" }}>
                  <div style={{ background:C.warm, borderRadius:20, overflow:"hidden", border:"1.5px solid "+C.blush, boxShadow:"0 20px 60px rgba(21,16,12,.12)" }}>
                    <div style={{ padding:"18px 18px 0", textAlign:"center" }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontStyle:"italic", color:C.deep, marginBottom:3 }}>
                        {"Meet your future "+(gender==="girl"?"daughter":gender==="boy"?"son":"child")+" ✨"}
                      </div>
                      <div style={{ fontSize:11, color:C.soft, letterSpacing:".08em", textTransform:"uppercase", marginBottom:14 }}>AI Generated · Age 7 Portrait</div>
                    </div>
                    <div style={{ margin:"0 16px 14px", position:"relative" }}>
                      <div style={{ borderRadius:16, overflow:"hidden", background:"#E8D5C0", aspectRatio:"4/5" }}>
                        <img src={result} alt="Future child" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top center", display:"block" }}/>
                      </div>
                      <div style={{ position:"absolute", bottom:10, left:10, background:"rgba(21,16,12,.55)", backdropFilter:"blur(4px)", borderRadius:8, padding:"3px 10px", fontSize:9, color:"rgba(255,255,255,.72)", letterSpacing:".06em" }}>urbaby.ai · Free Preview</div>
                    </div>
                    {features && (
                      <div style={{ margin:"0 16px 14px", background:C.pale, borderRadius:12, padding:"11px 14px", border:"1px solid "+C.blush }}>
                        <div style={{ fontSize:10, letterSpacing:".09em", textTransform:"uppercase", color:C.soft, marginBottom:5, fontWeight:500 }}>🧬 Genetic Blend Detected</div>
                        <p style={{ fontSize:13, color:C.mid, lineHeight:1.65 }}>{features}</p>
                      </div>
                    )}
                    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <button onClick={doDownload} style={{ padding:"12px 8px", background:C.deep, color:C.cream, border:"none", borderRadius:100, fontSize:13, fontWeight:500, cursor:"pointer" }}>⬇ Download HD</button>
                        <button onClick={doShare}    style={{ padding:"12px 8px", background:C.pale, color:C.mid, border:"1.5px solid "+C.blush, borderRadius:100, fontSize:13, fontWeight:500, cursor:"pointer" }}>↗ Share</button>
                      </div>
                      <button onClick={reset} style={{ padding:11, background:"transparent", color:C.soft, border:"1px solid "+C.blush, borderRadius:100, fontSize:13, cursor:"pointer" }}>↺ Try with New Photos</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ AD 2 — after generator (best RPM spot) ══ */}
      <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
        <Ad label="AdSense 300×250 rectangle — highest RPM, post-interaction"/>
      </div>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" style={{ padding:"72px 0", background:C.cream }}>
        <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
          <SL t="How It Works"/>
          <H2>Real genetics,<br/><em style={{ fontStyle:"italic", color:C.terra }}>real resemblance</em></H2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
            {[
              ["01","Upload both photos","One clear photo of Dad, one of Mom. AI maps hundreds of facial landmarks from each separately."],
              ["02","Choose the gender","Select boy, girl, or Surprise. The portrait adapts while preserving every inherited trait."],
              ["03","AI blends genetics","Dominant and recessive traits blended — eyes from one, nose from the other, skin tone in between."],
              ["04","See your child's face","A photorealistic portrait — face and head only — your child at age 7."],
            ].map(function(s){
              return (
                <div key={s[0]} style={{ background:C.warm, borderRadius:18, padding:"24px 20px", border:"1px solid "+C.pale }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:44, color:C.blush, lineHeight:1, marginBottom:14 }}>{s[0]}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:C.deep, marginBottom:8 }}>{s[1]}</div>
                  <p style={{ fontSize:13, lineHeight:1.75, color:C.soft, fontWeight:300 }}>{s[2]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ AD 3 — mid scroll ══ */}
      <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
        <Ad label="AdSense 728×90 leaderboard — mid-scroll placement"/>
      </div>

      {/* ══ FAQ ══ */}
      <section style={{ padding:"72px 0" }}>
        <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"start" }}>
            <div>
              <SL t="FAQ"/>
              <H2>Frequently asked<br/><em style={{ fontStyle:"italic", color:C.terra }}>questions</em></H2>
              <p style={{ fontSize:14, lineHeight:1.8, color:C.soft, fontWeight:300 }}>Everything you need to know about how UrBaby.ai works, its accuracy, and your privacy.</p>
            </div>
            <div>
              {FAQS.map(function(f,i){
                const open = faqOpen===i;
                return (
                  <div key={i} onClick={function(){ setFaqOpen(open?null:i); }} style={{ borderBottom:"1px solid "+C.pale, padding:"18px 0", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:C.deep, lineHeight:1.3 }}>{f[0]}</span>
                      <span style={{ fontSize:22, color:C.terra, flexShrink:0, display:"inline-block", transition:"transform .3s", transform:open?"rotate(45deg)":"none" }}>+</span>
                    </div>
                    {open && <p style={{ fontSize:14, lineHeight:1.75, color:C.soft, fontWeight:300, paddingTop:12 }}>{f[1]}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══ REVIEWS ══ */}
      <section style={{ padding:"72px 0", background:C.cream, overflow:"hidden" }}>
        <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
          <SL t="Reviews"/>
          <H2>Loved by <em style={{ fontStyle:"italic", color:C.terra }}>millions</em> of parents</H2>
        </div>
        <div style={{ paddingLeft:"clamp(20px,5vw,80px)", display:"flex", gap:16, overflowX:"auto", paddingBottom:12, scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch" }}>
          {[
            ["👩🏻","Sarah M.","New York","I cried when I saw it. She looked exactly like a mix of both of us."],
            ["👨🏽","Carlos M.","Miami","Tried 3 different apps. UrBaby.ai is in a completely different league."],
            ["👩🏽","Priya S.","London","We framed the AI portrait. Our baby isn't born yet and we already have their portrait!"],
            ["👨🏻","David C.","San Francisco","Our son looks almost identical to the AI portrait from 2 years ago."],
            ["👩🏿","Aisha W.","Atlanta","Generated boy and girl. Can't wait to compare with reality!"],
            ["👨🏻","Marco L.","Rome","Incredibile! The resemblance to both of us is uncanny."],
          ].map(function(r){
            return (
              <div key={r[1]} style={{ minWidth:280, maxWidth:320, background:C.warm, borderRadius:18, padding:24, border:"1px solid "+C.pale, scrollSnapAlign:"start", flexShrink:0 }}>
                <div style={{ color:C.gold, fontSize:12, letterSpacing:2, marginBottom:10 }}>★★★★★</div>
                <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontStyle:"italic", color:C.deep, lineHeight:1.7, marginBottom:16 }}>{'"'+r[3]+'"'}</p>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:C.pale, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{r[0]}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:C.deep }}>{r[1]}</div>
                    <div style={{ fontSize:11, color:C.soft }}>{r[2]}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ BLOG ══ */}
      <section style={{ padding:"72px 0" }}>
        <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
          <SL t="From the Blog"/>
          <H2>Learn about<br/><em style={{ fontStyle:"italic", color:C.terra }}>baby genetics</em></H2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16 }}>
            {POSTS.map(function(post){
              return (
                <article key={post.title} style={{ background:C.cream, borderRadius:18, padding:"22px 20px", border:"1px solid "+C.pale, display:"flex", flexDirection:"column" }}>
                  <span style={{ display:"inline-block", background:C.pale, border:"1px solid "+C.blush, padding:"3px 11px", borderRadius:100, fontSize:10, letterSpacing:".09em", textTransform:"uppercase", color:C.terra, marginBottom:12 }}>{post.tag}</span>
                  <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:C.deep, marginBottom:10, lineHeight:1.3, flex:1 }}>{post.title}</h3>
                  <p style={{ fontSize:13, color:C.soft, lineHeight:1.72, fontWeight:300, marginBottom:16 }}>{post.excerpt}</p>
                  <button onClick={function(){ setArticle(post); }}
                    style={{ display:"inline-flex", alignItems:"center", gap:6, color:C.terra, fontSize:12, fontWeight:600, background:"none", border:"none", cursor:"pointer", padding:0, letterSpacing:".02em" }}>
                    Read full article →
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ AD 4 — pre-footer ══ */}
      <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
        <Ad label="AdSense 300×250 rectangle — pre-footer, high viewability"/>
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={{ background:C.deep, padding:"56px 0 32px" }}>
        <div style={{ maxWidth:maxW, margin:"0 auto", padding:"0 "+pad }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:48, marginBottom:48, flexWrap:"wrap" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
                <LogoSVG size={28}/>
                <Brand light={true}/>
              </div>
              <p style={{ fontSize:13, lineHeight:1.75, color:"rgba(247,240,232,.42)", maxWidth:260 }}>
                The world's most accurate free AI baby face generator. Powered by real facial genetics AI.
              </p>
            </div>
            {[["Product",["How it works","Try it free","FAQ","Blog"]],["Company",["About","Contact","Press","Careers"]],["Legal",["Privacy Policy","Terms","GDPR","Cookies"]],["Social",["Instagram","TikTok","Twitter/X","YouTube"]]].map(function(col){
              return (
                <div key={col[0]}>
                  <div style={{ fontSize:10, letterSpacing:".13em", textTransform:"uppercase", color:"rgba(247,240,232,.28)", marginBottom:14, fontWeight:600 }}>{col[0]}</div>
                  {col[1].map(function(l){ return <div key={l} style={{ fontSize:13, color:"rgba(247,240,232,.44)", marginBottom:10, cursor:"pointer" }}>{l}</div>; })}
                </div>
              );
            })}
          </div>
          <div style={{ paddingTop:20, borderTop:"1px solid rgba(247,240,232,.08)", fontSize:12, color:"rgba(247,240,232,.3)" }}>
            © 2025 UrBaby.ai — All rights reserved · Free AI Baby Face Generator
          </div>
        </div>
      </footer>
    </div>
  );
}
