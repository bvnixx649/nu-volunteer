import { useLayoutEffect, useRef } from 'react'
import { thDate, thTime } from '../lib/format'

type Props = { hours: number; name: string; studentId: string; at: number; distance?: number; ref: string; title?: string }

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <dt className="text-muted">{k}</dt>
    <dd className="num min-w-0 text-right font-medium break-words">{v}</dd>
  </div>
)

/** Confirmation ticket. The notch row is cut with a mask so the page colour shows through in both themes. */
export function Ticket({ hours, name, studentId, at, distance, ref, title }: Props) {
  const card = useRef<HTMLElement>(null)
  const perf = useRef<HTMLDivElement>(null)
  // Line the notches up with the tear line, wherever the header's height puts it.
  useLayoutEffect(() => {
    if (card.current && perf.current) card.current.style.setProperty('--perf-y', `${perf.current.offsetTop}px`)
  })
  return (
    <article ref={card} className="ticket relative overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
      <div className="flex items-end justify-between gap-4 px-6 pt-6 pb-5">
        <div className="min-w-0">
          <p className="text-sm text-muted">ชั่วโมงจิตอาสา</p>
          {title && <p className="mt-1 line-clamp-2 font-medium">{title}</p>}
        </div>
        <p className="num shrink-0 text-5xl leading-none font-bold tracking-tight text-accent">
          {hours}
          <span className="ml-1 text-lg font-semibold text-ink">ชม.</span>
        </p>
      </div>
      <div ref={perf} className="ticket-perf" aria-hidden />
      <dl className="px-6 pt-4 pb-6 text-[15px]">
        <Row k="ชื่อ" v={name} />
        <Row k="รหัสนิสิต" v={studentId} />
        <Row k="วันที่" v={thDate(at)} />
        <Row k="เวลายืนยัน" v={`${thTime(at)} น.`} />
        {distance !== undefined && <Row k="ระยะจากจุดกิจกรรม" v={`${Math.round(distance)} ม.`} />}
        <Row k="เลขอ้างอิง" v={ref} />
      </dl>
    </article>
  )
}
