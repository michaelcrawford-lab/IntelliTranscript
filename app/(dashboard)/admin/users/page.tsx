import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserCog } from 'lucide-react'

export default async function UsersPage() {
  const supabase = await createAdminClient()
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  const roleColors: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-800',
    admin: 'bg-orange-100 text-orange-800',
    editor: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-700',
    restricted: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage team access and roles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Users ({users?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!users || users.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No users yet. Users are created when someone signs up.
            </p>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <div key={user.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{user.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{user.organization ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[user.role] ?? 'bg-gray-100'}`}
                    >
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Role Permissions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            {[
              { role: 'super_admin', perms: 'Full access including user deletion and settings' },
              { role: 'admin', perms: 'Upload, manage events, correct transcripts, generate reports' },
              { role: 'editor', perms: 'Correct transcripts, rename speakers, update metadata' },
              { role: 'viewer', perms: 'Search and view approved transcripts only' },
              { role: 'restricted', perms: 'View selected events or reports only' },
            ].map(({ role, perms }) => (
              <div key={role} className="flex gap-3 py-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${roleColors[role]}`}>
                  {role.replace('_', ' ')}
                </span>
                <span className="text-muted-foreground text-xs">{perms}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
