import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import type { Activity } from '../../../data/types'
import { fmtHours, thDayMonth, thTime } from '../../../lib/format'
import { deadlineSub, regInfo, rowSub, TH_MONTHS_SHORT, type Groups, type UpcomingSplit } from '../../../lib/home'
import { stage } from '../../../lib/stage'
import { StatusTag } from '../../../ui/StatusTag'
import { CARD, DateTile, PhotoChip, PosterImg, SeatLine } from './parts'

const delayOf = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

function Heading({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="px-1 pb-3 text-xl font-semibold">
      {title} <span className="num font-medium text-muted">{count}</span>
    </h2>
  )
}

/** One row of a list card: poster thumbnail, title, status tag with one short line, chevron. */
function Row({ a, now, showOrg, first, thumb, meta }: { a: Activity; now: number; showOrg: boolean; first: boolean; thumb?: ReactNode; meta?: ReactNode }) {
  const s = stage(a, now)
  return (
    <li className={first ? '' : 'border-t border-line'}>
      <Link to={`/sup/a/${a.id}`} className="pressable group flex items-center gap-3.5 p-3.5">
        {thumb ?? (
          <span className="relative block size-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
            <PosterImg src={a.poster} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-base leading-[1.35] font-semibold">{a.title}</span>
          <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {meta ?? (
              <>
                <StatusTag stage={s} size="sm" />
                <span className="num min-w-0 text-[13.5px] text-muted">{rowSub(a, s, now)}</span>
              </>
            )}
          </span>
          {showOrg && <span className="mt-1 block truncate text-[13.5px] text-muted">{a.org}</span>}
        </span>
        <CaretRight size={18} className="shrink-0 text-faint" aria-hidden />
      </Link>
    </li>
  )
}

/** A roster an organisation sent: the date it arrived, how many people and the hours each gets. The centre has to record it. */
function WaitingRow({ a, now, first }: { a: Activity; now: number; first: boolean }) {
  return (
    <Row
      a={a}
      now={now}
      showOrg
      first={first}
      meta={
        <>
          <StatusTag stage="waiting" tone="accent" size="sm" label={`ส่งแล้ว ${thDayMonth(a.submittedAt ?? a.end)}`} />
          <span className="num min-w-0 text-[13.5px] text-muted">
            {a.creditCount.toLocaleString('th-TH')} คน {fmtHours(a.hours)} ชั่วโมงต่อคน
          </span>
        </>
      }
    />
  )
}

/** An activity of another organisation that has ended without a sent roster: its stage and what is left of the 30 days. */
function UnsentRow({ a, now, first }: { a: Activity; now: number; first: boolean }) {
  const left = deadlineSub(a, now)
  return (
    <Row
      a={a}
      now={now}
      showOrg
      first={first}
      meta={
        <>
          <StatusTag stage={stage(a, now)} size="sm" />
          <span className={`num min-w-0 text-[13.5px] ${left.late ? 'text-bad' : 'text-muted'}`}>{left.text}</span>
        </>
      }
    />
  )
}

/** Row whose poster carries the day and month over a dark scrim, for the activities further out. */
function DateRow({ a, now, showOrg, first }: { a: Activity; now: number; showOrg: boolean; first: boolean }) {
  const d = new Date(a.start)
  return (
    <Row
      a={a}
      now={now}
      showOrg={showOrg}
      first={first}
      thumb={
        <span className="relative block size-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          <PosterImg src={a.poster} />
          <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 leading-[1.1]">
            <span className="num text-xl font-semibold">{d.getDate()}</span>
            <span className="text-[11.5px] text-ink">{TH_MONTHS_SHORT[d.getMonth()]}</span>
          </span>
        </span>
      }
    />
  )
}

/** A poster card for one of the nearest activities. */
function BigCard({ a, now, showOrg, delay }: { a: Activity; now: number; showOrg: boolean; delay: number }) {
  return (
    <li className="rise" style={delayOf(delay)}>
      <Link to={`/sup/a/${a.id}`} className="pressable group block">
        <div className="relative h-44 overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
          <PosterImg src={a.poster} />
          <DateTile ms={a.start} now={now} />
          <PhotoChip stage={stage(a, now)} />
        </div>
        <div className="px-1 pt-3">
          <p className="line-clamp-2 text-lg leading-[1.35] font-semibold text-balance">{a.title}</p>
          <p className="num mt-1 text-[13.5px] text-muted">
            {thTime(a.start)} ถึง {thTime(a.end)} น.{a.place ? ` ${a.place}` : ''}
          </p>
          {showOrg && <p className="truncate text-[13.5px] text-muted">{a.org}</p>}
          <SeatLine info={regInfo(a, now)} className="mt-3" />
        </div>
      </Link>
    </li>
  )
}

/** A sent roster: small poster, title on one line, the tag next to the date it was sent. */
function SentRow({ a, now, showOrg, first }: { a: Activity; now: number; showOrg: boolean; first: boolean }) {
  const s = stage(a, now)
  return (
    <li className={first ? '' : 'border-t border-line'}>
      <Link to={`/sup/a/${a.id}`} className="pressable group flex items-center gap-3.5 p-3.5">
        <span className="relative block size-12 shrink-0 overflow-hidden rounded-[14px] bg-surface-2">
          <PosterImg src={a.poster} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-semibold">{a.title}</span>
          <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <StatusTag stage={s} size="sm" />
            <span className="num min-w-0 text-[13.5px] text-muted">{rowSub(a, s, now)}</span>
          </span>
          {showOrg && <span className="mt-0.5 block truncate text-[13.5px] text-muted">{a.org}</span>}
        </span>
      </Link>
    </li>
  )
}

/** What only the centre admin sees on top of the supervisor lists. */
export interface AdminLists {
  waiting: Activity[]
  unsent: Activity[]
}

/** Activities that are not running: what needs the supervisor, what is coming, and (folded away) what is already sent. */
export function ActivityList({ groups, split, showOrg, now, admin }: { groups: Groups; split: UpcomingSplit; showOrg: boolean; now: number; admin?: AdminLists }) {
  const [showSent, setShowSent] = useState(false)
  const upcomingCount = split.big.length + split.small.length
  return (
    <>
      {admin && admin.waiting.length > 0 && (
        <section className="rise" style={delayOf(100)}>
          <Heading title="รอบันทึกลงระบบ" count={admin.waiting.length} />
          <ul className={CARD}>
            {admin.waiting.map((a, i) => (
              <WaitingRow key={a.id} a={a} now={now} first={i === 0} />
            ))}
          </ul>
        </section>
      )}

      {groups.todo.length > 0 && (
        <section className="rise" style={delayOf(120)}>
          <Heading title="รอดำเนินการ" count={groups.todo.length} />
          <ul className={CARD}>
            {groups.todo.map((a, i) => (
              <Row key={a.id} a={a} now={now} showOrg={showOrg} first={i === 0} />
            ))}
          </ul>
        </section>
      )}

      {admin && admin.unsent.length > 0 && (
        <section className="rise" style={delayOf(150)}>
          <Heading title="หน่วยงานที่ยังไม่ส่งรายชื่อ" count={admin.unsent.length} />
          <ul className={CARD}>
            {admin.unsent.map((a, i) => (
              <UnsentRow key={a.id} a={a} now={now} first={i === 0} />
            ))}
          </ul>
        </section>
      )}

      {upcomingCount > 0 && (
        <section className="rise" style={delayOf(180)}>
          <Heading title="กิจกรรมที่จะจัดขึ้น" count={upcomingCount} />
          <ul className="flex flex-col gap-6">
            {split.big.map((a, i) => (
              <BigCard key={a.id} a={a} now={now} showOrg={showOrg} delay={200 + i * 40} />
            ))}
          </ul>
          {split.small.length > 0 && (
            <ul className={`${CARD} mt-6`}>
              {split.small.map((a, i) => (
                <DateRow key={a.id} a={a} now={now} showOrg={showOrg} first={i === 0} />
              ))}
            </ul>
          )}
        </section>
      )}

      {groups.sent.length > 0 && (
        <section className="rise" style={delayOf(260)}>
          <h2 className="text-xl font-semibold">
            <button type="button" aria-expanded={showSent} onClick={() => setShowSent((v) => !v)} className="pressable flex min-h-14 w-full items-center gap-2 px-1 text-left">
              <span>
                {admin ? 'บันทึกแล้ว' : 'ส่งรายชื่อแล้ว'} <span className="num font-medium text-muted">{groups.sent.length}</span>
              </span>
              <CaretDown size={18} className={`text-muted transition-transform duration-300 ${showSent ? 'rotate-180' : ''}`} />
            </button>
          </h2>
          {showSent && (
            <ul className={`${CARD} mt-1`}>
              {groups.sent.map((a, i) => (
                <SentRow key={a.id} a={a} now={now} showOrg={showOrg} first={i === 0} />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
