import { createClient } from '@/lib/supabase/server'
import { getGroqClient, GROQ_MODEL } from './client'
import type { ChunkSearchResult, ChatSource } from '@/types'

const SYSTEM_PROMPT = `You are IntelliTranscript AI, an assistant for the Intellibus Hackathon Archive.
You ONLY answer questions based on the transcript excerpts provided below.
If the answer is not found in the provided excerpts, say: "I couldn't find that information in the available transcripts."
Always cite the source event and timestamp when referencing transcript content.
Be concise, accurate, and professional.`

export async function ragQuery(
  query: string,
  eventId?: string
): Promise<{ stream: AsyncIterable<string>; sources: ChatSource[] }> {
  const supabase = await createClient()

  // 1. Vector search for semantically relevant chunks
  let chunks: ChunkSearchResult[] = []
  try {
    const embedding = await getEmbedding(query)
    const { data } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: 8,
      filter_event: eventId ?? null,
    })
    chunks = (data as ChunkSearchResult[]) ?? []
  } catch {
    // Fall through to FTS if vector search fails (embeddings not generated yet)
  }

  // 2. FTS fallback / supplement
  const { data: ftsData } = await supabase
    .from('transcript_segments')
    .select('id, transcript_text, start_time_seconds, event_id, speaker_id, speakers(full_name), events(title)')
    .textSearch('fts', query, { type: 'plain', config: 'english' })
    .eq(eventId ? 'event_id' : 'id', eventId ?? 'id') // conditional filter
    .limit(5)

  const ftsText = (ftsData ?? [])
    .map((r: Record<string, unknown>) => `[${(r.events as Record<string, string>)?.title ?? 'Unknown Event'} @ ${formatTime(r.start_time_seconds as number)}] ${r.transcript_text as string}`)
    .join('\n')

  // 3. Build context from chunks
  const chunkContext = chunks
    .map((c) => `[Event ID: ${c.event_id} @ ${formatTime(c.start_time_seconds)}] ${c.chunk_text}`)
    .join('\n\n')

  const context = [chunkContext, ftsText].filter(Boolean).join('\n\n')

  const userMessage = context
    ? `TRANSCRIPT EXCERPTS:\n${context}\n\nQUESTION: ${query}`
    : `QUESTION: ${query}`

  // 4. Groq inference with streaming
  const groq = getGroqClient()
  const groqStream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    stream: true,
    max_tokens: 1024,
    temperature: 0.3,
  })

  // 5. Convert Groq stream to async iterable of text deltas
  async function* textStream() {
    for await (const chunk of groqStream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  const sources: ChatSource[] = chunks.map((c) => ({
    event_title: c.event_id,
    speaker_names: c.speaker_names,
    start_time_seconds: c.start_time_seconds,
    similarity: c.similarity,
  }))

  return { stream: textStream(), sources }
}

// Lightweight embedding via local transformers.js (server-side only)
async function getEmbedding(text: string): Promise<number[]> {
  const { pipeline } = await import('@xenova/transformers')
  const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
  })
  const output = await embed(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

function formatTime(seconds: number | null): string {
  if (seconds == null) return '??:??'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
