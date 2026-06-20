"use client"

import React, { useState, useEffect } from 'react'

type Mode = 'guided' | 'brain'
type Tone = 'professional' | 'casual' | 'very-brief' | 'add-context'

const TONES: { id: Tone; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'very-brief', label: 'Very brief' },
  { id: 'add-context', label: 'Add context' }
]

export default function Page() {
  const [mode, setMode] = useState<Mode>('brain')

  const track = (event: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && typeof pendo !== 'undefined') {
      pendo.track(event, properties ?? {})
    }
  };
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

  function generateStructured(effectiveTone: Tone, raw: { yesterday?: string; today?: string; blocked?: string; brain?: string }) {
    const toItems = (text: string, max = 3): string[] => {
      if (!text.trim()) return []
      const byLine = text.split(/\n/).map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(s => s.length > 2)
      const parts = byLine.length > 1 ? byLine : text.split(/[.;!]+/).map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(s => s.length > 3)
      return parts.slice(0, max)
    }

    let yesterdayItems: string[] = []
    let todayItems: string[] = []
    let blockedItems: string[] = []

    if (raw.brain) {
      const brain = raw.brain.trim()

      if (/^(yesterday|today|blocked)\s*:?\s*$/im.test(brain)) {
        // Strategy 1: standalone section headers on their own lines
        const yBlock = brain.match(/^yesterday\s*:?\s*\n([\s\S]*?)(?=\n[ \t]*(today|blocked)\s*:?\s*$|$)/im)
        const tBlock = brain.match(/^today\s*:?\s*\n([\s\S]*?)(?=\n[ \t]*blocked\s*:?\s*$|$)/im)
        const bBlock = brain.match(/^blocked\s*:?\s*\n([\s\S]*?)$/im)
        yesterdayItems = toItems(yBlock?.[1]?.trim() || '')
        todayItems = toItems(tBlock?.[1]?.trim() || '')
        blockedItems = toItems(bBlock?.[1]?.trim() || '')
      } else {
        // Strategy 2: classify sentences by keyword signals
        const sentences = brain
          .split(/[.!\n]+/)
          .map(s => s.replace(/^[-•*]\s*/, '').replace(/^(today|yesterday|blocked)\s*:?\s*/i, '').trim())
          .filter(s => s.length > 3)

        for (const s of sentences) {
          const lo = s.toLowerCase()
          // "today was X" in past tense = describing yesterday, not today
          const isPastDayDescriptor = /^(alright\s+so\s+)?(today|yesterday)\s+was\b/i.test(s)
          if (/\bno\s+blockers?\b|\bnot\s+blocked\b|\bno\s+issues\b/i.test(s)) {
            // explicit "no blockers" — skip
          } else if (/\bblocked?\b|\bblocking\b|\bwaiting\s+on\b|\bpending\s+(from|on)\b|\bstuck\b/i.test(lo)) {
            blockedItems.push(s)
          } else if (/\btomorrow\b|\bpushing\s+(that\s+)?to\b|\bdidn'?t\s+get\s+to\b|\bcouldn'?t\s+get\s+to\b/i.test(lo)) {
            // deferred work → goes in Today
            todayItems.push(s)
          } else if (/\btoday\b|\bthis\s+(morning|afternoon)\b|\bgoing\s+to\b|\bwill\b|\bplanning\b/i.test(lo) && !isPastDayDescriptor && !/\byesterday\b/i.test(lo)) {
            todayItems.push(s)
          } else {
            yesterdayItems.push(s)
          }
        }
        yesterdayItems = yesterdayItems.slice(0, 3)
        todayItems = todayItems.slice(0, 3)
        blockedItems = blockedItems.slice(0, 3)
      }
    } else {
      yesterdayItems = toItems(raw.yesterday || '')
      todayItems = toItems(raw.today || '')
      blockedItems = toItems(raw.blocked || '')
    }

    const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s

    // Truncate a string at the first comma that appears after at least minWords words
    const truncateAtClause = (s: string, minWords = 6, maxWords = 16): string => {
      const words = s.split(' ')
      if (words.length <= maxWords) return s
      let wi = 0
      for (let i = 0; i < s.length; i++) {
        if (s[i] === ' ') wi++
        if (wi >= minWords && s[i] === ',') return s.slice(0, i)
      }
      return words.slice(0, maxWords).join(' ')
    }

    const toProfessional = (lines: string[]): string[] =>
      lines
        .filter(s => !/^(alright\s+so\s+)?(today|yesterday)\s+was\b/i.test(s)) // drop meta-descriptors
        .map(s =>
          cap(truncateAtClause(s
            .replace(/^(alright so,?\s*|ok so,?\s*|oh and,?\s*|basically,?\s*|then\s+I?\s*|also\s+I?\s*)/i, '')
            .replace(/\bfinally\s+/gi, '')
            .replace(/\blike\s+(\d)/gi, '$1')
            .replace(/\bkind of\b\s*/gi, '')
            .replace(/\bsort of\b\s*/gi, '')
            .replace(/\bgot around to\b/gi, 'completed initial work on')
            .replace(/\bhopped?\s+on\b/gi, 'joined')
            .replace(/\bended up being\b/gi, 'identified as')
            .replace(/\bsat in on\b/gi, 'attended')
            .replace(/\bnail down\b/gi, 'finalize')
            .replace(/\bpushing\s+(that\s+)?to\s+tomorrow\b/gi, 'deferred to today')
            .replace(/\bdidn'?t\s+get\s+to\b/gi, 'did not complete')
            .replace(/\btook\s+(forever|ages)\b/gi, 'required extended time')
            .replace(/\bthat\s+took\s+an?\s+hour\s+and\s+a\s+half\b/gi, '(1.5h)')
            .replace(/\bstill\s+blocked\s+on\b/gi, 'blocked pending')
            .replace(/\beveryone'?s\s+been\s+asking\s+(about|for)\b/gi, '(widely requested)')
            .replace(/\bgot\s+maybe\s+(\d+)%\s+done\b/gi, '~$1% complete')
            .replace(/,?\s*it'?s\s+been\s+sitting\s+with\s+them\s+for\s+(?:like\s+)?(\d+)\s+days.*$/gi, '; pending $1+ days')
            .replace(/,?\s*I\s+don'?t\s+think\s+anyone'?s\s+even\s+looked\s+at\s+it\.?/gi, '')
            .replace(/\bstuff\b/gi, 'work').replace(/\bthings\b/gi, 'items')
            .replace(/\bi\b/g, 'I').replace(/\s{2,}/g, ' ').trim()
          ))
        ).filter(Boolean)

    const toCasual = (lines: string[]): string[] =>
      lines.map(s =>
        cap(s
          .replace(/\bdid not\b/g, "didn't").replace(/\bwas not\b/g, "wasn't")
          .replace(/\bcannot\b/g, "can't").replace(/\bdo not\b/g, "don't")
          .replace(/\bI am\b/g, "I'm").replace(/\bI will\b/g, "I'll")
          .replace(/\bi\b/g, 'I').replace(/\s{2,}/g, ' ').trim()
        )
      ).filter(Boolean)

    const toVeryBrief = (lines: string[]): string[] => {
      const s = lines[0]
      if (!s) return []
      // Strip time preambles then take up to first comma, capped at 8 words
      const stripped = s
        .replace(/^spent\s+(?:like\s+)?\d+\+?\s*h(?:our)?s?\s+(?:\w+\s+the\s+\w+\s+)?on\s+(?:the\s+|that\s+)?/i, '')
        .replace(/^(alright so,?\s*|ok so,?\s*|oh and,?\s*|also,?\s*|then\s+I?\s*)/i, '')
        .replace(/^(?:finally\s+)?(?:I\s+)?(?:got\s+around\s+to|completed\s+initial\s+work\s+on)\s+/i, '')
        .replace(/^(writing\s+up\s+)?the\s+/i, '')
        .trim()
      const beforeComma = stripped.includes(',') ? stripped.slice(0, stripped.indexOf(',')) : stripped
      return [cap(beforeComma.split(' ').slice(0, 8).join(' '))]
    }

    const applyTone = (lines: string[]): string[] => {
      if (!lines.length) return []
      switch (effectiveTone) {
        case 'very-brief':   return toVeryBrief(lines)
        case 'casual':       return toCasual(lines)
        case 'add-context':  return toProfessional(lines).map(s => `${s} — see ticket or Slack`)
        case 'professional':
        default:             return toProfessional(lines)
      }
    }

    return {
      yesterday: applyTone(yesterdayItems),
      today: applyTone(todayItems),
      blocked: blockedItems.length ? applyTone(blockedItems) : ['None']
    }
  }

  async function onGenerate(toneOverride?: Tone) {
    const effectiveTone = toneOverride ?? tone
    track('generate_clicked', { mode, tone: effectiveTone })
    setGenerating(true)
    setCopied(false)
    // Attempt server-side generation first
    const payload = mode === 'guided' ? { mode: 'guided', tone: effectiveTone, yesterday: yesterdayInput, today: todayInput, blocked: blockedInput } : { mode: 'brain', tone: effectiveTone, brain: brainDump }

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
    const structured = generateStructured(effectiveTone, raw)
    const formatted = formatAsStandup(structured)
    setOutput(formatted)
    setGenerating(false)
  }

  async function copyOutput() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      track('output_copied', { mode, tone })
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('copy failed', e)
    }
  }

  function useExample(idx: number) {
    const ex = examples[idx]
    track('example_used', { index: idx, mode })
    if (mode === 'guided') {
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
    setOutput('')
  }, [mode])

  useEffect(() => {
    const validTones: Tone[] = ['professional', 'casual', 'very-brief', 'add-context']
    const savedTone = localStorage.getItem('standup_tone') as Tone | null
    if (savedTone && validTones.includes(savedTone)) setTone(savedTone)

    const today = new Date().toISOString().slice(0, 10)
    const lastVisit = localStorage.getItem('standup_last_visit')
    if (lastVisit && lastVisit !== today) {
      track('return_visit', { last_visit: lastVisit })
    }
    localStorage.setItem('standup_last_visit', today)
  }, [])

  return (
    <main className="min-h-screen bg-background">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-primary" aria-hidden="true" />

      <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
        {/* Header */}
        <header className="mb-10 flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 11 3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              standup<span className="text-primary">.so</span>
            </h1>
          </div>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Turn your brain dump into a clean standup post in 10 seconds.
          </p>
        </header>

        {/* Composer card */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          {/* Mode toggle + Tone */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex rounded-xl bg-muted p-1" role="tablist" aria-label="Input mode">
              {(['brain', 'guided'] as Mode[]).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m)
                    track('mode_selected', { mode: m })
                  }}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                    mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'brain' ? 'Brain dump' : 'Guided'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tone</span>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTone(t.id)
                      localStorage.setItem('standup_tone', t.id)
                      track('tone_changed', { tone: t.id })
                      if (output) onGenerate(t.id)
                    }}
                    aria-pressed={tone === t.id}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      tone === t.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div className="mt-5">
            {mode === 'guided' ? (
              <div className="grid grid-cols-1 gap-4">
                <Field label="Yesterday" hint="What did you finish?">
                  <textarea
                    className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm leading-relaxed text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
                    rows={2}
                    value={yesterdayInput}
                    onChange={e => setYesterdayInput(e.target.value)}
                    placeholder="Shipped the new dashboard, reviewed two PRs..."
                  />
                </Field>
                <Field label="Today" hint="What are you doing today?">
                  <textarea
                    className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm leading-relaxed text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
                    rows={2}
                    value={todayInput}
                    onChange={e => setTodayInput(e.target.value)}
                    placeholder="Wire up the API, write tests..."
                  />
                </Field>
                <Field label="Blocked" hint="Anything blocking you?">
                  <textarea
                    className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm leading-relaxed text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
                    rows={1}
                    value={blockedInput}
                    onChange={e => setBlockedInput(e.target.value)}
                    placeholder="Waiting on design specs..."
                  />
                </Field>
              </div>
            ) : (
              <Field label="Brain dump" hint="Paste whatever's in your head">
                <textarea
                  className="w-full resize-y rounded-xl border border-input bg-background p-3 font-mono text-sm leading-relaxed text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
                  rows={7}
                  value={brainDump}
                  onChange={e => setBrainDump(e.target.value)}
                  placeholder="Paste whatever's in your head..."
                />
              </Field>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => onGenerate()}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" />
                  </svg>
                  Generate
                </>
              )}
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Try an example:</span>
              {examples.map((_, i) => (
                <button
                  key={i}
                  onClick={() => useExample(i)}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Output */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <span className={`inline-block h-2 w-2 rounded-full ${output ? 'bg-accent' : 'bg-border'}`} aria-hidden="true" />
              Output
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={copyOutput}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="14" height="14" x="8" y="8" rx="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => { setOutput(''); setCopied(false) }}
                disabled={!output}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>

          <pre className={`min-h-[160px] whitespace-pre-wrap rounded-xl border border-border p-4 font-mono text-sm leading-relaxed ${
            output ? 'bg-muted/50 text-foreground' : 'bg-muted/30 text-muted-foreground'
          }`}>
            {output || 'No output yet. Click Generate to turn your notes into a clean standup post.'}
          </pre>

          {output ? (
            <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <span>{output.length} chars</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-foreground">{lengthLabel(output)}</span>
            </div>
          ) : null}
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Built for fast, frictionless standups.
        </footer>
      </div>
    </main>
  )
}

function lengthLabel(text: string): 'Short' | 'Medium' | 'Long' {
  const len = text.length
  if (len < 200) return 'Short'
  if (len < 450) return 'Medium'
  return 'Long'
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </label>
  )
}
