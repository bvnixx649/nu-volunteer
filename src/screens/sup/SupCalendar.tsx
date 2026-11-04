import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { now as serverNow } from '../../data/api'
import { thTime } from '../../lib/format'
import { countInMonth, dayKey, onDay, stagesByDay, TH_MONTHS } from '../../lib/home'
import { stage } from '../../lib/stage'
import { StatusTag } from '../../ui/StatusTag'
import { OverviewCalendar } from './home/OverviewCalendar'
import { useSupActivities } from './home/useSupActivities'

/** Calendar tab: a month with a dot on each day an activity starts, and the list of the picked day. */
export default function SupCalendar() {
  const { sup, mine, now } = useSupActivities()
  const [cal, setCal] = useState(() => {
    const d = new Date(serverNow())
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  /** undefined: nobody has picked yet, so today (if it has activities) is shown. null: picked nothing on purpose. */
  const [picked, setPicked] = useState<string | null>()
  const stages = useMemo(() => stagesByDay(mine, now), [mine, now])

  if (!sup) return null
  const today = dayKey(now)
  const day = picked === undefined ? (stages.has(today) ? today : undefined) : (picked ?? undefined)
  const dayList = day ? onDay(mine, day).sort((a, b) => a.start - b.start) : []
  const dayDate = day ? new Date(`${day}T00:00:00`) : undefined

  return (
    <main className="mx-auto max-w-lg px-4 pt-[calc(1.625rem+env(safe-area-inset-top,0px))] pb-4">
      <h1 className="rise px-1 text-[26px] font-semibold">ปฏิทิน</h1>

      <div className="mt-4">
        <OverviewCalendar
          year={cal.year}
          month={cal.month}
          onMonth={(year, month) => {
            setCal({ year, month })
            setPicked(null)
          }}
          stages={stages}
          count={countInMonth(mine, cal.year, cal.month)}
          selected={day}
          onSelect={(key) => setPicked(day === key ? null : key)}
          now={now}
        />
      </div>

      {dayDate ? (
        <>
          <div className="flex items-baseline justify-between px-1 pt-[22px] pb-2.5">
            <h2 className="text-[17px] font-semibold">
              วันที่ {dayDate.getDate()} {TH_MONTHS[dayDate.getMonth()]} {dayDate.getFullYear() + 543}
            </h2>
            <span className="num text-[13px] text-muted">{dayList.length} กิจกรรม</span>
          </div>
          <ul className="overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface">
            {dayList.map((a, i) => (
              <li key={a.id} className={i ? 'border-t border-white/5' : ''}>
                <Link to={`/sup/a/${a.id}`} className="pressable flex items-center gap-3 px-3.5 py-3">
                  <img src={a.poster} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl bg-surface-2 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15.5px] leading-snug font-semibold">{a.title}</span>
                    <span className="num block text-[13px] text-muted">
                      {thTime(a.start)} ถึง {thTime(a.end)} น.
                    </span>
                  </span>
                  <StatusTag stage={stage(a, now)} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-[22px] rounded-[22px] border border-white/[0.06] bg-surface px-4 py-[22px] text-center text-sm text-muted">แตะวันที่มีจุดเพื่อดูกิจกรรม</p>
      )}
    </main>
  )
}
