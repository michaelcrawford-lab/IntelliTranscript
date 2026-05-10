'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Copy, Bookmark, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimestamp } from '@/lib/utils/transcript-parser'
import { TranscriptEditor } from './TranscriptEditor'
import type { TranscriptSegment } from '@/types'

interface Props {
  segment: TranscriptSegment
  searchTerm?: string
  isActive?: boolean
  onTimestampClick: (seconds: number) => void
}

function highlight(text: string, term: string): React.ReactNode {
  if (!term.trim()) return text
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  )
}

export function TranscriptLine({ segment, searchTerm, isActive, onTimestampClick }: Props) {
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentText, setCurrentText] = useState(segment.transcript_text)

  const speaker = segment.speaker as unknown as { full_name: string } | null

  const handleCopy = () => {
    navigator.clipboard.writeText(`[${formatTimestamp(segment.start_time_seconds)}] ${speaker?.full_name ? `${speaker.full_name}: ` : ''}${currentText}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (editing) {
    return (
      <TranscriptEditor
        segment={{ ...segment, transcript_text: currentText }}
        onSave={(newText) => {
          setCurrentText(newText)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div
      className={cn(
        'group flex gap-3 rounded-md px-2 py-1.5 transition-colors',
        isActive ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-accent/50'
      )}
    >
      {/* Timestamp */}
      <button
        onClick={() => onTimestampClick(segment.start_time_seconds)}
        className="shrink-0 font-mono text-xs text-primary hover:underline mt-0.5"
        title="Jump to this moment"
      >
        {formatTimestamp(segment.start_time_seconds)}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {speaker && (
          <span className="text-xs font-semibold text-muted-foreground mr-1">
            {speaker.full_name}:
          </span>
        )}
        <span className="text-sm leading-relaxed">
          {searchTerm ? highlight(currentText, searchTerm) : currentText}
        </span>
      </div>

      {/* Status badge + actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {segment.reviewed_status === 'approved' && (
          <CheckCircle className="w-3 h-3 text-emerald-500" />
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleCopy}
          title="Copy line"
        >
          {copied ? (
            <CheckCircle className="w-3 h-3 text-emerald-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setEditing(true)}
          title="Edit"
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
