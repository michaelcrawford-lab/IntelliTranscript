'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Loader2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatTimestamp } from '@/lib/utils/transcript-parser'
import type { TranscriptSegment } from '@/types'

interface Props {
  segment: TranscriptSegment
  onSave: (newText: string) => void
  onCancel: () => void
}

export function TranscriptEditor({ segment, onSave, onCancel }: Props) {
  const [text, setText] = useState(segment.transcript_text)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (text === segment.transcript_text) {
      onCancel()
      return
    }
    setSaving(true)
    const supabase = createClient()

    // Update segment
    await supabase
      .from('transcript_segments')
      .update({ transcript_text: text, reviewed_status: 'reviewed', updated_at: new Date().toISOString() })
      .eq('id', segment.id)

    // Log correction
    await supabase.from('correction_logs').insert({
      transcript_segment_id: segment.id,
      old_text: segment.transcript_text,
      new_text: text,
      edit_reason: reason || null,
    })

    setSaving(false)
    onSave(text)
  }

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="text-xs font-mono text-muted-foreground">
        {formatTimestamp(segment.start_time_seconds)}
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="text-sm resize-none"
        autoFocus
      />
      <Input
        placeholder="Reason for edit (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="text-xs h-8"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
