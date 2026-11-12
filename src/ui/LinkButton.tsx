import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'bg-ink text-bg',
  /** Scanning and receiving hours only. */
  accent: 'bg-accent-strong text-on-accent',
  secondary: 'bg-surface-2 text-ink',
  /** Plain text, for a quiet second action under a primary one. */
  ghost: 'bg-transparent text-ink',
}

/** A Link that looks like Button, for navigation that should read as a main action. */
export function LinkButton({
  to,
  variant = 'secondary',
  className = '',
  replace,
  children,
}: {
  to: string
  variant?: keyof typeof variants
  className?: string
  /** Swap the current history entry, for a way out of a page the person should not come back to. */
  replace?: boolean
  children: ReactNode
}) {
  return (
    <Link to={to} replace={replace} className={`pressable inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-7 text-[17px] font-semibold whitespace-nowrap ${variants[variant]} ${className}`}>
      {children}
    </Link>
  )
}
