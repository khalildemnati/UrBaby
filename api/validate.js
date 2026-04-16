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

  // STRICT prompt — NO fail-open, Claude must decide
  const prompt = `You are a strict face validation system for an AI baby generator app.

Analyze this image and answer STRICTLY. Return ONLY valid JSON — no markdown, no explanation.

CHECK ALL of the following. ALL must be true for valid=true:

1. The image contains EXACTLY one real human face (not a drawing, cartoon, statue, or CGI)
2. The face is front-facing — both eyes visible, nose visible, mouth visible
3. The face is NOT covered by sunglasses, mask, hat brim, or heavy shadow
4. The image is NOT a photo of a screen, phone, laptop, TV, monitor, or any electronic device
5. The image is NOT a product photo, advertisement, screenshot, or website
6. The face is NOT a side profile (must be within ~20 degrees of looking at camera)
7. The image is reasonably sharp — not heavily blurred or pixelated
8. The face occupies at least 15% of the image frame
9. There is only ONE person in the image (no group photos)
10. The image is NOT a landscape, building, animal, food, or any non-human subject

If ANY check fails → valid must be false.

Return exactly this JSON and nothing else:
{"valid":true,"reason":"","ethnicity":"","skinTone":"","eyeColor":"","hairColor":""}

OR if invalid:
{"valid":false,"reason":"<one clear sentence explaining what is wrong>","ethnicity":"","skinTone":"","eyeColor":"","hairColor":""}

For valid images, also fill:
- ethnicity: e.g. "Black/African", "East Asian", "South Asian", "White/Caucasian", "Middle Eastern", "Hispanic/Latino", "Mixed"  
- skinTone: e.g. "very dark", "dark brown", "medium brown", "olive", "light", "very light"
- eyeColor: e.g. "dark brown", "brown", "hazel", "green", "blue"
- hairColor: e.g. "black", "dark brown", "brown", "blonde", "red", "gray"`

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
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!resp.ok) {
      // API down — FAIL CLOSED (reject, don't allow through)
      return new Response(JSON.stringify({
        valid: false,
        reason: 'Validation service unavailable. Please try again in a moment.'
      }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    }

    const data = await resp.json()
    const raw = (data.content || []).map(c => c.text || '').join('').trim()
    const clean = raw.replace(/```json|```/g, '').trim()

    let result
    try {
      result = JSON.parse(clean.slice(clean.indexOf('{')))
    } catch (_) {
      return new Response(JSON.stringify({
        valid: false,
        reason: 'Could not process image. Please try a different photo.'
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Humanize rejection messages
    if (!result.valid && result.reason) {
      const r = result.reason.toLowerCase()
      if (r.includes('screen') || r.includes('monitor') || r.includes('laptop') || r.includes('phone') || r.includes('device') || r.includes('product') || r.includes('advertisement') || r.includes('screenshot') || r.includes('website'))
        result.reason = 'This appears to be a photo of a screen or product — not a person. Please upload a real portrait photo.'
      else if (r.includes('multiple') || r.includes('group') || r.includes('more than one') || r.includes('several'))
        result.reason = 'Multiple people detected. Please upload a photo with only one person.'
      else if (r.includes('no face') || r.includes('not a human') || r.includes('not a person') || r.includes('object') || r.includes('landscape') || r.includes('animal') || r.includes('building'))
        result.reason = 'No face detected. Please upload a clear portrait photo of a real person.'
      else if (r.includes('cartoon') || r.includes('drawing') || r.includes('illustration') || r.includes('anime') || r.includes('cgi') || r.includes('3d'))
        result.reason = 'Not a real photo. Please upload an actual photograph of a person.'
      else if (r.includes('profile') || r.includes('side') || r.includes('turned away') || r.includes('not front'))
        result.reason = 'Please look directly at the camera. Side profiles are not accepted.'
      else if (r.includes('blur') || r.includes('blurry') || r.includes('pixelated'))
        result.reason = 'Photo is too blurry. Please use a sharper, clearer image.'
      else if (r.includes('dark') || r.includes('shadow') || r.includes('lighting'))
        result.reason = 'Poor lighting. Please use a well-lit photo where the face is clearly visible.'
      else if (r.includes('sunglasses') || r.includes('mask') || r.includes('covered') || r.includes('occluded'))
        result.reason = 'Face is covered. Please remove sunglasses or masks and retake the photo.'
      else if (r.includes('small') || r.includes('far') || r.includes('too distant'))
        result.reason = 'Face is too small in the frame. Please use a portrait or headshot photo.'
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    // Network / unexpected error — FAIL CLOSED
    return new Response(JSON.stringify({
      valid: false,
      reason: 'Validation failed due to a network error. Please check your connection and try again.'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
