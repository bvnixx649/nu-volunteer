import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, Recycle } from '@phosphor-icons/react'
import { api } from '../../../data/api'
import type { Activity, Credit } from '../../../data/types'
import { isBottle } from '../../../lib/bottle'
import { fmtHours, thTime } from '../../../lib/format'
import { fillPercent } from '../../../lib/home'
import { CountUp } from '../../../ui/CountUp'
import { LinkButton } from '../../../ui/LinkButton'
import { CARD, PosterImg, POSTER_SCRIM } from './parts'

/** The newest credit, whatever order the data arrives in. */
const newest = (list: Credit[]) => list.reduce<Credit | undefined>((n, c) => (!n || c.at > n.at ? c : n), undefined)

function LiveCard({ a, showOrg, delay }: { a: Activity; showOrg: boolean; delay: number }) {
  const [last, setLast] = useState<Credit>()
  // The "ล่าสุด" line follows the live credits of this activity only, and stops when the card goes away.
  useEffect(() => api.watchCredits(a.id, (list) => setLast(newest(list))), [a.id])
  const bottle = isBottle(a)
  const pct = fillPercent(a)

  return (
    <li className={`rise ${CARD}`} style={{ '--d': `${delay}ms` } as CSSProperties}>
      <Link to={`/sup/a/${a.id}`} className="pressable group relative block h-44 overflow-hidden">
        <PosterImg src={a.poster} eager />
        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: POSTER_SCRIM }} />
        <span className="num absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-bg py-1.5 pr-3 pl-2.5 text-[13px] font-medium text-ok">
          <span className="live-dot-ok size-2 shrink-0" aria-hidden />
          กำลังดำเนินการ ถึง {thTime(a.end)} น.
        </span>
        <span className="absolute inset-x-5 bottom-3.5 block">
          <span className="line-clamp-2 block text-[19px] leading-[1.3] font-semibold text-balance">{a.title}</span>
          <span className="num mt-0.5 flex gap-2 text-[13.5px] text-ink/80">
            {a.place && <span className="min-w-0 truncate">{a.place}</span>}
            <span className="shrink-0">{fmtHours(a.hours)} ชั่วโมงต่อคน</span>
          </span>
          {showOrg && <span className="block truncate text-[13.5px] text-ink/80">{a.org}</span>}
        </span>
      </Link>

      <div className="px-5 pt-4 pb-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <CountUp value={a.creditCount} delay={0.1} className="block text-[52px] leading-[0.95] font-semibold tracking-tight" />
            <p className="mt-1.5 text-sm text-ink/80">ได้รับชั่วโมงแล้ว</p>
          </div>
          {a.regCount > 0 && (
            <p className="shrink-0 text-right text-[13.5px] text-muted">
              จากผู้ลงทะเบียน <b className="num font-semibold text-ink">{a.regCount.toLocaleString('th-TH')}</b> คน
            </p>
          )}
        </div>

        {/* With no sign-ups there is nothing to measure against, so the count stands alone. */}
        <div
          hidden={a.regCount === 0}
          role="progressbar"
          aria-label="ได้รับชั่วโมงแล้วเทียบกับผู้ลงทะเบียน"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full w-full origin-left rounded-full bg-ok transition-transform duration-[600ms] ease-[var(--ease-out)]" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>

        <p className="mt-3 flex min-h-5 items-center gap-2 text-[13.5px] text-muted">
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

        <LinkButton to={bottle ? `/sup/a/${a.id}` : `/sup/a/${a.id}?qr=1`} variant="accent" className="mt-4 w-full">
          {bottle ? <Recycle size={22} weight="bold" /> : <QrCode size={22} weight="bold" />}
          {bottle ? 'บันทึกขวด' : 'แสดง QR รับชั่วโมง'}
        </LinkButton>
      </div>
    </li>
  )
}

/** One card per activity that is running now: poster first, then people credited so far, the latest name and a big QR button. */
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
