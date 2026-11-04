import { useMemo } from 'react'
import { yearOverview } from '../../lib/home'
import { OverviewStats } from './home/OverviewStats'
import { useSupActivities } from './home/useSupActivities'

/** Statistics tab: the activity year in numbers, from the supervisor's own activities. */
export default function SupStats() {
  const { sup, mine, now } = useSupActivities()
  const overview = useMemo(() => yearOverview(mine, now), [mine, now])
  if (!sup) return null
  return (
    <main className="mx-auto max-w-lg px-4 pt-[calc(1.625rem+env(safe-area-inset-top,0px))] pb-4">
      <h1 className="rise px-1 text-[26px] font-semibold">สถิติ</h1>
      <OverviewStats o={overview} />
    </main>
  )
}
