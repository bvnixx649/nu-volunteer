import { STAGE_LABEL, type Stage } from '../lib/stage'

export type Tone = 'neutral' | 'accent' | 'warn' | 'ok'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-white/[0.06] text-ink/80',
  accent: 'bg-accent/15 text-[#f7a57a]',
  warn: 'bg-warn/15 text-warn',
  ok: 'bg-ok/15 text-ok',
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

/** The dot on the calendar for each stage. Literal colours only for the two that have no token. */
export const STAGE_DOT: Record<Stage, string> = {
  scheduled: '#a5a19a',
  open: '#e9d8c6',
  live: 'var(--color-ok)',
  closing: 'var(--color-warn)',
  submit: 'var(--color-accent)',
  waiting: '#6f6a63',
  done: '#6f6a63',
}

/** Small status pill: the stage label on a soft tone. Not interactive. */
export function StatusTag({ stage, className = '' }: { stage: Stage; className?: string }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-[12.5px] leading-none font-semibold whitespace-nowrap ${TONE_CLASS[STAGE_TONE[stage]]} ${className}`}>
      {STAGE_LABEL[stage]}
    </span>
  )
}
