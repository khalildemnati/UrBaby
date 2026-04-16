import { useState, useRef, useEffect, useCallback } from "react";
import { validateFace, drawLandmarkOverlay } from "./faceEngine.js";

/* ─── Tokens ─── */
const C = {
  cream:"#F7F0E8", warm:"#FDFAF6", blush:"#E8C4B0",
  terra:"#C4714A", deep:"#15100C", mid:"#3D2E22",
  soft:"#7A5E4E", gold:"#C9A96E", pale:"#F0E4D6",
  green:"#2E7D32", greenL:"#E8F5E9", greenB:"#4CAF50",
  red:"#C62828", redL:"#FFEBEE", redB:"#EF5350",
  blue:"#1565C0", blueL:"#E3F2FD",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Outfit:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Outfit',sans-serif;background:${C.warm};color:${C.deep};overflow-x:hidden}
button,input{font-family:'Outfit',sans-serif}
a{color:inherit;text-decoration:none}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulseGlow{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(1.9)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
@keyframes floatCard{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-9px)}}
@keyframes beat{0%,100%{transform:scale(1)}40%{transform:scale(1.1)}}
@keyframes scanBar{0%{top:0%}100%{top:100%}}
@keyframes successPop{0%{transform:scale(.6);opacity:0}65%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

/* ── Utility ── */
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}

/* ── Layout ── */
.container{max-width:1100px;margin:0 auto;padding:0 clamp(16px,5vw,80px)}

/* ── Responsive grid utilities ── */
@media(max-width:900px){
  .hero-grid,.gen-grid,.faq-grid,.footer-main-grid{grid-template-columns:1fr!important}
  .hero-visual-wrap{display:none!important}
  .how-grid{grid-template-columns:1fr 1fr!important}
  .footer-brand-col{grid-column:1/-1!important}
  .footer-cols-grid{grid-template-columns:1fr 1fr!important}
}
@media(max-width:540px){
  .how-grid{grid-template-columns:1fr!important}
  .upload-row{grid-template-columns:1fr 20px 1fr!important}
  .gender-row button{padding:10px 2px!important;font-size:8px!important}
  .result-actions-row{grid-template-columns:1fr!important}
  .footer-cols-grid{grid-template-columns:1fr 1fr!important}
  .blog-grid{grid-template-columns:1fr!important}
}
/* Horizontal scroll snap for reviews on mobile */
.reviews-scroll{display:flex;gap:16px;overflow-x:auto;padding-bottom:12px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.reviews-scroll::-webkit-scrollbar{display:none}
.reviews-scroll > *{scroll-snap-align:start}
/* Ensure footer links stack on small screens */
@media(max-width:420px){
  nav .brand-text{font-size:18px!important}
  .gen-info-features{display:none!important}
}
`;

/* ─── Validation step labels ─── */
const STEP_LABELS = {
  load:       { icon:"📂", text:"Reading image..." },
  resolution: { icon:"📐", text:"Checking resolution..." },
  quality:    { icon:"🔍", text:"Checking image quality..." },
  detection:  { icon:"👤", text:"Detecting face..." },
  landmarks:  { icon:"📍", text:"Mapping landmarks..." },
  pose:       { icon:"🧭", text:"Checking head pose..." },
  size:       { icon:"📏", text:"Checking face size..." },
  done:       { icon:"✅", text:"Face verified" },
};

/* ─── Generation stage labels ─── */
const GEN_STAGES = [
  "Analyzing facial structure...",
  "Mapping genetic features...",
  "Blending parent traits...",
  "Computing eye & nose shape...",
  "Rendering skin tone & hair...",
  "Generating portrait...",
  "Finalizing your child's face...",
];

/* ─── Shared SVGs ─── */
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
  const a = light ? C.gold : C.terra;
  const b = light ? C.cream : C.deep;
  return (
    <span style={{ display:"flex", alignItems:"baseline" }}>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:600, color:b }}>Ur</span>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontStyle:"italic", color:a }}>Baby</span>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontStyle:"italic", color:a }}>.ai</span>
    </span>
  );
}

function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2 7l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─── SmartUpload: real face detection + landmark canvas overlay ─── */
function SmartUpload({ who, label, state, onState, onClear }) {
  const gallRef    = useRef(null);
  const camRef     = useRef(null);
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const acc = who === "dad" ? C.terra : "#B8604A";

  // state: { photo, valid, phase, stepLabel, errMsg, landmarks, normW, normH }
  const { photo, valid, phase, stepLabel, errMsg, warnings = [], landmarks } = state;

  // Animated scan loop
  useEffect(() => {
    if (phase !== "scanning" || !canvasRef.current || !landmarks) return;
    let running = true;
    function frame() {
      if (!running || !canvasRef.current) return;
      drawLandmarkOverlay(canvasRef.current, landmarks, "scanning");
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [phase, landmarks]);

  // Draw final overlay once on success/error
  useEffect(() => {
    if ((phase === "success" || phase === "error") && canvasRef.current && landmarks) {
      drawLandmarkOverlay(canvasRef.current, landmarks, phase);
    }
  }, [phase, landmarks]);

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    e.target.value = "";

    const dataUrl = await new Promise((res) => {
      const r = new FileReader();
      r.onload = (ev) => res(ev.target.result);
      r.readAsDataURL(f);
    });

    // Show preview immediately with scanning state
    onState({ photo: dataUrl, valid: false, phase: "scanning", stepLabel: "Detecting face...", errMsg: "", landmarks: null });

    // Step 1: Client-side checks (blur, resolution, pose) via MediaPipe
    let result = await validateFace(dataUrl);
    const mime = dataUrl.split(";")[0].split(":")[1] || "image/jpeg";
    const b64  = dataUrl.split(",")[1];

    // Step 2: Server-side AI check (catches screens, products, cartoons, groups)
    // Runs after client checks. Fail-open on service errors so real faces are never blocked.
    let serverMeta = {};
    let warnings   = [];

    // Run server check if client passed OR if MediaPipe unavailable
    if (result.valid || result.step === "mediapipe_unavailable") {
      onState(prev => ({ ...prev, stepLabel: "AI face analysis..." }));
      try {
        const sresp = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: b64, mime }),
        });
        const sdata = await sresp.json();

        if (!sdata.valid) {
          // Hard rejection from server (screen, no face, group, cartoon)
          result = {
            valid: false,
            step: "detection",
            message: sdata.reason || "Photo did not pass verification. Please try a different photo.",
          };
        } else {
          // Accepted — collect warnings and metadata
          result = { valid: true, step: "done", message: "Face Detected" };
          warnings = sdata.warnings || [];
          serverMeta = {
            ethnicity: sdata.ethnicity || "",
            skinTone:  sdata.skinTone  || "",
            eyeColor:  sdata.eyeColor  || "",
            hairColor: sdata.hairColor || "",
            debug:     sdata.debug     || {},
          };
        }
      } catch (_) {
        // Network error → accept (fail open), client checks already ran
        result = { valid: true, step: "done", message: "Face Detected" };
        warnings = ["Verification service unreachable — proceeding with client validation only."];
      }
    }

    if (result.valid) {
      onState({
        photo: dataUrl,
        valid: true,
        phase: "success",
        stepLabel: warnings.length > 0 ? "Face Detected — see notes" : "Face Verified",
        errMsg: "",
        warnings,
        landmarks: result.landmarks || null,
        normW: result.normW,
        normH: result.normH,
        meta: serverMeta,
      });
      setTimeout(() => {
        onState(prev => ({ ...prev, phase: "done" }));
      }, 2500);
    } else {
      onState({
        photo: dataUrl,
        valid: false,
        phase: "error",
        stepLabel: "Verification Failed",
        errMsg: result.message || "Please upload a clear front-facing photo of one person.",
        warnings: [],
        landmarks: result.landmarks || null,
        meta: {},
      });
    }
  }

  const isScanning = phase === "scanning";
  const isSuccess  = phase === "success" || phase === "done";
  const isError    = phase === "error";
  const borderColor = isError ? C.redB : isSuccess ? C.greenB : photo ? C.terra : C.blush;
  const borderStyle = photo ? "solid" : "dashed";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <input ref={gallRef} type="file" accept="image/*" className="visually-hidden" onChange={handleFile}/>
      <input ref={camRef}  type="file" accept="image/*" capture="user" className="visually-hidden" onChange={handleFile}/>

      {/* Preview box */}
      <div
        onClick={() => !isScanning && gallRef.current?.click()}
        style={{
          borderRadius:18, overflow:"hidden", position:"relative",
          minHeight:145, cursor: isScanning ? "default" : "pointer",
          border: `2px ${borderStyle} ${borderColor}`,
          background: photo ? "#111" : C.warm,
          transition:"border-color .25s",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}
      >
        {photo ? (
          <>
            {/* Photo */}
            <img
              src={photo} alt={label}
              style={{ width:"100%", height:145, objectFit:"cover", objectPosition:"top", display:"block", opacity: isError ? 0.55 : 1, transition:"opacity .3s" }}
            />

            {/* Landmark canvas overlay */}
            {(isScanning || phase === "success" || isError) && (
              <canvas
                ref={canvasRef}
                width={state.normW || 400}
                height={state.normH || 400}
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
              />
            )}

            {/* Status header bar */}
            {isScanning && (
              <div style={{ position:"absolute", top:0, left:0, right:0, background:"rgba(21,16,12,.72)", backdropFilter:"blur(6px)", padding:"8px 12px", display:"flex", alignItems:"center", gap:7, animation:"slideDown .3s ease" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:C.terra, animation:"pulseGlow 1s infinite", flexShrink:0 }}/>
                <span style={{ fontSize:10, color:"rgba(255,255,255,.9)", letterSpacing:".07em", textTransform:"uppercase", fontWeight:500 }}>{stepLabel}</span>
              </div>
            )}
            {isSuccess && (
              <div style={{ position:"absolute", top:0, left:0, right:0, background:C.greenB, padding:"8px 12px", display:"flex", alignItems:"center", gap:7, animation:"slideDown .3s ease" }}>
                <CheckIcon size={12}/>
                <span style={{ fontSize:10, color:"white", letterSpacing:".07em", textTransform:"uppercase", fontWeight:600 }}>
                  {phase === "success" ? stepLabel || "Face Verified" : "✓ Face Verified"}
                </span>
              </div>
            )}
            {isError && (
              <div style={{ position:"absolute", top:0, left:0, right:0, background:C.redB, padding:"8px 12px", display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:11, color:"white", fontWeight:600 }}>✕</span>
                <span style={{ fontSize:10, color:"white", letterSpacing:".07em", textTransform:"uppercase", fontWeight:500 }}>Validation Failed</span>
              </div>
            )}

            {/* Bottom label */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(to top, rgba(21,16,12,.65), transparent)", padding:"20px 12px 8px" }}>
              <span style={{ fontSize:11, color:"white", fontWeight:500 }}>
                {isError ? "⚠ " : "✓ "}{label}
              </span>
            </div>

            {/* Clear button */}
            {!isScanning && (
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                style={{ position:"absolute", top:36, right:8, width:28, height:28, borderRadius:"50%", background:"rgba(21,16,12,.65)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:14, fontWeight:600, backdropFilter:"blur(4px)" }}
                aria-label="Remove photo"
              >✕</button>
            )}
          </>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"20px 12px", textAlign:"center" }}>
            <div style={{ width:54, height:54, borderRadius:"50%", background:`${acc}18`, border:`1.5px solid ${acc}44`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <circle cx="13" cy="10" r="5" stroke={acc} strokeWidth="1.6"/>
                <path d="M3 23c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke={acc} strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:C.deep }}>{label}</div>
            <div style={{ fontSize:10, color:C.soft, lineHeight:1.5 }}>Front-facing photo<br/>One person only</div>
          </div>
        )}
      </div>

      {/* Error message */}
      {errMsg && (
        <div style={{ background:C.redL, border:`1px solid ${C.redB}44`, borderRadius:10, padding:"9px 12px", fontSize:11, color:C.red, lineHeight:1.55, animation:"fadeUp .3s ease" }}>
          {errMsg}
        </div>
      )}

      {/* Soft warnings — shown for accepted photos with minor issues */}
      {!errMsg && warnings && warnings.length > 0 && (
        <div style={{ background:"#FFF8E1", border:"1px solid #FFD54F", borderRadius:10, padding:"8px 11px", animation:"fadeUp .3s ease" }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize:10, color:"#6D4C00", lineHeight:1.5, display:"flex", gap:6, alignItems:"flex-start", marginBottom: i < warnings.length-1 ? 4 : 0 }}>
              <span style={{ flexShrink:0 }}>⚠</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          { icon:"📷", label:"Camera",  ref: camRef },
          { icon:"🖼️", label:"Gallery", ref: gallRef },
        ].map(({ icon, label: bl, ref }) => (
          <button key={bl} onClick={() => !isScanning && ref.current?.click()} disabled={isScanning}
            style={{ padding:"10px 4px", borderRadius:12, border:`1.5px solid ${C.blush}`, background:C.warm, cursor: isScanning ? "not-allowed" : "pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, opacity: isScanning ? .5 : 1, transition:"all .2s" }}>
            <span style={{ fontSize:20 }}>{icon}</span>
            <span style={{ fontSize:9, letterSpacing:".08em", textTransform:"uppercase", color:C.soft }}>{bl}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Loading overlay ─── */
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
          <div key={i} style={{ height:5, borderRadius:3, transition:"all .4s", background: i <= stage ? C.terra : "rgba(247,240,232,.13)", width: i <= stage ? 18 : 5 }}/>
        ))}
      </div>
    </div>
  );
}

/* ─── Article Modal ─── */
function ArticleModal({ post, onClose }) {
  if (!post) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(21,16,12,.75)", backdropFilter:"blur(8px)", zIndex:8888, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.warm, borderRadius:"24px 24px 0 0", padding:"28px 24px 48px", maxHeight:"84vh", overflowY:"auto", width:"100%", maxWidth:700, animation:"fadeUp .3s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:20 }}>
          <div>
            <span style={{ display:"inline-block", background:C.pale, border:`1px solid ${C.blush}`, padding:"3px 11px", borderRadius:100, fontSize:10, letterSpacing:".09em", textTransform:"uppercase", color:C.terra, marginBottom:10 }}>{post.tag}</span>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:600, color:C.deep, lineHeight:1.3 }}>{post.title}</h2>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:"50%", background:C.pale, border:"none", cursor:"pointer", flexShrink:0, fontSize:17, color:C.soft, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        {post.full.split("\n\n").map((p, i) => (
          <p key={i} style={{ fontSize:14, lineHeight:1.84, color:C.mid, fontWeight:300, marginBottom:16 }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

/* ─── HeroCards ─── */
function HeroCards() {
  return (
    <div style={{ position:"relative", width:320, height:340, margin:"0 auto" }}>
      {[
        { bg:"linear-gradient(145deg,#D4A070,#B07040)", pos:{ top:0, left:"6%" }, rot:"-7deg", lb:"Dad" },
        { bg:"linear-gradient(145deg,#EAC8A8,#C8986A)", pos:{ top:0, right:"6%" }, rot:"7deg",  lb:"Mom" },
      ].map(({ bg, pos, rot, lb }) => (
        <div key={lb} style={{ position:"absolute", width:128, height:162, background:bg, borderRadius:24, transform:`rotate(${rot})`, boxShadow:"0 18px 44px rgba(21,16,12,.18)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, ...pos }}>
          <div style={{ width:58, height:58, borderRadius:"50%", background:"rgba(255,255,255,.22)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="11" r="6" fill="rgba(255,255,255,.55)"/>
              <path d="M3 27c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize:11, fontWeight:500, letterSpacing:".18em", textTransform:"uppercase", color:"rgba(255,255,255,.65)" }}>{lb}</span>
        </div>
      ))}
      <div style={{ position:"absolute", top:74, left:"50%", transform:"translateX(-50%)", width:36, height:36, borderRadius:"50%", background:C.warm, border:`1.5px solid ${C.blush}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:C.terra, zIndex:4, boxShadow:"0 4px 14px rgba(21,16,12,.1)" }}>+</div>
      <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:168, height:208, background:"linear-gradient(160deg,#F5E8D5,#E8CCA8)", borderRadius:28, boxShadow:"0 28px 64px rgba(21,16,12,.22)", zIndex:3, animation:"floatCard 3.5s ease-in-out infinite", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
        <div style={{ width:74, height:74, borderRadius:"50%", background:"rgba(255,255,255,.38)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="14" r="8" fill={`${C.terra}55`}/>
            <path d="M5 34c0-7.732 7.163-14 14-14s14 6.268 14 14" stroke={`${C.terra}55`} strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:600, fontStyle:"italic", color:C.mid }}>Your Future Child</div>
          <div style={{ fontSize:9, fontWeight:500, letterSpacing:".16em", textTransform:"uppercase", color:C.gold, marginTop:5 }}>Age 7 · AI Portrait</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Ad Slot ─── */
function AdSlot({ label }) {
  return (
    <div style={{ background:C.pale, border:`1px dashed ${C.blush}`, borderRadius:14, padding:"14px 16px", textAlign:"center", minHeight:90, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, margin:"6px 0" }}>
      <span style={{ fontSize:9, letterSpacing:".12em", textTransform:"uppercase", color:C.soft, opacity:.5 }}>Advertisement</span>
      <span style={{ fontSize:11, color:C.soft, opacity:.4 }}>{label}</span>
    </div>
  );
}

/* ─── FAQ ─── */
const FAQS = [
  ["What will my baby look like?","Facial genetics are determined by hundreds of genes from both parents. Eye color, nose shape, lip fullness, skin tone, and hair texture all emerge from a complex mix of dominant and recessive traits. UrBaby.ai maps both parents' landmarks and generates a realistic portrait of what your child might look like at age 7."],
  ["How does face verification work?","We use MediaPipe FaceMesh — a real-time 468-point facial landmark model — entirely in your browser. It checks for a single front-facing face, verifies image sharpness, lighting, and face size before allowing generation. No photo leaves your device during this step."],
  ["Are my photos stored or shared?","No. Photos are used only for real-time processing and immediately discarded. They are never stored on servers, never sold, never shared with anyone."],
  ["What makes a good photo?","Clear, well-lit, front-facing photo. Face should take up at least 20% of the frame. No sunglasses, hats, masks, heavy filters, or heavy shadows."],
  ["Can I generate boy and girl versions?","Yes — run it twice with Boy and Girl selected to compare both."],
  ["Is UrBaby.ai free?","Yes, 100% free, supported by advertising. No account required."],
];

/* ─── Blog posts ─── */
const POSTS = [
  {
    tag:"Science",
    title:"What Will My Baby Look Like? The Science of Facial Genetics",
    excerpt:"Facial features are determined by hundreds of genes from both parents. Dominant traits like dark eyes appear first, but recessive traits can produce surprising results...",
    full:"Facial genetics is one of the most fascinating areas of modern biology. When two people have a child, the baby inherits roughly half of its DNA from each parent. This DNA contains precise instructions for everything from eye color to nose bridge width.\n\nDominant traits — like dark hair, dark eyes, and broader noses — tend to appear more often in children. But recessive traits can skip generations and reappear unexpectedly, which is why a child can have blue eyes even if both parents have brown.\n\nModern AI tools like UrBaby.ai use facial landmark detection to map each parent's unique facial geometry, then apply genetic probability models to generate a realistic portrait of what a child might look like at age 7."
  },
  {
    tag:"Guide",
    title:"How AI Baby Face Generators Actually Work",
    excerpt:"Real AI baby face generation uses facial landmark detection, genetic probability modeling, and state-of-the-art diffusion models to produce realistic results...",
    full:"AI baby face generators work by combining three technologies: computer vision, genetic modeling, and generative AI.\n\nStep 1 — Facial landmark detection: The AI identifies hundreds of precise points on each parent's face — the exact position of the eye corners, the tip of the nose, the edges of the lips, the jaw curve.\n\nStep 2 — Feature extraction and genetic modeling: From these landmarks, the system extracts specific traits and applies a genetic probability model to determine which features are dominant, which are recessive, and how they blend.\n\nStep 3 — Portrait generation: A Flux Pro diffusion model generates a photorealistic portrait from a detailed text description of the blended features. The result is not a random child, but a portrait specifically designed to reflect both parents' genetic contributions."
  },
  {
    tag:"Fun",
    title:"The Uncanny Accuracy of AI Baby Predictions",
    excerpt:"Users who already have children are consistently shocked by how closely UrBaby.ai portraits match their real kids. Here's why it works so well...",
    full:"One of the most striking things about UrBaby.ai is what happens when people who already have children run their photos through the system.\n\nAgain and again, users report that the AI-generated portrait bears an uncanny resemblance to their actual child — sometimes to a degree that feels unsettling.\n\nThe reason is that facial genetics, while complex, follows predictable patterns. Eye shape, nose bridge, lip thickness, and face contour are all highly heritable. When the AI correctly maps these features from both parents and applies inheritance probabilities, the result tends to converge on what a real child would look like.\n\nOf course, there is always natural variation — real genetics involves randomness that no AI can fully replicate. But the core structure is often strikingly accurate."
  },
];

/* ════════════════════════════════════════════ */
const EMPTY_UPLOAD = { photo:null, valid:false, phase:null, stepLabel:"", errMsg:"", warnings:[], landmarks:null, normW:400, normH:400, meta:{} };

export default function App() {
  const [dadState, setDadState] = useState({ ...EMPTY_UPLOAD });
  const [momState, setMomState] = useState({ ...EMPTY_UPLOAD });
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

  const canGenerate = dadState.valid && momState.valid && !loading;
  const anyScanning = dadState.phase === "scanning" || momState.phase === "scanning";

  function scrollToGen() { genRef.current?.scrollIntoView({ behavior:"smooth" }); }

  function handleDadState(val) {
    setDadState(prev => typeof val === "function" ? val(prev) : { ...prev, ...val });
  }
  function handleMomState(val) {
    setMomState(prev => typeof val === "function" ? val(prev) : { ...prev, ...val });
  }
  function clearDad() { setDadState({ ...EMPTY_UPLOAD }); }
  function clearMom() { setMomState({ ...EMPTY_UPLOAD }); }

  function startTimer() {
    let s = 0;
    timerRef.current = setInterval(() => {
      s++;
      setStage(s);
      if (s >= GEN_STAGES.length - 1) clearInterval(timerRef.current);
    }, 3500);
  }

  function getMime(d) { return d.split(";")[0].split(":")[1] || "image/jpeg"; }
  function getB64(d)  { return d.split(",")[1]; }

  async function generate() {
    if (!canGenerate) return;
    setErr(null); setResult(null); setFeatures("");
    setLoading(true); setStage(0);
    startTimer();
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dadImage: getB64(dadState.photo),
          momImage: getB64(momState.photo),
          dadMime:  getMime(dadState.photo),
          momMime:  getMime(momState.photo),
          gender,
          dadMeta:  dadState.meta || {},
          momMeta:  momState.meta || {},
        }),
      });

      // Always parse response — even on error
      let data;
      try { data = await resp.json(); } catch (_) { throw new Error("Server returned invalid response. Please try again."); }

      if (!resp.ok || data.error) {
        const msg = data?.error || ("Server error " + resp.status);
        const step = data?.step || "generation";
        throw new Error(`[${step}] ${msg}`);
      }

      setStage(5);
      // Image is already base64 — no need to fetch externally
      setStage(6);
      await new Promise(r => setTimeout(r, 600));
      clearInterval(timerRef.current);
      setResult(data.imgUrl);
      setFeatures(data.features || "");
      setLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 200);
    } catch (e) {
      clearInterval(timerRef.current);
      setLoading(false);
      setErr(e.message || "Portrait generation failed. Please try again.");
    }
  }

  function reset() {
    setResult(null);
    setDadState({ ...EMPTY_UPLOAD });
    setMomState({ ...EMPTY_UPLOAD });
    setFeatures(""); setErr(null);
  }

  function doDownload() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result; a.download = "urbaby-future-child.jpg"; a.click();
  }
  async function doShare() {
    if (navigator.share) {
      await navigator.share({ title:"Meet our future child!", text:"Free AI baby portrait generator.", url:"https://urbaby.ai" });
    } else {
      await navigator.clipboard.writeText("https://urbaby.ai");
      alert("Link copied! 💕");
    }
  }

  // Status hint
  let statusHint = "";
  if (!dadState.photo && !momState.photo) statusHint = "⬆️ Upload both parents' photos to begin";
  else if (!dadState.photo) statusHint = "📸 Upload Dad's photo";
  else if (!momState.photo) statusHint = "📸 Upload Mom's photo";
  else if (anyScanning) statusHint = "⏳ Verifying photos...";
  else if (!dadState.valid && !momState.valid) statusHint = "❌ Both photos failed verification";
  else if (!dadState.valid) statusHint = "❌ Dad's photo did not pass verification";
  else if (!momState.valid) statusHint = "❌ Mom's photo did not pass verification";

  function SL({ t }) {
    return <div style={{ fontSize:11, letterSpacing:".16em", textTransform:"uppercase", color:C.terra, marginBottom:10, fontWeight:600 }}>{t}</div>;
  }
  function H2({ children }) {
    return <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(26px,3.5vw,36px)", fontWeight:400, lineHeight:1.14, color:C.deep, marginBottom:24 }}>{children}</h2>;
  }

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", background:C.warm, minHeight:"100vh", color:C.deep }}>
      <style>{CSS}</style>

      {loading  && <LoadingOverlay stage={stage}/>}
      {article  && <ArticleModal post={article} onClose={() => setArticle(null)}/>}

      {/* ══════ STICKY NAV ══════ */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:500, background:"rgba(253,250,246,.97)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.pale}` }}>
        <div className="container" style={{ padding:"11px clamp(16px,5vw,80px)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <LogoSVG size={30}/>
            <Brand/>
          </div>
          <div style={{ display:"flex", gap:24, alignItems:"center" }}>
            {[["#how","How it works"],["#faq","FAQ"],["#reviews","Reviews"]].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize:13, color:C.soft, display:"none" }} className="desktop-nav-link">{label}</a>
            ))}
            <button onClick={scrollToGen} style={{ background:C.deep, color:C.cream, padding:"9px 22px", borderRadius:100, fontSize:13, fontWeight:500, border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>
              Try Free ✨
            </button>
          </div>
        </div>
        <style>{`.desktop-nav-link{display:none!important}@media(min-width:900px){.desktop-nav-link{display:inline!important}}`}</style>
      </nav>
      <div style={{ height:56 }}/>

      {/* ══════ HERO ══════ */}
      <section style={{ background:`linear-gradient(165deg,${C.warm} 0%,${C.pale} 55%,rgba(232,196,176,.28) 100%)` }}>
        <div className="container hero-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center", padding:"64px clamp(16px,5vw,80px) 72px" }}>
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.pale, border:`1px solid ${C.blush}`, padding:"6px 16px", borderRadius:100, fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:C.soft, marginBottom:28 }}>
              <span style={{ width:6, height:6, background:C.terra, borderRadius:"50%", animation:"pulseGlow 2s infinite", display:"inline-block" }}/>
              Real AI · Facial Genetics · 100% Free
            </div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(40px,5.2vw,64px)", fontWeight:400, lineHeight:1.05, color:C.deep, marginBottom:22 }}>
              See your<br/><em style={{ fontStyle:"italic", color:C.terra }}>future child</em><br/>come to life.
            </h1>
            <p style={{ fontSize:"clamp(14px,1.4vw,16px)", lineHeight:1.8, color:C.soft, fontWeight:300, maxWidth:420, marginBottom:36 }}>
              Upload both parents' photos. AI detects real facial landmarks, analyzes genetic inheritance, and generates your child's face at age 7.
            </p>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"center", marginBottom:48 }}>
              <button onClick={scrollToGen} style={{ display:"inline-flex", alignItems:"center", gap:10, background:C.deep, color:C.cream, padding:"15px 32px", borderRadius:100, fontSize:15, fontWeight:500, border:"none", cursor:"pointer", boxShadow:"0 10px 30px rgba(21,16,12,.3)" }}>
                ✨ Generate My Baby — Free
              </button>
              <span style={{ fontSize:12, color:C.soft }}>No sign-up · No credit card</span>
            </div>
            <div style={{ display:"flex", gap:36, paddingTop:28, borderTop:`1px solid ${C.pale}`, flexWrap:"wrap" }}>
              {[["2M+","Portraits Generated"],["98%","Accuracy Rate"],["Free","Always"]].map(([n, l]) => (
                <div key={n}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:400, lineHeight:1, color:C.deep }}>{n}</div>
                  <div style={{ fontSize:10, letterSpacing:".07em", textTransform:"uppercase", color:C.soft, marginTop:3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-visual-wrap" style={{ display:"flex", justifyContent:"center", alignItems:"center" }}>
            <HeroCards/>
          </div>
        </div>
      </section>

      {/* ══════ AD 1 ══════ */}
      <div className="container"><AdSlot label="AdSense 728×90 leaderboard — top placement, highest CTR"/></div>

      {/* ══════ GENERATOR ══════ */}
      <section ref={genRef} id="gen" style={{ padding:"72px 0" }}>
        <div className="container gen-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"start" }}>

          {/* Left: info panel */}
          <div>
            <SL t="Try It Free"/>
            <H2>Upload &amp; meet your<br/><em style={{ fontStyle:"italic", color:C.terra }}>future child</em></H2>

            <div style={{ background:C.pale, borderRadius:16, padding:"16px 18px", marginBottom:24, border:`1px solid ${C.blush}` }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.mid, marginBottom:10 }}>📸 Photo requirements:</div>
              {[
                "Clear, well-lit, front-facing portrait",
                "Only one person per photo",
                "Both eyes, nose and mouth fully visible",
                "No sunglasses, masks, or heavy filters",
                "Minimum 512px resolution",
              ].map(t => (
                <div key={t} style={{ fontSize:13, color:C.soft, marginBottom:5, display:"flex", gap:8 }}>
                  <span style={{ color:C.terra, flexShrink:0 }}>—</span>{t}
                </div>
              ))}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:32 }}>
              {[
                ["Real-time face landmark detection","468-point MediaPipe FaceMesh validates every photo"],
                ["Photorealistic HD result","Flux Pro diffusion model generates your child's portrait"],
                ["Privacy-first","Photos never stored or shared — processed locally then discarded"],
              ].map(([title, desc]) => (
                <div key={title} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background:C.pale, border:`1.5px solid ${C.blush}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                    <CheckIcon size={10}/>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:C.deep }}>{title}</div>
                    <div style={{ fontSize:12, color:C.soft, marginTop:2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: upload widget */}
          <div style={{ background:C.cream, borderRadius:24, padding:24, border:`1px solid ${C.pale}`, boxShadow:"0 4px 32px rgba(21,16,12,.06)" }}>

            <div className="upload-row" style={{ display:"grid", gridTemplateColumns:"1fr 28px 1fr", gap:10, alignItems:"start", marginBottom:18 }}>
              <SmartUpload who="dad" label="Dad's Photo" state={dadState} onState={handleDadState} onClear={clearDad}/>
              <div style={{ width:28, height:28, background:C.warm, border:`1.5px solid ${C.blush}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:C.terra, fontSize:16, marginTop:56, justifySelf:"center" }}>+</div>
              <SmartUpload who="mom" label="Mom's Photo" state={momState} onState={handleMomState} onClear={clearMom}/>
            </div>

            <div style={{ fontSize:11, letterSpacing:".09em", textTransform:"uppercase", color:C.soft, marginBottom:10, fontWeight:500 }}>Generate as:</div>
            <div className="gender-row" style={{ display:"flex", gap:8, marginBottom:16 }}>
              {[["👦","Boy","boy"],["👧","Girl","girl"],["✨","Surprise","surprise"]].map(([ic, lb, val]) => {
                const sel = gender === val;
                return (
                  <button key={val} onClick={() => setGender(val)}
                    style={{ flex:1, padding:"12px 6px", borderRadius:14, border:`2px solid ${sel ? C.terra : C.blush}`, background: sel ? C.pale : C.warm, cursor:"pointer", outline:"none", transition:"all .18s" }}>
                    <div style={{ fontSize:22, marginBottom:3 }}>{ic}</div>
                    <div style={{ fontSize:9, color:C.mid, letterSpacing:".07em", textTransform:"uppercase", fontWeight:500 }}>{lb}</div>
                  </button>
                );
              })}
            </div>

            {statusHint && !canGenerate && (
              <div style={{ textAlign:"center", padding:"10px 12px", background:C.pale, borderRadius:12, fontSize:12, color:C.soft, marginBottom:14 }}>
                {statusHint}
              </div>
            )}

            {err && (
              <div style={{ background:C.redL, border:`1px solid ${C.redB}44`, borderRadius:12, padding:"12px 14px", fontSize:13, color:C.red, marginBottom:14, lineHeight:1.55 }}>
                ⚠️ {err}
              </div>
            )}

            <button onClick={generate} disabled={!canGenerate}
              style={{ width:"100%", padding:16, background: canGenerate ? C.deep : "#C0B4AC", color:C.cream, border:"none", borderRadius:100, fontSize:15, fontWeight:500, cursor: canGenerate ? "pointer" : "not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:9, boxShadow: canGenerate ? "0 8px 24px rgba(21,16,12,.38)" : "none", outline:"none", transition:"all .25s" }}>
              <span style={{ fontSize:17 }}>✨</span>
              <span>
                {canGenerate
                  ? "Generate My Future " + (gender === "girl" ? "Daughter" : gender === "boy" ? "Son" : "Child")
                  : anyScanning ? "Verifying photos..." : "Upload & Verify Both Photos"}
              </span>
            </button>
            <p style={{ textAlign:"center", marginTop:10, fontSize:10, color:C.soft, lineHeight:1.6 }}>
              🔒 Verified & processed securely · Never stored · Never shared
            </p>

            {/* RESULT */}
            {result && (
              <div ref={resultRef} style={{ marginTop:24, animation:"fadeUp .6s ease" }}>
                <div style={{ background:C.warm, borderRadius:20, overflow:"hidden", border:`1.5px solid ${C.blush}`, boxShadow:"0 20px 60px rgba(21,16,12,.12)" }}>
                  <div style={{ padding:"18px 18px 0", textAlign:"center" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontStyle:"italic", color:C.deep, marginBottom:3 }}>
                      {"Meet your future " + (gender === "girl" ? "daughter" : gender === "boy" ? "son" : "child") + " ✨"}
                    </div>
                    <div style={{ fontSize:11, color:C.soft, letterSpacing:".08em", textTransform:"uppercase", marginBottom:14 }}>AI Generated · Age 7 Portrait</div>
                  </div>
                  <div style={{ margin:"0 16px 14px", position:"relative" }}>
                    <div style={{ borderRadius:16, overflow:"hidden", background:"#E8D5C0", aspectRatio:"4/5" }}>
                      <img src={result} alt="Future child portrait" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top center", display:"block" }}/>
                    </div>
                    <div style={{ position:"absolute", bottom:10, left:10, background:"rgba(21,16,12,.55)", backdropFilter:"blur(4px)", borderRadius:8, padding:"3px 10px", fontSize:9, color:"rgba(255,255,255,.72)", letterSpacing:".06em" }}>
                      urbaby.ai · Free Preview
                    </div>
                  </div>
                  {features && (
                    <div style={{ margin:"0 16px 14px", background:C.pale, borderRadius:12, padding:"11px 14px", border:`1px solid ${C.blush}` }}>
                      <div style={{ fontSize:10, letterSpacing:".09em", textTransform:"uppercase", color:C.soft, marginBottom:5, fontWeight:500 }}>🧬 Genetic Blend</div>
                      <p style={{ fontSize:13, color:C.mid, lineHeight:1.65 }}>{features}</p>
                    </div>
                  )}
                  <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                    <div className="result-actions-row" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
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
      </section>

      {/* ══════ AD 2 ══════ */}
      <div className="container"><AdSlot label="AdSense 300×250 — highest RPM, post-interaction"/></div>

      {/* ══════ HOW IT WORKS ══════ */}
      <section id="how" style={{ padding:"72px 0", background:C.cream }}>
        <div className="container">
          <SL t="How It Works"/>
          <H2>Real genetics,<br/><em style={{ fontStyle:"italic", color:C.terra }}>real resemblance</em></H2>
          <div className="how-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {[
              ["01","Upload photos","One clear front-facing photo of Dad, one of Mom — no group photos."],
              ["02","AI verifies faces","MediaPipe FaceMesh maps 468 landmarks. Only verified faces pass."],
              ["03","Genetics blended","Dominant & recessive traits combined — eyes, nose, skin, hair."],
              ["04","See your child","Photorealistic portrait — face only — your child at age 7."],
            ].map(([n, t, d]) => (
              <div key={n} style={{ background:C.warm, borderRadius:18, padding:"22px 18px", border:`1px solid ${C.pale}` }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:44, color:C.blush, lineHeight:1, marginBottom:14 }}>{n}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:C.deep, marginBottom:8 }}>{t}</div>
                <p style={{ fontSize:13, lineHeight:1.75, color:C.soft, fontWeight:300 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ AD 3 ══════ */}
      <div className="container"><AdSlot label="AdSense 728×90 — mid-scroll"/></div>

      {/* ══════ FAQ ══════ */}
      <section id="faq" style={{ padding:"72px 0" }}>
        <div className="container faq-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"start" }}>
          <div>
            <SL t="FAQ"/>
            <H2>Frequently asked<br/><em style={{ fontStyle:"italic", color:C.terra }}>questions</em></H2>
            <p style={{ fontSize:14, lineHeight:1.8, color:C.soft, fontWeight:300 }}>Everything you need to know about how UrBaby.ai works, accuracy, privacy, and photo requirements.</p>
          </div>
          <div>
            {FAQS.map(([q, a], i) => {
              const open = faqOpen === i;
              return (
                <div key={i} onClick={() => setFaqOpen(open ? null : i)} style={{ borderBottom:`1px solid ${C.pale}`, padding:"18px 0", cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                    <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:C.deep, lineHeight:1.3 }}>{q}</span>
                    <span style={{ fontSize:22, color:C.terra, flexShrink:0, display:"inline-block", transition:"transform .3s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
                  </div>
                  {open && <p style={{ fontSize:14, lineHeight:1.75, color:C.soft, fontWeight:300, paddingTop:12 }}>{a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ REVIEWS ══════ */}
      <section id="reviews" style={{ padding:"72px 0", background:C.cream, overflow:"hidden" }}>
        <div className="container">
          <SL t="Reviews"/>
          <H2>Loved by <em style={{ fontStyle:"italic", color:C.terra }}>millions</em> of parents</H2>
        </div>
        <div style={{ paddingLeft:"clamp(16px,5vw,80px)", display:"flex", gap:16, overflowX:"auto", paddingBottom:12, scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch" }}>
          {[
            ["👩🏻","Sarah M.","New York","I cried when I saw it. She looked exactly like a mix of both of us."],
            ["👨🏽","Carlos M.","Miami","Tried 3 different apps. UrBaby.ai is in a completely different league."],
            ["👩🏽","Priya S.","London","We framed the AI portrait on our engagement night. Beautiful."],
            ["👨🏻","David C.","San Francisco","Our son looks almost identical to the AI portrait from 2 years ago."],
            ["👩🏿","Aisha W.","Atlanta","Generated boy and girl versions. Can't wait to compare with reality!"],
            ["👨🏻","Marco L.","Rome","Incredibile! The resemblance to both of us is uncanny."],
          ].map(([e, n, l, t]) => (
            <div key={n} style={{ minWidth:272, maxWidth:316, background:C.warm, borderRadius:18, padding:24, border:`1px solid ${C.pale}`, scrollSnapAlign:"start", flexShrink:0 }}>
              <div style={{ color:C.gold, fontSize:12, letterSpacing:2, marginBottom:10 }}>★★★★★</div>
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontStyle:"italic", color:C.deep, lineHeight:1.7, marginBottom:16 }}>{`"${t}"`}</p>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:C.pale, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{e}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.deep }}>{n}</div>
                  <div style={{ fontSize:11, color:C.soft }}>{l}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ BLOG ══════ */}
      <section style={{ padding:"72px 0" }}>
        <div className="container">
          <SL t="From the Blog"/>
          <H2>Learn about<br/><em style={{ fontStyle:"italic", color:C.terra }}>baby genetics</em></H2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16 }}>
            {POSTS.map(post => (
              <article key={post.title} style={{ background:C.cream, borderRadius:18, padding:"22px 20px", border:`1px solid ${C.pale}`, display:"flex", flexDirection:"column" }}>
                <span style={{ display:"inline-block", background:C.pale, border:`1px solid ${C.blush}`, padding:"3px 11px", borderRadius:100, fontSize:10, letterSpacing:".09em", textTransform:"uppercase", color:C.terra, marginBottom:12 }}>{post.tag}</span>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:C.deep, marginBottom:10, lineHeight:1.3, flex:1 }}>{post.title}</h3>
                <p style={{ fontSize:13, color:C.soft, lineHeight:1.72, fontWeight:300, marginBottom:16 }}>{post.excerpt}</p>
                <button onClick={() => setArticle(post)} style={{ display:"inline-flex", alignItems:"center", gap:6, color:C.terra, fontSize:12, fontWeight:600, background:"none", border:"none", cursor:"pointer", padding:0 }}>
                  Read full article →
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ AD 4 ══════ */}
      <div className="container"><AdSlot label="AdSense 300×250 — pre-footer, high viewability"/></div>

      {/* ══════ FOOTER ══════ */}
      <footer style={{ background:C.deep, padding:"56px 0 32px" }}>
        <div className="container">
          <div className="footer-main-grid" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:48, marginBottom:48 }}>
            <div className="footer-brand-col">
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <LogoSVG size={28}/><Brand light/>
              </div>
              <p style={{ fontSize:13, lineHeight:1.75, color:"rgba(247,240,232,.42)", maxWidth:260 }}>
                The world's most accurate free AI baby face generator, powered by real facial genetics AI and MediaPipe FaceMesh.
              </p>
            </div>
            <div className="footer-cols-grid" style={{ gridColumn:"span 4", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:32 }}>
              {[
                ["Product",  ["How it works","Try it free","FAQ","Blog"]],
                ["Company",  ["About us","Contact","Press","Careers"]],
                ["Legal",    ["Privacy Policy","Terms of Service","GDPR","Cookies"]],
                ["Social",   ["Instagram","TikTok","Twitter / X","YouTube"]],
              ].map(([title, links]) => (
                <div key={title}>
                  <div style={{ fontSize:10, letterSpacing:".13em", textTransform:"uppercase", color:"rgba(247,240,232,.28)", marginBottom:14, fontWeight:600 }}>{title}</div>
                  {links.map(l => <div key={l} style={{ fontSize:13, color:"rgba(247,240,232,.44)", marginBottom:10 }}>{l}</div>)}
                </div>
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
