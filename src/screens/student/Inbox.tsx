import { useEffect, useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BellRinging, CalendarCheck, ChatCircle, GearSix, Megaphone, SealCheck } from '@phosphor-icons/react'
import { useMine } from '../../data/mine'
import { api } from '../../data/api'
import type { NoticeKind } from '../../data/types'
import { MESSAGES_ON } from '../../config'
import { timeAgo } from '../../lib/format'
import { Button } from '../../ui/Button'
import { enablePush } from '../../lib/push'

const ICON: Record<NoticeKind, ReactNode> = {
  registered: <CalendarCheck size={22} weight="fill" />,
  open: <BellRinging size={22} weight="fill" />,
  announce: <Megaphone size={22} weight="fill" />,
  credit: <SealCheck size={22} weight="fill" />,
  recorded: <SealCheck size={22} weight="fill" />,
  chat: <ChatCircle size={22} weight="fill" />,
}
const GOOD = new Set<NoticeKind>(['credit', 'recorded'])

/** Notices from the database, newest first. Leaving the page marks them read. */
export default function Inbox() {
  const nav = useNavigate()
  const { notices: all, student, patchStudent, loaded, refresh } = useMine()
  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const id = student?.id
    if (!id) return
    return () => {
      if (useMine.getState().notices.some((n) => !n.read)) {
        api.markNoticesRead(id).then(() => useMine.setState((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })))
      }
    }
  }, [student?.id])

  // A message notice opens the private thread or the chat room, which have no way in while messages are off.
  const notices = useMemo(() => (MESSAGES_ON ? all : all.filter((n) => n.kind !== 'chat' && !/\/(dm|chat)$/.test(n.to ?? ''))), [all])

  const groups = useMemo(() => {
    const today = new Date().toDateString()
    return [
      { label: 'วันนี้', items: notices.filter((n) => new Date(n.at).toDateString() === today) },
      { label: 'ก่อนหน้านี้', items: notices.filter((n) => new Date(n.at).toDateString() !== today) },
    ].filter((g) => g.items.length)
  }, [notices])

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">แจ้งเตือน</h1>
        <Link to="/settings/notify" aria-label="ตั้งค่าการแจ้งเตือน" className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-surface-2">
          <GearSix size={22} />
        </Link>
      </div>

      {loaded && student && !student.notify?.enabled && (
        <section className="mt-5 flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">เปิดแจ้งเตือนบนเครื่อง</p>
            <p className="text-[13.5px] text-muted">แจ้งเมื่อได้รับชั่วโมงหรือมีประกาศ</p>
          </div>
          <Button onClick={() => enablePush(student, patchStudent)}>เปิด</Button>
        </section>
      )}

      {loaded && notices.length === 0 && (
        <div className="mt-5 rounded-[var(--radius-card)] bg-surface px-6 py-12 text-center">
          <p className="text-lg font-semibold">ยังไม่มีการแจ้งเตือน</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.label} className="mt-7">
          <h2 className="mb-2 px-1 text-[15px] font-medium text-muted">{g.label}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
            {g.items.map((n) => (
              <li key={n.id}>
                <button onClick={() => (n.to ? nav(n.to) : n.activityId && nav(`/a/${n.activityId}`))} className="pressable flex w-full items-start gap-3.5 p-4 text-left">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full ${GOOD.has(n.kind) ? 'bg-ok-soft text-ok' : 'bg-surface-2'}`}>{ICON[n.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`num min-w-0 leading-snug ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
                      <span className="num shrink-0 text-[13px] text-muted">{timeAgo(n.at)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[13.5px] text-muted">{n.body}</span>
                  </span>
                  {!n.read && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-accent" aria-label="ยังไม่ได้อ่าน" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
