import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CalendarBlank, Plus, SignOut, X } from '@phosphor-icons/react'
import { api, now as serverNow } from '../../data/api'
import type { Activity } from '../../data/types'
import { thDate } from '../../lib/format'
import { busyDays, liveNow, onDay, orderedActivities, visibleTo, yearStats } from '../../lib/home'
import { Sheet } from '../../ui/Sheet'
import { useDevice } from '../../store'
import { ActivityList } from './home/ActivityList'
import { LiveCards } from './home/LiveCards'
import { MonthCalendar } from './home/MonthCalendar'
import { YearStats } from './home/YearStats'

const iconBtn = 'pressable relative grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2'

/** Supervisor home: what is running now, every activity in one list with its status, and the activity-year numbers. */
export default function SupHome() {
  const { sup, clearSup } = useDevice()
  const [list, setList] = useState<Activity[] | null>(null)
  const [tick, setTick] = useState(0)
  const [cal, setCal] = useState(() => {
    const d = new Date(serverNow())
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [calOpen, setCalOpen] = useState(false)
  const [day, setDay] = useState<string>()
  const pickDay = (key?: string) => {
    setDay(key)
    if (key) setCalOpen(false)
  }
  useEffect(() => api.watchActivities(setList), [])
  // Stages change with the clock, so look again every 30 seconds.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const now = useMemo(() => serverNow(), [list, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMemo(() => (sup && list ? visibleTo(list, sup) : []), [list, sup])
  const view = useMemo(
    () => ({
      live: liveNow(mine, now),
      busy: busyDays(mine),
      stats: yearStats(mine, now),
      rows: orderedActivities(day ? onDay(mine, day) : mine, now),
    }),
    [mine, now, day],
  )

  if (!sup) return <Navigate to="/sup/login" replace />
  const dayStart = day ? new Date(`${day}T00:00:00`).getTime() : 0
  const base = import.meta.env.BASE_URL

  return (
    <main className="mx-auto max-w-2xl px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <header className="flex items-center gap-3">
        <img src={`${base}nu-emblem.png`} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="leading-tight font-semibold">ศูนย์จิตอาสา</p>
          <p className="text-[13px] leading-tight text-muted">กองกิจการนิสิต มหาวิทยาลัยนเรศวร</p>
        </div>
        <button onClick={() => setCalOpen(true)} className={iconBtn} aria-label="ปฏิทิน">
          <CalendarBlank size={22} />
          {day && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-accent" />}
        </button>
        <button onClick={clearSup} className={iconBtn} aria-label="ออกจากระบบ">
          <SignOut size={22} />
        </button>
      </header>

      <div className="mt-6 flex flex-col gap-10">
        <LiveCards list={view.live} showOrg={sup.admin} />

        <div>
          {day && (
            <button
              onClick={() => setDay(undefined)}
              className="pressable num mb-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-2 pr-3 pl-4 text-[15px] font-medium"
              aria-label={`ล้างตัวกรองวันที่ ${thDate(dayStart)}`}
            >
              {thDate(dayStart)}
              <span className="inline-flex items-center gap-1 text-muted">
                ล้าง <X size={14} weight="bold" />
              </span>
            </button>
          )}
          <ActivityList list={view.rows} showOrg={sup.admin} now={now} />
          {list && !view.rows.length && (day || !mine.length) && (
            <p className="rounded-[var(--radius-card)] bg-surface px-5 py-8 text-center text-muted">
              {day ? 'ไม่มีกิจกรรมอื่นในวันนี้' : 'ยังไม่มีกิจกรรม กดปุ่ม + เพื่อสร้างกิจกรรม'}
            </p>
          )}
        </div>

        {list && <YearStats stats={view.stats} now={now} />}
      </div>

      <Link
        to="/sup/new"
        aria-label="สร้างกิจกรรม"
        className="pressable fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] z-30 grid size-14 place-items-center rounded-full bg-ink text-bg shadow-lift"
      >
        <Plus size={26} weight="bold" />
      </Link>

      <Sheet open={calOpen} onClose={() => setCalOpen(false)} title="เลือกวัน">
        <MonthCalendar
          year={cal.year}
          month={cal.month}
          onMonth={(year, month) => setCal({ year, month })}
          busy={view.busy}
          selected={day}
          onSelect={pickDay}
          now={now}
        />
      </Sheet>
    </main>
  )
}
