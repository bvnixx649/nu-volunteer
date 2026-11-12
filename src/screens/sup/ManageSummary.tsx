import { CaretRight } from '@phosphor-icons/react'
import type { Activity } from '../../data/types'
import { fillBasis, fillPercent } from '../../lib/home'
import { fmtHours } from '../../lib/format'
import type { RosterFilter } from '../../lib/roster'
import { CountUp } from '../../ui/CountUp'
import { ProgressRing } from '../../ui/ProgressRing'

export interface SummaryCounts {
  /** Registered and not yet credited. */
  notYet: number
  /** Credited without having registered. */
  walkIn: number
  /** Credits carrying a flag to look at. */
  flagged: number
}

const tile = 'pressable flex min-h-16 flex-col justify-center rounded-[14px] px-3 py-2.5 text-left'
const count = 'block text-[52px] leading-none font-semibold tracking-tight'

/**
 * The live summary. With registrations: a ring and the big credited count, then three tiles; each tile jumps to
 * the roster with the matching filter already on. With no registrations at all (everyone just turns up, like a
 * blood donation day) there is nothing to compare against, so it is the credited count alone.
 */
export function ManageSummary({ activity, counts, bottle, onFilter }: { activity: Activity; counts: SummaryCounts; bottle: boolean; onFilter: (f: RosterFilter) => void }) {
  const pct = fillPercent(activity)
  const basis = fillBasis(activity)
  const perPerson = bottle ? `${activity.itemsPerHour} ขวด ได้ 1 ชั่วโมง สูงสุด ${fmtHours(activity.hours)} ชั่วโมงต่อคน` : `${fmtHours(activity.hours)} ชั่วโมงต่อคน`
  const flagged = counts.flagged > 0

  if (activity.regCount === 0)
    return (
      <section className="rise rounded-[var(--radius-card)] bg-surface p-5" aria-label="สรุปกิจกรรม">
        <CountUp value={activity.creditCount} delay={0.1} className={count} />
        <p className="mt-2 text-[15px] text-ink/80">ได้รับชั่วโมงแล้ว</p>
        <p className="num mt-0.5 text-[13.5px] text-muted">{perPerson}</p>
        {flagged && (
          <button type="button" onClick={() => onFilter('flagged')} className="pressable mt-4 flex min-h-12 w-full items-center gap-2 rounded-[14px] bg-warn-soft px-4 text-left text-[15px] font-semibold text-warn">
            <span className="flex-1">
              ควรตรวจสอบ <span className="num">{counts.flagged.toLocaleString('th-TH')}</span>
            </span>
            <CaretRight size={18} aria-hidden />
          </button>
        )}
      </section>
    )

  return (
    <section className="rise rounded-[var(--radius-card)] bg-surface p-5" aria-label="สรุปกิจกรรม">
      <div className="flex items-center gap-4">
        <ProgressRing percent={pct} size={104} label={`ได้รับชั่วโมงแล้ว ร้อยละ ${pct}`}>
          <span className="text-xl">{pct}%</span>
        </ProgressRing>
        <div className="min-w-0">
          <CountUp value={activity.creditCount} delay={0.1} className={count} />
          <p className="mt-1.5 text-sm text-ink/80">
            ได้รับชั่วโมงแล้ว {basis.byLimit ? 'จากจำนวนที่รับ' : 'จากผู้ลงทะเบียน'} <span className="num">{basis.of.toLocaleString('th-TH')}</span> คน
          </p>
          <p className="num mt-0.5 text-[13.5px] text-muted">{perPerson}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onFilter('notScanned')} className={`${tile} bg-surface-2`}>
          <span className="num text-xl font-semibold">{counts.notYet.toLocaleString('th-TH')}</span>
          <span className="text-[13px] text-muted">ยังไม่ได้รับ</span>
        </button>
        <button type="button" onClick={() => onFilter('walkIn')} className={`${tile} bg-surface-2`}>
          <span className="num text-xl font-semibold">{counts.walkIn.toLocaleString('th-TH')}</span>
          <span className="text-[13px] text-muted">ไม่ได้ลงทะเบียน</span>
        </button>
        <button type="button" onClick={() => onFilter('flagged')} className={`${tile} ${flagged ? 'bg-warn-soft' : 'bg-surface-2'}`}>
          <span className={`num text-xl font-semibold ${flagged ? 'text-warn' : ''}`}>{counts.flagged.toLocaleString('th-TH')}</span>
          <span className={`text-[13px] ${flagged ? 'text-warn' : 'text-muted'}`}>ควรตรวจสอบ</span>
        </button>
      </div>
    </section>
  )
}
