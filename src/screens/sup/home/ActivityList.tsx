import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DotsThree, PencilSimple, PushPin, QrCode } from '@phosphor-icons/react'
import type { Activity } from '../../../data/types'
import { isBottle } from '../../../lib/bottle'
import { thDate, thDayMonth, thTime } from '../../../lib/format'
import { deadlineSub, endedLine, rowSub, type HomeFilter, type HomeSections } from '../../../lib/home'
import { toggle, usePins } from '../../../lib/pins'
import { canEdit, qrClosed, stage } from '../../../lib/stage'
import { Sheet } from '../../../ui/Sheet'
import { StatusTag } from '../../../ui/StatusTag'
import { CARD, DayThumb } from './parts'

const delayOf = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

function Heading({ title, count, icon }: { title: string; count: number; icon?: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 px-1 pb-3 text-xl font-semibold">
      {icon}
      {title} <span className="num font-medium text-muted">{count}</span>
    </h2>
  )
}

/** A section of the home: heading with its count, then the card of rows. */
function Section({ title, count, icon, delay, children }: { title: string; count: number; icon?: ReactNode; delay: number; children: ReactNode }) {
  return (
    <section className="rise" style={delayOf(delay)}>
      <Heading title={title} count={count} icon={icon} />
      <ul className={CARD}>{children}</ul>
    </section>
  )
}

interface RowProps {
  a: Activity
  now: number
  showOrg: boolean
  first: boolean
  meta?: ReactNode
  onMenu: (a: Activity) => void
}

/** One activity: a day thumbnail, the one-line title, the status tag with one short line, and a trailing dots button. The link and the button are siblings. */
function Row({ a, now, showOrg, first, meta, onMenu }: RowProps) {
  const s = stage(a, now)
  return (
    <li className={first ? '' : 'border-t border-line'}>
      <div className="flex items-center">
        <Link to={`/sup/a/${a.id}`} className="pressable group flex min-w-0 flex-1 items-center gap-3.5 py-3 pl-3.5">
          <DayThumb src={a.poster} ms={a.start} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base leading-[1.35] font-semibold">{a.title}</span>
            <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {meta ?? (
                <>
                  <StatusTag stage={s} size="sm" />
                  <span className="num min-w-0 truncate text-[13.5px] text-muted">{rowSub(a, s, now)}</span>
                </>
              )}
            </span>
            {showOrg && <span className="mt-1 block truncate text-[13.5px] text-muted">{a.org}</span>}
          </span>
        </Link>
        <button
          type="button"
          aria-label={`ตัวเลือกของ ${a.title}`}
          onClick={() => onMenu(a)}
          className="pressable mr-1.5 grid size-11 shrink-0 place-items-center rounded-full text-faint"
        >
          <DotsThree size={24} weight="bold" aria-hidden />
        </button>
      </div>
    </li>
  )
}

const OPTION = 'pressable flex min-h-14 w-full items-center gap-3.5 rounded-2xl bg-surface-2 px-4 text-left text-base font-medium'

/** The row menu: pin or unpin, show the QR when hours can still be claimed, edit while the roster is not sent. */
function ActivityMenu({ a, now, pinned, onDone }: { a: Activity; now: number; pinned: boolean; onDone: () => void }) {
  const qr = !isBottle(a) && !qrClosed(a, now)
  return (
    <div className="flex flex-col gap-2">
      <p className="num px-1 text-[13.5px] text-muted">
        {thDate(a.start)} เวลา {thTime(a.start)} ถึง {thTime(a.end)} น.
      </p>
      <button
        type="button"
        onClick={() => {
          toggle(a.id)
          onDone()
        }}
        className={OPTION}
      >
        <PushPin size={22} weight={pinned ? 'fill' : 'regular'} aria-hidden />
        {pinned ? 'เลิกปักหมุด' : 'ปักหมุดไว้บนสุด'}
      </button>
      {qr && (
        <Link to={`/sup/a/${a.id}?qr=1`} onClick={onDone} className={OPTION}>
          <QrCode size={22} aria-hidden />
          แสดง QR รับชั่วโมง
        </Link>
      )}
      {canEdit(a) && (
        <Link to={`/sup/edit/${a.id}`} onClick={onDone} className={OPTION}>
          <PencilSimple size={22} aria-hidden />
          แก้ไขกิจกรรม
        </Link>
      )}
    </div>
  )
}

/** Sections of the supervisor home, filtered by the chip above them: everything, what needs action, or what is coming. Live cards are not here. */
export function ActivityList({ s, filter, admin, now }: { s: HomeSections; filter: HomeFilter; admin: boolean; now: number }) {
  const pinIds = usePins((st) => st.ids)
  const [menu, setMenu] = useState<Activity | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const openMenu = useCallback((a: Activity) => {
    setMenu(a)
    setMenuOpen(true)
  }, [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const all = filter === 'all'
  const todo = all || filter === 'todo'
  const upcoming = all || filter === 'upcoming'
  const row = (a: Activity, first: boolean, meta?: ReactNode) => <Row key={a.id} a={a} now={now} showOrg={admin} first={first} meta={meta} onMenu={openMenu} />

  return (
    <>
      {all && s.pinned.length > 0 && (
        <Section title="ปักหมุด" count={s.pinned.length} icon={<PushPin size={18} weight="fill" className="text-muted" aria-hidden />} delay={100}>
          {s.pinned.map((a, i) => row(a, i === 0))}
        </Section>
      )}

      {todo && s.waiting.length > 0 && (
        <Section title="รอบันทึกลงระบบ" count={s.waiting.length} delay={120}>
          {s.waiting.map((a, i) =>
            row(
              a,
              i === 0,
              <>
                <StatusTag stage="waiting" tone="accent" size="sm" label={`ส่งแล้ว ${thDayMonth(a.submittedAt ?? a.end)}`} />
                <span className="num min-w-0 text-[13.5px] text-muted">{endedLine(a)}</span>
              </>,
            ),
          )}
        </Section>
      )}

      {todo && s.todo.length > 0 && (
        <Section title="ต้องดำเนินการ" count={s.todo.length} delay={140}>
          {s.todo.map((a, i) => row(a, i === 0))}
        </Section>
      )}

      {todo && s.unsent.length > 0 && (
        <Section title="หน่วยงานที่ยังไม่ส่งรายชื่อ" count={s.unsent.length} delay={160}>
          {s.unsent.map((a, i) => {
            const left = deadlineSub(a, now)
            return row(
              a,
              i === 0,
              <>
                <StatusTag stage={stage(a, now)} size="sm" />
                <span className={`num min-w-0 text-[13.5px] ${left.late ? 'text-bad' : 'text-muted'}`}>{left.text}</span>
              </>,
            )
          })}
        </Section>
      )}

      {upcoming && s.upcoming.length > 0 && (
        <Section title="จะจัดขึ้น" count={s.upcoming.length} delay={180}>
          {s.upcoming.map((a, i) => row(a, i === 0))}
        </Section>
      )}

      <Sheet open={menuOpen} onClose={closeMenu} title={menu?.title ?? ''}>
        {menu && <ActivityMenu a={menu} now={now} pinned={pinIds.includes(menu.id)} onDone={closeMenu} />}
      </Sheet>
    </>
  )
}
