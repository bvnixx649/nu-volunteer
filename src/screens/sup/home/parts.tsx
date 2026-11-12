import { TH_MONTHS_SHORT } from '../../../lib/home'

/** Black scrim for a poster with a title laid over its lower half: a little shade on top for the chips, dark at the bottom for the text. */
export const POSTER_SCRIM = 'linear-gradient(180deg, rgb(0 0 0 / 0.28) 0%, rgb(0 0 0 / 0) 30%, rgb(0 0 0 / 0.5) 62%, rgb(0 0 0 / 0.86) 100%)'

/** A flat card: one tone, 22px corners, no ring and no shadow. */
export const CARD = 'overflow-hidden rounded-[var(--radius-card)] bg-surface'

/** A poster that scales a little while its card is pressed. The card link must have the `group` class. */
export function PosterImg({ src, eager = false, className = '' }: { src: string; eager?: boolean; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      className={`size-full object-cover transition-transform duration-[600ms] ease-[var(--ease-out)] group-active:scale-[1.03] ${className}`}
    />
  )
}

/** Compact poster thumbnail with the day and month over a dark scrim, for the rows of the home and the list tab. */
export function DayThumb({ src, ms }: { src: string; ms: number }) {
  const d = new Date(ms)
  return (
    <span className="relative block size-14 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
      <PosterImg src={src} />
      <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 leading-[1.1]">
        <span className="num text-xl font-semibold">{d.getDate()}</span>
        <span className="text-[11.5px] text-ink">{TH_MONTHS_SHORT[d.getMonth()]}</span>
      </span>
    </span>
  )
}
