import { createClient } from '@/lib/supabase/server'
import { ragQuery } from '@/lib/groq/rag'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { query, eventId } = await request.json()

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { stream, sources } = await ragQuery(query, eventId)

    // Collect stream into full response
    let fullResponse = ''
    for await (const chunk of stream) {
      fullResponse += chunk
    }

    // Log query
    await supabase.from('chatbot_queries').insert({
      user_id: user.id,
      query_text: query,
      response_text: fullResponse,
      event_filter: eventId ?? null,
    })

    return NextResponse.json({ response: fullResponse, sources })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
