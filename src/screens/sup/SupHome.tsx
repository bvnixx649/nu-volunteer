import { useMemo } from 'react'
import { adminGroups, groupActivities, liveNow, orderedActivities, splitUpcoming } from '../../lib/home'
import { ActivityList } from './home/ActivityList'
import { HeroCard } from './home/HeroCard'
import { LiveCards } from './home/LiveCards'
import { CARD } from './home/parts'
import { useSupActivities } from './home/useSupActivities'

/**
 * Supervisor home (first tab): what is running now, or the next activity when nothing is, then what needs the
 * supervisor and what is coming. Calendar, statistics and the account have their own tabs; creating an activity
 * is the raised button in the middle of the tab bar.
 */
export default function SupHome() {
  const { sup, list, mine, now } = useSupActivities()
  const view = useMemo(() => {
    const live = liveNow(mine, now)
    // The admin sees every org's activities (`mine` is already that), split by who has to act next.
    const a = sup?.admin ? adminGroups(mine, sup, now) : undefined
    const groups = a ? { todo: a.todo, upcoming: a.upcoming, sent: a.done } : groupActivities(orderedActivities(mine, now), now)
    return { live, groups, split: splitUpcoming(groups.upcoming, live.length > 0), admin: a && { waiting: a.waiting, unsent: a.unsent } }
  }, [mine, now, sup])

  if (!sup) return null
  const base = import.meta.env.BASE_URL
  const empty = !!list && !view.live.length && !view.admin?.waiting.length && !view.admin?.unsent.length && !view.groups.todo.length && !view.groups.upcoming.length && !view.groups.sent.length

  return (
    <main className="mx-auto max-w-lg px-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-4">
      <header className="rise flex items-center gap-3 px-1">
        <img src={`${base}nu-emblem.png`} alt="ตรามหาวิทยาลัยนเรศวร" width={44} height={44} className="size-11 shrink-0 rounded-full bg-ink p-[3px]" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] leading-[1.3] font-semibold">{sup.orgName}</h1>
          <p className="truncate text-[13.5px] text-muted">ผู้ดูแล {sup.name}</p>
        </div>
      </header>

      <div className="mt-5 flex flex-col gap-8">
        <LiveCards list={view.live} showOrg={sup.admin} />
        {view.split.hero && <HeroCard a={view.split.hero} now={now} showOrg={sup.admin} />}
        <ActivityList groups={view.groups} split={view.split} showOrg={sup.admin} now={now} admin={view.admin} />
        {empty && <p className={`${CARD} px-5 py-8 text-center text-muted`}>ยังไม่มีกิจกรรม กดสร้างกิจกรรมเพื่อเริ่ม</p>}
      </div>
    </main>
  )
}
