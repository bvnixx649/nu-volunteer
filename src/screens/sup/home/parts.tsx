import { motion } from 'motion/react'
import { SEAT_RED, SEAT_YELLOW } from '../../../config'
import { dateTile } from '../../../lib/format'
import type { RegInfo } from '../../../lib/home'
import { STAGE_LABEL, type Stage } from '../../../lib/stage'

/** Fade to the page colour at the bottom of a poster, for text laid over it. */
export const POSTER_SCRIM = 'linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 35%, rgba(20,19,18,0.94) 100%)'

/** Shell of a double-bezel card: the outer ring, then an inner surface with an inset highlight. */
export const BEZEL_OUTER = 'rounded-[30px] border border-white/[0.06] bg-white/[0.03] p-1.5'
export const BEZEL_INNER = 'rounded-3xl bg-gradient-to-b from-[#25231f] to-[#1c1a18] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_48px_-20px_rgba(0,0,0,0.7)]'

/** A poster that scales a little while its card is pressed. The card link must have the `group` class. */
export function PosterImg({ src, eager = false, className = '' }: { src: string; eager?: boolean; className?: string }) {
  return <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} className={`size-full object-cover transition-transform duration-[600ms] ease-[var(--ease-out)] group-active:scale-[1.03] ${className}`} />
}

/** Date tile laid over a poster: weekday (or "วันนี้"), day number, month. */
export function DateTile({ ms, now, large = false }: { ms: number; now: number; large?: boolean }) {
  const t = dateTile(ms, now)
  return (
    <span
      aria-hidden
      className={`absolute top-3 left-3 overflow-hidden bg-bg/80 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-xl ${large ? 'w-[60px] rounded-2xl' : 'w-14 rounded-[14px]'}`}
    >
      <span className={`block font-semibold text-[#f7a57a] ${large ? 'pt-[5px] text-[11.5px]' : 'pt-1 text-[11px]'}`}>{t.dow}</span>
      <span className={`num block leading-[1.1] font-semibold ${large ? 'text-2xl' : 'text-[22px]'}`}>{t.day}</span>
      <span className={`block text-ink/80 ${large ? 'pb-1.5 text-[11.5px]' : 'pb-[5px] text-[11px]'}`}>{t.mon}</span>
    </span>
  )
}

/** Status chip laid over a poster (top right): green when open, grey when not yet open. Blurred so it reads on any photo. */
export function PhotoChip({ stage }: { stage: Stage }) {
  const tone = stage === 'open' || stage === 'live' ? 'bg-[rgba(14,40,26,0.72)] text-[#7fd8a6]' : 'bg-[rgba(20,19,18,0.72)] text-ink/80'
  return (
    <span className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[12.5px] leading-none font-semibold whitespace-nowrap backdrop-blur-xl ${tone}`}>{STAGE_LABEL[stage]}</span>
  )
}

/** Registration under a poster card: seat bar (only when numbers are limited), text on the left, what is left on the right. */
export function SeatLine({ info, className = '' }: { info: RegInfo; className?: string }) {
  const { fill } = info
  const level = fill === undefined ? 'ok' : fill > SEAT_RED ? 'bad' : fill > SEAT_YELLOW ? 'warn' : 'ok'
  const bar = level === 'bad' ? 'bg-bad' : level === 'warn' ? 'bg-warn' : 'bg-accent'
  const side = level === 'bad' ? 'text-bad' : level === 'warn' ? 'text-warn' : 'text-ink'
  return (
    <div className={className}>
      {fill !== undefined && (
        <div className="mb-[7px] h-[5px] overflow-hidden rounded-full bg-white/[0.08]" role="img" aria-label={info.text}>
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
