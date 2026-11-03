import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { create } from 'zustand'
import { CalendarBlank, CaretRight, CloudSlash, ListBullets, QrCode } from '@phosphor-icons/react'
import { now as serverNow } from '../data/api'
import { useMine } from '../data/mine'
import { CATEGORIES, CATEGORY_KEYS } from '../data/categories'
import type { CategoryKey } from '../data/types'
import { SOON_DAYS } from '../config'
import { buildFeed, liveForScan, type When, WHEN } from '../lib/student'
import { busyDays, dayKey } from '../lib/home'
import { thDate, thTime } from '../lib/format'
import { sendPending, usePending } from '../lib/pending'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { CountUp } from '../ui/CountUp'
import { LinkButton } from '../ui/LinkButton'
import { MonthCalendar } from './sup/home/MonthCalendar'
import { ActivityCard } from './student/ActivityCard'

/** Filters survive a trip to the detail page and back. */
const useUi = create<{ view: 'list' | 'cal'; when: When; seatsOnly: boolean; category: CategoryKey | null; set: (p: Partial<{ view: 'list' | 'cal'; when: When; seatsOnly: boolean; category: CategoryKey | null }>) => void }>((set) => ({
  view: 'list',
  when: 'all',
  seatsOnly: false,
  category: null,
  set: (p) => set(p),
}))

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-30 animate-pulse rounded-[var(--radius-card)] bg-surface" />
      ))}
    </div>
  )
}

export default function Home() {
  const { student, activities, regs, credits, loaded, failed } = useMine()
  const ui = useUi()
  const pending = usePending()
  const [sending, setSending] = useState(false)
  const now = serverNow()
  const [cal, setCal] = useState(() => {
    const d = new Date(now)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [day, setDay] = useState<string>()

  const total = useMemo(() => credits.reduce((t, c) => t + c.hours, 0), [credits])
  const feed = useMemo(
    () => buildFeed({ activities, regs, credits, now, when: ui.view === 'cal' ? 'all' : ui.when, seatsOnly: ui.seatsOnly, category: ui.category }),
    [activities, regs, credits, now, ui.view, ui.when, ui.seatsOnly, ui.category],
  )
  const live = useMemo(() => liveForScan(activities, regs, credits, now), [activities, regs, credits, now])
  const dayItems = day ? feed.items.filter((f) => dayKey(f.a.start) === day) : []
  const filtered = ui.when !== 'all' || ui.seatsOnly || ui.category !== null
  const firstName = student?.name.split(' ')[0] ?? ''

  const sections = [
    { title: 'ใกล้ถึงวัน', sub: `เริ่มภายใน ${SOON_DAYS} วัน`, list: feed.soon },
    { title: 'เปิดรับสมัคร', sub: '', list: feed.open },
    { title: 'ยังไม่เปิดรับ', sub: 'ตั้งเตือนล่วงหน้าได้', list: feed.notYet },
  ].filter((s) => s.list.length)

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <h1 className="text-3xl leading-tight font-bold tracking-tight break-words">{firstName ? `สวัสดี ${firstName}` : 'จิตอาสา มน.'}</h1>

      {pending.length > 0 && (
        <section className="mt-5 flex items-center gap-3 rounded-[var(--radius-card)] bg-warn-soft p-4" aria-label="การสแกนรอส่ง">
          <CloudSlash size={26} weight="fill" className="shrink-0 text-warn" />
          <p className="num min-w-0 flex-1 font-semibold text-warn">มีการสแกนรอส่ง {pending.length} รายการ</p>
          <Button
            variant="secondary"
            loading={sending}
            onClick={async () => {
              setSending(true)
              await sendPending(true)
              setSending(false)
            }}
          >
            ส่งตอนนี้
          </Button>
        </section>
      )}

      <Link to="/me" className="pressable mt-5 flex items-end justify-between gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-soft">
        <div>
          <p className="text-muted">ชั่วโมงจิตอาสาสะสม</p>
          <p className="mt-1 flex items-baseline gap-2">
            <CountUp value={total} className="text-6xl leading-none font-bold tracking-tight" />
            <span className="font-semibold text-muted">ชั่วโมง</span>
          </p>
        </div>
        <span className="flex items-center gap-1 pb-1 text-sm font-medium text-accent">
          ดู Transcript <CaretRight size={16} weight="bold" />
        </span>
      </Link>

      {live.map((a, i) => (
        <motion.section
          key={a.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: 0.1 + i * 0.05 }}
          className="mt-4 rounded-[var(--radius-card)] bg-accent-soft p-5"
          aria-label="กิจกรรมที่กำลังดำเนินอยู่"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-accent">
            <span className="size-2 animate-pulse rounded-full bg-accent" /> กำลังดำเนินอยู่ ถึง {thTime(a.end)} น.
          </p>
          <Link to={`/a/${a.id}`} className="mt-2 line-clamp-2 block text-lg leading-snug font-semibold">
            {a.title}
          </Link>
          <p className="mt-1 text-muted">สแกน QR ที่งานเพื่อรับ {a.hours} ชั่วโมง</p>
          <LinkButton to="/scan" variant="primary" className="mt-4 w-full">
            <QrCode size={22} weight="bold" /> สแกนรับชั่วโมง
          </LinkButton>
        </motion.section>
      ))}

      <div className="mt-9 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">กิจกรรมจิตอาสา</h2>
        <div role="group" aria-label="รูปแบบการแสดง" className="flex rounded-full bg-surface-2 p-1">
          {(
            [
              ['list', 'ดูเป็นรายการ', ListBullets],
              ['cal', 'ดูเป็นปฏิทิน', CalendarBlank],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              aria-label={label}
              aria-pressed={ui.view === k}
              onClick={() => ui.set({ view: k })}
              className={`pressable grid size-11 place-items-center rounded-full transition-colors ${ui.view === k ? 'bg-surface text-ink shadow-soft' : 'text-muted'}`}
            >
              <Icon size={22} weight="bold" />
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5" role="group" aria-label="กรองตามหมวด">
        <Chip selected={ui.category === null} onClick={() => ui.set({ category: null })}>
          ทุกหมวด
        </Chip>
        {CATEGORY_KEYS.filter((k) => k !== 'other' || ui.category === 'other' || activities.some((a) => a.categoryKey === 'other')).map((k) => (
          <Chip key={k} selected={ui.category === k} onClick={() => ui.set({ category: k })}>
            {CATEGORIES[k].label}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5" role="group" aria-label="กรองกิจกรรม">
        {ui.view === 'list' &&
          WHEN.map((w) => (
            <Chip key={w.key} selected={ui.when === w.key} onClick={() => ui.set({ when: w.key })}>
              {w.label}
            </Chip>
          ))}
        <Chip selected={ui.seatsOnly} onClick={() => ui.set({ seatsOnly: !ui.seatsOnly })}>
          ยังมีที่ว่าง
        </Chip>
      </div>
      {filtered && ui.view === 'list' && (
        <p className="num mt-3 text-sm text-muted">
          พบ {feed.items.length} กิจกรรม{' '}
          <button className="font-semibold text-accent" onClick={() => ui.set({ when: 'all', seatsOnly: false, category: null })}>
            ล้างตัวกรอง
          </button>
        </p>
      )}

      {!loaded ? (
        <div className="mt-6">
          <Skeleton />
        </div>
      ) : failed ? (
        <p className="mt-6 rounded-[var(--radius-card)] bg-bad-soft px-5 py-4 text-bad">โหลดกิจกรรมไม่ได้ ตรวจอินเทอร์เน็ตแล้วเปิดแอปใหม่</p>
      ) : ui.view === 'cal' ? (
        <div className="mt-6 flex flex-col gap-5">
          <MonthCalendar
            year={cal.year}
            month={cal.month}
            onMonth={(year, month) => setCal({ year, month })}
            busy={busyDays(feed.items.map((f) => f.a))}
            selected={day}
            onSelect={setDay}
            now={now}
          />
          {day ? (
            <>
              <p className="num font-semibold">กิจกรรมวันที่ {thDate(new Date(`${day}T00:00:00`).getTime())}</p>
              {dayItems.map((f, i) => (
                <ActivityCard key={f.a.id} {...f} now={now} index={i} />
              ))}
              {!dayItems.length && <p className="text-muted">ไม่มีกิจกรรมในวันนี้</p>}
            </>
          ) : (
            <p className="text-muted">แตะวันที่ที่มีจุดเพื่อดูกิจกรรม</p>
          )}
        </div>
      ) : feed.items.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-card)] bg-surface px-6 py-12 text-center shadow-soft">
          <p className="text-lg font-semibold">{filtered ? 'ไม่พบกิจกรรมตามตัวกรอง' : 'ยังไม่มีกิจกรรมเปิดรับ'}</p>
          <p className="mt-2 text-muted">{filtered ? 'ลองเปลี่ยนหมวดหรือวัน หรือล้างตัวกรอง' : 'กิจกรรมใหม่จะแสดงที่นี่'}</p>
        </div>
      ) : (
        sections.map((s) => (
          <section key={s.title} className="mt-8">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h3 className="text-lg font-semibold">
                {s.title} <span className="num text-muted">{s.list.length}</span>
              </h3>
              {s.sub && <span className="text-sm text-muted">{s.sub}</span>}
            </div>
            <div className="flex flex-col gap-4">
              {s.list.map((f, i) => (
                <ActivityCard key={f.a.id} {...f} now={now} index={i} />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  )
}
