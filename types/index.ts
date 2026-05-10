export type UserRole = 'super_admin' | 'admin' | 'editor' | 'viewer' | 'restricted'

export interface User {
  id: string
  full_name: string | null
  role: UserRole
  organization: string | null
  created_at: string
}

export type EventType = 'hackathon' | 'awards_ceremony' | 'workshop' | 'keynote' | 'demo_day' | 'judging'
export type EventStatus = 'draft' | 'active' | 'archived'

export interface Event {
  id: string
  title: string
  slug: string
  event_date_start: string | null
  event_date_end: string | null
  event_type: EventType
  description: string | null
  location: string | null
  platform: string | null
  cover_image_url: string | null
  status: EventStatus
  created_by: string | null
  created_at: string
}

export type MediaSourceType = 'upload' | 'youtube' | 'google_drive' | 'zoom'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface MediaFile {
  id: string
  event_id: string
  title: string | null
  file_type: string | null
  source_type: MediaSourceType | null
  source_url: string | null
  youtube_video_id: string | null
  duration_seconds: number | null
  processing_status: ProcessingStatus
  created_at: string
}

export interface Speaker {
  id: string
  full_name: string
  role: string | null
  organization: string | null
  bio: string | null
  photo_url: string | null
  created_at: string
}

export interface Session {
  id: string
  event_id: string
  title: string
  session_type: string | null
  start_time: string | null
  end_time: string | null
  description: string | null
}

export type ReviewedStatus = 'pending' | 'reviewed' | 'approved'

export interface TranscriptSegment {
  id: string
  event_id: string
  media_file_id: string
  session_id: string | null
  speaker_id: string | null
  start_time_seconds: number
  end_time_seconds: number | null
  transcript_text: string
  confidence_score: number | null
  reviewed_status: ReviewedStatus
  created_at: string
  updated_at: string
  speaker?: Speaker
  event?: Event
  media_file?: MediaFile
}

export interface TranscriptChunk {
  id: string
  event_id: string
  media_file_id: string
  chunk_text: string
  start_time_seconds: number | null
  end_time_seconds: number | null
  speaker_names: string[] | null
  created_at: string
}

export interface Team {
  id: string
  event_id: string
  team_name: string
  project_name: string | null
  challenge_category: string | null
  project_summary: string | null
  technologies_used: string[] | null
  final_rank: number | null
  created_at: string
  event?: Event
  members?: TeamMember[]
  awards?: Award[]
}

export interface TeamMember {
  id: string
  team_id: string
  full_name: string
  role: string | null
  email: string | null
}

export type WinnerType = 'team' | 'individual' | 'organization'

export interface Award {
  id: string
  event_id: string
  award_category: string
  winner_type: WinnerType | null
  winner_name: string | null
  team_id: string | null
  prize_amount: string | null
  announcer_speaker_id: string | null
  announcement_timestamp: number | null
  acceptance_timestamp: number | null
  sponsor_name: string | null
  notes: string | null
  confirmed_status: boolean
  created_at: string
  event?: Event
  team?: Team
  announcer?: Speaker
}

export interface SavedQuote {
  id: string
  transcript_segment_id: string
  quote_text: string
  saved_by: string | null
  tag: string | null
  created_at: string
  segment?: TranscriptSegment
}

export interface ChatbotQuery {
  id: string
  user_id: string | null
  query_text: string
  response_text: string | null
  event_filter: string | null
  created_at: string
}

export interface CorrectionLog {
  id: string
  transcript_segment_id: string
  edited_by: string | null
  old_text: string | null
  new_text: string | null
  old_speaker_id: string | null
  new_speaker_id: string | null
  edit_reason: string | null
  created_at: string
}

export interface DashboardStats {
  events_count: number
  speakers_count: number
  teams_count: number
  awards_count: number
  segments_count: number
  approved_segments: number
  pending_segments: number
  media_files_count: number
}

export interface SearchResult {
  id: string
  event_id: string
  media_file_id: string
  speaker_id: string | null
  start_time_seconds: number
  end_time_seconds: number | null
  transcript_text: string
  reviewed_status: ReviewedStatus
  rank: number
  speaker?: Speaker
  event?: Event
  media_file?: MediaFile
}

export interface ChunkSearchResult {
  id: string
  chunk_text: string
  event_id: string
  media_file_id: string
  start_time_seconds: number | null
  end_time_seconds: number | null
  speaker_names: string[] | null
  similarity: number
  event?: Event
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
}

export interface ChatSource {
  event_title: string
  speaker_names: string[] | null
  start_time_seconds: number | null
  similarity: number
}
