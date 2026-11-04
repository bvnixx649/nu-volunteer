import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, Recycle } from '@phosphor-icons/react'
import { api } from '../../../data/api'
import type { Activity, Credit } from '../../../data/types'
import { isBottle } from '../../../lib/bottle'
import { fmtHours, thTime } from '../../../lib/format'
import { fillPercent } from '../../../lib/home'
import { CountUp } from '../../../ui/CountUp'

/** The newest credit, whatever order the data arrives in. */
const newest = (list: Credit[]) => list.reduce<Credit | undefined>((n, c) => (!n || c.at > n.at ? c : n), undefined)

function LiveCard({ a, showOrg, delay }: { a: Activity; showOrg: boolean; delay: number }) {
  const [last, setLast] = useState<Credit>()
  // The "ล่าสุด" line follows the live credits of this activity only, and stops when the card goes away.
  useEffect(() => api.watchCredits(a.id, (list) => setLast(newest(list))), [a.id])
  const bottle = isBottle(a)

  return (
    <li className="rise -mx-1 rounded-[30px] border border-white/[0.06] bg-white/[0.03] p-1.5" style={{ '--d': `${delay}ms` } as CSSProperties}>
      <div
        className="rounded-3xl px-[18px] pt-[18px] pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_48px_-20px_rgba(0,0,0,0.7)]"
        style={{ backgroundImage: 'radial-gradient(120% 80% at 0% 0%, rgba(92,196,141,0.14), rgba(92,196,141,0) 55%), linear-gradient(180deg, #25231f, #1c1a18)' }}
      >
        <p className="num flex items-center gap-2 text-[13px] text-ok">
          <span className="live-dot-ok size-2 shrink-0" aria-hidden />
          กำลังดำเนินการ ถึง {thTime(a.end)} น.
        </p>
        <Link to={`/sup/a/${a.id}`} className="pressable mt-2.5 flex items-center gap-3">
          <img src={a.poster} alt="" className="size-[52px] shrink-0 rounded-[14px] object-cover" />
          <div className="min-w-0">
            <p className="line-clamp-2 text-[18px] leading-snug font-semibold">{a.title}</p>
            <p className="num flex gap-1 text-[13px] text-muted">
              {a.place && <span className="min-w-0 truncate">{a.place}</span>}
              <span className="shrink-0">{fmtHours(a.hours)} ชั่วโมงต่อคน</span>
            </p>
            {showOrg && <p className="truncate text-[13px] text-muted">{a.org}</p>}
          </div>
        </Link>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <CountUp value={a.creditCount} delay={0.1} className="block text-[64px] leading-[0.95] font-semibold tracking-[-0.045em]" />
            <p className="mt-1 text-sm text-ink/80">ได้รับชั่วโมงแล้ว</p>
          </div>
          <p className="shrink-0 text-right text-[13px] leading-relaxed text-muted">
            ผู้ลงทะเบียน <b className="num font-semibold text-ink">{a.regCount.toLocaleString('th-TH')}</b>
          </p>
        </div>

        <div
          role="progressbar"
          aria-label="ได้รับชั่วโมงแล้วเทียบกับผู้ลงทะเบียน"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fillPercent(a)}
          className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
        >
          <div className="h-full rounded-full bg-gradient-to-r from-[#3fae74] to-[#7fd8a6] transition-[width] duration-[600ms] ease-[var(--ease-out)]" style={{ width: `${fillPercent(a)}%` }} />
        </div>

        <p className="mt-3 flex min-h-5 items-center gap-2 text-[13px] text-muted">
          {last && (
            <>
              <span>ล่าสุด</span>
              <span key={last.studentId + last.at} className="bump min-w-0 truncate font-medium text-ink">
                {last.name}
              </span>
              <span className="num shrink-0">{thTime(last.at)} น.</span>
            </>
          )}
        </p>

        <Link
          to={bottle ? `/sup/a/${a.id}` : `/sup/a/${a.id}?qr=1`}
          className="pressable mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-accent-strong px-7 text-[17px] font-semibold text-on-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_24px_-10px_rgba(232,89,12,0.8)]"
        >
          {bottle ? <Recycle size={22} weight="bold" /> : <QrCode size={22} weight="bold" />}
          {bottle ? 'บันทึกขวด' : 'แสดง QR รับชั่วโมง'}
        </Link>
      </div>
    </li>
  )
}

/** One card per activity that is running now: people credited so far, the latest name and a big QR button. */
export function LiveCards({ list, showOrg }: { list: Activity[]; showOrg: boolean }) {
  if (!list.length) return null
  return (
    <section aria-label="กำลังดำเนินการ">
      <ul className="flex flex-col gap-4">
        {list.map((a, i) => (
          <LiveCard key={a.id} a={a} showOrg={showOrg} delay={60 + i * 60} />
        ))}
      </ul>
    </section>
  )
}
