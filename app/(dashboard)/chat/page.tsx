'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Send, Loader2, Bot, User, Trash2 } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils/transcript-parser'
import type { ChatMessage, ChatSource } from '@/types'

const STARTER_QUESTIONS = [
  'Summarize the March 2025 hackathon.',
  'Who won the 2025 awards ceremony?',
  'What were the main themes across all hackathons?',
  'List all first-place winners and what they built.',
  'What did the judges say about innovation?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      })

      const data = await res.json()
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response ?? data.error ?? 'Sorry, something went wrong.',
        sources: data.sources,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Answers are grounded in uploaded hackathon transcripts.
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessages([])}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 rounded-md border bg-card p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-4">
            <Bot className="w-12 h-12 text-muted-foreground opacity-30" />
            <div>
              <p className="font-medium text-muted-foreground">Ask me about any hackathon</p>
              <p className="text-sm text-muted-foreground mt-1">
                I only answer from uploaded transcripts and will cite sources.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border hover:bg-accent transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className={`flex-1 space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                  <div
                    className={`rounded-xl px-4 py-3 text-sm leading-relaxed max-w-prose ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {msg.sources.slice(0, 3).map((src, j) => (
                        <Badge key={j} variant="outline" className="text-xs font-normal">
                          {src.start_time_seconds != null
                            ? formatTimestamp(src.start_time_seconds)
                            : '??:??'}{' '}
                          · {src.speaker_names?.join(', ') ?? 'Unknown'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-muted rounded-xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
        className="flex gap-2 mt-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about any hackathon, speaker, team, or award…"
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
