import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Activity } from '../../../data/types'
import { daysAway, thTime } from '../../../lib/format'
import { regInfo } from '../../../lib/home'
import { stage } from '../../../lib/stage'
import { BEZEL_INNER, BEZEL_OUTER, DateTile, PhotoChip, PosterImg, POSTER_SCRIM, SeatLine } from './parts'

/** With nothing live, the nearest upcoming activity takes the top spot: big poster, how far away it is, how full it is. */
export function HeroCard({ a, now, showOrg }: { a: Activity; now: number; showOrg: boolean }) {
  return (
    <section aria-label="กิจกรรมถัดไป" className={`rise -mx-1 ${BEZEL_OUTER}`} style={{ '--d': '60ms' } as CSSProperties}>
      <Link to={`/sup/a/${a.id}`} className={`pressable group block overflow-hidden ${BEZEL_INNER}`}>
        <div className="relative h-[220px] overflow-hidden">
          <PosterImg src={a.poster} eager />
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: POSTER_SCRIM }} />
          <DateTile ms={a.start} now={now} large />
          <PhotoChip stage={stage(a, now)} />
          <div className="absolute inset-x-4 bottom-3.5">
            <p className="num text-[13.5px] font-semibold text-[#f7a57a]">{daysAway(a.start, now)}</p>
            <p className="mt-0.5 line-clamp-2 text-[21px] leading-[1.3] font-semibold">{a.title}</p>
            <p className="num text-[13px] text-ink/80">
              {thTime(a.start)} ถึง {thTime(a.end)} น.{a.place ? ` ${a.place}` : ''}
            </p>
            {showOrg && <p className="truncate text-[13px] text-ink/80">{a.org}</p>}
          </div>
        </div>
        <div className="px-[18px] pt-4 pb-[18px]">
          <SeatLine info={regInfo(a, now)} />
        </div>
      </Link>
    </section>
  )
}
