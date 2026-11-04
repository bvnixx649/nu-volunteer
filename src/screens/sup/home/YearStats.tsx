import { activityYear, type YearStats as Stats } from '../../../lib/home'
import { thDate } from '../../../lib/format'
import { Counter } from '../../../ui/Counter'

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[var(--radius-field)] bg-surface-2 px-4 py-3.5">
      <Counter value={value} className="block text-4xl leading-none font-bold tracking-tight" />
      <p className="mt-1.5 text-sm text-muted">{label}</p>
    </div>
  )
}

/** Activity-year numbers, from the activity documents only. */
export function YearStats({ stats, now }: { stats: Stats; now: number }) {
  const y = activityYear(now)
  return (
    <section>
      <h2 className="text-lg font-semibold">ปีกิจกรรม {stats.label}</h2>
      <p className="num mt-1 mb-3 text-sm text-muted">
        {thDate(y.start)} ถึง {thDate(y.end - 1)}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Stat value={stats.activities} label="กิจกรรม" />
        <Stat value={stats.people} label="คนได้ชั่วโมง" />
      </div>
    </section>
  )
}
