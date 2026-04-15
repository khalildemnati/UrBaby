export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { dadImage, momImage, dadMime, momMime, gender } = await req.json()

  const gLabel =
    gender === 'girl' ? 'a 7-year-old girl' :
    gender === 'boy'  ? 'a 7-year-old boy'  :
    'a 7-year-old child'

  const promptLines = [
    'You are a facial genetics expert.',
    'Image 1 = Dad. Image 2 = Mom. Analyze both carefully.',
    '',
    'Extract from EACH parent:',
    '- Eye shape (almond/round/hooded), size, color',
    '- Nose: bridge width, tip shape, nostrils',
    '- Lips: upper/lower thickness, cupid bow',
    '- Face shape: oval, round, square, heart',
    '- Skin tone and undertone',
    '- Hair color and texture',
    '- Eyebrow shape',
    '- Cheekbone prominence',
    '- Jaw and chin structure',
    '',
    'Write an image generation prompt for ' + gLabel + ' who CLEARLY resembles BOTH parents.',
    '',
    'Rules:',
    '- Frame: neck/shoulders to top of head ONLY',
    '- Child faces camera with gentle warm smile',
    '- Photorealistic, 8k, ultra sharp, RAW photo style',
    '- Soft natural window light',
    '- Clean cream or off-white background',
    '- List specific inherited traits from each parent',
    '- Do NOT reference any real person or celebrity names',
    '',
    'Return ONLY raw JSON, no markdown:',
    '{"prompt":"...","features":"one sentence about blended traits"}',
  ].join('\n')

  const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: dadMime, data: dadImage }},
          { type: 'image', source: { type: 'base64', media_type: momMime, data: momImage }},
          { type: 'text',  text: promptLines },
        ],
      }],
    }),
  })

  if (!anthropicResp.ok) {
    return new Response(JSON.stringify({ error: 'Analysis failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const data = await anthropicResp.json()
  const raw  = (data.content || []).map(c => c.text || '').join('').trim()

  let imgPrompt = ''
  let features  = ''
  try {
    const clean  = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean.slice(clean.indexOf('{')))
    imgPrompt = parsed.prompt   || ''
    features  = parsed.features || ''
  } catch (_) {
    imgPrompt = 'Photorealistic portrait of ' + gLabel + ', neck to top of head only, gentle smile, 8k sharp, clearly inherits features from both parents, soft natural lighting, cream background'
  }

  const seed   = Math.floor(Math.random() * 999999)
  const full   = imgPrompt + ', portrait from neck to top of head only, photorealistic RAW photo, 8k ultra sharp, professional photography, no text, no watermark, clean background'
  const imgUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(full) + '?width=512&height=640&seed=' + seed + '&nologo=true&enhance=true&model=flux-pro'

  return new Response(JSON.stringify({ imgUrl, features }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
