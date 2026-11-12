import { STAGE_LABEL, type Stage } from '../lib/stage'

export type Tone = 'neutral' | 'accent' | 'warn' | 'ok'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent-soft text-accent-ink',
  warn: 'bg-warn-soft text-warn',
  ok: 'bg-ok-soft text-ok',
}

/** Which tone each stage's pill wears: green while running or open, amber to check, orange to send, grey once handed on. */
export const STAGE_TONE: Record<Stage, Tone> = {
  scheduled: 'neutral',
  open: 'ok',
  live: 'ok',
  closing: 'warn',
  submit: 'accent',
  waiting: 'neutral',
  done: 'neutral',
}

/** The dot on the calendar for each stage. */
export const STAGE_DOT: Record<Stage, string> = {
  scheduled: 'var(--color-muted)',
  open: 'var(--color-ink)',
  live: 'var(--color-ok)',
  closing: 'var(--color-warn)',
  submit: 'var(--color-accent)',
  waiting: 'var(--color-faint)',
  done: 'var(--color-faint)',
}

/** Small status pill: the stage label on a soft tone. `label` and `tone` override the stage's own, for a pill that says more. Not interactive. */
export function StatusTag({ stage, size = 'md', className = '', label, tone }: { stage: Stage; size?: 'md' | 'sm'; className?: string; label?: string; tone?: Tone }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center rounded-full leading-none font-semibold whitespace-nowrap ${size === 'sm' ? 'px-2 py-[3px] text-xs' : 'px-2.5 py-1 text-[12.5px]'} ${TONE_CLASS[tone ?? STAGE_TONE[stage]]} ${className}`}>
      {label ?? STAGE_LABEL[stage]}
    </span>
  )
}
