import type { CSSProperties, ReactNode } from 'react'
import { TH_MONTHS_SHORT, YEAR_START_MONTH, type YearOverview } from '../../../lib/home'
import { Counter } from '../../../ui/Counter'
import { ProgressRing } from '../../../ui/ProgressRing'
import { CARD } from './parts'

const n = (v: number) => v.toLocaleString('th-TH')
const delay = (ms: number): CSSProperties => ({ '--d': `${ms}ms` }) as CSSProperties

/** Section title of the statistics tab, with an optional note on the right. */
export const STAT_HEADING = 'rise flex flex-wrap items-baseline justify-between gap-x-3 px-1 pt-8 pb-3'

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[14px] bg-surface-2 px-3 py-2.5">
      <Counter value={value} className="block text-2xl leading-tight font-semibold tracking-tight" />
      <p className="text-[13px] text-muted">{label}</p>
    </div>
  )
}

/** Twelve bars, May to April. One data colour (people who received hours); months still to come are an empty track, and this month is told by weight. */
function MonthlyBars({ o }: { o: YearOverview }) {
  const max = Math.max(1, ...o.monthly)
  const months = o.monthly.map((v, k) => ({ v, name: TH_MONTHS_SHORT[(YEAR_START_MONTH + k) % 12], current: k === o.currentMonth, future: k > o.currentMonth }))
  const summary = months
    .filter((m) => !m.future)
    .map((m) => `${m.name} ${n(m.v)} คน`)
    .join(' ')
  return (
    <section className={`rise ${CARD} px-3 pt-5 pb-3.5`} style={delay(100)} role="img" aria-label={`ผู้ได้รับชั่วโมงรายเดือน ${summary}`}>
      <div className="grid h-[150px] grid-cols-12 items-end gap-[5px]" aria-hidden>
        {months.map((m, k) => (
          <div key={k} className="flex h-full flex-col items-center justify-end">
            <span className={`num mb-1 text-[11px] ${m.current ? 'font-semibold text-ink' : 'text-muted'}`}>{m.future ? '' : n(m.v)}</span>
            <div
              className={`bar-grow w-full rounded-t-md rounded-b-[3px] ${m.future || m.v === 0 ? 'bg-surface-2' : 'bg-ok'}`}
              style={{ ...delay(k * 40), height: m.future ? 6 : Math.max(6, Math.round((m.v / max) * 118)) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-12 gap-[5px] text-center" aria-hidden>
        {months.map((m, k) => (
          <span key={k} className={`text-[10.5px] tracking-[-0.02em] whitespace-nowrap ${m.current ? 'font-semibold text-ink' : 'text-muted'}`}>
            {m.name}
          </span>
        ))}
      </div>
    </section>
  )
}

const row = 'flex items-center justify-between gap-3 px-5 py-4 text-[15px] [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line'

/** The statistics tab: turn-up ring, three counts, the monthly bars and this month in four rows. `lead` goes above the ring card and `children` after the last rows (the admin's extras). */
export function OverviewStats({ o, lead, children }: { o: YearOverview; lead?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <div className="rise flex flex-wrap items-baseline justify-between gap-x-3 px-1 pt-5 pb-3">
        <h2 className="text-xl font-semibold">ปีการศึกษา {o.label}</h2>
        <p className="num text-[13.5px] text-muted">
          1 พ.ค. {o.label} ถึง 30 เม.ย. {o.label + 1}
        </p>
      </div>
      {lead && <div className="mb-3">{lead}</div>}
      <section className={`rise ${CARD} p-5`} style={delay(40)}>
        <div className="flex items-center gap-4">
          <ProgressRing percent={o.kpi ?? 0} size={96} label={o.kpi === null ? 'เข้าร่วมจริง ยังไม่มีข้อมูล' : `เข้าร่วมจริง ร้อยละ ${o.kpi}`}>
            <span className="text-[22px]">{o.kpi === null ? '-' : `${o.kpi}%`}</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[17px] leading-snug font-semibold">เข้าร่วมจริงเทียบจำนวนที่รับ</p>
            <p className="num mt-1 text-[13.5px] text-muted">
              {o.kpiActivities ? `นับเฉพาะกิจกรรมที่จบแล้วและจำกัดจำนวน ${n(o.kpiActivities)} กิจกรรม` : 'ยังไม่มีกิจกรรมที่จบแล้วและจำกัดจำนวน'}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Tile value={o.activities} label="กิจกรรม" />
          <Tile value={o.registered} label="ผู้ลงทะเบียน" />
          <Tile value={o.people} label="ผู้ได้รับชั่วโมง" />
        </div>
      </section>

      <div className={STAT_HEADING} style={delay(80)}>
        <h2 className="text-xl font-semibold">ผู้ได้รับชั่วโมงรายเดือน</h2>
        <span className="text-[13.5px] text-muted">หน่วย คน</span>
      </div>
      <MonthlyBars o={o} />

      <div className={STAT_HEADING} style={delay(140)}>
        <h2 className="text-xl font-semibold">เดือนนี้</h2>
      </div>
      <section className={`rise ${CARD}`} style={delay(160)}>
        <div className={row}>
          <span className="text-ink/80">กิจกรรมที่จัดแล้ว</span>
          <b className="num font-semibold">{n(o.month.held)}</b>
        </div>
        <div className={row}>
          <span className="text-ink/80">กิจกรรมที่จะจัดขึ้น</span>
          <b className="num font-semibold">{n(o.month.upcoming)}</b>
        </div>
        <div className={row}>
          <span className="text-ink/80">ผู้ได้รับชั่วโมง</span>
          <b className="num font-semibold">{n(o.month.people)}</b>
        </div>
        <div className={row}>
          <span className="text-ink/80">รายชื่อที่ยังไม่ส่งศูนย์จิตอาสา</span>
          <b className="num shrink-0 font-semibold">{n(o.month.unsent)} กิจกรรม</b>
        </div>
      </section>
      {children}
    </>
  )
}
