# standup.so

Turn your brain dump into a clean standup post in 10 seconds. Paste your messy thoughts, get a structured Yesterday / Today / Blocked update ready to copy to Slack.

Built for the [Mind the Product World Product Day Hackathon 2026](https://www.mindtheproduct.com/).

## What it does

Two input modes, one AI call, one paste-ready output:

- **Brain dump** — paste whatever's in your head, no structure needed
- **Guided** — answer three quick questions (Yesterday / Today / Blocked)

Four tone options: Professional, Casual, Very brief, Add context.

No accounts. No integrations. Open the URL, get your post.

## Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- [Claude claude-sonnet-4-6](https://anthropic.com/) via Anthropic API
- [Novus.ai](https://novus.ai/) for analytics

## Setup

```bash
git clone https://github.com/vaishnaviskamdi/standup-so
cd standup-so
npm install
cp .env.local.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

Then run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | Yes | — | Set to `anthropic` or `openai` |
| `ANTHROPIC_API_KEY` | If using Anthropic | — | Your Anthropic API key |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Model override |
| `OPENAI_API_KEY` | If using OpenAI | — | Your OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model override |

Without an API key the app falls back to a local stub so you can develop without credits.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vaishnaviskamdi/standup-so)

Set `AI_PROVIDER` and `ANTHROPIC_API_KEY` in your Vercel project environment variables.
