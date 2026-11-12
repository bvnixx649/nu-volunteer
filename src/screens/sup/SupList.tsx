import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Activity } from '../../data/types'
import { endedLine, endedMonths, type ListFilter } from '../../lib/home'
import { stage } from '../../lib/stage'
import { Segmented } from '../../ui/Segmented'
import { StatusTag } from '../../ui/StatusTag'
import { CARD, DayThumb } from './home/parts'
import { useSupActivities } from './home/useSupActivities'

const OPTIONS: { value: ListFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'waiting', label: 'รอบันทึก' },
  { value: 'recorded', label: 'บันทึกแล้ว' },
]

/** One ended activity: the day thumbnail, title, the stage, and the people and hours. The centre admin also sees the organisation. */
function EndedRow({ a, now, showOrg, first }: { a: Activity; now: number; showOrg: boolean; first: boolean }) {
  const s = stage(a, now)
  return (
    <li className={first ? '' : 'border-t border-line'}>
      <Link to={`/sup/a/${a.id}`} className="pressable group flex items-center gap-3.5 p-3.5">
        <DayThumb src={a.poster} ms={a.start} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base leading-[1.35] font-semibold">{a.title}</span>
          <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <StatusTag stage={s} size="sm" />
            <span className="num min-w-0 truncate text-[13.5px] text-muted">{endedLine(a)}</span>
          </span>
          {showOrg && <span className="mt-1 block truncate text-[13.5px] text-muted">{a.org}</span>}
        </span>
      </Link>
    </li>
  )
}

/** Ended activities, newest first, under their month. The segmented control picks all, the rosters waiting for the centre, or the recorded ones. */
export default function SupList() {
  const { sup, mine, now } = useSupActivities()
  const [filter, setFilter] = useState<ListFilter>('all')
  const months = useMemo(() => endedMonths(mine, now, filter), [mine, now, filter])
  if (!sup) return null

  return (
    <main className="mx-auto max-w-lg px-4 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-4">
      <h1 className="rise px-1 text-[28px] leading-tight font-bold tracking-tight">รายการ</h1>
      <div className="rise mt-4" style={{ '--d': '40ms' } as CSSProperties}>
        <Segmented options={OPTIONS} value={filter} onChange={setFilter} label="กรองรายการ" />
      </div>

      {months.length === 0 && <p className={`rise mt-6 ${CARD} px-5 py-8 text-center text-muted`}>ยังไม่มีกิจกรรมที่จบแล้ว</p>}
      {months.map((m) => (
        <section key={m.key} className="rise mt-6">
          <h2 className="px-1 pb-2 text-[14px] font-medium text-muted">{m.label}</h2>
          <ul className={CARD}>
            {m.items.map((a, i) => (
              <EndedRow key={a.id} a={a} now={now} showOrg={sup.admin} first={i === 0} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
