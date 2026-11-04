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

const tile = 'pressable flex flex-col rounded-[14px] px-3 py-2.5 text-left'

/**
 * The live summary: a ring and the big credited count, then three tiles. Each tile jumps to the roster
 * with the matching filter already on.
 */
export function ManageSummary({ activity, counts, bottle, onFilter }: { activity: Activity; counts: SummaryCounts; bottle: boolean; onFilter: (f: RosterFilter) => void }) {
  const pct = fillPercent(activity)
  const basis = fillBasis(activity)
  return (
    <section className="rise -mx-1 rounded-[30px] border border-white/[0.06] bg-white/[0.03] p-1.5" aria-label="สรุปกิจกรรม">
      <div
        className="rounded-3xl p-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
        style={{ backgroundImage: 'radial-gradient(120% 80% at 100% 0%, rgba(92,196,141,0.14), rgba(92,196,141,0) 55%), linear-gradient(180deg, #25231f, #1c1a18)' }}
      >
        <div className="flex items-center gap-4">
          <ProgressRing percent={pct} size={104} label={`ได้รับชั่วโมงแล้ว ร้อยละ ${pct}`}>
            <span className="text-xl">{pct}%</span>
          </ProgressRing>
          <div className="min-w-0">
            <CountUp value={activity.creditCount} delay={0.1} className="block text-[52px] leading-none font-semibold tracking-[-0.045em]" />
            <p className="mt-1 text-sm text-ink/80">
              ได้รับชั่วโมงแล้ว {basis.byLimit ? 'จากจำนวนที่รับ' : 'จากผู้ลงทะเบียน'} <span className="num">{basis.of.toLocaleString('th-TH')}</span> คน
            </p>
            <p className="num mt-0.5 text-[13px] text-muted">
              {bottle ? `${activity.itemsPerHour} ขวด ได้ 1 ชั่วโมง สูงสุด ${fmtHours(activity.hours)} ชั่วโมงต่อคน` : `${fmtHours(activity.hours)} ชั่วโมงต่อคน`}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onFilter('notScanned')} className={`${tile} bg-white/[0.04]`}>
            <span className="num text-[19px] font-semibold">{counts.notYet.toLocaleString('th-TH')}</span>
            <span className="text-xs text-muted">ยังไม่ได้รับ</span>
          </button>
          <button type="button" onClick={() => onFilter('walkIn')} className={`${tile} bg-white/[0.04]`}>
            <span className="num text-[19px] font-semibold">{counts.walkIn.toLocaleString('th-TH')}</span>
            <span className="text-xs text-muted">ไม่ได้ลงทะเบียน</span>
          </button>
          <button type="button" onClick={() => onFilter('flagged')} className={`${tile} bg-warn/10 shadow-[inset_0_0_0_1px_rgba(232,176,74,0.25)]`}>
            <span className="num text-[19px] font-semibold text-warn">{counts.flagged.toLocaleString('th-TH')}</span>
            <span className="text-xs text-warn">ควรตรวจสอบ</span>
          </button>
        </div>
      </div>
    </section>
  )
}
