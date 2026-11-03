import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import type { Activity } from '../../data/types'
import { SEAT_RED, SEAT_YELLOW } from '../../config'
import { fmtHours, relDay, thTime } from '../../lib/format'

/** Seat bar for limited activities, a head count for the rest. Yellow past 70 percent, red past 90 (SPEC 13). */
export function Seats({ a }: { a: Activity }) {
  if (a.itemsPerHour) return <p className="num text-sm text-muted">{a.itemsPerHour} ขวด = 1 ชม.</p>
  if (!a.capLimit) return <p className="num text-sm text-muted">ลงทะเบียนแล้ว {a.regCount} คน</p>
  const fill = a.capacity ? Math.min(1, a.regCount / a.capacity) : 1
  const left = Math.max(0, a.capacity - a.regCount)
  const tone = fill > SEAT_RED ? 'bg-bad' : fill > SEAT_YELLOW ? 'bg-warn' : 'bg-ok'
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`ลงทะเบียนแล้ว ${a.regCount} จาก ${a.capacity} คน`}>
        <motion.div
          className={`h-full origin-left rounded-full ${tone}`}
          initial={{ transform: 'scaleX(0)' }}
          animate={{ transform: `scaleX(${fill})` }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
        />
      </div>
      <p className="num mt-1.5 text-sm text-muted">{left ? `เหลือ ${left} ที่ จาก ${a.capacity}` : 'เต็มแล้ว'}</p>
    </div>
  )
}

const chip = (tone: string, text: string) => <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap ${tone}`}>{text}</span>

export function ActivityCard({ a, registered, credited, now, index = 0 }: { a: Activity; registered: boolean; credited: boolean; now: number; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: Math.min(index, 6) * 0.05 }}
    >
      <Link to={`/a/${a.id}`} className="pressable flex gap-4 rounded-[var(--radius-card)] bg-surface p-3 shadow-soft">
        <img src={a.poster} alt="" loading="lazy" className="size-24 shrink-0 rounded-2xl bg-surface-2 object-cover" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="num truncate text-sm font-semibold text-accent-strong">
              {relDay(a.start, now)} {thTime(a.start)} น.
            </p>
            <p className="num shrink-0 text-sm font-bold">{a.itemsPerHour ? `สูงสุด ${fmtHours(a.hours)}` : `+${fmtHours(a.hours)}`} ชม.</p>
          </div>
          <p className="line-clamp-2 leading-snug font-semibold">{a.title}</p>
          <div className="mt-auto">
            {credited ? chip('bg-ok-soft text-ok', 'ได้รับชั่วโมงแล้ว') : registered ? chip('bg-ok-soft text-ok', 'ลงทะเบียนแล้ว') : <Seats a={a} />}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
