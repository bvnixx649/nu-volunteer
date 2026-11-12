import { useRef } from 'react'
import type { Credit } from '../../data/types'
import { initial, thTime } from '../../lib/format'

/**
 * The last three scans, newest on top. A row that arrives after the list first showed slides in from the top
 * (plain CSS, so it plays with Reduce Motion on). `ready` is true once the credits have loaded, so the rows that
 * were already there do not all animate at once.
 */
export function ScanFeed({ credits, ready }: { credits: Credit[]; ready: boolean }) {
  const latest = [...credits].sort((a, b) => b.at - a.at).slice(0, 3)
  const first = useRef<Set<string> | null>(null)
  if (ready && first.current === null) first.current = new Set(latest.map((c) => c.studentId))

  return (
    <section aria-label="สแกนล่าสุด">
      <div className="flex items-baseline justify-between px-1 pt-8 pb-3">
        <h2 className="text-xl font-semibold">สแกนล่าสุด</h2>
        <span className="text-[13.5px] text-muted">อัปเดตอัตโนมัติ</span>
      </div>
      <ul data-feed className="overflow-hidden rounded-[var(--radius-card)] bg-surface">
        {latest.map((c, i) => (
          <li
            key={c.studentId}
            className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-line' : ''} ${first.current && !first.current.has(c.studentId) ? 'feed-new' : ''}`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-[15px] font-semibold" aria-hidden>
              {initial(c.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{c.name}</span>
              <span className="num block text-[13px] text-muted">{c.studentId}</span>
            </span>
            <span className="num shrink-0 text-[13.5px] text-muted">{thTime(c.at)} น.</span>
          </li>
        ))}
        {!latest.length && <li className="px-5 py-6 text-center text-[15px] text-muted">ยังไม่มีผู้สแกน</li>}
      </ul>
    </section>
  )
}
