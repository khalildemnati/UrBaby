export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { image, mime, who } = await req.json()
  const role = who === 'dad' ? 'Dad' : 'Mom'

  const prompt = [
    'Analyze this photo carefully and answer ONLY with JSON.',
    '',
    'Check for ALL of these:',
    '1. Is there exactly ONE clearly visible human face?',
    '2. Is the face front-facing (not a side profile or turned away)?',
    '3. Is the face large enough to see facial features clearly?',
    '4. Is this a real photo of a real person (not a cartoon, drawing, animal, landscape, object, or crowd)?',
    '5. Is the face reasonably well-lit (not too dark or too blurry)?',
    '',
    'Return ONLY this JSON (no markdown):',
    '{"valid":true/false,"reason":"brief reason if invalid","message":"brief positive message if valid"}',
    '',
    'Examples of INVALID: landscape photo, cartoon, drawing, back of head, group photo, animal, QR code, text-only image, face covered by sunglasses or mask, face too small or too far away.',
    'Examples of VALID: clear selfie, portrait photo, headshot with visible face features.',
  ].join('\n')

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: image }},
          { type: 'text', text: prompt },
        ],
      }],
    }),
  })

  if (!resp.ok) {
    // On API error, allow through (fail open) so users aren't blocked
    return new Response(JSON.stringify({ valid: true, message: 'Face detected ✓' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const data = await resp.json()
  const raw  = (data.content || []).map(c => c.text || '').join('').trim()

  let result = { valid: true, message: 'Face detected ✓' }
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    result = JSON.parse(clean.slice(clean.indexOf('{')))
  } catch (_) {
    // fallback: allow through
  }

  // Make error messages friendly and actionable
  if (!result.valid) {
    const reasonLow = (result.reason || '').toLowerCase()
    if (reasonLow.includes('group') || reasonLow.includes('multiple')) {
      result.reason = 'Please upload a photo with only one person — no group photos.'
    } else if (reasonLow.includes('landscape') || reasonLow.includes('object') || reasonLow.includes('no face')) {
      result.reason = 'No face detected. Please upload a clear photo of a person.'
    } else if (reasonLow.includes('cartoon') || reasonLow.includes('drawing') || reasonLow.includes('anime')) {
      result.reason = 'Please upload a real photo, not a drawing or cartoon.'
    } else if (reasonLow.includes('dark') || reasonLow.includes('blur')) {
      result.reason = 'Photo is too dark or blurry. Please use a clear, well-lit photo.'
    } else if (reasonLow.includes('profile') || reasonLow.includes('side')) {
      result.reason = 'Please use a front-facing photo where the full face is visible.'
    } else if (reasonLow.includes('sunglasses') || reasonLow.includes('mask') || reasonLow.includes('covered')) {
      result.reason = 'Face is covered. Please remove sunglasses or masks and retake the photo.'
    } else if (!result.reason) {
      result.reason = 'Please upload a clear, front-facing photo of one person.'
    }
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
