/**
 * UrBaby Face Engine v2
 * Real face detection using MediaPipe FaceMesh (468 landmarks)
 * + image quality checks entirely in-browser, no server needed
 */

let faceMeshInstance = null;

async function getFaceMesh() {
  if (faceMeshInstance) return faceMeshInstance;
  const { FaceMesh } = await import('@mediapipe/face_mesh');
  const fm = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
  });
  fm.setOptions({
    maxNumFaces: 2,          // detect up to 2 so we can reject multi-face
    refineLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
  await new Promise((resolve) => {
    fm.onResults(() => resolve());
    // warm-up with a blank canvas
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    fm.send({ image: c }).catch(() => resolve());
    setTimeout(resolve, 3000);
  });
  faceMeshInstance = fm;
  return fm;
}

/** Draw image on off-screen canvas, return {canvas, ctx, img} */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 1024;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        const s = MAX / Math.max(w, h);
        w = Math.round(w * s); h = Math.round(h * s);
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ canvas, ctx, img, w, h });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Estimate blur via Laplacian variance on a small centre crop */
function measureBlur(ctx, w, h) {
  const cw = Math.min(200, w), ch = Math.min(200, h);
  const cx = Math.round((w - cw) / 2), cy = Math.round((h - ch) / 2);
  const { data } = ctx.getImageData(cx, cy, cw, ch);
  // Convert to greyscale
  const grey = [];
  for (let i = 0; i < data.length; i += 4)
    grey.push(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
  // Laplacian kernel [-1,-1,-1,-1,8,-1,-1,-1,-1]
  let variance = 0;
  for (let y = 1; y < ch - 1; y++) {
    for (let x = 1; x < cw - 1; x++) {
      const idx = y * cw + x;
      const lap = -grey[idx-cw-1] - grey[idx-cw] - grey[idx-cw+1]
                  - grey[idx-1]   + 8*grey[idx]   - grey[idx+1]
                  - grey[idx+cw-1] - grey[idx+cw] - grey[idx+cw+1];
      variance += lap * lap;
    }
  }
  return variance / ((cw - 2) * (ch - 2));
}

/** Average brightness 0-255 */
function measureBrightness(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4)
    sum += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
  return sum / (data.length / 4);
}

/**
 * Compute head yaw from key landmarks using 3-D geometry approximation.
 * Works reliably for frontal faces without a full 3D model.
 */
function estimateYaw(lm, w, h) {
  // Nose tip = 1, left eye outer = 33, right eye outer = 263
  const nose  = lm[1];
  const leftE = lm[33];
  const rightE = lm[263];
  const eyeMidX = (leftE.x + rightE.x) / 2;
  // Positive = turning right, negative = turning left
  return (nose.x - eyeMidX) * 100; // normalised units → rough degrees proxy
}

/**
 * Main validation function.
 * Returns { valid, step, message, landmarks, normW, normH }
 */
export async function validateFace(dataUrl) {
  // ── Step 1: Load & basic resolution check ──
  let loaded;
  try { loaded = await loadImage(dataUrl); }
  catch (_) { return { valid: false, step: 'load', message: 'Could not read the image. Please try a different photo.' }; }

  const { canvas, ctx, w, h } = loaded;

  if (w < 80 || h < 80) {
    return { valid: false, step: 'resolution', message: 'Image is very small. For best results, use a higher resolution photo.' };
  }

  // ── Step 2: Blur detection ──
  const blurScore = measureBlur(ctx, w, h);
  if (blurScore < 8) {
    return { valid: false, step: 'quality', message: 'Photo is too blurry. Please use a sharper image.' };
  }

  // ── Step 3: Brightness ──
  const brightness = measureBrightness(ctx, w, h);
  if (brightness < 15) {
    return { valid: false, step: 'quality', message: 'Photo is too dark. Please use a well-lit photo.' };
  }
  if (brightness > 252) {
    return { valid: false, step: 'quality', message: 'Photo is overexposed. Please use a photo with normal lighting.' };
  }

  // ── Step 4: MediaPipe face detection ──
  let results = null;
  try {
    const fm = await getFaceMesh();
    results = await new Promise((resolve) => {
      fm.onResults((r) => resolve(r));
      fm.send({ image: canvas });
    });
  } catch (e) {
    // MediaPipe unavailable → fall through to Claude server-side validation
    return { valid: null, step: 'mediapipe_unavailable', message: 'Server validation required.' };
  }

  const faces = results?.multiFaceLandmarks || [];

  if (faces.length === 0) {
    return { valid: false, step: 'detection', message: 'No face detected. Please upload a clear, front-facing photo of one person.' };
  }

  if (faces.length > 1) {
    return { valid: false, step: 'detection', message: 'Multiple faces detected. Please upload a photo with only one person.' };
  }

  const lm = faces[0];

  // ── Step 5: Key landmark visibility ──
  // Required: both eyes, nose tip, mouth
  const required = [
    { idx: 33,  name: 'left eye' },
    { idx: 263, name: 'right eye' },
    { idx: 1,   name: 'nose' },
    { idx: 13,  name: 'mouth' },
  ];
  for (const { idx, name } of required) {
    const pt = lm[idx];
    if (!pt || pt.visibility < 0.05) {
      return { valid: false, step: 'landmarks', message: `${name.charAt(0).toUpperCase()+name.slice(1)} is not clearly visible. Please ensure the full face is in frame.` };
    }
  }

  // ── Step 6: Head pose (yaw) ──
  const yaw = Math.abs(estimateYaw(lm, w, h));
  if (yaw > 35) {
    return { valid: false, step: 'pose', message: 'Head angle is quite steep. Front-facing photos give better results.' };
  }

  // ── Step 7: Face size relative to frame ──
  const xs = lm.map(p => p.x), ys = lm.map(p => p.y);
  const faceW = (Math.max(...xs) - Math.min(...xs)) * w;
  const faceH = (Math.max(...ys) - Math.min(...ys)) * h;
  if (faceW < w * 0.08 || faceH < h * 0.08) {
    return { valid: false, step: 'size', message: 'Face is too small in the frame. Please move closer or use a portrait/headshot photo.' };
  }

  return {
    valid: true,
    step: 'done',
    message: 'Face verified',
    landmarks: lm,
    normW: w,
    normH: h,
  };
}

/**
 * Draw real landmark overlay onto a <canvas> element.
 * Uses actual MediaPipe landmark positions — adapts to every face.
 */
export function drawLandmarkOverlay(canvas, landmarks, phase) {
  if (!landmarks || !canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const px = (lm) => ({ x: lm.x * W, y: lm.y * H });
  const color = phase === 'success' ? '#4CAF50' : phase === 'error' ? '#E53935' : '#C4714A';
  const alpha = phase === 'scanning' ? 0.65 : 0.9;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = alpha;

  function polyline(indices) {
    ctx.beginPath();
    indices.forEach((i, n) => {
      const p = px(landmarks[i]);
      n === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  function dot(i, r = 2.5) {
    const p = px(landmarks[i]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ── Face oval ──
  const ovalIdx = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
  polyline(ovalIdx);

  // ── Left eye ──
  polyline([33,7,163,144,145,153,154,155,133,33]);
  polyline([246,161,160,159,158,157,173,246]);

  // ── Right eye ──
  polyline([362,382,381,380,374,373,390,249,263,362]);
  polyline([466,388,387,386,385,384,398,466]);

  // ── Eyebrows ──
  polyline([70,63,105,66,107,55,65,52,53,46]);
  polyline([300,293,334,296,336,285,295,282,283,276]);

  // ── Nose bridge + tip ──
  polyline([168,6,197,195,5,4,1,19,94]);
  polyline([129,98,97,2,326,327,358]);
  polyline([49,48,115,220,237,44]);
  polyline([279,278,344,440,457,274]);

  // ── Lips outer ──
  polyline([61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185,61]);
  // Lips inner
  polyline([78,95,88,178,87,14,317,402,318,324,308,78]);

  // ── Jawline ──
  polyline([234,227,116,111,117,118,119,120,121,128,132,176,149,150,136,172,138,212,210,169,170,140,171,175,396,369,395,394,378,400,377,152]);

  // ── Key landmark dots ──
  [33, 263, 1, 61, 291, 199, 10, 152].forEach(i => dot(i));

  // ── Scanning line animation ──
  if (phase === 'scanning') {
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const progress = (Date.now() % 1800) / 1800;
    const y = progress * H;
    const grad = ctx.createLinearGradient(0, y - 20, 0, y + 20);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // ── Success checkmark ──
  if (phase === 'success') {
    const cx = W / 2, cy = H / 2;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(76,175,80,0.18)';
    ctx.fill();
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx - 3, cy + 10);
    ctx.lineTo(cx + 14, cy - 10);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
