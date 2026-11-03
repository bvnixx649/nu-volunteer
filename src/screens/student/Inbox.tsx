import { useEffect, useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BellRinging, CalendarCheck, ChatCircle, GearSix, Megaphone, SealCheck } from '@phosphor-icons/react'
import { useMine } from '../../data/mine'
import { api } from '../../data/api'
import type { NoticeKind } from '../../data/types'
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
  const { notices, student, patchStudent, loaded, refresh } = useMine()
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

  const groups = useMemo(() => {
    const today = new Date().toDateString()
    return [
      { label: 'วันนี้', items: notices.filter((n) => new Date(n.at).toDateString() === today) },
      { label: 'ก่อนหน้านี้', items: notices.filter((n) => new Date(n.at).toDateString() !== today) },
    ].filter((g) => g.items.length)
  }, [notices])

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">แจ้งเตือน</h1>
        <Link to="/settings/notify" aria-label="ตั้งค่าการแจ้งเตือน" className="pressable grid size-12 place-items-center rounded-full bg-surface ring-1 ring-line">
          <GearSix size={22} />
        </Link>
      </div>

      {loaded && student && !student.notify?.enabled && (
        <section className="mt-5 flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">เปิดแจ้งเตือนบนเครื่อง</p>
            <p className="text-sm text-muted">รู้ทันทีเมื่อได้รับชั่วโมงหรือผู้คุมประกาศ</p>
          </div>
          <Button onClick={() => enablePush(student, patchStudent)}>เปิด</Button>
        </section>
      )}

      {loaded && notices.length === 0 && (
        <div className="mt-6 rounded-[var(--radius-card)] bg-surface px-6 py-12 text-center shadow-soft">
          <p className="text-lg font-semibold">ยังไม่มีการแจ้งเตือน</p>
          <p className="mt-2 text-muted">ลงทะเบียนหรือรับชั่วโมงแล้วจะขึ้นที่นี่</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.label} className="mt-7">
          <h2 className="mb-1 text-sm font-medium text-muted">{g.label}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
            {g.items.map((n) => (
              <li key={n.id}>
                <button onClick={() => (n.to ? nav(n.to) : n.activityId && nav(`/a/${n.activityId}`))} className="pressable flex w-full items-start gap-4 px-4 py-4 text-left">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full ${GOOD.has(n.kind) ? 'bg-ok-soft text-ok' : 'bg-surface-2'}`}>{ICON[n.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`truncate ${n.read ? '' : 'font-bold'}`}>{n.title}</span>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(n.at)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{n.body}</span>
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
