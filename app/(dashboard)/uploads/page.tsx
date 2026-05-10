'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Link2, FileText, Loader2, CheckCircle, AlertCircle, Mic } from 'lucide-react'
import { useRouter } from 'next/navigation'

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

type Status = 'idle' | 'loading' | 'success' | 'error'

function StatusBadge({ status, message }: { status: Status; message: string }) {
  if (status === 'idle') return null
  return (
    <div
      className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
        status === 'success'
          ? 'bg-emerald-50 text-emerald-700'
          : status === 'error'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted'
      }`}
    >
      {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
      {status === 'success' && <CheckCircle className="w-4 h-4" />}
      {status === 'error' && <AlertCircle className="w-4 h-4" />}
      {message || 'Processing…'}
    </div>
  )
}

export default function UploadsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([])
  const [eventsLoaded, setEventsLoaded] = useState(false)

  // Shared
  const [selectedEvent, setSelectedEvent] = useState('')
  const [mediaTitle, setMediaTitle] = useState('')

  // Transcript file mode
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [transcriptStatus, setTranscriptStatus] = useState<Status>('idle')
  const [transcriptMessage, setTranscriptMessage] = useState('')

  // Audio transcription mode
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [transcribeModel, setTranscribeModel] = useState('whisper-large-v3-turbo')
  const [audioStatus, setAudioStatus] = useState<Status>('idle')
  const [audioMessage, setAudioMessage] = useState('')

  const loadEvents = async () => {
    if (eventsLoaded) return
    const supabase = createClient()
    const { data } = await supabase.from('events').select('id, title').order('created_at', { ascending: false })
    setEvents(data ?? [])
    setEventsLoaded(true)
  }

  // ── Option A / B: SRT/VTT/TXT or YouTube ──────────────────────────────────
  const handleTranscriptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent) {
      setTranscriptStatus('error')
      setTranscriptMessage('Please select an event.')
      return
    }
    setTranscriptStatus('loading')
    setTranscriptMessage('')

    try {
      const supabase = createClient()

      if (youtubeUrl) {
        const videoId = extractYouTubeId(youtubeUrl)
        const { error } = await supabase.from('media_files').insert({
          event_id: selectedEvent,
          title: mediaTitle || youtubeUrl,
          source_type: 'youtube',
          source_url: youtubeUrl,
          youtube_video_id: videoId,
          processing_status: 'completed',
        })
        if (error) throw error
        setTranscriptStatus('success')
        setTranscriptMessage('YouTube video linked. Upload a transcript file separately.')
        return
      }

      if (transcriptFile) {
        const ext = transcriptFile.name.split('.').pop()?.toLowerCase() as 'srt' | 'vtt' | 'txt' | undefined
        if (!['srt', 'vtt', 'txt'].includes(ext ?? '')) {
          setTranscriptStatus('error')
          setTranscriptMessage('Only .srt, .vtt, and .txt files are supported.')
          return
        }

        const content = await transcriptFile.text()

        const { data: mf, error: mfErr } = await supabase
          .from('media_files')
          .insert({
            event_id: selectedEvent,
            title: mediaTitle || transcriptFile.name,
            source_type: 'upload',
            file_type: ext,
            processing_status: 'processing',
          })
          .select()
          .single()
        if (mfErr) throw mfErr

        const res = await fetch('/api/transcripts/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaFileId: mf.id, eventId: selectedEvent, content, format: ext }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error ?? 'Failed to parse transcript')

        await supabase.from('media_files').update({ processing_status: 'completed' }).eq('id', mf.id)

        setTranscriptStatus('success')
        setTranscriptMessage(`Imported ${result.segments} segments and ${result.chunks} chunks.`)
        setTimeout(() => router.push(`/events/${selectedEvent}`), 2000)
        return
      }

      setTranscriptStatus('error')
      setTranscriptMessage('Please provide a YouTube URL or upload a transcript file.')
    } catch (err) {
      setTranscriptStatus('error')
      setTranscriptMessage((err as Error).message)
    }
  }

  // ── Option C: Audio → OpenAI transcription ────────────────────────────────
  const handleAudioSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent) {
      setAudioStatus('error')
      setAudioMessage('Please select an event.')
      return
    }
    if (!audioFile) {
      setAudioStatus('error')
      setAudioMessage('Please select an audio/video file.')
      return
    }
    if (audioFile.size > 25 * 1024 * 1024) {
      setAudioStatus('error')
      setAudioMessage('File exceeds 25 MB limit. Use the CLI script for larger files.')
      return
    }

    setAudioStatus('loading')
    setAudioMessage('Uploading and transcribing… this may take a minute.')

    try {
      const supabase = createClient()

      const { data: mf, error: mfErr } = await supabase
        .from('media_files')
        .insert({
          event_id: selectedEvent,
          title: mediaTitle || audioFile.name,
          source_type: 'upload',
          processing_status: 'processing',
        })
        .select()
        .single()
      if (mfErr) throw mfErr

      const fd = new FormData()
      fd.append('file', audioFile)
      fd.append('mediaFileId', mf.id)
      fd.append('eventId', selectedEvent)
      fd.append('model', transcribeModel)

      const res = await fetch('/api/transcripts/transcribe', { method: 'POST', body: fd })
      const text = await res.text()
      let result: { segments?: number; chunks?: number; error?: string }
      try { result = JSON.parse(text) } catch { throw new Error(text || 'Transcription failed') }
      if (!res.ok) throw new Error(result.error ?? 'Transcription failed')

      setAudioStatus('success')
      setAudioMessage(`Transcribed: ${result.segments} segments, ${result.chunks} chunks.`)
      setTimeout(() => router.push(`/events/${selectedEvent}`), 2000)
    } catch (err) {
      setAudioStatus('error')
      setAudioMessage((err as Error).message)
    }
  }

  const eventSelector = (
    <div className="space-y-2">
      <Label>Event *</Label>
      <Select
        value={selectedEvent}
        onValueChange={(v) => setSelectedEvent(v ?? '')}
        onOpenChange={loadEvents}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an event…" />
        </SelectTrigger>
        <SelectContent>
          {events.map((ev) => (
            <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Transcript</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a transcript file, link a YouTube video, or transcribe audio directly with AI.
        </p>
      </div>

      {/* ── Card A+B: Transcript file / YouTube ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Option A — Upload Transcript or Link YouTube
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTranscriptSubmit} className="space-y-5">
            {eventSelector}

            <div className="space-y-2">
              <Label htmlFor="mediaTitle">Recording Title</Label>
              <Input
                id="mediaTitle"
                value={mediaTitle}
                onChange={(e) => setMediaTitle(e.target.value)}
                placeholder="Opening Ceremony · March 15 2025"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">choose one</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ytUrl" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                YouTube / External URL
              </Label>
              <Input
                id="ytUrl"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                disabled={!!transcriptFile}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Transcript File (.srt / .vtt / .txt)
              </Label>
              <div className="border-2 border-dashed rounded-md p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".srt,.vtt,.txt"
                  onChange={(e) => setTranscriptFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                  id="transcriptFileInput"
                  disabled={!!youtubeUrl}
                />
                <label htmlFor="transcriptFileInput" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  {transcriptFile ? (
                    <div>
                      <p className="text-sm font-medium">{transcriptFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(transcriptFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Click to choose a file</p>
                      <p className="text-xs text-muted-foreground">SRT, VTT, or TXT</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <StatusBadge status={transcriptStatus} message={transcriptMessage} />

            <Button type="submit" className="w-full" disabled={transcriptStatus === 'loading'}>
              {transcriptStatus === 'loading' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Import</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Card C: Audio → OpenAI transcription ────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Option B — Transcribe Audio with AI
            <span className="ml-auto text-xs font-normal text-muted-foreground">Powered by OpenAI</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAudioSubmit} className="space-y-5">
            {eventSelector}

            <div className="space-y-2">
              <Label>AI Model</Label>
              <Select value={transcribeModel} onValueChange={(v) => setTranscribeModel(v ?? 'gpt-4o-transcribe-diarize')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whisper-large-v3-turbo">Groq — whisper-large-v3-turbo (free, fast)</SelectItem>
                  <SelectItem value="whisper-large-v3">Groq — whisper-large-v3 (free, most accurate)</SelectItem>
                  <SelectItem value="distil-whisper-large-v3-en">Groq — distil-whisper (free, English only)</SelectItem>
                  <SelectItem value="gpt-4o-transcribe-diarize">OpenAI — gpt-4o-transcribe-diarize (speaker labels)</SelectItem>
                  <SelectItem value="gpt-4o-transcribe">OpenAI — gpt-4o-transcribe</SelectItem>
                  <SelectItem value="gpt-4o-mini-transcribe">OpenAI — gpt-4o-mini-transcribe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Audio / Video File
                <span className="text-xs font-normal text-muted-foreground ml-1">mp3, mp4, m4a, wav, webm — max 25 MB</span>
              </Label>
              <div className="border-2 border-dashed rounded-md p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm"
                  onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                  id="audioFileInput"
                />
                <label htmlFor="audioFileInput" className="cursor-pointer">
                  <Mic className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  {audioFile ? (
                    <div>
                      <p className="text-sm font-medium">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Click to choose audio/video</p>
                      <p className="text-xs text-muted-foreground">mp3, mp4, m4a, wav, webm</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <StatusBadge status={audioStatus} message={audioMessage} />

            <Button type="submit" className="w-full" disabled={audioStatus === 'loading'}>
              {audioStatus === 'loading' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Transcribing…</>
              ) : (
                <><Mic className="w-4 h-4 mr-2" />Transcribe & Import</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CLI Transcription (large files &gt; 25 MB)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>For files larger than 25 MB, split them or use the local script:</p>
          <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto">
            python scripts/transcribe.py path/to/recording.mp4
          </pre>
          <p className="text-xs">Outputs an SRT file — upload it above with Option A.</p>
        </CardContent>
      </Card>
    </div>
  )
}
