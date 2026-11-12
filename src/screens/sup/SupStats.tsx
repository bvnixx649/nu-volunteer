import { useEffect, useMemo, useState } from 'react'
import { api } from '../../data/api'
import { breakdownIds, categoryBreakdown, orgBreakdown, yearOverview } from '../../lib/home'
import { BackBar } from '../../ui/BackBar'
import { CategorySection, OrgSection, TargetCard } from './home/AdminStats'
import { OverviewStats } from './home/OverviewStats'
import { useSupActivities } from './home/useSupActivities'

/** Statistics tab: the activity year in numbers, from the supervisor's own activities, or every org's for the centre admin. */
export default function SupStats() {
  const { sup, mine, now } = useSupActivities()
  const admin = !!sup?.admin
  const overview = useMemo(() => yearOverview(mine, now), [mine, now])
  const orgs = useMemo(() => (admin ? orgBreakdown(mine, now) : []), [admin, mine, now])

  // Hours come from the credits, one read for the whole year. Read again only when the set of activities changes.
  const ids = useMemo(() => (admin ? breakdownIds(mine, now) : []), [admin, mine, now])
  const key = ids.slice().sort().join(',')
  const [hours, setHours] = useState<Record<string, number>>()
  useEffect(() => {
    if (!admin || !ids.length) return
    let alive = true
    api
      .creditHours(ids)
      .then((byId) => alive && setHours(byId))
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, key])
  const categories = useMemo(() => (admin ? categoryBreakdown(mine, now, hours) : []), [admin, mine, now, hours])

  if (!sup) return null
  return (
    <main className="mx-auto max-w-lg px-4 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-4">
      <BackBar fallback="/sup/me" />
      <h1 className="rise mt-2 px-1 text-[28px] leading-tight font-bold tracking-tight">สถิติ</h1>
      <OverviewStats o={overview} lead={admin && <TargetCard label={overview.label} count={overview.activities} />}>
        {admin && (
          <>
            <OrgSection rows={orgs} />
            <CategorySection rows={categories} />
          </>
        )}
      </OverviewStats>
    </main>
  )
}
