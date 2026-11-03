import { Link } from 'react-router-dom'
import { CaretRight, LockSimple, PaperPlaneTilt } from '@phosphor-icons/react'
import type { Todo } from '../../../lib/home'

/** What still needs doing: close the roster, send the roster. Hidden when nothing is pending. */
export function TodoList({ rows, showOrg }: { rows: Todo[]; showOrg: boolean }) {
  if (!rows.length) return null
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">ต้องทำต่อ</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((t) => {
          const Icon = t.kind === 'close' ? LockSimple : PaperPlaneTilt
          return (
            <li key={`${t.activity.id}-${t.kind}`}>
              <Link to={`/sup/a/${t.activity.id}`} className="pressable flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft">
                <span className={`grid size-11 shrink-0 place-items-center rounded-full ${t.overdue ? 'bg-bad-soft text-bad' : 'bg-accent-soft text-accent-strong'}`}>
                  <Icon size={22} weight="bold" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.kind === 'close' ? 'ปิดรายชื่อ' : 'ส่งรายชื่อ'}</p>
                  <p className="truncate text-sm text-muted">{t.activity.title}</p>
                  {showOrg && <p className="truncate text-sm text-muted">{t.activity.org}</p>}
                </div>
                {t.kind === 'submit' && (
                  <p className={`num shrink-0 text-sm font-medium ${t.overdue ? 'text-bad' : 'text-muted'}`}>
                    {t.overdue ? 'เลยกำหนดส่งแล้ว' : `เหลือ ${t.days} วัน`}
                  </p>
                )}
                <CaretRight size={20} className="shrink-0 text-muted" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
