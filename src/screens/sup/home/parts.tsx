import { motion } from 'motion/react'
import { SEAT_RED, SEAT_YELLOW } from '../../../config'
import { dateTile } from '../../../lib/format'
import type { RegInfo } from '../../../lib/home'
import { STAGE_LABEL, type Stage } from '../../../lib/stage'

/** Black scrim for a poster with a title laid over its lower half: a little shade on top for the chips, dark at the bottom for the text. */
export const POSTER_SCRIM = 'linear-gradient(180deg, rgb(0 0 0 / 0.28) 0%, rgb(0 0 0 / 0) 30%, rgb(0 0 0 / 0.5) 62%, rgb(0 0 0 / 0.86) 100%)'

/** A flat card: one tone, 22px corners, no ring and no shadow. */
export const CARD = 'overflow-hidden rounded-[var(--radius-card)] bg-surface'

/** A poster that scales a little while its card is pressed. The card link must have the `group` class. */
export function PosterImg({ src, eager = false, className = '' }: { src: string; eager?: boolean; className?: string }) {
  return <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} className={`size-full object-cover transition-transform duration-[600ms] ease-[var(--ease-out)] group-active:scale-[1.03] ${className}`} />
}

/** Date tile laid over a poster: weekday (or "วันนี้"), day number, month. Solid, so it reads on any photo. */
export function DateTile({ ms, now, large = false }: { ms: number; now: number; large?: boolean }) {
  const t = dateTile(ms, now)
  return (
    <span aria-hidden className={`absolute top-3 left-3 overflow-hidden bg-bg text-center ${large ? 'w-[60px] rounded-2xl' : 'w-14 rounded-[14px]'}`}>
      <span className={`block font-semibold text-accent ${large ? 'pt-1.5 text-[12px]' : 'pt-[5px] text-[11.5px]'}`}>{t.dow}</span>
      <span className={`num block leading-[1.1] font-semibold ${large ? 'text-2xl' : 'text-[22px]'}`}>{t.day}</span>
      <span className={`block text-muted ${large ? 'pb-[7px] text-[12px]' : 'pb-1.5 text-[11.5px]'}`}>{t.mon}</span>
    </span>
  )
}

/** Status chip laid over a poster (top right): green text when open, plain when not yet open. Solid, so it reads on any photo. */
export function PhotoChip({ stage }: { stage: Stage }) {
  const tone = stage === 'open' || stage === 'live' ? 'text-ok' : 'text-ink'
  return <span className={`absolute top-3 right-3 rounded-full bg-bg px-3 py-1.5 text-[12.5px] leading-none font-semibold whitespace-nowrap ${tone}`}>{STAGE_LABEL[stage]}</span>
}

/** Registration under a poster card: seat bar (only when numbers are limited), text on the left, what is left on the right. */
export function SeatLine({ info, className = '' }: { info: RegInfo; className?: string }) {
  const { fill } = info
  const level = fill === undefined ? 'ok' : fill > SEAT_RED ? 'bad' : fill > SEAT_YELLOW ? 'warn' : 'ok'
  const bar = level === 'bad' ? 'bg-bad' : level === 'warn' ? 'bg-warn' : 'bg-ok'
  const side = level === 'bad' ? 'text-bad' : level === 'warn' ? 'text-warn' : 'text-ink'
  return (
    <div className={className}>
      {fill !== undefined && (
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={info.text}>
          <motion.div
            className={`h-full origin-left rounded-full ${bar}`}
            initial={{ transform: 'scaleX(0)' }}
            animate={{ transform: `scaleX(${fill})` }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
          />
        </div>
      )}
      <p className="num flex justify-between gap-3 text-[13px] text-muted">
        <span className="min-w-0">{info.text}</span>
        {info.side && <span className={`shrink-0 font-semibold ${side}`}>{info.side}</span>}
      </p>
    </div>
  )
}
