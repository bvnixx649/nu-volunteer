import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'bg-accent-strong text-on-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_24px_-10px_rgba(232,89,12,0.8)]',
  secondary: 'bg-surface text-ink ring-1 ring-line',
  /** Plain text, for a quiet second action under a primary one. */
  ghost: 'bg-transparent text-ink',
}

/** A Link that looks like Button, for navigation that should read as a main action. */
export function LinkButton({ to, variant = 'secondary', className = '', children }: { to: string; variant?: keyof typeof variants; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={`pressable inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-7 text-[17px] font-semibold whitespace-nowrap ${variants[variant]} ${className}`}>
      {children}
    </Link>
  )
}
