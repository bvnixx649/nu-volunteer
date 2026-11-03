import { Link } from 'react-router-dom'
import { CaretRight } from '@phosphor-icons/react'
import type { Activity } from '../../../data/types'
import { thDate, thTime } from '../../../lib/format'
import type { Group } from '../../../lib/home'

function Row({ a, group, showOrg }: { a: Activity; group: Group['key']; showOrg: boolean }) {
  const people = group === 'upcoming' ? a.regCount : a.creditCount
  return (
    <Link to={`/sup/a/${a.id}`} className="pressable flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft">
      <img src={a.poster} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold">{a.title}</p>
        <p className="num mt-1 text-sm text-muted">
          {thDate(a.start)} {thTime(a.start)} ถึง {thTime(a.end)} น.
        </p>
        {showOrg && <p className="mt-0.5 truncate text-sm text-muted">{a.org}</p>}
      </div>
      <p className="shrink-0 text-right">
        <span className="num block text-xl leading-none font-bold">{people.toLocaleString('th-TH')}</span>
        <span className="text-xs text-muted">{group === 'upcoming' ? 'ลงทะเบียน' : 'ได้ชั่วโมง'}</span>
      </p>
      <CaretRight size={20} className="shrink-0 text-muted" />
    </Link>
  )
}

/** Activities grouped by status, each group hidden when empty. */
export function ActivityGroups({ groups, showOrg }: { groups: Group[]; showOrg: boolean }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.key} className="mb-10 last:mb-0">
          <h2 className="mb-3 text-lg font-semibold">{g.title}</h2>
          <ul className="flex flex-col gap-3">
            {g.items.map((a) => (
              <li key={a.id}>
                <Row a={a} group={g.key} showOrg={showOrg} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
