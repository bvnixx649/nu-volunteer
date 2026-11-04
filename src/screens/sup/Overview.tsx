import { useEffect, useId, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CaretLeft } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { api, now as serverNow } from '../../data/api'
import type { Activity } from '../../data/types'
import { thTime } from '../../lib/format'
import { countInMonth, dayKey, onDay, stagesByDay, TH_MONTHS, visibleTo, yearOverview } from '../../lib/home'
import { stage } from '../../lib/stage'
import { STAGE_DOT, StatusTag } from '../../ui/StatusTag'
import { useDevice } from '../../store'
import { OverviewCalendar } from './home/OverviewCalendar'
import { OverviewStats } from './home/OverviewStats'

type Tab = 'cal' | 'stats'
const TABS: { value: Tab; label: string }[] = [
  { value: 'cal', label: 'ปฏิทิน' },
  { value: 'stats', label: 'สถิติ' },
]

/** Two tabs, ปฏิทิน and สถิติ, with a thumb that slides to the chosen one. */
function Tabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const id = useId()
  return (
    <div role="tablist" aria-label="มุมมอง" className="grid grid-cols-2 gap-1 rounded-full border border-white/5 bg-surface p-1">
      {TABS.map((t) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={`pressable relative h-10 rounded-full text-[15px] transition-colors duration-200 ${on ? 'font-semibold text-ink' : 'text-muted'}`}
          >
            {on && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-full bg-[#34312d] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.35)]"
                transition={{ type: 'spring', duration: 0.35, bounce: 0.12 }}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Calendar and statistics for the supervisor's activities, one page with two tabs. */
export default function Overview() {
  const sup = useDevice((s) => s.sup)
  const [list, setList] = useState<Activity[] | null>(null)
  const [tab, setTab] = useState<Tab>('cal')
  const [cal, setCal] = useState(() => {
    const d = new Date(serverNow())
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  /** undefined: nobody has picked yet, so today (if it has activities) is shown. null: picked nothing on purpose. */
  const [picked, setPicked] = useState<string | null>()
  useEffect(() => api.watchActivities(setList), [])

  const now = useMemo(() => serverNow(), [list]) // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMemo(() => (sup && list ? visibleTo(list, sup) : []), [list, sup])
  const stages = useMemo(() => stagesByDay(mine, now), [mine, now])
  const overview = useMemo(() => yearOverview(mine, now), [mine, now])

  if (!sup) return <Navigate to="/sup/login" replace />
  const today = dayKey(now)
  const day = picked === undefined ? (stages.has(today) ? today : undefined) : (picked ?? undefined)
  const dayList = day ? onDay(mine, day).sort((a, b) => a.start - b.start) : []
  const dayDate = day ? new Date(`${day}T00:00:00`) : undefined

  return (
    <main className="mx-auto max-w-lg px-4 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center gap-2 pr-3">
        <Link to="/sup" aria-label="กลับหน้าแรก" className="pressable grid size-11 shrink-0 place-items-center rounded-full">
          <CaretLeft size={24} />
        </Link>
        <h1 className="text-xl font-semibold">ภาพรวมกิจกรรม</h1>
      </div>

      <div className="mt-3">
        <Tabs value={tab} onChange={setTab} />
      </div>

      {tab === 'cal' ? (
        <div role="tabpanel" aria-label="ปฏิทิน">
          <div className="mt-4">
            <OverviewCalendar
              year={cal.year}
              month={cal.month}
              onMonth={(year, month) => {
                setCal({ year, month })
                setPicked(null)
              }}
              stages={stages}
              count={countInMonth(mine, cal.year, cal.month)}
              selected={day}
              onSelect={(key) => setPicked(day === key ? null : key)}
              now={now}
            />
          </div>

          {dayDate ? (
            <>
              <div className="flex items-baseline justify-between px-1 pt-[22px] pb-2.5">
                <h2 className="text-[17px] font-semibold">
                  วันที่ {dayDate.getDate()} {TH_MONTHS[dayDate.getMonth()]} {dayDate.getFullYear() + 543}
                </h2>
                <span className="num text-[13px] text-muted">{dayList.length} กิจกรรม</span>
              </div>
              <ul className="overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface">
                {dayList.map((a, i) => {
                  const s = stage(a, now)
                  return (
                    <li key={a.id} className={i ? 'border-t border-white/5' : ''}>
                      <Link to={`/sup/a/${a.id}`} className="pressable flex items-center gap-3 px-4 py-3.5">
                        <span className="w-1 shrink-0 self-stretch rounded-full" style={{ background: STAGE_DOT[s] }} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15.5px] font-semibold">{a.title}</span>
                          <span className="num block text-[13px] text-muted">
                            {thTime(a.start)} ถึง {thTime(a.end)} น.
                          </span>
                        </span>
                        <StatusTag stage={s} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="mt-[22px] rounded-[22px] border border-white/[0.06] bg-surface px-4 py-[22px] text-center text-sm text-muted">แตะวันที่มีจุดเพื่อดูกิจกรรม</p>
          )}
        </div>
      ) : (
        <div role="tabpanel" aria-label="สถิติ">
          <OverviewStats o={overview} />
        </div>
      )}
    </main>
  )
}
