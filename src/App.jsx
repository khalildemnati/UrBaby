import { useState, useRef, useEffect } from "react";
import { validateFace, drawLandmarkOverlay } from "./faceEngine.js";

const C = {
  cream:"#F7F0E8", warm:"#FDFAF6", blush:"#E8C4B0",
  terra:"#C4714A", deep:"#15100C", mid:"#3D2E22",
  soft:"#7A5E4E", gold:"#C9A96E", pale:"#F0E4D6",
  greenB:"#4CAF50", redB:"#EF5350", redL:"#FFEBEE",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Outfit:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Outfit',sans-serif;background:${C.warm};color:${C.deep};overflow-x:hidden}
button,input{font-family:'Outfit',sans-serif}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pls{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.9)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes sd{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-9px)}}
@keyframes beat{0%,100%{transform:scale(1)}40%{transform:scale(1.1)}}

.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}

/* ── Reviews scroll ── */
.rv-scroll{display:flex;gap:16px;overflow-x:auto;padding-bottom:12px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.rv-scroll::-webkit-scrollbar{display:none}
.rv-scroll>*{scroll-snap-align:start;flex-shrink:0}

/* ── Desktop nav links ── */
.dnl{display:none}
@media(min-width:900px){.dnl{display:inline}}

/* ── Hero layout ── */
.hero-wrap{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
@media(max-width:900px){
  .hero-wrap{grid-template-columns:1fr!important;gap:0}
  .hero-cards-col{display:flex;justify-content:center;margin-top:40px}
}

/* ── Generator layout ── */
.gen-wrap{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:start}
@media(max-width:900px){.gen-wrap{grid-template-columns:1fr!important}}

/* ── How it works ── */
.how-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:900px){.how-grid{grid-template-columns:1fr 1fr}}
@media(max-width:500px){.how-grid{grid-template-columns:1fr}}

/* ── FAQ layout ── */
.faq-wrap{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:start}
@media(max-width:900px){.faq-wrap{grid-template-columns:1fr!important}}

/* ── Upload row ── */
.upl-row{display:grid;grid-template-columns:1fr 28px 1fr;gap:10px;align-items:start;margin-bottom:18px}
@media(max-width:400px){.upl-row{grid-template-columns:1fr 20px 1fr;gap:7px}}

/* ── Gender buttons ── */
.gender-row{display:flex;gap:8px;margin-bottom:16px}
.gender-row button{flex:1;padding:12px 6px;border-radius:14px;border:2px solid ${C.blush};background:${C.warm};cursor:pointer;outline:none;transition:all .18s;text-align:center}
.gender-row button.sel{border-color:${C.terra};background:${C.pale}}
.gender-row button .gi{font-size:22px;margin-bottom:3px}
.gender-row button .gl{font-size:9px;color:${C.mid};letter-spacing:.07em;text-transform:uppercase;font-weight:500}

/* ── Result actions ── */
.res-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:400px){.res-acts{grid-template-columns:1fr}}

/* ── Footer ── */
.footer-inner{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr 1fr;gap:40px;margin-bottom:48px}
@media(max-width:900px){
  .footer-inner{grid-template-columns:1fr 1fr 1fr!important;gap:28px}
  .footer-brand{grid-column:1/-1}
}
@media(max-width:500px){
  .footer-inner{grid-template-columns:1fr 1fr!important}
  .footer-brand{grid-column:1/-1}
}

/* ── Blog grid ── */
.blog-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
`;

const GEN_STAGES = [
  "Analyzing facial structure...",
  "Mapping genetic features...",
  "Blending parent traits...",
  "Computing eye & nose shape...",
  "Rendering skin tone & hair...",
  "Generating portrait...",
  "Finalizing your child's face...",
];

const FAQS = [
  ["What will my baby look like?","Facial genetics are determined by hundreds of genes from both parents. Eye color, nose shape, lip fullness, skin tone, and hair texture all emerge from a mix of dominant and recessive traits. UrBaby.ai maps both parents' landmarks and generates a realistic portrait of what your child might look like at age 7."],
  ["How does face verification work?","We use MediaPipe FaceMesh — a 468-point facial landmark model — entirely in your browser for blur/pose/resolution checks. Then Claude AI does a content check to reject non-human images like screens or cartoons."],
  ["Are my photos stored or shared?","No. Photos are used only for real-time processing and immediately discarded. Never stored on servers, never sold, never shared with anyone."],
  ["What makes a good photo?","Clear, well-lit, front-facing photo. Face should take up at least 20% of the frame. No heavy sunglasses, masks, or extreme shadows."],
  ["Can I generate boy and girl versions?","Yes — run it twice with Boy and Girl selected to compare both."],
  ["Is UrBaby.ai free?","Yes, 100% free, supported by advertising. No account required."],
];

const POSTS = [
  { tag:"Science", title:"What Will My Baby Look Like? The Science of Facial Genetics", excerpt:"Facial features are determined by hundreds of genes from both parents. Dominant traits like dark eyes appear first, but recessive traits can produce surprising results...", full:"Facial genetics is one of the most fascinating areas of modern biology. When two people have a child, the baby inherits roughly half of its DNA from each parent. This DNA contains precise instructions for everything from eye color to nose bridge width.\n\nDominant traits — like dark hair, dark eyes, and broader noses — tend to appear more often in children. But recessive traits can skip generations and reappear unexpectedly, which is why a child can have blue eyes even if both parents have brown.\n\nModern AI tools like UrBaby.ai use facial landmark detection to map each parent's unique facial geometry, then apply genetic probability models to generate a realistic portrait of what a child might look like at age 7." },
  { tag:"Guide", title:"How AI Baby Face Generators Actually Work", excerpt:"Real AI baby face generation uses facial landmark detection, genetic probability modeling, and state-of-the-art diffusion models to produce realistic results...", full:"AI baby face generators work by combining three technologies: computer vision, genetic modeling, and generative AI.\n\nStep 1 — Facial landmark detection: The AI identifies hundreds of precise points on each parent's face — the exact position of the eye corners, the tip of the nose, the edges of the lips, the jaw curve.\n\nStep 2 — Feature extraction and genetic modeling: From these landmarks, the system extracts specific traits and applies a genetic probability model to determine which features are dominant, which are recessive, and how they blend.\n\nStep 3 — Portrait generation: A Flux Pro diffusion model generates a photorealistic portrait from a detailed text description of the blended features. The result is not a random child, but a portrait specifically designed to reflect both parents' genetic contributions." },
  { tag:"Fun", title:"The Uncanny Accuracy of AI Baby Predictions", excerpt:"Users who already have children are consistently shocked by how closely UrBaby.ai portraits match their real kids. Here's why it works so well...", full:"One of the most striking things about UrBaby.ai is what happens when people who already have children run their photos through the system.\n\nAgain and again, users report that the AI-generated portrait bears an uncanny resemblance to their actual child — sometimes to a degree that feels unsettling.\n\nThe reason is that facial genetics, while complex, follows predictable patterns. Eye shape, nose bridge, lip thickness, and face contour are all highly heritable. When the AI correctly maps these features from both parents and applies inheritance probabilities, the result tends to converge on what a real child would look like." },
];

/* ── Logo ── */
function LogoSVG({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
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

function Brand({ light }) {
  const a = light ? C.gold : C.terra, b = light ? C.cream : C.deep;
  return (
    <span style={{ display:"flex", alignItems:"baseline" }}>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:600, color:b }}>Ur</span>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontStyle:"italic", color:a }}>Baby</span>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontStyle:"italic", color:a }}>.ai</span>
    </span>
  );
}

/* ── Hero cards — 3 cards like reference screenshot ── */
function HeroCards() {
  const PersonIcon = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="10" r="5.5" fill="rgba(255,255,255,.55)"/>
      <path d="M3 25c0-6.075 4.925-11 11-11s11 4.925 11 11" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  return (
    <div style={{ position:"relative", width:310, height:340 }}>
      {/* DAD — top left */}
      <div style={{ position:"absolute", top:0, left:0, width:128, height:162, background:"linear-gradient(145deg,#D4A070,#B07040)", borderRadius:24, transform:"rotate(-7deg)", boxShadow:"0 18px 44px rgba(21,16,12,.18)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center" }}><PersonIcon/></div>
        <span style={{ fontSize:11, fontWeight:500, letterSpacing:".18em", textTransform:"uppercase", color:"rgba(255,255,255,.65)" }}>Dad</span>
      </div>
      {/* MOM — top right */}
      <div style={{ position:"absolute", top:0, right:0, width:128, height:162, background:"linear-gradient(145deg,#EAC8A8,#C8986A)", borderRadius:24, transform:"rotate(7deg)", boxShadow:"0 18px 44px rgba(21,16,12,.15)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center" }}><PersonIcon/></div>
        <span style={{ fontSize:11, fontWeight:500, letterSpacing:".18em", textTransform:"uppercase", color:"rgba(255,255,255,.6)" }}>Mom</span>
      </div>
      {/* PLUS badge */}
      <div style={{ position:"absolute", top:75, left:"50%", transform:"translateX(-50%)", width:36, height:36, borderRadius:"50%", background:C.warm, border:`1.5px solid ${C.blush}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:C.terra, zIndex:4 }}>+</div>
      {/* CHILD — centered bottom, floating */}
      <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:164, height:204, background:"linear-gradient(160deg,#F5E8D5,#E8CCA8)", borderRadius:28, boxShadow:"0 28px 64px rgba(21,16,12,.22)", zIndex:3, animation:"float 3.5s ease-in-out infinite", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
        <div style={{ width:70, height:70, borderRadius:"50%", background:"rgba(255,255,255,.38)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="13" r="7" fill={C.terra+"55"}/>
            <path d="M4 32c0-7.732 7.163-14 14-14s14 6.268 14 14" stroke={C.terra+"55"} strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:600, fontStyle:"italic", color:C.mid }}>Your Future Child</div>
          <div style={{ fontSize:9, fontWeight:500, letterSpacing:".16em", textTransform:"uppercase", color:C.gold, marginTop:5 }}>Age 7 · AI Portrait</div>
        </div>
      </div>
    </div>
  );
}

/* ── Loading overlay ── */
function LoadingOverlay({ stage }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(21,16,12,.94)", backdropFilter:"blur(14px)", zIndex:9999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, padding:28 }}>
      <div style={{ position:"relative", width:90, height:90, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"absolute", width:90, height:90, borderRadius:"50%", border:"2.5px solid rgba(247,240,232,.06)", borderTopColor:C.terra, animation:"spin 1.1s linear infinite" }}/>
        <div style={{ animation:"beat 1.5s ease infinite" }}><LogoSVG size={52}/></div>
      </div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontStyle:"italic", color:C.cream, textAlign:"center", minHeight:54, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {GEN_STAGES[Math.min(stage, GEN_STAGES.length - 1)]}
      </div>
      <div style={{ fontSize:11, color:"rgba(247,240,232,.38)", letterSpacing:".13em", textTransform:"uppercase" }}>approx. 20–35 seconds</div>
      <div style={{ display:"flex", gap:5 }}>
        {GEN_STAGES.map((_, i) => (
          <div key={i} style={{ height:5, borderRadius:3, transition:"all .4s", background:i<=stage?C.terra:"rgba(247,240,232,.13)", width:i<=stage?18:5 }}/>
        ))}
      </div>
    </div>
  );
}

/* ── Article modal ── */
function ArticleModal({ post, onClose }) {
  if (!post) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(21,16,12,.75)", backdropFilter:"blur(8px)", zIndex:8888, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.warm, borderRadius:"24px 24px 0 0", padding:"28px 24px 48px", maxHeight:"82vh", overflowY:"auto", width:"100%", maxWidth:700, animation:"fadeUp .3s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:20 }}>
          <div>
            <span style={{ display:"inline-block", background:C.pale, border:`1px solid ${C.blush}`, padding:"3px 11px", borderRadius:100, fontSize:10, letterSpacing:".09em", textTransform:"uppercase", color:C.terra, marginBottom:10 }}>{post.tag}</span>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:600, color:C.deep, lineHeight:1.3 }}>{post.title}</h2>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:"50%", background:C.pale, border:"none", cursor:"pointer", flexShrink:0, fontSize:17, color:C.soft, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        {post.full.split("\n\n").map((p,i)=>(
          <p key={i} style={{ fontSize:14, lineHeight:1.84, color:C.mid, fontWeight:300, marginBottom:16 }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

/* ── Ad slot ── */
function AdSlot({ label }) {
  return (
    <div style={{ background:C.pale, border:`1px dashed ${C.blush}`, borderRadius:14, padding:"14px 16px", textAlign:"center", minHeight:88, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, margin:"6px 0" }}>
      <span style={{ fontSize:9, letterSpacing:".12em", textTransform:"uppercase", color:C.soft, opacity:.5 }}>Advertisement</span>
      <span style={{ fontSize:11, color:C.soft, opacity:.4 }}>{label}</span>
    </div>
  );
}

/* ── SmartUpload ── */
const EMPTY = { photo:null, valid:false, phase:null, stepLabel:"", errMsg:"", warnings:[], landmarks:null, normW:400, normH:400, meta:{} };

function SmartUpload({ who, label, state, onState, onClear }) {
  const gallRef = useRef(null);
  const camRef  = useRef(null);
  const cvRef   = useRef(null);
  const rafRef  = useRef(null);
  const acc = who==="dad" ? C.terra : "#B8604A";
  const { photo, valid, phase, stepLabel, errMsg, warnings=[], landmarks } = state;

  useEffect(()=>{
    if (phase!=="scanning"||!cvRef.current||!landmarks) return;
    let run=true;
    const frame=()=>{ if(!run||!cvRef.current) return; drawLandmarkOverlay(cvRef.current,landmarks,"scanning"); rafRef.current=requestAnimationFrame(frame); };
    rafRef.current=requestAnimationFrame(frame);
    return ()=>{ run=false; cancelAnimationFrame(rafRef.current); };
  },[phase,landmarks]);

  useEffect(()=>{
    if((phase==="success"||phase==="error")&&cvRef.current&&landmarks)
      drawLandmarkOverlay(cvRef.current,landmarks,phase);
  },[phase,landmarks]);

  async function handleFile(e) {
    const f=e.target.files?.[0];
    if(!f||!f.type.startsWith("image/")) return;
    e.target.value="";
    const dataUrl=await new Promise(res=>{ const r=new FileReader(); r.onload=ev=>res(ev.target.result); r.readAsDataURL(f); });
    onState({ ...EMPTY, photo:dataUrl, phase:"scanning", stepLabel:"Detecting face..." });

    // Client-side MediaPipe check
    let result=await validateFace(dataUrl);
    const mime=dataUrl.split(";")[0].split(":")[1]||"image/jpeg";
    const b64=dataUrl.split(",")[1];

    // Server-side content check (screens, cartoons, groups)
    if(result.valid||result.step==="mediapipe_unavailable") {
      onState(prev=>({...prev,stepLabel:"AI content check..."}));
      try {
        const sr=await fetch("/api/validate",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({image:b64,mime}) });
        const sd=await sr.json();
        if(!sd.valid) {
          result={ valid:false, step:"detection", message:sd.reason||"Photo did not pass verification." };
        } else {
          result={ valid:true, step:"done", message:"Face Detected" };
          // Merge server metadata
          result.meta={ ethnicity:sd.ethnicity||"", skinTone:sd.skinTone||"", eyeColor:sd.eyeColor||"", hairColor:sd.hairColor||"" };
          result.warnings=sd.warnings||[];
        }
      } catch(_) {
        // Network error — accept with warning
        result={ valid:true, step:"done", message:"Face Detected", meta:{}, warnings:["Verification service unreachable — proceeding with local check only."] };
      }
    }

    if(result.valid) {
      onState({ photo:dataUrl, valid:true, phase:"success", stepLabel:"Face Detected", errMsg:"", warnings:result.warnings||[], landmarks:result.landmarks||null, normW:result.normW||400, normH:result.normH||400, meta:result.meta||{} });
      setTimeout(()=>onState(prev=>({...prev,phase:"done"})),2500);
    } else {
      onState({ photo:dataUrl, valid:false, phase:"error", stepLabel:"Check Failed", errMsg:result.message||"Please upload a clear front-facing photo.", warnings:[], landmarks:result.landmarks||null, normW:400, normH:400, meta:{} });
    }
  }

  const scanning=phase==="scanning", success=phase==="success"||phase==="done", error=phase==="error";
  const bc=error?C.redB:success?C.greenB:photo?C.terra:C.blush;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <input ref={gallRef} type="file" accept="image/*" className="vh" onChange={handleFile}/>
      <input ref={camRef}  type="file" accept="image/*" capture="user" className="vh" onChange={handleFile}/>

      <div onClick={()=>!scanning&&gallRef.current?.click()}
        style={{ borderRadius:18, overflow:"hidden", position:"relative", minHeight:142, cursor:scanning?"default":"pointer", border:`2px ${photo?"solid":"dashed"} ${bc}`, background:photo?"#000":C.warm, transition:"border-color .25s", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {photo ? (
          <>
            <img src={photo} alt={label} style={{ width:"100%", height:142, objectFit:"cover", objectPosition:"top", opacity:error?.55:1, transition:"opacity .3s" }}/>
            {(scanning||phase==="success"||error)&&(
              <canvas ref={cvRef} width={state.normW||400} height={state.normH||400} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}/>
            )}
            {/* Status bar */}
            {scanning&&(
              <div style={{ position:"absolute", top:0, left:0, right:0, background:"rgba(21,16,12,.72)", backdropFilter:"blur(6px)", padding:"7px 12px", display:"flex", alignItems:"center", gap:7, animation:"sd .3s ease" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:C.terra, animation:"pls 1s infinite", flexShrink:0 }}/>
                <span style={{ fontSize:10, color:"white", letterSpacing:".07em", textTransform:"uppercase", fontWeight:500 }}>{stepLabel}</span>
              </div>
            )}
            {success&&(
              <div style={{ position:"absolute", top:0, left:0, right:0, background:C.greenB, padding:"7px 12px", display:"flex", alignItems:"center", gap:7, animation:"sd .3s ease" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.8 2.8 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <span style={{ fontSize:10, color:"white", letterSpacing:".07em", textTransform:"uppercase", fontWeight:600 }}>Face Detected</span>
              </div>
            )}
            {error&&(
              <div style={{ position:"absolute", top:0, left:0, right:0, background:C.redB, padding:"7px 12px", display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:11, color:"white", fontWeight:700 }}>✕</span>
                <span style={{ fontSize:10, color:"white", letterSpacing:".07em", textTransform:"uppercase", fontWeight:500 }}>Check Failed</span>
              </div>
            )}
            {/* Bottom label */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(to top,rgba(21,16,12,.65),transparent)", padding:"20px 12px 8px" }}>
              <span style={{ fontSize:11, color:"white", fontWeight:500 }}>{error?"⚠ ":"✓ "}{label}</span>
            </div>
            {/* Clear button */}
            {!scanning&&(
              <button onClick={e=>{e.stopPropagation();onClear();}} style={{ position:"absolute", top:36, right:8, width:28, height:28, borderRadius:"50%", background:"rgba(21,16,12,.65)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:14, fontWeight:600 }}>✕</button>
            )}
          </>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:9, padding:"18px 10px", textAlign:"center" }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:`${acc}18`, border:`1.5px solid ${acc}44`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="9" r="4.5" stroke={acc} strokeWidth="1.6"/>
                <path d="M3 21c0-4.97 4.03-9 9-9s9 4.03 9 9" stroke={acc} strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:C.deep }}>{label}</div>
            <div style={{ fontSize:10, color:C.soft }}>Tap to upload · One person only</div>
          </div>
        )}
      </div>

      {/* Error */}
      {errMsg&&(
        <div style={{ background:C.redL, border:`1px solid ${C.redB}44`, borderRadius:10, padding:"9px 12px", fontSize:11, color:C.redB, lineHeight:1.55, animation:"fadeUp .3s ease" }}>{errMsg}</div>
      )}
      {/* Warnings */}
      {!errMsg&&warnings.length>0&&(
        <div style={{ background:"#FFF8E1", border:"1px solid #FFD54F", borderRadius:10, padding:"8px 11px", animation:"fadeUp .3s ease" }}>
          {warnings.map((w,i)=>(
            <div key={i} style={{ fontSize:10, color:"#5D4037", lineHeight:1.5, display:"flex", gap:6, marginBottom:i<warnings.length-1?4:0 }}>
              <span>⚠</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[["📷","Camera",()=>camRef.current?.click()],["🖼️","Gallery",()=>gallRef.current?.click()]].map(([ic,lb,fn])=>(
          <button key={lb} onClick={()=>!scanning&&fn()} disabled={scanning}
            style={{ padding:"10px 4px", borderRadius:12, border:`1.5px solid ${C.blush}`, background:C.warm, cursor:scanning?"not-allowed":"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, opacity:scanning?.5:1, outline:"none" }}>
            <span style={{ fontSize:20 }}>{ic}</span>
            <span style={{ fontSize:9, letterSpacing:".08em", textTransform:"uppercase", color:C.soft }}>{lb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════ Main App ════ */
export default function App() {
  const [dadSt, setDadSt] = useState({...EMPTY});
  const [momSt, setMomSt] = useState({...EMPTY});
  const [gender,  setGender]  = useState("boy");
  const [loading, setLoading] = useState(false);
  const [stage,   setStage]   = useState(0);
  const [result,  setResult]  = useState(null);
  const [features,setFeatures]= useState("");
  const [err,     setErr]     = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);
  const [article, setArticle] = useState(null);
  const timerRef  = useRef(null);
  const resultRef = useRef(null);
  const genRef    = useRef(null);

  const canGen = dadSt.valid && momSt.valid && !loading;
  const anyScanning = dadSt.phase==="scanning" || momSt.phase==="scanning";

  function scrollToGen() { genRef.current?.scrollIntoView({behavior:"smooth"}); }
  function getMime(d){ return d.split(";")[0].split(":")[1]||"image/jpeg"; }
  function getB64(d) { return d.split(",")[1]; }

  function startTimer(){
    let s=0;
    timerRef.current=setInterval(()=>{ s++; setStage(s); if(s>=GEN_STAGES.length-1) clearInterval(timerRef.current); },3200);
  }

  async function generate(){
    if(!canGen) return;
    setErr(null); setResult(null); setFeatures("");
    setLoading(true); setStage(0);
    startTimer();
    try {
      const resp=await fetch("/api/generate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          dadImage:getB64(dadSt.photo), momImage:getB64(momSt.photo),
          dadMime:getMime(dadSt.photo), momMime:getMime(momSt.photo),
          gender, dadMeta:dadSt.meta||{}, momMeta:momSt.meta||{},
        }),
      });
      let data;
      try { data=await resp.json(); } catch(_){ throw new Error("Server returned invalid response. Please try again."); }
      if(!resp.ok||data.error) throw new Error(data?.error||`Server error ${resp.status}`);
      setStage(5);
      setStage(6);
      await new Promise(r=>setTimeout(r,600));
      clearInterval(timerRef.current);
      setResult(data.imgUrl); setFeatures(data.features||""); setLoading(false);
      setTimeout(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),200);
    } catch(e){
      clearInterval(timerRef.current);
      setLoading(false);
      setErr(e.message||"Portrait generation failed. Please try again.");
    }
  }

  function reset(){ setResult(null); setDadSt({...EMPTY}); setMomSt({...EMPTY}); setFeatures(""); setErr(null); }
  function doDownload(){ if(!result) return; const a=document.createElement("a"); a.href=result; a.download="urbaby-future-child.jpg"; a.click(); }
  async function doShare(){
    if(navigator.share) await navigator.share({title:"Meet our future child!",text:"Free AI baby portrait generator.",url:"https://urbaby.ai"});
    else { await navigator.clipboard.writeText("https://urbaby.ai"); alert("Link copied! 💕"); }
  }

  let hint="";
  if(!dadSt.photo&&!momSt.photo) hint="⬆️ Upload both parents' photos to begin";
  else if(!dadSt.photo) hint="📸 Upload Dad's photo";
  else if(!momSt.photo) hint="📸 Upload Mom's photo";
  else if(anyScanning) hint="⏳ Verifying photos...";
  else if(!dadSt.valid&&!momSt.valid) hint="❌ Both photos need re-uploading";
  else if(!dadSt.valid) hint="❌ Please re-upload Dad's photo";
  else if(!momSt.valid) hint="❌ Please re-upload Mom's photo";

  const SL=({t})=><div style={{fontSize:11,letterSpacing:".16em",textTransform:"uppercase",color:C.terra,marginBottom:10,fontWeight:600}}>{t}</div>;
  const H2=({children})=><h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(26px,3.5vw,36px)",fontWeight:400,lineHeight:1.14,color:C.deep,marginBottom:24}}>{children}</h2>;

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", background:C.warm, minHeight:"100vh", color:C.deep }}>
      <style>{CSS}</style>
      {loading  && <LoadingOverlay stage={stage}/>}
      {article  && <ArticleModal post={article} onClose={()=>setArticle(null)}/>}

      {/* ══ NAV ══ */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:500, background:"rgba(253,250,246,.97)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.pale}` }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"11px clamp(16px,5vw,80px)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <LogoSVG size={30}/><Brand/>
          </div>
          <div style={{ display:"flex", gap:24, alignItems:"center" }}>
            {[["#how","How it works"],["#faq","FAQ"],["#reviews","Reviews"]].map(([h,l])=>(
              <a key={h} href={h} className="dnl" style={{ fontSize:13, color:C.soft }}>{l}</a>
            ))}
            <button onClick={scrollToGen} style={{ background:C.deep, color:C.cream, padding:"9px 22px", borderRadius:100, fontSize:13, fontWeight:500, border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>
              Try Free ✨
            </button>
          </div>
        </div>
      </nav>
      <div style={{ height:56 }}/>

      {/* ══ HERO ══ */}
      <section style={{ background:`linear-gradient(165deg,${C.warm} 0%,${C.pale} 55%,rgba(232,196,176,.28) 100%)` }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"64px clamp(16px,5vw,80px) 72px" }}>
          <div className="hero-wrap">
            {/* Left */}
            <div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.pale, border:`1px solid ${C.blush}`, padding:"6px 16px", borderRadius:100, fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:C.soft, marginBottom:28 }}>
                <span style={{ width:6, height:6, background:C.terra, borderRadius:"50%", animation:"pls 2s infinite", display:"inline-block" }}/>
                Real AI · Facial Genetics · 100% Free
              </div>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(40px,5.2vw,64px)", fontWeight:400, lineHeight:1.05, color:C.deep, marginBottom:22 }}>
                See your<br/><em style={{ fontStyle:"italic", color:C.terra }}>future child</em><br/>come to life.
              </h1>
              <p style={{ fontSize:"clamp(14px,1.4vw,16px)", lineHeight:1.8, color:C.soft, fontWeight:300, maxWidth:420, marginBottom:36 }}>
                Upload both parents' photos. AI detects real facial landmarks, analyzes genetic inheritance, and generates your child's face at age 7.
              </p>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"center", marginBottom:44 }}>
                <button onClick={scrollToGen} style={{ display:"inline-flex", alignItems:"center", gap:10, background:C.deep, color:C.cream, padding:"15px 32px", borderRadius:100, fontSize:15, fontWeight:500, border:"none", cursor:"pointer", boxShadow:"0 10px 30px rgba(21,16,12,.3)" }}>
                  ✨ Generate My Baby — Free
                </button>
                <span style={{ fontSize:12, color:C.soft }}>No sign-up · No credit card</span>
              </div>
              <div style={{ display:"flex", gap:36, paddingTop:28, borderTop:`1px solid ${C.pale}`, flexWrap:"wrap" }}>
                {[["2M+","Portraits Generated"],["98%","Accuracy Rate"],["Free","Always"]].map(([n,l])=>(
                  <div key={n}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:400, lineHeight:1, color:C.deep }}>{n}</div>
                    <div style={{ fontSize:10, letterSpacing:".07em", textTransform:"uppercase", color:C.soft, marginTop:3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Right — hero cards (hidden on mobile via CSS, shown centered below text) */}
            <div className="hero-cards-col" style={{ display:"flex", justifyContent:"center", alignItems:"center" }}>
              <HeroCards/>
            </div>
          </div>
        </div>
      </section>

      {/* ══ AD 1 ══ */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
        <AdSlot label="AdSense 728×90 leaderboard — top placement, highest CTR"/>
      </div>

      {/* ══ GENERATOR ══ */}
      <section ref={genRef} id="gen" style={{ padding:"72px 0" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
          <div className="gen-wrap">
            {/* Info panel */}
            <div>
              <SL t="Try It Free"/>
              <H2>Upload &amp; meet your<br/><em style={{ fontStyle:"italic", color:C.terra }}>future child</em></H2>
              <div style={{ background:C.pale, borderRadius:16, padding:"16px 18px", marginBottom:24, border:`1px solid ${C.blush}` }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.mid, marginBottom:10 }}>📸 Photo requirements:</div>
                {["Clear, well-lit front-facing photo","One person per photo only","Both eyes and nose clearly visible","No heavy filters or extreme shadows"].map(t=>(
                  <div key={t} style={{ fontSize:13, color:C.soft, marginBottom:5, display:"flex", gap:8 }}>
                    <span style={{ color:C.terra, flexShrink:0 }}>—</span>{t}
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  ["Real-time face detection","MediaPipe FaceMesh validates every photo in your browser"],
                  ["Ethnicity-aware generation","Skin tone and features match the parents' real genetics"],
                  ["Privacy-first","Photos never stored or shared — processed then discarded"],
                ].map(([title,desc])=>(
                  <div key={title} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", background:C.pale, border:`1.5px solid ${C.blush}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke={C.terra} strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:C.deep }}>{title}</div>
                      <div style={{ fontSize:12, color:C.soft, marginTop:2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload widget */}
            <div style={{ background:C.cream, borderRadius:24, padding:24, border:`1px solid ${C.pale}`, boxShadow:"0 4px 32px rgba(21,16,12,.06)" }}>
              <div className="upl-row">
                <SmartUpload who="dad" label="Dad's Photo" state={dadSt} onState={v=>setDadSt(p=>({...p,...(typeof v==="function"?v(p):v)}))} onClear={()=>setDadSt({...EMPTY})}/>
                <div style={{ width:28, height:28, background:C.warm, border:`1.5px solid ${C.blush}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:C.terra, fontSize:16, marginTop:55, justifySelf:"center" }}>+</div>
                <SmartUpload who="mom" label="Mom's Photo" state={momSt} onState={v=>setMomSt(p=>({...p,...(typeof v==="function"?v(p):v)}))} onClear={()=>setMomSt({...EMPTY})}/>
              </div>

              <div style={{ fontSize:11, letterSpacing:".09em", textTransform:"uppercase", color:C.soft, marginBottom:10, fontWeight:500 }}>Generate as:</div>
              <div className="gender-row">
                {[["👦","Boy","boy"],["👧","Girl","girl"],["✨","Surprise","surprise"]].map(([ic,lb,val])=>(
                  <button key={val} onClick={()=>setGender(val)} className={gender===val?"sel":""}>
                    <div className="gi">{ic}</div>
                    <div className="gl">{lb}</div>
                  </button>
                ))}
              </div>

              {hint&&!canGen&&(
                <div style={{ textAlign:"center", padding:"10px 12px", background:C.pale, borderRadius:12, fontSize:12, color:C.soft, marginBottom:14 }}>{hint}</div>
              )}
              {err&&(
                <div style={{ background:C.redL, border:`1px solid ${C.redB}44`, borderRadius:12, padding:"12px 14px", fontSize:13, color:C.redB, marginBottom:14, lineHeight:1.55 }}>⚠️ {err}</div>
              )}

              <button onClick={generate} disabled={!canGen}
                style={{ width:"100%", padding:16, background:canGen?C.deep:"#C0B4AC", color:C.cream, border:"none", borderRadius:100, fontSize:15, fontWeight:500, cursor:canGen?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:9, boxShadow:canGen?"0 8px 24px rgba(21,16,12,.38)":"none", outline:"none", transition:"all .25s" }}>
                <span style={{ fontSize:17 }}>✨</span>
                <span>{canGen ? `Generate My Future ${gender==="girl"?"Daughter":gender==="boy"?"Son":"Child"}` : anyScanning?"Verifying photos...":"Upload & Verify Both Photos"}</span>
              </button>
              <p style={{ textAlign:"center", marginTop:10, fontSize:10, color:C.soft, lineHeight:1.6 }}>🔒 Verified & processed securely · Never stored · Never shared</p>

              {/* Result */}
              {result&&(
                <div ref={resultRef} style={{ marginTop:24, animation:"fadeUp .6s ease" }}>
                  <div style={{ background:C.warm, borderRadius:20, overflow:"hidden", border:`1.5px solid ${C.blush}`, boxShadow:"0 20px 60px rgba(21,16,12,.12)" }}>
                    <div style={{ padding:"18px 18px 0", textAlign:"center" }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontStyle:"italic", color:C.deep, marginBottom:3 }}>
                        {`Meet your future ${gender==="girl"?"daughter":gender==="boy"?"son":"child"} ✨`}
                      </div>
                      <div style={{ fontSize:11, color:C.soft, letterSpacing:".08em", textTransform:"uppercase", marginBottom:14 }}>AI Generated · Age 7 Portrait</div>
                    </div>
                    <div style={{ margin:"0 16px 14px", position:"relative" }}>
                      <div style={{ borderRadius:16, overflow:"hidden", background:"#E8D5C0", aspectRatio:"4/5" }}>
                        <img src={result} alt="Future child portrait" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top center" }}/>
                      </div>
                      <div style={{ position:"absolute", bottom:10, left:10, background:"rgba(21,16,12,.55)", backdropFilter:"blur(4px)", borderRadius:8, padding:"3px 10px", fontSize:9, color:"rgba(255,255,255,.72)", letterSpacing:".06em" }}>urbaby.ai · Free Preview</div>
                    </div>
                    {features&&(
                      <div style={{ margin:"0 16px 14px", background:C.pale, borderRadius:12, padding:"11px 14px", border:`1px solid ${C.blush}` }}>
                        <div style={{ fontSize:10, letterSpacing:".09em", textTransform:"uppercase", color:C.soft, marginBottom:5, fontWeight:500 }}>🧬 Genetic Blend</div>
                        <p style={{ fontSize:13, color:C.mid, lineHeight:1.65 }}>{features}</p>
                      </div>
                    )}
                    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                      <div className="res-acts">
                        <button onClick={doDownload} style={{ padding:"12px 8px", background:C.deep, color:C.cream, border:"none", borderRadius:100, fontSize:13, fontWeight:500, cursor:"pointer" }}>⬇ Download HD</button>
                        <button onClick={doShare}    style={{ padding:"12px 8px", background:C.pale, color:C.mid, border:`1.5px solid ${C.blush}`, borderRadius:100, fontSize:13, fontWeight:500, cursor:"pointer" }}>↗ Share</button>
                      </div>
                      <button onClick={reset} style={{ padding:11, background:"transparent", color:C.soft, border:`1px solid ${C.blush}`, borderRadius:100, fontSize:13, cursor:"pointer" }}>↺ Try with New Photos</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ AD 2 ══ */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
        <AdSlot label="AdSense 300×250 — highest RPM, post-interaction"/>
      </div>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" style={{ padding:"72px 0", background:C.cream }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
          <SL t="How It Works"/>
          <H2>Real genetics,<br/><em style={{ fontStyle:"italic", color:C.terra }}>real resemblance</em></H2>
          <div className="how-grid">
            {[["01","Upload photos","One clear photo of Dad, one of Mom. Front-facing, good lighting."],["02","AI verifies","MediaPipe FaceMesh + Claude AI checks every photo for a valid face."],["03","Genetics blended","Skin tone, eyes, nose, hair — all blended from both parents' real features."],["04","See your child","Photorealistic portrait — face only — your child at age 7."]].map(([n,t,d])=>(
              <div key={n} style={{ background:C.warm, borderRadius:18, padding:"22px 18px", border:`1px solid ${C.pale}` }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:44, color:C.blush, lineHeight:1, marginBottom:14 }}>{n}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:C.deep, marginBottom:8 }}>{t}</div>
                <p style={{ fontSize:13, lineHeight:1.75, color:C.soft, fontWeight:300 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ AD 3 ══ */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
        <AdSlot label="AdSense 728×90 — mid-scroll"/>
      </div>

      {/* ══ FAQ ══ */}
      <section id="faq" style={{ padding:"72px 0" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
          <div className="faq-wrap">
            <div>
              <SL t="FAQ"/>
              <H2>Frequently asked<br/><em style={{ fontStyle:"italic", color:C.terra }}>questions</em></H2>
              <p style={{ fontSize:14, lineHeight:1.8, color:C.soft, fontWeight:300 }}>Everything about how UrBaby.ai works, accuracy, and your privacy.</p>
            </div>
            <div>
              {FAQS.map(([q,a],i)=>{
                const open=faqOpen===i;
                return (
                  <div key={i} onClick={()=>setFaqOpen(open?null:i)} style={{ borderBottom:`1px solid ${C.pale}`, padding:"18px 0", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:C.deep, lineHeight:1.3 }}>{q}</span>
                      <span style={{ fontSize:22, color:C.terra, flexShrink:0, display:"inline-block", transition:"transform .3s", transform:open?"rotate(45deg)":"none" }}>+</span>
                    </div>
                    {open&&<p style={{ fontSize:14, lineHeight:1.75, color:C.soft, fontWeight:300, paddingTop:12 }}>{a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══ REVIEWS ══ */}
      <section id="reviews" style={{ padding:"72px 0", background:C.cream, overflow:"hidden" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
          <SL t="Reviews"/>
          <H2>Loved by <em style={{ fontStyle:"italic", color:C.terra }}>millions</em> of parents</H2>
        </div>
        <div className="rv-scroll" style={{ paddingLeft:"clamp(16px,5vw,80px)", paddingRight:16 }}>
          {[["👩🏻","Sarah M.","New York","I cried when I saw it. She looked exactly like a mix of both of us."],["👨🏽","Carlos M.","Miami","Tried 3 different apps. UrBaby.ai is in a completely different league."],["👩🏽","Priya S.","London","We framed the AI portrait on our engagement night. Beautiful."],["👨🏻","David C.","San Francisco","Our son looks almost identical to the AI portrait from 2 years ago."],["👩🏿","Aisha W.","Atlanta","Generated boy and girl versions. Can't wait to compare with reality!"],["👨🏻","Marco L.","Rome","Incredibile! The resemblance to both of us is uncanny."]].map(([e,n,l,t])=>(
            <div key={n} style={{ minWidth:272, maxWidth:316, background:C.warm, borderRadius:18, padding:24, border:`1px solid ${C.pale}` }}>
              <div style={{ color:C.gold, fontSize:12, letterSpacing:2, marginBottom:10 }}>★★★★★</div>
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontStyle:"italic", color:C.deep, lineHeight:1.7, marginBottom:16 }}>{`"${t}"`}</p>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:C.pale, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{e}</div>
                <div><div style={{ fontSize:13, fontWeight:500, color:C.deep }}>{n}</div><div style={{ fontSize:11, color:C.soft }}>{l}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ BLOG ══ */}
      <section style={{ padding:"72px 0" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
          <SL t="From the Blog"/>
          <H2>Learn about<br/><em style={{ fontStyle:"italic", color:C.terra }}>baby genetics</em></H2>
          <div className="blog-grid">
            {POSTS.map(post=>(
              <article key={post.title} style={{ background:C.cream, borderRadius:18, padding:"22px 20px", border:`1px solid ${C.pale}`, display:"flex", flexDirection:"column" }}>
                <span style={{ display:"inline-block", background:C.pale, border:`1px solid ${C.blush}`, padding:"3px 11px", borderRadius:100, fontSize:10, letterSpacing:".09em", textTransform:"uppercase", color:C.terra, marginBottom:12 }}>{post.tag}</span>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:C.deep, marginBottom:10, lineHeight:1.3, flex:1 }}>{post.title}</h3>
                <p style={{ fontSize:13, color:C.soft, lineHeight:1.72, fontWeight:300, marginBottom:16 }}>{post.excerpt}</p>
                <button onClick={()=>setArticle(post)} style={{ display:"inline-flex", alignItems:"center", gap:6, color:C.terra, fontSize:12, fontWeight:600, background:"none", border:"none", cursor:"pointer", padding:0 }}>
                  Read full article →
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══ AD 4 ══ */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
        <AdSlot label="AdSense 300×250 — pre-footer, high viewability"/>
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={{ background:C.deep, padding:"56px 0 32px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,80px)" }}>
          <div className="footer-inner">
            <div className="footer-brand">
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <LogoSVG size={28}/><Brand light/>
              </div>
              <p style={{ fontSize:13, lineHeight:1.75, color:"rgba(247,240,232,.42)", maxWidth:260, marginBottom:0 }}>
                The world's most accurate free AI baby face generator, powered by real facial genetics AI and MediaPipe FaceMesh.
              </p>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontSize:10, letterSpacing:".13em", textTransform:"uppercase", color:"rgba(247,240,232,.35)", marginBottom:16, fontWeight:600 }}>Product</div>
              {["How it works","Try it free","FAQ","Blog"].map(l=>(
                <a key={l} href="#gen" style={{ display:"block", fontSize:13, color:"rgba(247,240,232,.55)", marginBottom:10, cursor:"pointer" }}>{l}</a>
              ))}
            </div>

            {/* Company */}
            <div>
              <div style={{ fontSize:10, letterSpacing:".13em", textTransform:"uppercase", color:"rgba(247,240,232,.35)", marginBottom:16, fontWeight:600 }}>Company</div>
              {[["About us","#"],["Contact","mailto:hello@urbaby.ai"],["Press","#"],["Careers","#"]].map(([l,h])=>(
                <a key={l} href={h} style={{ display:"block", fontSize:13, color:"rgba(247,240,232,.55)", marginBottom:10 }}>{l}</a>
              ))}
            </div>

            {/* Legal */}
            <div>
              <div style={{ fontSize:10, letterSpacing:".13em", textTransform:"uppercase", color:"rgba(247,240,232,.35)", marginBottom:16, fontWeight:600 }}>Legal</div>
              {[["Privacy Policy","#"],["Terms of Service","#"],["GDPR","#"],["Cookies","#"]].map(([l,h])=>(
                <a key={l} href={h} style={{ display:"block", fontSize:13, color:"rgba(247,240,232,.55)", marginBottom:10 }}>{l}</a>
              ))}
            </div>

            {/* Social */}
            <div>
              <div style={{ fontSize:10, letterSpacing:".13em", textTransform:"uppercase", color:"rgba(247,240,232,.35)", marginBottom:16, fontWeight:600 }}>Social</div>
              {[["Instagram","https://instagram.com"],["TikTok","https://tiktok.com"],["Twitter / X","https://x.com"],["YouTube","https://youtube.com"]].map(([l,h])=>(
                <a key={l} href={h} target="_blank" rel="noopener noreferrer" style={{ display:"block", fontSize:13, color:"rgba(247,240,232,.55)", marginBottom:10 }}>{l}</a>
              ))}
            </div>
          </div>

          <div style={{ paddingTop:20, borderTop:"1px solid rgba(247,240,232,.08)", fontSize:12, color:"rgba(247,240,232,.3)" }}>
            © 2025 UrBaby.ai — All rights reserved · Free AI Baby Face Generator
          </div>
        </div>
      </footer>
    </div>
  );
}
