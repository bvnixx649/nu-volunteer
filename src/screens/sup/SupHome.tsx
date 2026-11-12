import { useMemo, useState, type CSSProperties } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { homeSections, type HomeFilter } from '../../lib/home'
import { usePins } from '../../lib/pins'
import { Chip } from '../../ui/Chip'
import { ActivityList } from './home/ActivityList'
import { LiveCards } from './home/LiveCards'
import { useSupActivities } from './home/useSupActivities'

/**
 * Supervisor home (first tab): search, three chips, what is running now, then the activities in sections. Pinned ones
 * come first, then for the centre admin the rosters to record and the organisations that have not sent, then what needs
 * the supervisor, then what is coming. Ended activities are on the list tab; creating one is the raised button in the tab bar.
 */
export default function SupHome() {
  const { sup, list, mine, now } = useSupActivities()
  const pins = usePins((s) => s.ids)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<HomeFilter>('all')
  const view = useMemo(() => (sup ? homeSections(mine, sup, now, pins, query) : undefined), [mine, now, pins, query, sup])
  if (!sup || !view) return null

  const todoCount = view.waiting.length + view.todo.length + view.unsent.length
  const upcomingCount = view.upcoming.length
  // What the chip shows, not counting the live card, which stays on top whatever the chip.
  const listed = filter === 'all' ? view.pinned.length + todoCount + upcomingCount : filter === 'todo' ? todoCount : upcomingCount
  const loaded = list !== null
  const nothingAtAll = loaded && mine.length === 0
  const nothingShown = loaded && !view.live.length && listed === 0

  return (
    <main className="mx-auto max-w-lg px-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-4">
      <header className="rise flex items-center gap-3 px-1">
        <img src={`${import.meta.env.BASE_URL}nu-emblem.png`} alt="ตรามหาวิทยาลัยนเรศวร" width={44} height={44} className="size-11 shrink-0 rounded-full bg-ink p-[3px]" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] leading-[1.3] font-semibold">{sup.orgName}</h1>
          <p className="truncate text-[13.5px] text-muted">ผู้ดูแล {sup.name}</p>
        </div>
      </header>

      <div className="rise mt-4" style={{ '--d': '40ms' } as CSSProperties}>
        <div className="relative">
          <MagnifyingGlass size={20} aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหากิจกรรม"
            aria-label="ค้นหากิจกรรม"
            className="h-12 w-full rounded-2xl bg-surface-2 pr-4 pl-11 text-[16px] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ink/40"
          />
        </div>
        <div role="group" aria-label="กรองกิจกรรม" className="mt-3 flex gap-2 overflow-x-auto">
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            ทั้งหมด
          </Chip>
          <Chip selected={filter === 'todo'} onClick={() => setFilter('todo')}>
            ต้องดำเนินการ <span className="num">{todoCount}</span>
          </Chip>
          <Chip selected={filter === 'upcoming'} onClick={() => setFilter('upcoming')}>
            จะจัดขึ้น <span className="num">{upcomingCount}</span>
          </Chip>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-8">
        <LiveCards list={view.live} showOrg={sup.admin} />
        <ActivityList s={view} filter={filter} admin={sup.admin} now={now} />
        {nothingAtAll && <p className="rise rounded-[var(--radius-card)] bg-surface px-5 py-8 text-center text-muted">ยังไม่มีกิจกรรม กดสร้างกิจกรรมเพื่อเริ่ม</p>}
        {!nothingAtAll && nothingShown && <p className="rise rounded-[var(--radius-card)] bg-surface px-5 py-8 text-center text-muted">ไม่พบกิจกรรม</p>}
      </div>
    </main>
  )
}
