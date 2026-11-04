import type { CSSProperties } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import type { YearStats as Stats } from '../../../lib/home'
import { Counter } from '../../../ui/Counter'

const tile = 'rounded-[18px] border border-white/[0.06] bg-surface p-3.5'

/** Academic-year numbers in three small tiles, from the activity documents only. Never a total of hours. */
export function YearStats({ stats }: { stats: Stats }) {
  return (
    <section className="rise" style={{ '--d': '320ms' } as CSSProperties} aria-label={`ปีการศึกษา ${stats.label}`}>
      <div className="flex items-baseline justify-between px-1 pb-3">
        <h2 className="text-[19px] font-semibold">ปีการศึกษา {stats.label}</h2>
        <Link to="/sup/overview" className="pressable -my-3 inline-flex min-h-11 items-center pl-3 text-sm">
          ดูสถิติทั้งหมด <CaretRight size={16} />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={tile}>
          <Counter value={stats.activities} className="block text-[26px] leading-tight font-semibold tracking-[-0.03em]" />
          <p className="text-[12.5px] text-muted">กิจกรรม</p>
        </div>
        <div className={tile}>
          <Counter value={stats.people} className="block text-[26px] leading-tight font-semibold tracking-[-0.03em]" />
          <p className="text-[12.5px] text-muted">ผู้ได้รับชั่วโมง</p>
        </div>
        <div className={tile}>
          <p className="num text-[26px] leading-tight font-semibold tracking-[-0.03em] text-ok">{stats.kpi === null ? '-' : `${stats.kpi}%`}</p>
          <p className="text-[12.5px] text-muted">เข้าร่วมจริง</p>
        </div>
      </div>
    </section>
  )
}
