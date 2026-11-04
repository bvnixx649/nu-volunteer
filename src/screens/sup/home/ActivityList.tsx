import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CaretDown, CheckCircle, ListChecks, PaperPlaneTilt, SealCheck } from '@phosphor-icons/react'
import type { Activity } from '../../../data/types'
import { dateTile, thDayMonth, thTime } from '../../../lib/format'
import { groupActivities } from '../../../lib/home'
import { daysToSubmit, stage, submitDeadline, type Stage } from '../../../lib/stage'
import { StatusTag } from '../../../ui/StatusTag'

const n = (v: number) => v.toLocaleString('th-TH')

/** The icon tile of a row that is not upcoming: tint follows the stage. */
const TILE: Partial<Record<Stage, { tint: string; icon: ReactNode }>> = {
  closing: { tint: 'bg-warn/15 text-warn', icon: <ListChecks size={20} /> },
  submit: { tint: 'bg-accent/15 text-accent', icon: <PaperPlaneTilt size={20} /> },
  waiting: { tint: 'bg-white/[0.06] text-muted', icon: <CheckCircle size={20} /> },
  done: { tint: 'bg-white/[0.06] text-muted', icon: <SealCheck size={20} /> },
}

/** The one muted line under a title. */
function subline(a: Activity, s: Stage, now: number) {
  if (s === 'closing') return `${n(a.creditCount)} คนได้รับชั่วโมงแล้ว`
  if (s === 'submit') {
    const days = daysToSubmit(a, now)
    return days > 0 ? `ส่งภายใน ${thDayMonth(submitDeadline(a))} อีก ${days} วัน` : 'เลยกำหนดส่งรายชื่อแล้ว'
  }
  if (s === 'open') return a.capLimit ? `ลงทะเบียน ${n(a.regCount)} จาก ${n(a.capacity)} คน` : `ลงทะเบียน ${n(a.regCount)} คน`
  if (s === 'scheduled') return a.opensAt ? `เปิดรับ ${thDayMonth(a.opensAt)} ${thTime(a.opensAt)} น.` : 'ยังไม่เปิดรับ'
  return `${n(a.creditCount)} คนได้รับชั่วโมงแล้ว`
}

function Row({ a, now, showOrg, first }: { a: Activity; now: number; showOrg: boolean; first: boolean }) {
  const s = stage(a, now)
  const upcoming = s === 'open' || s === 'scheduled'
  const tile = TILE[s]
  const d = dateTile(a.start, now)
  return (
    <li className={first ? '' : 'border-t border-white/5'}>
      <Link to={`/sup/a/${a.id}`} className="pressable flex items-center gap-3 px-4 py-3.5">
        {upcoming ? (
          <span className="w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" aria-hidden>
            <span className="block pt-[3px] text-[10.5px] leading-tight font-semibold whitespace-nowrap text-[#f7a57a]">{d.dow}</span>
            <span className="num block text-lg leading-[1.1] font-semibold">{d.day}</span>
            <span className="block pb-1 text-[10.5px] leading-tight text-muted">{d.mon}</span>
          </span>
        ) : (
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tile?.tint}`} aria-hidden>
            {tile?.icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{a.title}</span>
          {s === 'open' && a.capLimit && a.capacity > 0 && (
            <span className="my-1.5 block h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.round((a.regCount / a.capacity) * 100))}%` }} />
            </span>
          )}
          <span className="num mt-px block truncate text-[13px] text-muted">{subline(a, s, now)}</span>
          {showOrg && <span className="block truncate text-[13px] text-muted">{a.org}</span>}
        </span>
        <StatusTag stage={s} />
      </Link>
    </li>
  )
}

function Group({ title, list, now, showOrg, delay }: { title: string; list: Activity[]; now: number; showOrg: boolean; delay: number }) {
  if (!list.length) return null
  return (
    <section className="rise" style={{ '--d': `${delay}ms` } as CSSProperties}>
      <h2 className="px-1 pb-3 text-[19px] font-semibold">
        {title} <span className="num font-medium text-muted">{list.length}</span>
      </h2>
      <ul className="overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface">
        {list.map((a, i) => (
          <Row key={a.id} a={a} now={now} showOrg={showOrg} first={i === 0} />
        ))}
      </ul>
    </section>
  )
}

/** Activities that are not running: what needs the supervisor, what is coming, and (folded away) what is already sent. */
export function ActivityList({ list, showOrg, now }: { list: Activity[]; showOrg: boolean; now: number }) {
  const [showSent, setShowSent] = useState(false)
  const g = groupActivities(list, now)
  return (
    <>
      <Group title="รอดำเนินการ" list={g.todo} now={now} showOrg={showOrg} delay={140} />
      <Group title="กิจกรรมที่จะจัดขึ้น" list={g.upcoming} now={now} showOrg={showOrg} delay={200} />
      {g.sent.length > 0 && (
        <section className="rise" style={{ '--d': '260ms' } as CSSProperties}>
          <h2 className="text-[19px] font-semibold">
            <button type="button" aria-expanded={showSent} onClick={() => setShowSent((v) => !v)} className="pressable -my-1 flex min-h-11 w-full items-center gap-2 px-1 text-left">
              <span>
                ส่งรายชื่อแล้ว <span className="num font-medium text-muted">{g.sent.length}</span>
              </span>
              <CaretDown size={18} className={`text-muted transition-transform duration-300 ${showSent ? 'rotate-180' : ''}`} />
            </button>
          </h2>
          {showSent && (
            <ul className="mt-2 overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface">
              {g.sent.map((a, i) => (
                <Row key={a.id} a={a} now={now} showOrg={showOrg} first={i === 0} />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}

