# IntelliTranscript

**Intellibus Hackathon Archive & Search Platform**

> Search every speech, pitch, award, and idea from every Intellibus AI Hackathon.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Vector Search | pgvector + all-MiniLM-L6-v2 embeddings |
| AI Chatbot | Groq API (llama-3.3-70b-versatile) |
| Transcription | OpenAI Whisper (local Python script) |
| Deployment | Vercel + Supabase |

## Setup

### 1. Environment variables

```bash
cp .env.local.example .env.local
# Fill in your Supabase and Groq credentials
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable the **pgvector** extension in the Supabase dashboard (Database → Extensions)
3. Apply migrations:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Create your first admin

1. Sign up via `/login`
2. In the Supabase dashboard, update your user's `role` to `super_admin` in the `public.users` table

---

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard with metrics |
| `/events` | All hackathon events |
| `/events/new` | Create an event |
| `/events/[id]` | Event detail with transcripts, speakers, teams, awards |
| `/events/[id]/transcript` | Transcript viewer with video player |
| `/search` | Full-text search across all transcripts |
| `/chat` | AI assistant (RAG-powered) |
| `/speakers` | Speaker directory |
| `/speakers/[id]` | Speaker profile |
| `/teams` | Team archive |
| `/awards` | Awards by event |
| `/reports` | Export transcripts as TXT, CSV, SRT |
| `/uploads` | Upload SRT/VTT/TXT transcripts or link YouTube |
| `/admin/users` | User management |
| `/admin/settings` | Platform settings |

## Transcript Upload Workflow

### Option A: Upload existing SRT/VTT/TXT files

Go to `/uploads`, select an event, and drop your transcript file.

### Option B: Transcribe locally with Whisper

```bash
pip install openai-whisper
python scripts/transcribe.py path/to/recording.mp4 --format srt --model large-v3
# Then upload the .srt file via /uploads
```

### Option C: Link a YouTube video

Paste the YouTube URL in `/uploads` to link it to an event. Upload the transcript separately.

## Generating Embeddings (for AI search)

After uploading transcripts, generate vector embeddings:

```bash
curl -X POST http://localhost:3000/api/transcripts/embed \
  -H "Content-Type: application/json" \
  -d '{"eventId": "your-event-id"}'
```

Run this for each event. Embeddings enable the AI chatbot semantic search.

## Deployment

```bash
vercel --prod
# Set env vars in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY
```

## User Roles

| Role | Permissions |
|---|---|
| `super_admin` | Full access |
| `admin` | Upload, manage events, generate reports |
| `editor` | Correct transcripts, rename speakers |
| `viewer` | Search and view approved transcripts |
| `restricted` | Selected events only |

## Architecture Notes

- `@base-ui/react` is used by this shadcn/ui version — `asChild` prop does not exist. Use `ButtonLink` (`components/ui/button-link.tsx`) for link-as-button patterns.
- Groq API key is **server-side only** — never exposed to the browser.
- Large videos should be hosted on YouTube or Google Drive. Store only the link in Supabase.
- Embeddings are 384-dimensional (all-MiniLM-L6-v2). The pgvector index uses `ivfflat` with 100 lists.
