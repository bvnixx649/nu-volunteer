import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import type { Credit, Registration } from '../../data/types'
import { rosterRows, type RosterFilter, type RosterRow } from '../../lib/roster'
import { thTime } from '../../lib/format'
import { Chip } from '../../ui/Chip'
import { Flag } from '../../ui/Flag'

const FILTERS: { key: RosterFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'credited', label: 'ได้ชั่วโมงแล้ว' },
  { key: 'notScanned', label: 'ยังไม่สแกน' },
  { key: 'walkIn', label: 'มาเพิ่ม' },
  { key: 'flagged', label: 'มีธง' },
]

type Props = {
  regs: Registration[]
  credits: Credit[]
  selected?: string
  onSelect: (row: RosterRow) => void
}

export function Flags({ row }: { row: RosterRow }) {
  const c = row.credit
  return (
    <>
      {row.reg?.walkIn && <Flag kind="walkIn">มาเพิ่ม</Flag>}
      {c?.flags.includes('location') && (
        <Flag kind="location">{c.distance !== undefined ? `ตำแหน่งไม่ผ่าน ${Math.round(c.distance)} ม.` : 'ตำแหน่งไม่ผ่าน'}</Flag>
      )}
      {c?.flags.includes('device') && <Flag kind="device">เครื่องซ้ำ</Flag>}
      {c?.reason && <Flag kind="edited">{c.reason}</Flag>}
    </>
  )
}

/** Live roster: search, five filters, one row per person. Updates as scans arrive from any device. */
export function Roster({ regs, credits, selected, onSelect }: Props) {
  const [filter, setFilter] = useState<RosterFilter>('all')
  const [q, setQ] = useState('')
  const all = useMemo(() => rosterRows(regs, credits, 'all', ''), [regs, credits])
  const rows = useMemo(() => rosterRows(regs, credits, filter, q), [regs, credits, filter, q])
  const count = (f: RosterFilter) => rosterRows(regs, credits, f, '').length

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <label className="flex h-12 items-center gap-3 rounded-full bg-surface px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
        <MagnifyingGlass size={20} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นด้วยรหัสหรือชื่อ"
          aria-label="ค้นด้วยรหัสหรือชื่อ"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </label>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {FILTERS.map((f) => (
          <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} <span className="num ml-1 opacity-70">{f.key === 'all' ? all.length : count(f.key)}</span>
          </Chip>
        ))}
      </div>

      {!rows.length ? (
        <p className="rounded-[var(--radius-card)] bg-surface px-5 py-8 text-center text-muted">
          {all.length ? 'ไม่พบรายชื่อที่ตรงกัน' : 'ยังไม่มีใครสแกน รายชื่อจะขึ้นที่นี่ทันทีที่มีคนรับชั่วโมง'}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
          {rows.map((r) => (
            <li key={r.studentId}>
              <button
                onClick={() => onSelect(r)}
                aria-current={selected === r.studentId || undefined}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-2 aria-[current]:bg-accent-soft/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="num text-sm text-muted">
                    {r.studentId}
                    {r.credit && <> สแกน {thTime(r.credit.at)} น.</>}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
                    <Flags row={r} />
                  </div>
                </div>
                <p className={`num shrink-0 pt-0.5 font-semibold ${r.credit ? '' : 'text-muted'}`}>
                  {r.credit ? `${r.credit.hours} ชม.` : 'ยังไม่สแกน'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
