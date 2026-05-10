import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Database, Key, Shield } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform configuration and integrations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Supabase Connection</span>
            <Badge variant="default" className="text-xs">Connected</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>pgvector Extension</span>
            <Badge variant="outline" className="text-xs">Required</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Row Level Security</span>
            <Badge variant="default" className="text-xs">Enabled</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Groq API (AI Chatbot)</span>
            <Badge variant={process.env.NEXT_PUBLIC_GROQ_CONFIGURED === 'true' ? 'default' : 'secondary'} className="text-xs">
              Configure via GROQ_API_KEY
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Whisper (Transcription)</span>
            <Badge variant="secondary" className="text-xs">Local script</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• All Groq API calls are server-side only (never exposed to client)</p>
          <p>• Transcript segments require admin/editor role to write</p>
          <p>• Viewers can only read approved transcript segments</p>
          <p>• All corrections are logged in correction_logs table</p>
          <p>• Storage buckets should be set to private in Supabase dashboard</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GROQ_API_KEY=gsk_...`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
