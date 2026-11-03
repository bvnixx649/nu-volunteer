import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowsClockwise, MagnifyingGlass } from '@phosphor-icons/react'
import { api } from '../../data/api'
import type { Activity, Credit } from '../../data/types'
import { creditList } from '../../lib/roster'
import { fmtHours, thTime } from '../../lib/format'
import { useDevice } from '../../store'
import { BackBar } from '../../ui/BackBar'

const COLS = 'grid-cols-[1.75rem_5.25rem_minmax(0,1fr)_2rem_2.75rem]'

/** Everyone who got hours in the activity, like the paper sign-in sheet. One read plus a refresh button; no realtime. */
export default function StudentRoster() {
  const { id = '' } = useParams()
  const me = useDevice((s) => s.studentId)
  const [activity, setActivity] = useState<Activity | null>()
  const [credits, setCredits] = useState<Credit[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const own = useRef<HTMLLIElement>(null)
  const scrolled = useRef(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const [a, c] = await Promise.all([api.getActivity(id), api.listCredits(id)])
      setActivity(a)
      setCredits(c)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }, [id])
  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => creditList(credits ?? [], q), [credits, q])

  // Bring the student's own row into view once, after the first list arrives.
  useEffect(() => {
    if (!scrolled.current && own.current) {
      scrolled.current = true
      own.current.scrollIntoView({ block: 'center' })
    }
  }, [rows])

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <BackBar fallback={`/a/${id}`} />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">ตรวจสอบรายชื่อ</h1>
      {activity && <p className="mt-1 line-clamp-2 text-muted">{activity.title}</p>}

      <div className="sticky top-0 z-10 -mx-5 mt-4 flex gap-2 bg-bg px-5 py-2">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full bg-surface px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
          <MagnifyingGlass size={20} className="shrink-0 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นด้วยรหัสหรือชื่อ"
            aria-label="ค้นด้วยรหัสหรือชื่อ"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
        </label>
        <button
          onClick={load}
          disabled={busy}
          aria-label="โหลดรายชื่อใหม่"
          className="pressable grid size-12 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-line"
        >
          <ArrowsClockwise size={22} className={busy ? 'animate-spin' : ''} />
        </button>
      </div>

      {failed && <p className="mt-4 rounded-[var(--radius-card)] bg-bad-soft px-5 py-4 text-bad">โหลดรายชื่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วกดโหลดใหม่</p>}

      {credits && (
        <>
          <p className="num mt-2 mb-3 text-muted">{q ? `พบ ${rows.length} จาก ${credits.length} คน` : `${credits.length} คน`}</p>
          {rows.length === 0 ? (
            <p className="rounded-[var(--radius-card)] bg-surface px-5 py-8 text-center text-muted">{credits.length ? 'ไม่พบรายชื่อที่ตรงกัน' : 'ยังไม่มีใครได้รับชั่วโมง'}</p>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
              <div className={`grid ${COLS} gap-x-2 border-b border-line px-4 py-2.5 text-sm text-muted`}>
                <span>ที่</span>
                <span>รหัส</span>
                <span>ชื่อ</span>
                <span className="text-right">ชม.</span>
                <span className="text-right">เวลา</span>
              </div>
              <ul className="divide-y divide-line">
                {rows.map(({ n, credit: c }) => {
                  const mine = c.studentId === me
                  return (
                    <li
                      key={c.studentId}
                      ref={mine ? own : undefined}
                      data-own={mine || undefined}
                      className={`grid ${COLS} items-start gap-x-2 px-4 py-3 text-[15px] ${mine ? 'bg-accent-soft font-bold shadow-[inset_3px_0_0_var(--color-accent)]' : ''}`}
                    >
                      <span className="num text-muted">{n}</span>
                      <span className="num">{c.studentId}</span>
                      <span className="line-clamp-2 break-words">{c.name}</span>
                      <span className="num text-right">{fmtHours(c.hours)}</span>
                      <span className={`num text-right ${mine ? 'text-accent' : 'text-muted'}`}>{thTime(c.at)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  )
}
