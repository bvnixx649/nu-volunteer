import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Plus, SignOut } from '@phosphor-icons/react'
import { api, now as serverNow } from '../../data/api'
import type { Activity } from '../../data/types'
import { thDate } from '../../lib/format'
import { busyDays, groupByStatus, liveNow, onDay, todos, visibleTo, yearStats } from '../../lib/home'
import { Button } from '../../ui/Button'
import { useDevice } from '../../store'
import { ActivityGroups } from './home/ActivityGroups'
import { LiveCards } from './home/LiveCards'
import { MonthCalendar } from './home/MonthCalendar'
import { TodoList } from './home/TodoList'
import { YearStats } from './home/YearStats'

/** Supervisor home: what to do next, the calendar, activity-year numbers, and activities by status. */
export default function SupHome() {
  const { sup, clearSup } = useDevice()
  const [list, setList] = useState<Activity[] | null>(null)
  const [tick, setTick] = useState(0)
  const [cal, setCal] = useState(() => {
    const d = new Date(serverNow())
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [day, setDay] = useState<string>()
  const listRef = useRef<HTMLDivElement>(null)
  // On a phone the list sits below the calendar, so picking a day brings the filtered list into view.
  const pickDay = (key?: string) => {
    setDay(key)
    if (key) requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  useEffect(() => api.watchActivities(setList), [])
  // Stages change with the clock, so look again every 30 seconds.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const now = useMemo(() => serverNow(), [list, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMemo(() => (sup && list ? visibleTo(list, sup) : []), [list, sup])
  const view = useMemo(() => {
    const shown = day ? onDay(mine, day) : mine
    return {
      live: liveNow(mine, now),
      todo: todos(mine, now),
      busy: busyDays(mine),
      stats: yearStats(mine, now),
      groups: groupByStatus(shown, now),
    }
  }, [mine, now, day])

  if (!sup) return <Navigate to="/sup/login" replace />
  const dayStart = day ? new Date(`${day}T00:00:00`).getTime() : 0

  return (
    <main className="mx-auto max-w-2xl px-5 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-12 min-[900px]:max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted">{sup.orgName}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">สวัสดี {sup.name}</h1>
        </div>
        <button onClick={clearSup} className="pressable flex items-center gap-1.5 rounded-full px-3 py-2 text-muted" aria-label="ออกจากระบบ">
          <SignOut size={20} />
        </button>
      </div>

      <div className="mt-8 grid gap-y-10 min-[900px]:grid-cols-[minmax(0,1fr)_22rem] min-[900px]:gap-x-12">
        <div className="flex flex-col gap-10 min-[900px]:col-start-1 min-[900px]:row-start-1">
          <Link
            to="/sup/new"
            className="pressable inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-accent-strong px-7 text-[17px] font-semibold text-on-accent shadow-soft"
          >
            <Plus size={22} weight="bold" />
            สร้างกิจกรรม
          </Link>
          <LiveCards list={view.live} showOrg={sup.admin} />
          <TodoList rows={view.todo} showOrg={sup.admin} />
        </div>

        <div className="min-[900px]:col-start-2 min-[900px]:row-start-1">
          <MonthCalendar
            year={cal.year}
            month={cal.month}
            onMonth={(year, month) => setCal({ year, month })}
            busy={view.busy}
            selected={day}
            onSelect={pickDay}
            now={now}
          />
        </div>

        <div ref={listRef} className="scroll-mt-4 min-[900px]:col-start-1 min-[900px]:row-start-2">
          {day && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="num text-lg font-semibold">กิจกรรมวันที่ {thDate(dayStart)}</p>
              <Button variant="secondary" onClick={() => setDay(undefined)}>
                ดูทั้งหมด
              </Button>
            </div>
          )}
          <ActivityGroups groups={view.groups} showOrg={sup.admin} />
          {list && !view.groups.length && (day || !mine.length) && (
            <p className="rounded-[var(--radius-card)] bg-surface px-5 py-8 text-center text-muted">
              {day ? 'ไม่มีกิจกรรมอื่นในวันนี้' : 'ยังไม่มีกิจกรรม กดสร้างกิจกรรมเพื่อเริ่ม'}
            </p>
          )}
        </div>

        {list && (
          <div className="min-[900px]:col-start-2 min-[900px]:row-start-2 min-[900px]:self-start">
            <YearStats stats={view.stats} now={now} />
          </div>
        )}
      </div>
    </main>
  )
}
