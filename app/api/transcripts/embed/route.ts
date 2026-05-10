import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { eventId } = await request.json()

    const supabase = await createClient()

    // Fetch chunks without embeddings
    const query = supabase
      .from('transcript_chunks')
      .select('id, chunk_text')
      .is('embedding', null)
      .limit(100)

    if (eventId) {
      query.eq('event_id', eventId)
    }

    const { data: chunks, error } = await query

    if (error) throw error
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ message: 'No chunks to embed', embedded: 0 })
    }

    // Dynamically import transformers.js (server only)
    const { pipeline } = await import('@xenova/transformers')
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    })

    let embedded = 0
    for (const chunk of chunks) {
      const output = await embedder(chunk.chunk_text, {
        pooling: 'mean',
        normalize: true,
      })
      const embedding = Array.from(output.data as Float32Array)

      await supabase
        .from('transcript_chunks')
        .update({ embedding })
        .eq('id', chunk.id)

      embedded++
    }

    return NextResponse.json({ embedded, total: chunks.length })
  } catch (err) {
    console.error('Embed error:', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
