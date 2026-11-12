import { useEffect, useState, type CSSProperties } from 'react'
import { KPI_ACTIVITIES } from '../../../config'
import type { CategoryRow, OrgRow } from '../../../lib/home'
import { Counter } from '../../../ui/Counter'
import { StatusTag } from '../../../ui/StatusTag'
import { STAT_HEADING } from './OverviewStats'
import { CARD } from './parts'

const n = (v: number) => v.toLocaleString('th-TH')
const hoursText = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 })
const delay = (ms: number): CSSProperties => ({ '--d': `${ms}ms` }) as CSSProperties

/** The centre's yearly target: activities started this activity year against KPI_ACTIVITIES, as a big number and a plain bar. */
export function TargetCard({ label, count }: { label: number; count: number }) {
  const left = KPI_ACTIVITIES - count
  const pct = Math.min(100, Math.max(0, (count / KPI_ACTIVITIES) * 100))
  // Starts empty and fills a beat after mounting, with a plain CSS transition so it plays with Reduce Motion on.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setShown(pct), 120)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <section className={`rise ${CARD} p-5`} style={delay(20)} aria-label="เป้าหมายปีการศึกษา">
      <p className="text-sm text-muted">เป้าหมายปีการศึกษา {label}</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5">
        <Counter value={count} className="text-[52px] leading-none font-semibold tracking-tight" />
        <span className="num text-base text-ink/80">จาก {n(KPI_ACTIVITIES)} กิจกรรม</span>
      </p>
      <div
        role="progressbar"
        aria-label="กิจกรรมที่จัดแล้วเทียบเป้าหมาย"
        aria-valuemin={0}
        aria-valuemax={KPI_ACTIVITIES}
        aria-valuenow={Math.min(count, KPI_ACTIVITIES)}
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full w-full origin-left rounded-full bg-ink" style={{ transform: `scaleX(${shown / 100})`, transition: 'transform 900ms var(--ease-out)' }} />
      </div>
      <p className={`num mt-2.5 text-right text-[13.5px] ${left > 0 ? 'text-muted' : 'font-semibold text-ok'}`}>{left > 0 ? `อีก ${n(left)} กิจกรรม` : 'ถึงเป้าแล้ว'}</p>
    </section>
  )
}

const ROW = 'flex min-h-16 items-center justify-between gap-3 px-5 py-3.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line'

/** Per organisation: its activities this year, the people who got hours, and how many rosters wait for the centre. */
export function OrgSection({ rows }: { rows: OrgRow[] }) {
  if (!rows.length) return null
  return (
    <>
      <div className={STAT_HEADING} style={delay(180)}>
        <h2 className="text-xl font-semibold">แยกตามหน่วยงาน</h2>
      </div>
      <ul className={`rise ${CARD}`} style={delay(200)}>
        {rows.map((r) => (
          <li key={r.orgCode} className={ROW}>
            <span className="min-w-0 flex-1">
              <span className="block text-base leading-snug font-semibold">{r.name}</span>
              <span className="num mt-0.5 flex flex-wrap gap-x-3 text-[13.5px] text-muted">
                <span>{n(r.activities)} กิจกรรม</span>
                <span>ผู้ได้รับชั่วโมง {n(r.people)} คน</span>
              </span>
            </span>
            {r.waiting > 0 && <StatusTag stage="waiting" tone="warn" size="sm" label={`รอบันทึก ${n(r.waiting)}`} />}
          </li>
        ))}
      </ul>
    </>
  )
}

/** Per category: its activities this year and the hours issued. The hours are left out until they have loaded. */
export function CategorySection({ rows }: { rows: CategoryRow[] }) {
  if (!rows.length) return null
  return (
    <>
      <div className={STAT_HEADING} style={delay(220)}>
        <h2 className="text-xl font-semibold">แยกตามหมวด</h2>
      </div>
      <ul className={`rise ${CARD}`} style={delay(240)}>
        {rows.map((r) => (
          <li key={r.key} className={ROW}>
            <span className="min-w-0 flex-1">
              <span className="block text-base leading-snug font-semibold">{r.label}</span>
              <span className="num mt-0.5 flex flex-wrap gap-x-3 text-[13.5px] text-muted">
                <span>{n(r.activities)} กิจกรรม</span>
                {r.hours !== undefined && <span>ชั่วโมงที่ออกให้ {hoursText(r.hours)}</span>}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
