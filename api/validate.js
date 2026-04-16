export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body
  try { body = await req.json() } catch (_) {
    return new Response(JSON.stringify({ valid: false, reason: 'Invalid request.' }), { status: 400 })
  }

  const { image, mime } = body
  if (!image || !mime) {
    return new Response(JSON.stringify({ valid: false, reason: 'No image provided.' }), { status: 400 })
  }

  const prompt = `You are a face validation system for an AI baby generator. Your job is to decide if this photo is USABLE.

HARD REJECT (valid=false) — only if ONE of these is true:
1. No human face is visible at all (empty room, landscape, animal, food, text only)
2. More than one person's face is clearly visible (group photo)
3. The image is a photo of a SCREEN or MONITOR (phone screen, laptop screen, TV, advertisement screenshot) — you can see UI elements, app interfaces, or the glow of a display
4. The image is a cartoon, anime, drawing, painting, or CGI — not a real photograph
5. The face is completely hidden (full face mask, heavy veil, turned fully away showing only back of head)

SOFT WARNINGS (valid=true, add to warnings array) — do NOT reject for:
- Slight head tilt or angle (accept up to ~45 degrees)
- Sunglasses (warn but accept)
- Partial face at edges
- Low light or shadows
- Motion blur
- Low resolution
- Side profile (warn but accept)
- Hat or hair covering forehead

IMPORTANT: When in doubt → accept (valid=true). Only reject the 5 hard cases above.

Also extract these if a face is present:
- ethnicity: best guess e.g. "Black/African", "East Asian", "South Asian", "White/Caucasian", "Middle Eastern", "Hispanic/Latino", "Mixed"
- skinTone: e.g. "very dark", "dark brown", "medium brown", "olive", "light", "very light"
- eyeColor: e.g. "dark brown", "brown", "hazel", "green", "blue", "unknown"
- hairColor: e.g. "black", "dark brown", "brown", "blonde", "red", "gray", "unknown"

Return ONLY raw JSON — no markdown, no explanation:
{"valid":true,"reason":"","warnings":[],"ethnicity":"","skinTone":"","eyeColor":"","hairColor":"","debug":{"faceDetected":true,"qualityScore":0.8}}`

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    // If API is down → FAIL OPEN (accept) so users aren't blocked
    if (!resp.ok) {
      console.error('Validate API error:', resp.status)
      return new Response(JSON.stringify({
        valid: true,
        reason: '',
        warnings: ['Verification service temporarily unavailable — proceeding with caution.'],
        ethnicity: '', skinTone: '', eyeColor: '', hairColor: '',
        debug: { faceDetected: true, qualityScore: 0.5 }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    const data = await resp.json()
    const raw = (data.content || []).map(c => c.text || '').join('').trim()
    const clean = raw.replace(/```json|```/g, '').trim()

    let result
    try {
      result = JSON.parse(clean.slice(clean.indexOf('{')))
    } catch (_) {
      // JSON parse failed → accept (fail open)
      return new Response(JSON.stringify({
        valid: true, reason: '', warnings: [],
        ethnicity: '', skinTone: '', eyeColor: '', hairColor: '',
        debug: { faceDetected: true, qualityScore: 0.5 }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Humanize hard rejection messages only
    if (!result.valid && result.reason) {
      const r = result.reason.toLowerCase()
      if (r.includes('screen') || r.includes('monitor') || r.includes('laptop') || r.includes('phone') || r.includes('device') || r.includes('display') || r.includes('ui') || r.includes('interface'))
        result.reason = 'This looks like a screenshot or photo of a screen. Please upload a real portrait photo.'
      else if (r.includes('multiple') || r.includes('group') || r.includes('more than one') || r.includes('several people'))
        result.reason = 'Multiple people detected. Please upload a photo with only one person.'
      else if (r.includes('no face') || r.includes('no human') || r.includes('no person') || r.includes('landscape') || r.includes('animal') || r.includes('object'))
        result.reason = 'No face detected. Please upload a clear photo of a person.'
      else if (r.includes('cartoon') || r.includes('drawing') || r.includes('anime') || r.includes('cgi') || r.includes('illustration'))
        result.reason = 'Not a real photo. Please upload an actual photograph of a person.'
    }

    // Ensure debug field exists
    if (!result.debug) {
      result.debug = { faceDetected: result.valid, qualityScore: result.valid ? 0.8 : 0.0 }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    // Network error → FAIL OPEN
    console.error('Validate error:', err)
    return new Response(JSON.stringify({
      valid: true, reason: '', warnings: ['Could not reach verification service — proceeding anyway.'],
      ethnicity: '', skinTone: '', eyeColor: '', hairColor: '',
      debug: { faceDetected: true, qualityScore: 0.5 }
    }), { headers: { 'Content-Type': 'application/json' } })
  }
}
