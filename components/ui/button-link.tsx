import Link from 'next/link'
import { buttonVariants } from './button'
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'

type ButtonVariants = VariantProps<typeof buttonVariants>

interface ButtonLinkProps extends ButtonVariants {
  href: string
  className?: string
  children: React.ReactNode
  download?: boolean | string
}

export function ButtonLink({ href, className, variant, size, children, download }: ButtonLinkProps) {
  if (download) {
    return (
      <a
        href={href}
        download={download}
        className={cn(buttonVariants({ variant, size }), className)}
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </Link>
  )
}
