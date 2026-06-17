import { NextResponse } from 'next/server'

type GenerateRequest = {
  mode: 'guided' | 'brain'
  tone: string
  yesterday?: string
  today?: string
  blocked?: string
  brain?: string
}

export async function POST(req: Request) {
  const body: GenerateRequest = await req.json()

  // If you set AI_API_KEY in your environment (e.g. .env.local), this route will forward to the AI provider.
  const API_KEY = process.env.AI_API_KEY || ''
  // Deterministic stub for local/dev usage (returned when no API key/URL or on proxy failure)
  const stub = {
    yesterday: body.mode === 'guided' ? (body.yesterday ? body.yesterday.split(/[.\n]+/).filter(Boolean).slice(0,3) : []) : (body.brain ? body.brain.split(/[.\n]+/).slice(0,2) : []),
    today: body.mode === 'guided' ? (body.today ? body.today.split(/[.\n]+/).filter(Boolean).slice(0,3) : []) : (body.brain ? body.brain.split(/[.\n]+/).slice(2,4) : []),
    blocked: body.mode === 'guided' ? (body.blocked ? body.blocked.split(/[.\n]+/).filter(Boolean).slice(0,3) : []) : (body.brain ? body.brain.split(/[.\n]+/).slice(4,6) : [])
  }

  if (!API_KEY) {
    return NextResponse.json({ ok: true, result: stub })
  }

  const AI_URL = process.env.AI_API_URL || ''
  const AI_PROVIDER = (process.env.AI_PROVIDER || '').toLowerCase()

  // If provider explicitly set to 'openai', use OpenAI Chat Completions endpoint.
  if (AI_PROVIDER === 'openai') {
    const OPENAI_KEY = process.env.OPENAI_API_KEY || API_KEY
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    if (!OPENAI_KEY) {
      return NextResponse.json({ ok: true, result: stub })
    }

    // Build a system prompt based on the PRD to ask for JSON output
    const toneMap: Record<string, string> = {
      professional: 'Use clear, concise professional language. Active voice. No filler words.',
      casual: "Use a relaxed, conversational tone. Contractions are fine. First person throughout.",
      'very-brief': 'Maximum 1 bullet per section. Each bullet under 10 words. No elaboration.',
      'add-context': 'Add a brief clause of context to each bullet to help stakeholders who are less familiar with the work.'
    }

    const systemPrompt = `You are a standup post writer for remote engineering and product teams. Given raw input, return JSON only: { \"yesterday\": [..], \"today\": [..], \"blocked\": [..] }. Rules: keep each section to 1-3 bullets max; preserve technical terms; if nothing is blocked return ['None']; surface implicit blockers. Tone hint: ${toneMap[body.tone] || ''}`

    const userContent = body.mode === 'guided'
      ? `Yesterday: ${body.yesterday || ''}\nToday: ${body.today || ''}\nBlocked: ${body.blocked || ''}`
      : `Brain dump: ${body.brain || ''}`

    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          max_tokens: 800
        })
      })

      if (!resp.ok) {
        const text = await resp.text()
        console.error('OpenAI error:', text)
        return NextResponse.json({ ok: true, result: stub })
      }

      const j = await resp.json()
      // Extract assistant text
      const assistant = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || ''

      // Try to parse JSON from the model output.
      try {
        const parsed = JSON.parse(assistant)
        if (parsed && (parsed.yesterday || parsed.today || parsed.blocked)) {
          return NextResponse.json({ ok: true, result: parsed })
        }
      } catch (e) {
        // If JSON.parse fails, attempt to extract JSON substring
        const m = assistant.match(/\{[\s\S]*\}/)
        if (m) {
          try {
            const parsed2 = JSON.parse(m[0])
            if (parsed2 && (parsed2.yesterday || parsed2.today || parsed2.blocked)) {
              return NextResponse.json({ ok: true, result: parsed2 })
            }
          } catch (e) {
            // fall through
          }
        }
      }

      // Parsing failed — log and return stub
      console.error('OpenAI response could not be parsed as JSON, returning stub. Raw:', assistant)
      return NextResponse.json({ ok: true, result: stub })
    } catch (err) {
      console.error('OpenAI fetch failed:', err)
      return NextResponse.json({ ok: true, result: stub })
    }
  }

  // If a generic AI_URL is configured, forward to it.
  if (!AI_URL) {
    return NextResponse.json({ ok: true, result: stub })
  }

  try {
    const aiResp = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ input: body, meta: { project: 'standup-so' } })
    })

    if (!aiResp.ok) {
      const text = await aiResp.text()
      return NextResponse.json({ ok: false, error: text }, { status: 502 })
    }

    const data = await aiResp.json()
    // Expect provider returns { yesterday: [], today: [], blocked: [] }
    return NextResponse.json({ ok: true, result: data })
  } catch (err) {
    // Network or DNS errors — return stub and log server-side
    console.error('AI proxy fetch failed:', err)
    return NextResponse.json({ ok: true, result: stub })
  }
}
