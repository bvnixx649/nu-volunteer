import { useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import type { Credit, Registration } from '../../data/types'
import { creditWhen, rosterRows, type RosterFilter, type RosterRow } from '../../lib/roster'
import { Chip } from '../../ui/Chip'
import { Flag } from '../../ui/Flag'

const FILTERS: { key: RosterFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'credited', label: 'ได้รับชั่วโมงแล้ว' },
  { key: 'notScanned', label: 'ยังไม่ได้รับชั่วโมง' },
  { key: 'walkIn', label: 'ไม่ได้ลงทะเบียน' },
  { key: 'flagged', label: 'ควรตรวจสอบ' },
]

type Props = {
  regs: Registration[]
  credits: Credit[]
  selected?: string
  /** Roster is closed: registered people without a credit are shown as not coming. */
  closed?: boolean
  onSelect: (row: RosterRow) => void
  /** Lets the page choose the filter, e.g. from the summary tiles. Without these the roster keeps its own. */
  filter?: RosterFilter
  onFilter?: (f: RosterFilter) => void
}

export function Flags({ row, closed }: { row: RosterRow; closed?: boolean }) {
  const c = row.credit
  return (
    <>
      {closed && row.reg && !c && <Flag kind="noShow">ไม่เข้าร่วม</Flag>}
      {row.reg?.walkIn && c?.items === undefined && <Flag kind="walkIn">ไม่ได้ลงทะเบียน</Flag>}
      {c?.flags.includes('location') && (
        <Flag kind="location">{c.distance !== undefined ? `อยู่นอกพื้นที่ ${Math.round(c.distance)} ม.` : 'อยู่นอกพื้นที่'}</Flag>
      )}
      {c?.flags.includes('device') && <Flag kind="device">ใช้เครื่องซ้ำ</Flag>}
      {c?.flags.includes('offline') && <Flag kind="offline">ส่งภายหลัง</Flag>}
      {c?.reason && <Flag kind="edited">{c.reason}</Flag>}
    </>
  )
}

/** Live roster: search, five filters, one row per person. Updates as scans arrive from any device. */
export function Roster({ regs, credits, selected, closed, onSelect, filter: given, onFilter }: Props) {
  const [own, setOwn] = useState<RosterFilter>('all')
  const filter = given ?? own
  const setFilter = onFilter ?? setOwn
  const [q, setQ] = useState('')
  const all = useMemo(() => rosterRows(regs, credits, 'all', ''), [regs, credits])
  const rows = useMemo(() => rosterRows(regs, credits, filter, q), [regs, credits, filter, q])
  const count = (f: RosterFilter) => rosterRows(regs, credits, f, '').length
  const bar = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  // Typing or filtering deep in a long roster: bring the top of the results up under the sticky bar.
  useEffect(() => {
    const top = list.current?.getBoundingClientRect().top ?? 0
    const below = bar.current?.getBoundingClientRect().height ?? 0
    if (top < below) window.scrollBy({ top: top - below })
  }, [q, filter])

  return (
    <section id="roster" className="flex min-w-0 scroll-mt-0 flex-col gap-3" aria-label="รายชื่อ">
      <h2 className="px-1 text-xl font-semibold">รายชื่อ</h2>
      {/* Stays on screen while scrolling a long roster, so a name can be looked up from anywhere in the list. */}
      <div ref={bar} className="sticky top-0 z-10 -mx-5 flex flex-col gap-3 bg-bg px-5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pb-3 min-[900px]:mx-0 min-[900px]:px-0">
      <label className="flex h-13 items-center gap-3 rounded-[var(--radius-field)] bg-surface-2 px-4 transition-shadow duration-150 focus-within:ring-2 focus-within:ring-ink">
        <MagnifyingGlass size={20} className="shrink-0 text-muted" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นด้วยรหัสหรือชื่อ"
          aria-label="ค้นด้วยรหัสหรือชื่อ"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </label>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 min-[900px]:mx-0 min-[900px]:px-0">
        {FILTERS.map((f) => (
          <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} <span className="num ml-1 opacity-70">{f.key === 'all' ? all.length : count(f.key)}</span>
          </Chip>
        ))}
      </div>
      </div>

      <div ref={list} className="-mt-3" aria-hidden />
      {!rows.length ? (
        <p className="rounded-[var(--radius-card)] bg-surface px-5 py-8 text-center text-muted">
          {all.length ? 'ไม่พบรายชื่อที่ตรงกัน' : 'ยังไม่มีรายชื่อ'}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
          {rows.map((r) => (
            <li key={r.studentId}>
              <button
                onClick={() => onSelect(r)}
                aria-current={selected === r.studentId || undefined}
                className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors active:bg-surface-2 aria-[current]:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="num mt-0.5 text-sm text-muted">
                    {r.studentId}
                    {r.credit && (r.credit.items !== undefined ? <> {r.credit.items} ขวด</> : <> {creditWhen(r.credit)}</>)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 empty:hidden">
                    <Flags row={r} closed={closed} />
                  </div>
                </div>
                <p className={`num shrink-0 pt-0.5 font-semibold ${r.credit ? '' : 'text-muted'}`}>
                  {r.credit ? `${r.credit.hours} ชม.` : closed && r.reg ? '0 ชม.' : 'ยังไม่ได้รับชั่วโมง'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
