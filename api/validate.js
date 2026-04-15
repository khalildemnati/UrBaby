export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const { image, mime } = await req.json()

  const prompt = [
    'You are a strict face validation system for a baby prediction app.',
    'Analyze this photo and return JSON only — no markdown, no extra text.',
    '',
    'Checks (ALL must pass for valid=true):',
    '1. Exactly ONE human face visible',
    '2. Face is front-facing (not a side profile)',
    '3. Both eyes, nose, and mouth are clearly visible',
    '4. Image is sharp (not blurry)',
    '5. Face is well-lit (not too dark or overexposed)',
    '6. Face occupies at least 20% of the frame',
    '7. No sunglasses, masks, or heavy occlusions',
    '8. Real photo of a real person (not cartoon, drawing, statue)',
    '',
    'Return exactly:',
    '{"valid":true|false,"reason":"short reason if invalid, empty string if valid","quality":"good|ok|poor"}',
  ].join('\n')

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
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!resp.ok) throw new Error('upstream')
    const data = await resp.json()
    const raw = (data.content || []).map(c => c.text || '').join('').trim()
    const clean = raw.replace(/```json|```/g, '').trim()
    let result = JSON.parse(clean.slice(clean.indexOf('{')))

    // Humanize error messages
    if (!result.valid && result.reason) {
      const r = result.reason.toLowerCase()
      if (r.includes('multiple') || r.includes('group') || r.includes('more than one'))
        result.reason = 'Multiple faces detected. Please upload a photo with only one person.'
      else if (r.includes('no face') || r.includes('not a') || r.includes('object') || r.includes('landscape'))
        result.reason = 'No face detected. Please upload a clear photo of a person.'
      else if (r.includes('cartoon') || r.includes('drawing') || r.includes('illustration'))
        result.reason = 'Not a real photo. Please upload an actual photograph.'
      else if (r.includes('profile') || r.includes('side') || r.includes('turned'))
        result.reason = 'Please look directly at the camera. Side profiles are not accepted.'
      else if (r.includes('blur') || r.includes('blurry'))
        result.reason = 'Photo is too blurry. Please use a sharper image.'
      else if (r.includes('dark') || r.includes('light'))
        result.reason = 'Poor lighting. Please use a well-lit, clearly visible photo.'
      else if (r.includes('sunglasses') || r.includes('mask') || r.includes('cover'))
        result.reason = 'Face is obscured. Remove sunglasses or masks.'
      else if (r.includes('small') || r.includes('far'))
        result.reason = 'Face is too small. Please move closer or use a portrait photo.'
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (_) {
    // Fail open — don't block users if validation API is down
    return new Response(JSON.stringify({ valid: true, reason: '', quality: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
