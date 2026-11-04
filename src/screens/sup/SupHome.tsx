import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from '@phosphor-icons/react'
import { groupActivities, liveNow, orderedActivities, splitUpcoming } from '../../lib/home'
import { ActivityList } from './home/ActivityList'
import { HeroCard } from './home/HeroCard'
import { LiveCards } from './home/LiveCards'
import { useSupActivities } from './home/useSupActivities'

/**
 * Supervisor home (first tab): what is running now, or the next activity when nothing is, then what needs the
 * supervisor and what is coming. Calendar, statistics and the account have their own tabs.
 */
export default function SupHome() {
  const { sup, list, mine, now } = useSupActivities()
  const view = useMemo(() => {
    const live = liveNow(mine, now)
    const groups = groupActivities(orderedActivities(mine, now), now)
    return { live, groups, split: splitUpcoming(groups.upcoming, live.length > 0) }
  }, [mine, now])

  if (!sup) return null
  const base = import.meta.env.BASE_URL
  const empty = !!list && !view.live.length && !view.groups.todo.length && !view.groups.upcoming.length && !view.groups.sent.length

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="absolute -top-44 -left-36 size-[440px] rounded-full bg-[radial-gradient(closest-side,rgba(92,196,141,0.10),rgba(92,196,141,0))]" />
      </div>

      <main className="relative mx-auto max-w-lg px-4 pt-[calc(1.375rem+env(safe-area-inset-top,0px))] pb-24">
        <header className="rise flex items-center gap-3 px-1">
          <img
            src={`${base}nu-emblem.png`}
            alt="ตรามหาวิทยาลัยนเรศวร"
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-full bg-white p-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] leading-[1.3] font-semibold">{sup.orgName}</h1>
            <p className="truncate text-[13px] text-muted">ผู้ดูแล {sup.name}</p>
          </div>
        </header>

        <div className="mt-5 flex flex-col gap-7">
          <LiveCards list={view.live} showOrg={sup.admin} />
          {view.split.hero && <HeroCard a={view.split.hero} now={now} showOrg={sup.admin} />}
          <ActivityList groups={view.groups} split={view.split} showOrg={sup.admin} now={now} />
          {empty && <p className="rounded-[22px] border border-white/[0.06] bg-surface px-5 py-8 text-center text-muted">ยังไม่มีกิจกรรม กดสร้างกิจกรรมเพื่อเริ่ม</p>}
        </div>
      </main>

      {/* Floats above the tab bar (64px bar + 8px padding + safe area), kept inside the centred column. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-30">
        <div className="mx-auto flex max-w-lg justify-end px-4">
          <Link
            to="/sup/new"
            className="pressable pointer-events-auto inline-flex h-14 items-center gap-2 rounded-full bg-ink pr-[22px] pl-[18px] text-base font-semibold text-bg shadow-[0_12px_28px_-8px_rgba(0,0,0,0.8)]"
          >
            <Plus size={22} weight="bold" aria-hidden />
            สร้างกิจกรรม
          </Link>
        </div>
      </div>
    </div>
  )
}
