export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body
  try { body = await req.json() } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 })
  }

  const { dadImage, momImage, dadMime, momMime, gender } = body
  if (!dadImage || !momImage) {
    return new Response(JSON.stringify({ error: 'Both parent images are required' }), { status: 400 })
  }

  const gLabel = gender === 'girl' ? 'a 7-year-old girl' : gender === 'boy' ? 'a 7-year-old boy' : 'a 7-year-old child'

  // ── Step 1: Analyze both parents with Claude Vision ──
  const analysisPrompt = [
    'You are an expert in human facial genetics and photorealistic image generation.',
    'Analyze Image 1 (Dad) and Image 2 (Mom) carefully.',
    '',
    'Extract PRECISE features from each parent:',
    'DAD: eye shape+color, nose shape+size, lip shape+thickness, face shape, skin undertone, hair color+texture, eyebrow shape, cheekbone structure, jaw shape, chin, forehead size',
    'MOM: same features as above',
    '',
    'Then write a highly detailed Stable Diffusion / Flux image generation prompt for ' + gLabel + ' who GENETICALLY INHERITS features from BOTH parents.',
    '',
    'STRICT rules for the image prompt:',
    '- Subject: ONLY the child face and neck/shoulders — NO body below shoulders',
    '- Child looks directly at camera with a natural warm smile',
    '- Style: photorealistic, RAW photo, 8k, ultra sharp, canon 5d mark IV, 85mm lens',
    '- Lighting: soft natural diffused window light',
    '- Background: clean soft cream/white bokeh',
    '- The prompt MUST name specific inherited traits: e.g. "inherited almond-shaped dark eyes from mother, straight nose bridge from father"',
    '- NO celebrity names, NO real person references',
    '- Negative prompt: include separately',
    '',
    'Return ONLY raw JSON (absolutely no markdown, no backticks):',
    '{"prompt":"...","negative":"cartoon, anime, illustration, painting, CGI, 3d render, blurry, deformed, extra limbs, watermark, text, body, torso, hands","features":"2 sentences describing the genetic blend"}',
  ].join('\n')

  let imgPrompt = ''
  let negativePrompt = 'cartoon, anime, illustration, blurry, deformed, watermark, text, body, torso, hands'
  let features = ''

  try {
    const analysisResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: dadMime || 'image/jpeg', data: dadImage } },
            { type: 'image', source: { type: 'base64', media_type: momMime || 'image/jpeg', data: momImage } },
            { type: 'text', text: analysisPrompt },
          ],
        }],
      }),
    })

    if (!analysisResp.ok) throw new Error('Analysis API error: ' + analysisResp.status)

    const analysisData = await analysisResp.json()
    const raw = (analysisData.content || []).map(c => c.text || '').join('').trim()
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean.slice(clean.indexOf('{')))
    imgPrompt = parsed.prompt || ''
    negativePrompt = parsed.negative || negativePrompt
    features = parsed.features || ''
  } catch (e) {
    // Fallback prompt if Claude analysis fails
    imgPrompt = 'Photorealistic portrait of ' + gLabel + ', clearly resembles both parents, face and shoulders only, direct eye contact, natural warm smile, 8k ultra sharp, RAW photo, soft natural lighting, cream background'
  }

  // ── Step 2: Generate via Pollinations Flux Pro ──
  const seed = Math.floor(Math.random() * 999999)
  const fullPrompt = [
    imgPrompt,
    'portrait framing: face neck shoulders only',
    'photorealistic RAW photograph',
    '8k ultra high definition',
    'sharp focus',
    '85mm portrait lens',
    'soft bokeh background',
    'professional studio lighting',
  ].join(', ')

  const imageUrl = [
    'https://image.pollinations.ai/prompt/',
    encodeURIComponent(fullPrompt),
    '?width=576&height=720',
    '&seed=' + seed,
    '&nologo=true',
    '&enhance=true',
    '&model=flux-pro',
    '&negative=' + encodeURIComponent(negativePrompt),
  ].join('')

  // Verify the image actually loaded by doing a HEAD request
  try {
    const check = await fetch(imageUrl, { method: 'GET', signal: AbortSignal.timeout(40000) })
    if (!check.ok) throw new Error('Image generation returned ' + check.status)
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Image generation failed. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ imgUrl: imageUrl, features, seed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
