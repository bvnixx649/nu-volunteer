import type { ButtonHTMLAttributes } from 'react'
import { CircleNotch } from '@phosphor-icons/react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
  size?: 'lg' | 'md'
  loading?: boolean
}

/** White is the main action on a page. `accent` is only for scanning and receiving hours (colour rule in styles.css). */
const variants = {
  primary: 'bg-ink text-bg',
  accent: 'bg-accent-strong text-on-accent',
  secondary: 'bg-surface-2 text-ink',
  ghost: 'text-ink',
  danger: 'bg-bad-soft text-bad',
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, className = '', children, ...rest }: Props) {
  const sizing = size === 'lg' ? 'min-h-14 px-7 text-[17px]' : 'min-h-11 px-5 text-[15px]'
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`pressable inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap disabled:opacity-45 aria-busy:opacity-100 disabled:active:scale-100 ${sizing} ${variants[variant]} ${className}`}
    >
      {loading && <CircleNotch size={18} weight="bold" className="animate-spin" />}
      {children}
    </button>
  )
}
