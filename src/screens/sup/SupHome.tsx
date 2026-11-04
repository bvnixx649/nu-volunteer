import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CalendarBlank, DotsThree, Plus, SignOut } from '@phosphor-icons/react'
import { api, now as serverNow } from '../../data/api'
import type { Activity } from '../../data/types'
import { liveNow, orderedActivities, visibleTo, yearStats } from '../../lib/home'
import { Sheet } from '../../ui/Sheet'
import { useDevice } from '../../store'
import { ActivityList } from './home/ActivityList'
import { LiveCards } from './home/LiveCards'
import { YearStats } from './home/YearStats'

const roundBtn = 'pressable grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'

/**
 * Supervisor home: what is running now, what needs the supervisor, what is coming, and the academic-year
 * numbers. The calendar and the full statistics are one tap away on /sup/overview.
 */
export default function SupHome() {
  const { sup, clearSup } = useDevice()
  const [list, setList] = useState<Activity[] | null>(null)
  const [tick, setTick] = useState(0)
  const [menu, setMenu] = useState(false)
  useEffect(() => api.watchActivities(setList), [])
  // Stages change with the clock, so look again every 30 seconds.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const now = useMemo(() => serverNow(), [list, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMemo(() => (sup && list ? visibleTo(list, sup) : []), [list, sup])
  const view = useMemo(
    () => ({ live: liveNow(mine, now), stats: yearStats(mine, now), rows: orderedActivities(mine, now) }),
    [mine, now],
  )

  if (!sup) return <Navigate to="/sup/login" replace />
  const base = import.meta.env.BASE_URL
  const empty = !!list && !view.live.length && !view.rows.length

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="absolute -top-44 -left-36 size-[440px] rounded-full bg-[radial-gradient(closest-side,rgba(92,196,141,0.10),rgba(92,196,141,0))]" />
      </div>

      <main className="relative mx-auto max-w-lg px-5 pt-[calc(1.375rem+env(safe-area-inset-top,0px))] pb-[calc(7rem+env(safe-area-inset-bottom,0px))] min-[900px]:max-w-5xl">
        <header className="rise flex items-center gap-3">
          <img
            src={`${base}nu-emblem.png`}
            alt="ตรามหาวิทยาลัยนเรศวร"
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full bg-white p-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] leading-tight font-semibold">{sup.orgName}</h1>
            <p className="truncate text-[13px] text-muted">ผู้ดูแล {sup.name}</p>
          </div>
          <Link to="/sup/overview" aria-label="ปฏิทินและสถิติ" className={roundBtn}>
            <CalendarBlank size={22} />
          </Link>
          <button type="button" aria-label="เมนู" onClick={() => setMenu(true)} className={roundBtn}>
            <DotsThree size={24} weight="bold" />
          </button>
        </header>

        {/* One column on a phone: live, lists, year. From 900px: live and year on the left, the lists on the right. */}
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-8 min-[900px]:grid-cols-2 min-[900px]:items-start">
          {view.live.length > 0 && <LiveCards list={view.live} showOrg={sup.admin} />}
          <div className="flex flex-col gap-8 min-[900px]:col-start-2 min-[900px]:row-span-2 min-[900px]:row-start-1">
            <ActivityList list={view.rows} showOrg={sup.admin} now={now} />
            {empty && <p className="rounded-[22px] border border-white/[0.06] bg-surface px-5 py-8 text-center text-muted">ยังไม่มีกิจกรรม กดสร้างกิจกรรมเพื่อเริ่ม</p>}
          </div>
          {list && <YearStats stats={view.stats} />}
        </div>
      </main>

      <Link
        to="/sup/new"
        className="pressable fixed right-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-30 inline-flex h-14 items-center gap-2 rounded-full bg-ink pr-[22px] pl-[18px] text-base font-semibold text-bg shadow-[0_12px_28px_-8px_rgba(0,0,0,0.8)]"
      >
        <Plus size={22} weight="bold" aria-hidden />
        สร้างกิจกรรม
      </Link>

      <Sheet open={menu} onClose={() => setMenu(false)} title="เมนู">
        <p className="mb-4 text-muted">
          {sup.orgName} <br />
          ผู้ดูแล {sup.name}
        </p>
        <button
          type="button"
          onClick={() => {
            setMenu(false)
            clearSup()
          }}
          className="pressable flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-field)] bg-surface-2 px-4 text-left font-semibold text-bad"
        >
          <SignOut size={22} /> ออกจากระบบ
        </button>
      </Sheet>
    </div>
  )
}
