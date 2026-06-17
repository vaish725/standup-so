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

    // Build an improved system prompt + examples and use OpenAI function-calling for strict JSON output.
    const toneMap: Record<string, string> = {
      professional: 'Use clear, concise professional language. Active voice. No filler words.',
      casual: "Use a relaxed, conversational tone. Contractions are fine. First person throughout.",
      'very-brief': 'Maximum 1 bullet per section. Each bullet under 10 words. No elaboration.',
      'add-context': 'Add a brief clause of context to each bullet to help stakeholders who are less familiar with the work.'
    }

    const systemPrompt = `You are a standup post writer. Given a raw brain dump or structured answers, produce JSON only with three arrays: {"yesterday":[], "today":[], "blocked":[]}. Rules:\n- 1-3 bullets per section\n- Preserve technical names and code references exactly\n- If nothing is blocked return ["None"]\n- Surface implicit blockers if present\n- Use the requested tone: ${toneMap[body.tone] || ''}\nExamples:\nInput: "Yesterday I fixed the auth bug and refactored login. Today I'll write tests and deploy. Blocked by flaky CI."\nOutput: {"yesterday":["Fixed auth bug; refactored login flow"],"today":["Write tests and deploy"],"blocked":["Flaky CI causing test failures"]}\n
Input: "Brain dump: updated UI, removed unused CSS, will ship today"\nOutput: {"yesterday":["Updated UI, removed unused CSS"],"today":["Ship changes today"],"blocked":["None"]}`

    const userContent = body.mode === 'guided'
      ? `Yesterday: ${body.yesterday || ''}\nToday: ${body.today || ''}\nBlocked: ${body.blocked || ''}`
      : `Brain dump: ${body.brain || ''}`

    const functions = [
      {
        name: 'return_standup_json',
        description: 'Return a JSON object containing arrays for yesterday, today, and blocked',
        parameters: {
          type: 'object',
          properties: {
            yesterday: { type: 'array', items: { type: 'string' }, description: '1-3 concise bullets of completed work' },
            today: { type: 'array', items: { type: 'string' }, description: "1-3 concise bullets of today's plan" },
            blocked: { type: 'array', items: { type: 'string' }, description: '0-3 bullets of blockers; return ["None"] if none' }
          },
          required: ['yesterday', 'today', 'blocked']
        }
      }
    ]

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
          functions,
          function_call: { name: 'return_standup_json' },
          max_tokens: 800
        })
      })

      if (!resp.ok) {
        const text = await resp.text()
        console.error('OpenAI error:', text)
        return NextResponse.json({ ok: true, result: stub })
      }

      const j = await resp.json()
      const choice = j?.choices?.[0]
      const functionCall = choice?.message?.function_call
      const argsText = functionCall?.arguments || ''

      if (argsText) {
        try {
          const parsed = JSON.parse(argsText)
          if (parsed && (Array.isArray(parsed.yesterday) || Array.isArray(parsed.today) || Array.isArray(parsed.blocked))) {
            // Normalize blocked if empty
            if (!parsed.blocked || (Array.isArray(parsed.blocked) && parsed.blocked.length === 0)) parsed.blocked = ['None']
            return NextResponse.json({ ok: true, result: parsed })
          }
        } catch (e) {
          console.warn('Failed to parse function_call.arguments as JSON', e)
        }
      }

      console.error('OpenAI did not return structured function output; returning stub. Raw response:', j)
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
