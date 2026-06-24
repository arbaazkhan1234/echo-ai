# Echo AI

**Preserve your memories, wisdom, and stories for the people you love.**

Echo is a personal memory preservation app. Every day it asks you one meaningful question about your life — your childhood, your proudest moments, the people you've loved. Over time it builds a private archive of your story, then lets your family have real conversations with your Echo, trained on your own words.

---

## Features

- **Daily questions** — one thoughtful question per day, deepening over time across five stages (Warmup → Foundations → Journey → Depths → Legacy)
- **Memory archive** — full searchable archive with categories, filters, and photo attachments
- **Echo chat** — after 10 memories, family members can have real AI conversations with your Echo, grounded in your actual stories
- **Voice preservation** — clone your voice from a 2-minute recording; Echo answers in your real voice (premium, coming soon)
- **Streak tracking** — daily streaks with XP and milestone rewards
- **Progressive Web App** — installable on any device, works offline after first visit
- **Claymorphism UI** — deep clay-style design with Framer Motion animations throughout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 3 |
| Routing | React Router DOM 7 |
| Animation | Framer Motion 12, GSAP 3 |
| Backend | Supabase (Auth, Postgres, Storage, Edge Functions) |
| AI / LLM | Groq — llama-3.3-70b-versatile (via Edge Function) |
| Voice | ElevenLabs — TTS + voice cloning (via Edge Function) |
| Speech-to-text | Groq Whisper (via Edge Function) |
| PWA | vite-plugin-pwa + Workbox |
| Deployment | Vercel (frontend) + Supabase (backend) |

---

## Project Structure

```
echo-ai/
├── public/
│   ├── favicon.svg
│   ├── icons/                  # PWA icons (192, 512, maskable)
│   ├── offline.html            # Offline fallback page
│   └── hero2.mp4, girl.png ... # Static assets
│
├── src/
│   ├── App.jsx                 # Root router + PWA banner
│   ├── main.jsx
│   ├── index.css               # Tailwind + global design system
│   │
│   ├── pages/
│   │   ├── Landing.jsx         # Public landing page
│   │   ├── SignIn.jsx
│   │   ├── SignUp.jsx
│   │   └── Dashboard.jsx       # Main app (all sections)
│   │
│   ├── components/
│   │   ├── PWAInstallBanner.jsx
│   │   ├── WaitlistModal.jsx
│   │   ├── landing/            # All landing page sections
│   │   └── dashboard/
│   │       └── EchoProgress.jsx
│   │
│   └── lib/
│       ├── supabase.js         # Supabase client
│       ├── gemini.js           # Groq LLM calls (via edge function)
│       ├── elevenLabs.js       # ElevenLabs TTS/clone (via edge function)
│       ├── questionGenerator.js
│       └── streakManager.js
│
├── supabase/
│   ├── functions/
│   │   ├── groq-proxy/         # LLM chat + Whisper transcription
│   │   └── elevenlabs-proxy/   # TTS + voice clone + delete
│   └── migrations/             # SQL migrations
│
├── vercel.json                 # SPA rewrite rule
├── vite.config.js              # Vite + PWA plugin config
├── tailwind.config.js
└── .env.example
```

---

## Local Development

### 1. Clone

```bash
git clone https://github.com/arbaazkhan1234/echo-ai.git
cd echo-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> The anon key is designed to be public — Supabase Row Level Security enforces what each authenticated user can access. Never put Groq or ElevenLabs keys in `.env`; they live as Supabase Edge Function secrets only.

### 4. Supabase setup

- Create a project at [supabase.com](https://supabase.com)
- Run each file in `supabase/migrations/` in order via the SQL editor
- Optionally enable Google OAuth in Authentication → Providers

### 5. Deploy Edge Functions

```bash
supabase link --project-ref your-project-ref
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set ELEVENLABS_API_KEY=sk_...
supabase functions deploy groq-proxy
supabase functions deploy elevenlabs-proxy
```

### 6. Run

```bash
npm run dev
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `user_profiles` | Name, avatar, subscription, streak, voice ID |
| `questions` | Question bank with stage and category |
| `user_question_log` | Which questions each user has answered |
| `memories` | Answers, photos, timestamps |
| `echo_conversations` | Echo chat history |
| `api_rate_limits` | Per-user per-day call counters |

---

## Deploying to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import this repo
3. Add environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

4. Click **Deploy** — Vercel auto-detects Vite, sets `npm run build`, and serves from `dist/`

The `vercel.json` at the root already handles SPA client-side routing rewrites.

---

## PWA — Install on Device

After deployment users can install Echo as a native-feeling app:

- **Android Chrome** — banner appears automatically, tap Install
- **iOS Safari** — Share button → "Add to Home Screen"
- **Desktop Chrome / Edge** — install icon in the address bar

The app caches its shell on first visit and works offline for browsing existing memories.

---

## Security

All secret API keys (Groq, ElevenLabs) are server-side only — stored as Supabase Edge Function secrets, never in the browser bundle. The frontend only holds the Supabase anon key, which is public by design (RLS enforces per-user data isolation).

---

## License

MIT — built by [Arbaaz Khan](https://github.com/arbaazkhan1234)
