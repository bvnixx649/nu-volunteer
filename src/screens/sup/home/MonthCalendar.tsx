import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { dayKey, monthGrid, TH_MONTHS, TH_WEEKDAYS } from '../../../lib/home'

type Props = {
  /** First day of the month shown: the year and month are what count. */
  year: number
  month: number
  onMonth: (year: number, month: number) => void
  busy: Set<string>
  selected?: string
  onSelect: (key?: string) => void
  now: number
}

const stepBtn = 'pressable grid size-11 place-items-center rounded-full text-ink [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2'

/** A compact month: a dot under days that have activities, today ringed, the picked day white. Tap a busy day to filter the list. */
export function MonthCalendar({ year, month, onMonth, busy, selected, onSelect, now }: Props) {
  const today = dayKey(now)
  const step = (d: number) => {
    const next = new Date(year, month + d, 1)
    onMonth(next.getFullYear(), next.getMonth())
  }
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {TH_MONTHS[month]} {year + 543}
        </h2>
        <div className="flex gap-1">
          <button onClick={() => step(-1)} aria-label="เดือนก่อน" className={stepBtn}>
            <CaretLeft size={20} />
          </button>
          <button onClick={() => step(1)} aria-label="เดือนถัดไป" className={stepBtn}>
            <CaretRight size={20} />
          </button>
        </div>
      </div>
      <div className="rounded-[var(--radius-card)] bg-surface p-3">
        <div className="grid grid-cols-7 pb-1 text-center text-[13px] text-muted">
          {TH_WEEKDAYS.map((w) => (
            <span key={w} className="py-1.5">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {monthGrid(year, month)
            .flat()
            .map((c, i) => {
              if (!c) return <span key={i} />
              const has = busy.has(c.key)
              const on = selected === c.key
              return (
                <button
                  key={c.key}
                  disabled={!has}
                  aria-pressed={has ? on : undefined}
                  aria-label={has ? `วันที่ ${c.day} มีกิจกรรม` : undefined}
                  onClick={() => onSelect(on ? undefined : c.key)}
                  className={`num relative mx-auto flex size-11 flex-col items-center justify-center rounded-full text-[15px] ${has ? 'pressable' : ''} ${
                    on ? 'bg-ink font-semibold text-bg' : has ? 'font-semibold text-ink' : 'text-ink/70'
                  } ${c.key === today && !on ? 'ring-[1.5px] ring-muted ring-inset' : ''}`}
                >
                  {c.day}
                  {has && <span className={`absolute bottom-1.5 size-1 rounded-full ${on ? 'bg-bg' : 'bg-accent'}`} />}
                </button>
              )
            })}
        </div>
      </div>
    </section>
  )
}
