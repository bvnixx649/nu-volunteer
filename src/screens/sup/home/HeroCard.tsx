import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Activity } from '../../../data/types'
import { daysAway, thTime } from '../../../lib/format'
import { regInfo } from '../../../lib/home'
import { stage } from '../../../lib/stage'
import { CARD, DateTile, PhotoChip, PosterImg, POSTER_SCRIM, SeatLine } from './parts'

/** With nothing live, the nearest upcoming activity takes the top spot: big poster, how far away it is, how full it is. */
export function HeroCard({ a, now, showOrg }: { a: Activity; now: number; showOrg: boolean }) {
  return (
    <section aria-label="กิจกรรมถัดไป" className="rise" style={{ '--d': '60ms' } as CSSProperties}>
      <Link to={`/sup/a/${a.id}`} className={`pressable group block ${CARD}`}>
        <div className="relative h-[220px] overflow-hidden">
          <PosterImg src={a.poster} eager />
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: POSTER_SCRIM }} />
          <DateTile ms={a.start} now={now} large />
          <PhotoChip stage={stage(a, now)} />
          <div className="absolute inset-x-5 bottom-4">
            <p className="num text-[13.5px] font-semibold text-accent">{daysAway(a.start, now)}</p>
            <p className="mt-0.5 line-clamp-2 text-[21px] leading-[1.3] font-semibold text-balance">{a.title}</p>
            <p className="num mt-0.5 text-[13.5px] text-ink/80">
              {thTime(a.start)} ถึง {thTime(a.end)} น.{a.place ? ` ${a.place}` : ''}
            </p>
            {showOrg && <p className="truncate text-[13.5px] text-ink/80">{a.org}</p>}
          </div>
        </div>
        <div className="px-5 pt-4 pb-5">
          <SeatLine info={regInfo(a, now)} />
        </div>
      </Link>
    </section>
  )
}
