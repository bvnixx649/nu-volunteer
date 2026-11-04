import { Link } from 'react-router-dom'
import { CaretRight } from '@phosphor-icons/react'
import type { Activity } from '../../../data/types'
import { thDate } from '../../../lib/format'
import { stage } from '../../../lib/stage'
import { StatusTag } from '../../../ui/StatusTag'

/** "ลงทะเบียน 12 คน" before the activity starts, "3 คนได้ชั่วโมง" after. */
function detail(a: Activity, now: number) {
  const s = stage(a, now)
  const count = s === 'scheduled' || s === 'open' ? `ลงทะเบียน ${a.regCount.toLocaleString('th-TH')} คน` : `${a.creditCount.toLocaleString('th-TH')} คนได้ชั่วโมง`
  return `${thDate(a.start)} ${count}`
}

/** Every activity in one inset grouped list: title and muted line on the left, status tag and chevron on the right. */
export function ActivityList({ list, showOrg, now }: { list: Activity[]; showOrg: boolean; now: number }) {
  if (!list.length) return null
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">กิจกรรมทั้งหมด</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
        {list.map((a) => (
          <li key={a.id}>
            <Link to={`/sup/a/${a.id}`} className="pressable flex min-h-16 items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 leading-snug font-semibold">{a.title}</p>
                <p className="num mt-0.5 truncate text-sm text-muted">{detail(a, now)}</p>
                {showOrg && <p className="truncate text-sm text-muted">{a.org}</p>}
              </div>
              <StatusTag stage={stage(a, now)} />
              <CaretRight size={18} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
