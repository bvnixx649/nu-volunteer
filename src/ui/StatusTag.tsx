import { STAGE_LABEL, type Stage } from '../lib/stage'

export type Tone = 'neutral' | 'accent' | 'warn' | 'ok'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink',
  accent: 'bg-accent-soft text-accent',
  warn: 'bg-warn-soft text-warn',
  ok: 'bg-ok-soft text-ok',
}

/** Which tone each stage's tag wears. */
export const STAGE_TONE: Record<Stage, Tone> = {
  scheduled: 'neutral',
  open: 'neutral',
  live: 'accent',
  closing: 'warn',
  submit: 'warn',
  waiting: 'ok',
  done: 'ok',
}

/** Small status pill: the stage label on a soft tone. Not interactive. */
export function StatusTag({ stage, className = '' }: { stage: Stage; className?: string }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center rounded-md px-2 py-1 text-[13px] leading-none font-semibold whitespace-nowrap ${TONE_CLASS[STAGE_TONE[stage]]} ${className}`}>
      {STAGE_LABEL[stage]}
    </span>
  )
}
