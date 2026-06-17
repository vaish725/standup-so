"use client"

import React, { useState, useRef, useEffect } from 'react'

type Mode = 'guided' | 'brain'
type Tone = 'professional' | 'casual' | 'very-brief' | 'add-context'

export default function Page() {
  const [mode, setMode] = useState<Mode>('brain')
  const [tone, setTone] = useState<Tone>('professional')

  // guided inputs
  const [yesterdayInput, setYesterdayInput] = useState('')
  const [todayInput, setTodayInput] = useState('')
  const [blockedInput, setBlockedInput] = useState('')

  // brain dump
  const [brainDump, setBrainDump] = useState('')

  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const examples = [
    `Yesterday I fixed the auth bug, had to refactor the login flow. Today I'll finish the tests and deploy. Blocked by flaky CI.`,
    `Spent yesterday on design review and figma handoff. Today: implement header and footer. No blockers.`,
    `Worked on the payment integration; encountered API contract mismatch; will pair with backend today to resolve; waiting on backend to confirm schema.`
  ]

  function formatAsStandup(json: { yesterday: string[]; today: string[]; blocked: string[] }) {
    const y = json.yesterday.length ? json.yesterday.map((b) => `- ${b}`).join('\n') : '- None'
    const t = json.today.length ? json.today.map((b) => `- ${b}`).join('\n') : '- None'
    const b = json.blocked.length ? json.blocked.map((b) => `- ${b}`).join('\n') : '- None'
    return `Yesterday\n${y}\n\nToday\n${t}\n\nBlocked\n${b}`
  }

  function generateStructured(tone: Tone, raw: { yesterday?: string; today?: string; blocked?: string; brain?: string }) {
    // Very simple local transformation to simulate AI output
    const toBullets = (text = '') => {
      if (!text.trim()) return []
      // split by sentences or semicolons, limit 3
      const parts = text.split(/[.\n;]+/).map(s => s.trim()).filter(Boolean)
      return parts.slice(0, 3)
    }

    let yesterday: string[] = []
    let today: string[] = []
    let blocked: string[] = []

    if (mode === 'guided') {
      yesterday = toBullets(raw.yesterday)
      today = toBullets(raw.today)
      blocked = toBullets(raw.blocked)
    } else {
      // brain-dump: naive assignment
      const brain = (raw.brain || '')
      const sentences = brain.split(/[.\n]+/).map(s => s.trim()).filter(Boolean)
      yesterday = sentences.slice(0, 2)
      today = sentences.slice(2, 4)
      blocked = sentences.slice(4, 6)
    }

    // Tone modifiers (simple textual transformation)
    const applyTone = (arr: string[]) => {
      if (tone === 'very-brief') return arr.slice(0, 1).map(s => s.split(' ').slice(0, 10).join(' '))
      if (tone === 'casual') return arr.map(s => s.replace(/\bI am\b/g, "I'm")).map(s => s)
      if (tone === 'add-context') return arr.map(s => `${s} — context: see linked ticket or Slack thread`)
      // professional
      return arr.map(s => s.replace(/\bi\b/g, 'I'))
    }

    const result = {
      yesterday: applyTone(yesterday),
      today: applyTone(today),
      blocked: applyTone(blocked.length ? blocked : ['None'])
    }

    return result
  }

  async function onGenerate() {
    setGenerating(true)
    setCopied(false)
    // Attempt server-side generation first
    const payload = mode === 'guided' ? { mode: 'guided', tone, yesterday: yesterdayInput, today: todayInput, blocked: blockedInput } : { mode: 'brain', tone, brain: brainDump }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        if (data?.ok && data?.result) {
          const formatted = formatAsStandup(data.result)
          setOutput(formatted)
          setGenerating(false)
          return
        }
      }
    } catch (e) {
      // fall through to local simulator
      console.warn('server generate failed, falling back to local simulator', e)
    }

    // fallback: local simulator
    await new Promise(r => setTimeout(r, 200))
    const raw = mode === 'guided' ? { yesterday: yesterdayInput, today: todayInput, blocked: blockedInput } : { brain: brainDump }
    const structured = generateStructured(tone, raw)
    const formatted = formatAsStandup(structured)
    setOutput(formatted)
    setGenerating(false)
  }

  async function copyOutput() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('copy failed', e)
    }
  }

  function useExample(idx: number) {
    const ex = examples[idx]
    if (mode === 'guided') {
      // split heuristically into the three fields
      const parts = ex.split(/[.\n]+/).map(s => s.trim()).filter(Boolean)
      setYesterdayInput(parts[0] || '')
      setTodayInput(parts[1] || '')
      setBlockedInput(parts[2] || '')
      setTimeout(onGenerate, 0)
    } else {
      setBrainDump(ex)
      setTimeout(onGenerate, 0)
    }
  }

  useEffect(() => {
    // clear output when switching modes
    setOutput('')
  }, [mode, tone])

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">standup.so</h1>
          <p className="mt-2 text-gray-600">Turn your brain dump into a clean standup post in 10 seconds.</p>
        </header>

        <section className="bg-white p-6 rounded shadow">
          <div className="flex gap-3 mb-4">
            <button className={`px-3 py-1 rounded ${mode === 'brain' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setMode('brain')}>Brain dump</button>
            <button className={`px-3 py-1 rounded ${mode === 'guided' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setMode('guided')}>Guided</button>
            <div className="ml-auto text-sm text-gray-500">Tone:</div>
            <div className="flex gap-2">
              <button className={`px-2 py-1 rounded ${tone === 'professional' ? 'bg-black text-white' : 'bg-gray-100'}`} onClick={() => setTone('professional')}>Professional</button>
              <button className={`px-2 py-1 rounded ${tone === 'casual' ? 'bg-black text-white' : 'bg-gray-100'}`} onClick={() => setTone('casual')}>Casual</button>
              <button className={`px-2 py-1 rounded ${tone === 'very-brief' ? 'bg-black text-white' : 'bg-gray-100'}`} onClick={() => setTone('very-brief')}>Very brief</button>
              <button className={`px-2 py-1 rounded ${tone === 'add-context' ? 'bg-black text-white' : 'bg-gray-100'}`} onClick={() => setTone('add-context')}>Add context</button>
            </div>
          </div>

          <div>
            {mode === 'guided' ? (
              <div className="grid grid-cols-1 gap-3">
                <label className="block">
                  <div className="text-sm font-medium">Yesterday</div>
                  <textarea className="mt-1 w-full border rounded p-2" rows={2} value={yesterdayInput} onChange={e => setYesterdayInput(e.target.value)} placeholder="What did you finish?" />
                </label>
                <label className="block">
                  <div className="text-sm font-medium">Today</div>
                  <textarea className="mt-1 w-full border rounded p-2" rows={2} value={todayInput} onChange={e => setTodayInput(e.target.value)} placeholder="What are you doing today?" />
                </label>
                <label className="block">
                  <div className="text-sm font-medium">Blocked</div>
                  <textarea className="mt-1 w-full border rounded p-2" rows={1} value={blockedInput} onChange={e => setBlockedInput(e.target.value)} placeholder="Anything blocking you?" />
                </label>
              </div>
            ) : (
              <label className="block">
                <div className="text-sm font-medium">Brain dump</div>
                <textarea className="mt-1 w-full border rounded p-2" rows={6} value={brainDump} onChange={e => setBrainDump(e.target.value)} placeholder="Paste whatever's in your head..." />
              </label>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button onClick={onGenerate} className="px-4 py-2 bg-green-600 text-white rounded" disabled={generating}>{generating ? 'Generating...' : 'Generate'}</button>
            <div className="text-sm text-gray-500">Try an example:</div>
            <div className="flex gap-2">
              {examples.map((_, i) => (
                <button key={i} onClick={() => useExample(i)} className="px-2 py-1 bg-gray-100 rounded text-sm">Example {i + 1}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 bg-white p-6 rounded shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Output</h2>
            <div className="flex items-center gap-2">
              <button onClick={copyOutput} disabled={!output} className="px-3 py-1 bg-blue-600 text-white rounded">{copied ? 'Copied!' : 'Copy'}</button>
              <button onClick={() => { setOutput(''); setCopied(false) }} className="px-3 py-1 bg-gray-100 rounded">Clear</button>
            </div>
          </div>

          <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border min-h-[120px]">{output || 'No output yet. Click Generate.'}</pre>
        </section>
      </div>
    </main>
  )
}
