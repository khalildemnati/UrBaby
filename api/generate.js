export const config = { runtime: 'edge' }

// Compress image to target size (base64 → smaller base64)
// We do this server-side by re-encoding at lower quality via Canvas API
// (Edge runtime doesn't have Canvas, so we work with the raw data)

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body
  try { body = await req.json() } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid request.' }), { status: 400 })
  }

  const { dadImage, momImage, dadMime, momMime, gender, dadMeta, momMeta } = body

  if (!dadImage || !momImage) {
    return new Response(JSON.stringify({ error: 'Both parent images are required.' }), { status: 400 })
  }

  const gLabel  = gender === 'girl' ? 'a 7-year-old girl' : gender === 'boy' ? 'a 7-year-old boy' : 'a 7-year-old child'
  const gPron   = gender === 'girl' ? 'her' : 'his'
  const gAdj    = gender === 'girl' ? 'girl' : gender === 'boy' ? 'boy' : 'child'

  // Build ethnicity context from validation metadata
  const dadEth = dadMeta?.ethnicity || ''
  const momEth = momMeta?.ethnicity || ''
  const dadSkin = dadMeta?.skinTone || ''
  const momSkin = momMeta?.skinTone || ''
  const dadHair = dadMeta?.hairColor || ''
  const momHair = momMeta?.hairColor || ''
  const dadEye  = dadMeta?.eyeColor  || ''
  const momEye  = momMeta?.eyeColor  || ''

  // ── Step 1: Deep facial analysis via Claude Vision ──
  const analysisPrompt = [
    'You are a world-class expert in human facial genetics, ethnicity analysis, and photorealistic image generation.',
    'You are given two parent photos: Image 1 is the Father, Image 2 is the Mother.',
    '',
    '=== CRITICAL TASK ===',
    'Generate a Flux/Stable Diffusion image prompt for ' + gLabel + ' who is a REALISTIC genetic child of these two specific parents.',
    '',
    '=== STEP 1: ANALYZE BOTH PARENTS ===',
    'For EACH parent, identify precisely:',
    '- Ethnicity/ancestry (be specific: West African, East Asian, South Asian, etc.)',
    '- Skin tone on the Fitzpatrick scale (I=very light to VI=very dark)',
    '- Eye shape (monolid, almond, round, hooded, deep-set, etc.) and color',
    '- Nose (width, bridge height, tip shape)',
    '- Lips (thickness, shape, color)',
    '- Face shape (oval, round, square, heart, diamond)',
    '- Jaw and chin structure',
    '- Cheekbone prominence',
    '- Hair texture (straight, wavy, curly, coily) and color',
    '- Eyebrow shape and thickness',
    '',
    '=== STEP 2: COMPUTE GENETIC BLEND ===',
    'Determine the child\'s likely features based on dominant/recessive genetics.',
    '- CRITICAL: skin tone must be a realistic biological blend of both parents\' skin tones',
    '- If both parents are dark-skinned → child MUST be dark-skinned',
    '- If parents have different tones → child is between them',
    '- NEVER default to white/light skin unless both parents are clearly light-skinned',
    '- Eye shape blends (e.g., slightly almond from one parent)',
    '- Hair texture blends (e.g., wavy-curly from curly + straight)',
    '',
    '=== STEP 3: WRITE THE IMAGE GENERATION PROMPT ===',
    'Rules:',
    '- Frame: face, neck, and top of shoulders ONLY — nothing below shoulder line',
    '- The child looks at camera with a natural, warm, gentle smile',
    '- ULTRA SPECIFIC on skin tone: use exact descriptors like "deep dark brown skin", "rich dark complexion", "warm medium brown skin", "light olive skin", etc.',
    '- ULTRA SPECIFIC on ethnic features: name them explicitly in the prompt',
    '- Style: photorealistic studio portrait, RAW photo, 8K, sharp, 85mm portrait lens f/2.8',
    '- Lighting: soft Rembrandt studio lighting',
    '- Background: very soft neutral cream/ivory bokeh',
    '- Age: child is exactly 7 years old',
    '- NO text, NO watermarks, NO body below shoulders',
    '',
    dadEth ? ('KNOWN: Father is ' + dadEth + ', skin: ' + dadSkin + ', eyes: ' + dadEye + ', hair: ' + dadHair) : '',
    momEth ? ('KNOWN: Mother is ' + momEth + ', skin: ' + momSkin + ', eyes: ' + momEye + ', hair: ' + momHair) : '',
    '',
    '=== OUTPUT FORMAT ===',
    'Return ONLY raw JSON (no markdown, no code fences, no explanation):',
    '{"prompt":"...","negative":"...","features":"2 sentences describing the genetic blend and which features come from which parent","dadEthnicity":"...","momEthnicity":"...","childSkinTone":"..."}',
  ].filter(Boolean).join('\n')

  let imgPrompt = ''
  let negPrompt = 'cartoon, anime, illustration, CGI, 3D render, painting, sketch, blurry, deformed, extra fingers, watermark, text, logo, body below shoulders, torso, hands, arms, nsfw, ugly, bad anatomy, wrong skin color, whitewashed, ethnicity mismatch'
  let features  = ''
  let childSkinTone = ''

  // Step 1: Analysis
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
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: dadMime || 'image/jpeg', data: dadImage } },
            { type: 'image', source: { type: 'base64', media_type: momMime || 'image/jpeg', data: momImage } },
            { type: 'text',  text: analysisPrompt },
          ],
        }],
      }),
    })

    if (!analysisResp.ok) {
      throw new Error('Analysis failed: HTTP ' + analysisResp.status)
    }

    const aData = await analysisResp.json()
    const raw   = (aData.content || []).map(c => c.text || '').join('').trim()
    const clean = raw.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('{')
    if (start === -1) throw new Error('No JSON in response')
    const parsed = JSON.parse(clean.slice(start))

    imgPrompt     = parsed.prompt     || ''
    negPrompt     = parsed.negative   || negPrompt
    features      = parsed.features   || ''
    childSkinTone = parsed.childSkinTone || ''

    if (!imgPrompt) throw new Error('Empty prompt from analysis')

  } catch (analysisErr) {
    // Analysis failed — return error, do NOT generate with fallback
    return new Response(JSON.stringify({
      error: 'Face analysis failed: ' + (analysisErr.message || 'Unknown error. Please try again.'),
      step: 'analysis'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  // Step 2: Generation with unique seed
  const seed = Math.floor(Math.random() * 999999) + Date.now() % 100000

  const fullPrompt = [
    imgPrompt,
    'portrait composition: face neck top-of-shoulders only',
    'photorealistic RAW photograph',
    '8k ultra-high-resolution',
    'tack-sharp focus on facial features',
    '85mm f/2.8 portrait lens',
    'professional studio bokeh background',
    'Rembrandt lighting setup',
    'film grain texture',
    'DSLR quality',
    gAdj === 'girl' ? 'feminine facial features' : gAdj === 'boy' ? 'masculine facial features' : '',
  ].filter(Boolean).join(', ')

  const imageUrl = 'https://image.pollinations.ai/prompt/' +
    encodeURIComponent(fullPrompt) +
    '?width=576&height=720' +
    '&seed=' + seed +
    '&nologo=true' +
    '&enhance=true' +
    '&model=flux-pro' +
    '&negative=' + encodeURIComponent(negPrompt)

  // Step 3: Fetch the image (not just HEAD — actually stream it)
  try {
    const imgResp = await fetch(imageUrl, {
      signal: AbortSignal.timeout(45000)
    })

    if (!imgResp.ok) {
      throw new Error('Generation service returned ' + imgResp.status)
    }

    const contentType = imgResp.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      throw new Error('Generation service did not return an image')
    }

    // Return the image as base64 so frontend doesn't need to load from external URL
    const buffer     = await imgResp.arrayBuffer()
    const uint8      = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
    const base64 = btoa(binary)
    const dataUrl = 'data:' + contentType + ';base64,' + base64

    return new Response(JSON.stringify({
      imgUrl:    dataUrl,
      features,
      seed,
      childSkinTone,
      debug: {
        promptLength:  fullPrompt.length,
        seed,
        model: 'flux-pro',
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (genErr) {
    return new Response(JSON.stringify({
      error: 'Portrait generation failed: ' + (genErr.message || 'Please try again.'),
      step: 'generation',
      seed,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
