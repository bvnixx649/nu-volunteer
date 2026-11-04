import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { dayKey, monthGrid, TH_MONTHS, TH_WEEKDAYS } from '../../../lib/home'
import type { Stage } from '../../../lib/stage'
import { STAGE_DOT } from '../../../ui/StatusTag'

type Props = {
  /** First day of the month shown: the year and month are what count. */
  year: number
  month: number
  onMonth: (year: number, month: number) => void
  /** Stages of the activities starting on each day: one dot per activity, coloured by stage. */
  stages: Map<string, Stage[]>
  count: number
  selected?: string
  onSelect: (key: string) => void
  now: number
}

const stepBtn = 'pressable grid size-11 place-items-center rounded-full text-ink hover:bg-white/5'

/** A month in a double-bezel card: dots on the days an activity starts, today outlined, only busy days tappable. */
export function OverviewCalendar({ year, month, onMonth, stages, count, selected, onSelect, now }: Props) {
  const today = dayKey(now)
  const step = (d: number) => {
    const next = new Date(year, month + d, 1)
    onMonth(next.getFullYear(), next.getMonth())
  }
  return (
    <section className="rise rounded-[30px] border border-white/[0.06] bg-white/[0.03] p-1.5" aria-label="ปฏิทินกิจกรรม">
      <div className="rounded-3xl bg-gradient-to-b from-[#25231f] to-[#1c1a18] px-3 pt-3.5 pb-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
        <div className="flex items-center justify-between px-1">
          <button type="button" onClick={() => step(-1)} aria-label="เดือนก่อน" className={stepBtn}>
            <CaretLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-[17px] font-semibold">
              {TH_MONTHS[month]} {year + 543}
            </h2>
            <p className="num text-[12.5px] text-muted">{count ? `${count} กิจกรรม` : 'ไม่มีกิจกรรม'}</p>
          </div>
          <button type="button" onClick={() => step(1)} aria-label="เดือนถัดไป" className={stepBtn}>
            <CaretRight size={20} />
          </button>
        </div>
        <div className="mt-1.5 grid grid-cols-7 text-center text-xs text-muted" aria-hidden>
          {TH_WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-0.5">
          {monthGrid(year, month)
            .flat()
            .map((c, i) => {
              if (!c) return <span key={i} className="h-[46px]" />
              const st = stages.get(c.key) ?? []
              const has = st.length > 0
              const on = selected === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  disabled={!has}
                  aria-pressed={has ? on : undefined}
                  aria-label={has ? `วันที่ ${c.day} ${TH_MONTHS[month]} มี ${st.length} กิจกรรม` : undefined}
                  onClick={() => onSelect(c.key)}
                  className={`num flex h-[46px] flex-col items-center justify-center rounded-[14px] text-[15px] ${has ? 'pressable' : ''} ${
                    on ? 'bg-ink font-semibold text-bg' : has ? 'text-ink' : 'text-[#6f6a63]'
                  } ${c.key === today && !on ? 'shadow-[inset_0_0_0_1.5px_rgba(242,112,42,0.7)]' : ''}`}
                >
                  {c.day}
                  <span className="mt-[3px] flex h-[5px] gap-[3px]" aria-hidden>
                    {st.slice(0, 3).map((s, k) => (
                      <i key={k} className="size-[5px] rounded-full" style={{ background: on ? 'var(--color-bg)' : STAGE_DOT[s] }} />
                    ))}
                  </span>
                </button>
              )
            })}
        </div>
      </div>
    </section>
  )
}
