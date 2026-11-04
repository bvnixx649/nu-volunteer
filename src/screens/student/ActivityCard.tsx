import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import type { Activity } from '../../data/types'
import { SEAT_RED, SEAT_YELLOW } from '../../config'
import { fmtHours, thTime } from '../../lib/format'

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

const chip = (tone: string, text: string) => <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-medium whitespace-nowrap ${tone}`}>{text}</span>

export function ActivityCard({ a, registered, credited, index = 0 }: { a: Activity; registered: boolean; credited: boolean; now: number; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: Math.min(index, 6) * 0.05 }}
    >
      <Link to={`/a/${a.id}`} className="pressable block">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
          <img src={a.poster} alt="" loading="lazy" className="aspect-video w-full object-cover" />
          <span className="num absolute right-2.5 bottom-2.5 inline-flex h-7 items-center rounded-full bg-black/65 px-3 text-[13px] font-semibold text-white backdrop-blur-md">
            {a.itemsPerHour ? `สูงสุด ${fmtHours(a.hours)} ชม.` : `${fmtHours(a.hours)} ชม.`}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 px-1 pt-3">
          <p className="line-clamp-2 text-base leading-snug font-semibold">{a.title}</p>
          <p className="num flex gap-1.5 text-sm text-muted">
            <span className="shrink-0">
              {thTime(a.start)} ถึง {thTime(a.end)} น.
            </span>
            {a.place && <span className="min-w-0 truncate">{a.place}</span>}
          </p>
          <div className="mt-0.5">{credited ? chip('bg-ok-soft text-ok', 'ได้รับชั่วโมงแล้ว') : registered ? chip('bg-ok-soft text-ok', 'ลงทะเบียนแล้ว') : <Seats a={a} />}</div>
        </div>
      </Link>
    </motion.div>
  )
}
