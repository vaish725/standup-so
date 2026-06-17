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

  if (!API_KEY) {
    // Return a simple deterministic stub so the frontend works without keys.
    const stub = {
      yesterday: body.mode === 'guided' ? (body.yesterday ? body.yesterday.split(/[.\n]+/).filter(Boolean).slice(0,3) : []) : (body.brain ? body.brain.split(/[.\n]+/).slice(0,2) : []),
      today: body.mode === 'guided' ? (body.today ? body.today.split(/[.\n]+/).filter(Boolean).slice(0,3) : []) : (body.brain ? body.brain.split(/[.\n]+/).slice(2,4) : []),
      blocked: body.mode === 'guided' ? (body.blocked ? body.blocked.split(/[.\n]+/).filter(Boolean).slice(0,3) : []) : (body.brain ? body.brain.split(/[.\n]+/).slice(4,6) : [])
    }

    return NextResponse.json({ ok: true, result: stub })
  }

  // Example: forward to an Anthropic/Claude endpoint (replace URL + payload per provider docs)
  const aiResp = await fetch('https://api.example-ai.com/generate', {
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
}
