import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { MapPin } from '@phosphor-icons/react'
import type { Activity } from '../../data/types'
import { categoryOf } from '../../data/categories'
import { SEAT_RED, SEAT_YELLOW } from '../../config'
import { fmtHours, relDay, thDate, thDayMonth, thTime } from '../../lib/format'

const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

/** Weekday name without the "วัน" prefix, e.g. "เสาร์". */
export const weekday = (ms: number) => WEEKDAYS[new Date(ms).getDay()]

/** The day as a card says it: "วันนี้", "พรุ่งนี้", otherwise the weekday and a date without the year ("เสาร์ 14 พ.ย."). */
export function dayWord(ms: number, now: number) {
  const rel = relDay(ms, now)
  return rel === thDate(ms) ? `${weekday(ms)} ${thDayMonth(ms)}` : rel
}

/**
 * Seat bar for limited activities, a head count for the rest. Yellow past 70 percent, red past 90 (SPEC 13).
 * `lead` puts the words first in body size, for the detail page where the row is read on its own.
 */
export function Seats({ a, lead }: { a: Activity; lead?: boolean }) {
  const plain = lead ? 'num font-semibold' : 'num text-[13.5px] text-muted'
  if (a.itemsPerHour) return <p className={plain}>{a.itemsPerHour} ขวด = 1 ชม.</p>
  if (!a.capLimit) return <p className={plain}>ลงทะเบียนแล้ว {a.regCount} คน</p>
  const fill = a.capacity ? Math.min(1, a.regCount / a.capacity) : 1
  const left = Math.max(0, a.capacity - a.regCount)
  const level = fill > SEAT_RED ? 'bad' : fill > SEAT_YELLOW ? 'warn' : 'ok'
  const bar = level === 'bad' ? 'bg-bad' : level === 'warn' ? 'bg-warn' : 'bg-ok'
  const text = level === 'bad' ? 'text-bad' : level === 'warn' ? 'text-warn' : lead ? 'text-muted' : 'text-ink'
  const track = (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`ลงทะเบียนแล้ว ${a.regCount} จาก ${a.capacity} คน`}>
      <motion.div
        className={`h-full origin-left rounded-full ${bar}`}
        initial={{ transform: 'scaleX(0)' }}
        animate={{ transform: `scaleX(${fill})` }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
      />
    </div>
  )
  const words = (
    <div className={`flex items-baseline justify-between gap-3 ${lead ? '' : 'text-[13.5px]'}`}>
      <span className={`num ${lead ? 'font-semibold' : 'text-muted'}`}>
        ลงทะเบียนแล้ว {a.regCount} จาก {a.capacity} คน
      </span>
      <span className={`num shrink-0 font-semibold ${lead ? 'text-[13.5px]' : ''} ${text}`}>{left ? `เหลือ ${left} ที่` : 'เต็มแล้ว'}</span>
    </div>
  )
  return lead ? (
    <div className="flex flex-col gap-2.5">
      {words}
      {track}
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      {track}
      {words}
    </div>
  )
}

const pill = 'num rounded-full bg-ink px-3 py-1.5 text-[13.5px] leading-none font-semibold text-bg'

export function ActivityCard({ a, registered, credited, now, index = 0 }: { a: Activity; registered: boolean; credited: boolean; now: number; index?: number }) {
  const state = credited ? 'ได้รับชั่วโมงแล้ว' : registered ? 'ลงทะเบียนแล้ว' : ''
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: Math.min(index, 6) * 0.05 }}
    >
      <Link to={`/a/${a.id}`} className="pressable group block">
        <div className="relative h-[196px] overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
          <img src={a.poster} alt="" loading="lazy" className="size-full object-cover transition-transform duration-[600ms] ease-[var(--ease-out)] group-active:scale-[1.02]" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
          {state && <span className={`${pill} absolute top-3 left-3`}>{state}</span>}
          <span className={`${pill} absolute right-3 bottom-3`}>{a.itemsPerHour ? `สูงสุด ${fmtHours(a.hours)} ชั่วโมง` : `${fmtHours(a.hours)} ชั่วโมง`}</span>
        </div>
        <div className="px-1 pt-3">
          <p className="num text-[13.5px] font-semibold text-accent">
            {dayWord(a.start, now)} {thTime(a.start)} ถึง {thTime(a.end)} น.
          </p>
          <p className="mt-1 line-clamp-2 text-lg leading-[1.35] font-semibold text-balance">{a.title}</p>
          <p className="mt-1 flex items-center justify-between gap-4 text-[13.5px] text-muted">
            {a.place && (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin size={16} weight="light" className="shrink-0" />
                <span className="min-w-0 truncate">{a.place}</span>
              </span>
            )}
            <span className="shrink-0">{categoryOf(a.categoryKey).label}</span>
          </p>
          {!credited && (
            <div className="mt-3">
              <Seats a={a} />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
