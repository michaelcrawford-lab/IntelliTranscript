'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
// Note: DialogTrigger in this shadcn/ui build (@base-ui/react) does not support asChild
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface DeleteButtonProps {
  table: string
  id: string
  label?: string
  description?: string
  redirectTo?: string
  onDeleted?: () => void
  variant?: 'icon' | 'full'
}

export function DeleteButton({
  table,
  id,
  label = 'Delete',
  description = 'This action cannot be undone.',
  redirectTo,
  onDeleted,
  variant = 'icon',
}: DeleteButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from(table).delete().eq('id', id)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setOpen(false)
    if (redirectTo) {
      router.push(redirectTo)
    } else {
      router.refresh()
      onDeleted?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        onClick={(e) => e.stopPropagation()}
        className={
          variant === 'icon'
            ? 'p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors'
            : 'inline-flex items-center justify-center gap-2 rounded-[min(var(--radius-md),12px)] text-sm font-medium h-8 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors'
        }
        title={variant === 'icon' ? `Delete ${label}` : undefined}
      >
        <Trash2 className="w-4 h-4" />
        {variant === 'full' && 'Delete'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
