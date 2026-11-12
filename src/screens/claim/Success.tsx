import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api } from '../../data/api'
import type { Credit } from '../../data/types'
import { haptic } from '../../lib/device'
import { thDate, thTime } from '../../lib/format'
import { CountUp } from '../../ui/CountUp'
import { LinkButton } from '../../ui/LinkButton'

/** Everything after the ring fades up in order, starting as the ring closes. `at` is the start in ms. */
const later = (at: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay: at / 1000, ease: [0.23, 1, 0.32, 1] as const },
})

/** The two people before you and you, with your place in the order. Own row comes from the credit just written. */
export function neighbours(list: Credit[], own: Credit) {
  const sorted = list.some((c) => c.studentId === own.studentId) ? list : [...list, own]
  const i = sorted.findIndex((c) => c.studentId === own.studentId)
  return { before: sorted.slice(Math.max(0, i - 2), i).map((c, k, a) => ({ c, n: i - a.length + k + 1 })), n: i + 1, total: sorted.length }
}

function RosterRow({ n, c, own }: { n: number; c: Credit; own?: boolean }) {
  const grid = 'grid grid-cols-[30px_82px_minmax(0,1fr)_44px] items-center gap-x-2 text-[14px]'
  const cells = (
    <>
      <span className={`num ${own ? 'text-accent-ink' : ''}`}>{n}</span>
      <span className="num">{c.studentId}</span>
      <span className="truncate">{c.name}</span>
      <span className={`num text-right ${own ? 'text-accent-ink' : ''}`}>{thTime(c.at)}</span>
    </>
  )
  if (!own) return <li className={`${grid} border-t border-line px-[18px] py-3 text-muted`}>{cells}</li>
  return (
    <motion.li
      data-own
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 1.2, ease: [0.23, 1, 0.32, 1] }}
      className={`${grid} mx-2 rounded-[14px] bg-accent-soft px-2.5 py-3 font-semibold`}
    >
      {cells}
    </motion.li>
  )
}

/** The cumulative total counts from what it was before this credit. `delay` keeps the start near 1.15 s even if the read finishes late. */
type Total = { from: number; to: number; delay: number }

/** Hours first, then who you are, then your place in the roster. Reads the roster once; the claim page never subscribes (SPEC 2.84). */
export function Success({ credit, title, activityId }: { credit: Credit; title: string; activityId: string }) {
  const [list, setList] = useState<Credit[]>([])
  /** undefined while loading, null when the read failed (the total block is then hidden). */
  const [total, setTotal] = useState<Total | null | undefined>(undefined)
  const t0 = useRef(performance.now())

  useEffect(() => {
    // A "ลงทะเบียนแล้ว" toast from the detail page can still be on screen and covers the ring.
    toast.dismiss()
    // The vibration is synced to the ring closing and fires only here, not when the claim returns.
    const id = setTimeout(() => haptic.success(), 950)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    api.listCredits(activityId).then(setList, () => setList([]))
  }, [activityId])

  useEffect(() => {
    let live = true
    api.studentCredits(credit.studentId).then(
      (mine) => {
        if (!live) return
        // The credit just written is normally in the list; if the read raced ahead of it, add it once.
        const counted = mine.some((c) => c.activityId === activityId)
        const sum = Math.round((mine.reduce((s, c) => s + c.hours, 0) + (counted ? 0 : credit.hours)) * 10) / 10
        const waited = (performance.now() - t0.current) / 1000
        setTotal({ from: Math.max(0, Math.round((sum - credit.hours) * 10) / 10), to: sum, delay: Math.max(0.05, 1.15 - waited) })
      },
      () => live && setTotal(null),
    )
    return () => {
      live = false
    }
  }, [credit.studentId, credit.hours, activityId])

  const { before, n, total: people } = neighbours(list, credit)

  return (
    <div className="flex flex-col pb-4">
      <div className="stamp-hero relative mx-auto mt-6 size-[228px]">
        <div aria-hidden className="stamp-glow pointer-events-none absolute -inset-[70px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-ok)_28%,transparent),transparent)]" />
        <svg className="stamp-ring absolute inset-0" width="228" height="228" viewBox="0 0 228 228" aria-hidden>
          <circle cx="114" cy="114" r="96" fill="none" stroke="var(--color-ok-soft)" strokeWidth="14" />
          <circle className="stamp-arc" cx="114" cy="114" r="96" fill="none" stroke="var(--color-ok)" strokeWidth="14" strokeLinecap="round" transform="rotate(-90 114 114)" />
        </svg>
        <div className="absolute inset-x-0 top-[60px] h-20 text-center leading-[80px]">
          <span className="relative inline-block text-[84px] font-semibold tracking-tight">
            <span aria-hidden className="absolute top-0 right-full pr-0.5 text-[44px] font-medium text-ok">
              +
            </span>
            <CountUp value={credit.hours} delay={0.12} duration={0.82} />
          </span>
        </div>
        <div className="absolute inset-x-0 top-[146px] text-center text-base text-muted">ชั่วโมง</div>
      </div>

      <div className="mt-[18px] flex justify-center">
        <span className="stamp-badge inline-flex h-9 items-center gap-2 rounded-full bg-ok-soft pr-3.5 pl-2.5 text-[15px] font-semibold text-ok">
          <CheckCircle size={20} weight="fill" />
          บันทึกชั่วโมงแล้ว
        </span>
      </div>

      <motion.div {...later(900)} className="px-4 pt-3.5 text-center">
        {title && <h1 className="line-clamp-2 text-[22px] leading-[1.35] font-semibold text-balance break-words">{title}</h1>}
        <p className="num mt-1 text-[13.5px] text-muted">
          {thDate(credit.at)} เวลา {thTime(credit.at)} น.
        </p>
      </motion.div>

      <motion.section {...later(980)} className="mt-6" aria-label="ชื่อและชั่วโมงสะสม">
        <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4">
          <img src={`${import.meta.env.BASE_URL}nu-emblem.png`} alt="ตรามหาวิทยาลัยนเรศวร" width={44} height={44} className="size-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base leading-snug font-semibold break-words">{credit.name}</h2>
            <p className="num text-[13.5px] text-muted">{credit.studentId}</p>
          </div>
          {total !== null && (
            <div className="shrink-0 text-right" style={{ opacity: total ? 1 : 0 }} aria-hidden={!total}>
              <p className="text-[13px] text-muted">ชั่วโมงสะสม</p>
              <p className="text-[28px] leading-[1.1] font-semibold tracking-tight">
                {total ? <CountUp value={total.to} from={total.from} delay={total.delay} duration={0.9} /> : <span className="num">0</span>}
              </p>
            </div>
          )}
        </div>
      </motion.section>

      <motion.section {...later(1060)} className="mt-3 overflow-hidden rounded-[var(--radius-card)] bg-surface pt-4 pb-2" aria-label="รายชื่อในงาน">
        <div className="flex items-baseline justify-between px-[18px] pb-3">
          <h2 className="text-base font-semibold">รายชื่อในงาน</h2>
          <p className="text-[13.5px] text-muted">
            <span className="num">{people}</span> คน
          </p>
        </div>
        <ul>
          {before.map(({ c, n }) => (
            <RosterRow key={c.studentId} n={n} c={c} />
          ))}
          <RosterRow n={n} c={credit} own />
        </ul>
      </motion.section>

      <motion.div {...later(1140)} className="flex flex-col gap-1 pt-6">
        <LinkButton to="/" variant="primary" className="w-full">
          เสร็จสิ้น
        </LinkButton>
        <LinkButton to={`/a/${activityId}/roster`} variant="ghost" className="w-full">
          ดูรายชื่อทั้งหมด
        </LinkButton>
      </motion.div>
    </div>
  )
}
