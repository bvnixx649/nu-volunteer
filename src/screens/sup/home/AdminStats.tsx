import { useEffect, useState, type CSSProperties } from 'react'
import { KPI_ACTIVITIES } from '../../../config'
import type { CategoryRow, OrgRow } from '../../../lib/home'
import { Counter } from '../../../ui/Counter'
import { StatusTag } from '../../../ui/StatusTag'

const n = (v: number) => v.toLocaleString('th-TH')
const hoursText = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 })
const delay = (ms: number): CSSProperties => ({ '--d': `${ms}ms` }) as CSSProperties

/** The centre's yearly target: activities started this activity year against KPI_ACTIVITIES, as a big number and an orange bar. */
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
    <section className="rise rounded-[30px] border border-white/[0.06] bg-white/[0.03] p-1.5" style={delay(20)} aria-label="เป้าหมายปีการศึกษา">
      <div
        className="rounded-3xl p-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
        style={{ backgroundImage: 'radial-gradient(120% 80% at 100% 0%, rgba(242,112,42,0.16), rgba(242,112,42,0) 55%), linear-gradient(180deg, #25231f, #1c1a18)' }}
      >
        <p className="text-sm text-ink/80">เป้าหมายปีการศึกษา {label}</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5">
          <Counter value={count} className="text-[52px] leading-none font-semibold tracking-[-0.045em]" />
          <span className="num text-base text-ink/80">จาก {n(KPI_ACTIVITIES)} กิจกรรม</span>
        </p>
        <div
          role="progressbar"
          aria-label="กิจกรรมที่จัดแล้วเทียบเป้าหมาย"
          aria-valuemin={0}
          aria-valuemax={KPI_ACTIVITIES}
          aria-valuenow={Math.min(count, KPI_ACTIVITIES)}
          className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.08]"
        >
          <div className="h-full w-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${shown / 100})`, transition: 'transform 900ms cubic-bezier(0.23,1,0.32,1)' }} />
        </div>
        <p className={`num mt-2 text-right text-[13px] ${left > 0 ? 'text-muted' : 'font-semibold text-ok'}`}>{left > 0 ? `อีก ${n(left)} กิจกรรม` : 'ถึงเป้าแล้ว'}</p>
      </div>
    </section>
  )
}

const ROW = 'flex min-h-16 items-center justify-between gap-3 px-4 py-3.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-white/5'

/** Per organisation: its activities this year, the people who got hours, and how many rosters wait for the centre. */
export function OrgSection({ rows }: { rows: OrgRow[] }) {
  if (!rows.length) return null
  return (
    <>
      <h2 className="rise px-1 pt-6 pb-2.5 text-[17px] font-semibold" style={delay(180)}>
        แยกตามหน่วยงาน
      </h2>
      <ul className="rise overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface" style={delay(200)}>
        {rows.map((r) => (
          <li key={r.orgCode} className={ROW}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15.5px] font-semibold">{r.name}</span>
              <span className="num mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-muted">
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
      <h2 className="rise px-1 pt-6 pb-2.5 text-[17px] font-semibold" style={delay(220)}>
        แยกตามหมวด
      </h2>
      <ul className="rise overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface" style={delay(240)}>
        {rows.map((r) => (
          <li key={r.key} className={ROW}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15.5px] font-semibold">{r.label}</span>
              <span className="num mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-muted">
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
