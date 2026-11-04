import type { CSSProperties, ReactNode } from 'react'
import { TH_MONTHS_SHORT, YEAR_START_MONTH, type YearOverview } from '../../../lib/home'
import { Counter } from '../../../ui/Counter'
import { ProgressRing } from '../../../ui/ProgressRing'

const n = (v: number) => v.toLocaleString('th-TH')
const delay = (ms: number): CSSProperties => ({ '--d': `${ms}ms` }) as CSSProperties

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <Counter value={value} className="block text-2xl leading-tight font-semibold tracking-[-0.03em]" />
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

function MonthlyBars({ o }: { o: YearOverview }) {
  const max = Math.max(1, ...o.monthly)
  const months = o.monthly.map((v, k) => ({ v, name: TH_MONTHS_SHORT[(YEAR_START_MONTH + k) % 12], current: k === o.currentMonth, future: k > o.currentMonth }))
  const summary = months
    .filter((m) => !m.future)
    .map((m) => `${m.name} ${n(m.v)} คน`)
    .join(' ')
  return (
    <section
      className="rise rounded-[22px] border border-white/[0.06] bg-surface px-3 pt-[18px] pb-3"
      style={delay(100)}
      role="img"
      aria-label={`ผู้ได้รับชั่วโมงรายเดือน ${summary}`}
    >
      <div className="grid h-[150px] grid-cols-12 items-end gap-[5px]" aria-hidden>
        {months.map((m, k) => (
          <div key={k} className="flex h-full flex-col items-center justify-end">
            <span className={`num mb-1 text-[10.5px] ${m.current ? 'text-ok' : 'text-muted'}`}>{m.future ? '' : n(m.v)}</span>
            <div
              className="bar-grow w-full rounded-t-md rounded-b-[3px]"
              style={{
                ...delay(k * 40),
                height: m.future ? 6 : Math.max(6, Math.round((m.v / max) * 118)),
                background: m.current ? 'var(--color-ok)' : m.future ? 'rgba(255,255,255,0.05)' : 'rgba(237,235,231,0.22)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-12 gap-[5px] text-center" aria-hidden>
        {months.map((m, k) => (
          <span key={k} className={`text-[10px] tracking-[-0.02em] whitespace-nowrap ${m.current ? 'font-semibold text-ink' : 'text-muted'}`}>
            {m.name}
          </span>
        ))}
      </div>
    </section>
  )
}

const row = 'flex items-center justify-between gap-3 px-4 py-3.5 text-[15px] [&:not(:first-child)]:border-t [&:not(:first-child)]:border-white/5'

/** The statistics tab: turn-up ring, three counts, the monthly bars and this month in four rows. `lead` goes above the ring card and `children` after the last rows (the admin's extras). */
export function OverviewStats({ o, lead, children }: { o: YearOverview; lead?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <div className="rise flex flex-wrap items-baseline justify-between gap-x-3 px-1 pt-5 pb-2.5">
        <h2 className="text-[17px] font-semibold">ปีการศึกษา {o.label}</h2>
        <p className="num text-[13px] text-muted">
          1 พ.ค. {o.label} ถึง 30 เม.ย. {o.label + 1}
        </p>
      </div>
      {lead && <div className="mb-3">{lead}</div>}
      <section className="rise rounded-[30px] border border-white/[0.06] bg-white/[0.03] p-1.5" style={delay(40)}>
        <div
          className="rounded-3xl p-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
          style={{ backgroundImage: 'radial-gradient(120% 80% at 100% 0%, rgba(92,196,141,0.14), rgba(92,196,141,0) 55%), linear-gradient(180deg, #25231f, #1c1a18)' }}
        >
          <div className="flex items-center gap-4">
            <ProgressRing percent={o.kpi ?? 0} size={96} label={o.kpi === null ? 'เข้าร่วมจริง ยังไม่มีข้อมูล' : `เข้าร่วมจริง ร้อยละ ${o.kpi}`}>
              <span className="text-[22px]">{o.kpi === null ? '-' : `${o.kpi}%`}</span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="text-base font-semibold">เข้าร่วมจริงเทียบจำนวนที่รับ</p>
              <p className="num mt-0.5 text-[13px] text-muted">
                {o.kpiActivities ? `นับเฉพาะกิจกรรมที่จบแล้วและจำกัดจำนวน ${n(o.kpiActivities)} กิจกรรม` : 'ยังไม่มีกิจกรรมที่จบแล้วและจำกัดจำนวน'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Tile value={o.activities} label="กิจกรรม" />
            <Tile value={o.registered} label="ผู้ลงทะเบียน" />
            <Tile value={o.people} label="ผู้ได้รับชั่วโมง" />
          </div>
        </div>
      </section>

      <div className="rise flex items-baseline justify-between px-1 pt-6 pb-2.5" style={delay(80)}>
        <h2 className="text-[17px] font-semibold">ผู้ได้รับชั่วโมงรายเดือน</h2>
        <span className="text-[13px] text-muted">หน่วย คน</span>
      </div>
      <MonthlyBars o={o} />

      <h2 className="rise px-1 pt-6 pb-2.5 text-[17px] font-semibold" style={delay(140)}>
        เดือนนี้
      </h2>
      <section className="rise overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface" style={delay(160)}>
        <div className={row}>
          <span className="text-[#c9c4bc]">กิจกรรมที่จัดแล้ว</span>
          <b className="num font-semibold">{n(o.month.held)}</b>
        </div>
        <div className={row}>
          <span className="text-[#c9c4bc]">กิจกรรมที่จะจัดขึ้น</span>
          <b className="num font-semibold">{n(o.month.upcoming)}</b>
        </div>
        <div className={row}>
          <span className="text-[#c9c4bc]">ผู้ได้รับชั่วโมง</span>
          <b className="num font-semibold">{n(o.month.people)}</b>
        </div>
        <div className={row}>
          <span className="text-[#c9c4bc]">รายชื่อที่ยังไม่ส่งศูนย์จิตอาสา</span>
          <b className={`num shrink-0 font-semibold ${o.month.unsent > 0 ? 'text-[#f7a57a]' : ''}`}>{n(o.month.unsent)} กิจกรรม</b>
        </div>
      </section>
      {children}
    </>
  )
}
