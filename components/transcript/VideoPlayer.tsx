'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Video } from 'lucide-react'
import type { MediaFile } from '@/types'

interface Props {
  mediaFile: MediaFile | null
  seekTo: number
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
}

export function VideoPlayer({ mediaFile, seekTo, iframeRef }: Props) {
  const [iframeKey, setIframeKey] = useState(0)
  const prevSeekRef = useRef<number>(0)

  // When seekTo changes, reload the YouTube iframe with ?start=
  useEffect(() => {
    if (seekTo !== prevSeekRef.current && seekTo > 0) {
      prevSeekRef.current = seekTo
      setIframeKey((k) => k + 1)
    }
  }, [seekTo])

  if (!mediaFile) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Video className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No video linked</p>
          <p className="text-xs mt-1">Upload a media file or link a YouTube video</p>
        </CardContent>
      </Card>
    )
  }

  if (mediaFile.youtube_video_id) {
    const src = `https://www.youtube.com/embed/${mediaFile.youtube_video_id}?start=${Math.floor(seekTo)}&autoplay=${seekTo > 0 ? 1 : 0}&rel=0`
    return (
      <div className="aspect-video w-full rounded-md overflow-hidden border bg-black">
        <iframe
          key={iframeKey}
          ref={iframeRef as React.RefObject<HTMLIFrameElement>}
          src={src}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={mediaFile.title ?? 'Event recording'}
        />
      </div>
    )
  }

  if (mediaFile.source_url) {
    return (
      <div className="aspect-video w-full rounded-md overflow-hidden border bg-black">
        <video
          src={mediaFile.source_url}
          controls
          className="w-full h-full"
          title={mediaFile.title ?? 'Event recording'}
        />
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Play className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Video not available</p>
      </CardContent>
    </Card>
  )
}
