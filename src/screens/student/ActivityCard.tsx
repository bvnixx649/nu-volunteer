import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Clock, MapPin } from '@phosphor-icons/react'
import type { Activity } from '../../data/types'
import { categoryOf } from '../../data/categories'
import { SEAT_RED, SEAT_YELLOW } from '../../config'
import { dateTile, fmtHours, thTime } from '../../lib/format'

/** Seat bar for limited activities, a head count for the rest. Yellow past 70 percent, red past 90 (SPEC 13). */
export function Seats({ a }: { a: Activity }) {
  if (a.itemsPerHour) return <p className="num text-[13px] text-muted">{a.itemsPerHour} ขวด = 1 ชม.</p>
  if (!a.capLimit) return <p className="num text-[13px] text-muted">ลงทะเบียนแล้ว {a.regCount} คน</p>
  const fill = a.capacity ? Math.min(1, a.regCount / a.capacity) : 1
  const left = Math.max(0, a.capacity - a.regCount)
  const level = fill > SEAT_RED ? 'bad' : fill > SEAT_YELLOW ? 'warn' : 'ok'
  const bar = level === 'bad' ? 'bg-bad' : level === 'warn' ? 'bg-warn' : 'bg-accent'
  const text = level === 'bad' ? 'text-bad' : level === 'warn' ? 'text-warn' : 'text-ink'
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`ลงทะเบียนแล้ว ${a.regCount} จาก ${a.capacity} คน`}>
        <motion.div
          className={`h-full origin-left rounded-full ${bar}`}
          initial={{ transform: 'scaleX(0)' }}
          animate={{ transform: `scaleX(${fill})` }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
        />
      </div>
      <div className="mt-[7px] flex justify-between gap-3 text-[13px]">
        <span className="num text-muted">
          ลงทะเบียนแล้ว {a.regCount} จาก {a.capacity} คน
        </span>
        <span className={`num shrink-0 font-semibold ${text}`}>{left ? `เหลือ ${left} ที่` : 'เต็มแล้ว'}</span>
      </div>
    </div>
  )
}

const chip = (tone: string, text: string) => <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-medium whitespace-nowrap ${tone}`}>{text}</span>

export function ActivityCard({ a, registered, credited, now, index = 0 }: { a: Activity; registered: boolean; credited: boolean; now: number; index?: number }) {
  const tile = dateTile(a.start, now)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: Math.min(index, 6) * 0.05 }}
    >
      <Link to={`/a/${a.id}`} className="pressable group block">
        <div className="relative h-[196px] overflow-hidden rounded-[22px] bg-surface-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_18px_36px_-22px_rgba(0,0,0,0.9)]">
          <img src={a.poster} alt="" loading="lazy" className="size-full object-cover transition-transform duration-[600ms] ease-[var(--ease-out)] group-active:scale-[1.02]" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent from-55% to-black/55" />
          <div className="absolute top-3 left-3 w-14 overflow-hidden rounded-[14px] bg-bg/80 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-xl">
            <p className="pt-1 text-[11px] font-semibold text-[#f7a57a]">{tile.dow}</p>
            <p className="num text-[22px] leading-[1.1] font-semibold">{tile.day}</p>
            <p className="pb-[5px] text-[11px] text-ink/80">{tile.mon}</p>
          </div>
          <span className="num absolute right-3 bottom-3 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-bg">
            {a.itemsPerHour ? `สูงสุด ${fmtHours(a.hours)} ชั่วโมง` : `${fmtHours(a.hours)} ชั่วโมง`}
          </span>
        </div>
        <div className="px-1 pt-3">
          <p className="text-[13px] text-muted">{categoryOf(a.categoryKey).label}</p>
          <p className="mt-0.5 line-clamp-2 text-lg leading-[1.35] font-semibold">{a.title}</p>
          <div className="num mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[13.5px] text-ink/80">
            <span className="flex items-center gap-1.5">
              <Clock size={16} weight="light" className="shrink-0" />
              {thTime(a.start)} ถึง {thTime(a.end)} น.
            </span>
            {a.place && (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin size={16} weight="light" className="shrink-0" />
                <span className="min-w-0 truncate">{a.place}</span>
              </span>
            )}
          </div>
          <div className="mt-3">{credited ? chip('bg-ok-soft text-ok', 'ได้รับชั่วโมงแล้ว') : registered ? chip('bg-ok-soft text-ok', 'ลงทะเบียนแล้ว') : <Seats a={a} />}</div>
        </div>
      </Link>
    </motion.div>
  )
}
