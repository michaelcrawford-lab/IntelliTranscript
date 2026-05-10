'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  Trophy,
  Search,
  MessageSquare,
  BarChart3,
  Upload,
  Settings,
  UserCog,
  Mic,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/chat', label: 'AI Assistant', icon: MessageSquare },
  { href: '/speakers', label: 'Speakers', icon: Mic },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/awards', label: 'Awards', icon: Trophy },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/uploads', label: 'Uploads', icon: Upload },
]

const adminItems = [
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/users', label: 'Users', icon: UserCog },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r bg-card flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <FileText className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">IntelliTranscript</p>
          <p className="text-xs text-muted-foreground">Hackathon Archive</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-6">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Admin
          </p>
          <nav className="space-y-1">
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Intellibus © 2025
        </p>
      </div>
    </aside>
  )
}
