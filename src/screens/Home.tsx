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
import { buildFeed, hoursByCategory, liveForScan, type When } from '../lib/student'
import { busyDays, dayKey } from '../lib/home'
import { fmtHours, thDate, thTime } from '../lib/format'
import { sendPending, usePending } from '../lib/pending'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { CountUp } from '../ui/CountUp'
import { LinkButton } from '../ui/LinkButton'
import { Segmented } from '../ui/Segmented'
import { MonthCalendar } from './sup/home/MonthCalendar'
import { ActivityCard } from './student/ActivityCard'

type UiState = { view: 'list' | 'cal'; category: CategoryKey | null; when: When }

/** Filters survive a trip to the detail page and back. */
const useUi = create<UiState & { set: (p: Partial<UiState>) => void }>((set) => ({
  view: 'list',
  category: null,
  when: 'all',
  set: (p) => set(p),
}))

/** The day filter of SPEC 5.3. The longer filters in lib/student stay available to other callers. */
const DAYS: { value: When; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'today', label: 'วันนี้' },
  { value: 'week', label: 'อาทิตย์นี้' },
]

/** The hours bar: the category with the most hours is orange, the rest step down through the neutrals. */
const NEUTRALS = ['var(--color-ink)', 'var(--color-muted)', 'var(--color-faint)', 'var(--color-surface-3)']
function segmentColors(hours: number[]) {
  const top = hours.indexOf(Math.max(...hours))
  let n = 0
  return hours.map((_, i) => (i === top ? 'var(--color-accent)' : NEUTRALS[n++ % NEUTRALS.length]))
}

const ease = [0.23, 1, 0.32, 1] as const
const rise = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease, delay: i * 0.06 },
})

function Skeleton() {
  return (
    <div className="flex flex-col gap-7" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[196px] animate-pulse rounded-[var(--radius-card)] bg-surface" />
      ))}
    </div>
  )
}

export default function Home() {
  const { student, activities, regs, credits, loaded, failed, refresh } = useMine()
  const ui = useUi()
  const pending = usePending()
  const [sending, setSending] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const now = serverNow()
  const [cal, setCal] = useState(() => {
    const d = new Date(now)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [day, setDay] = useState<string>()

  const total = useMemo(() => credits.reduce((t, c) => t + c.hours, 0), [credits])
  const perCategory = useMemo(() => hoursByCategory(credits, activities), [credits, activities])
  const colors = segmentColors(perCategory.map((c) => c.hours))
  const inList = ui.view === 'list'
  const feed = useMemo(
    () => buildFeed({ activities, regs, credits, now, when: inList ? ui.when : 'all', seatsOnly: false, category: ui.category }),
    [activities, regs, credits, now, ui.category, ui.when, inList],
  )
  const live = useMemo(() => liveForScan(activities, regs, credits, now), [activities, regs, credits, now])
  const dayItems = day ? feed.items.filter((f) => dayKey(f.a.start) === day) : []
  const firstName = student?.name.split(' ')[0] ?? ''
  const filtered = ui.category !== null || (inList && ui.when !== 'all')

  // A live activity already has its own scan card above; listing it again would show it twice.
  const liveIds = new Set(live.map((a) => a.id))
  const notLive = (list: typeof feed.soon) => list.filter((f) => !liveIds.has(f.a.id))
  const sections = [
    { key: 'soon', title: 'ใกล้ถึงวัน', note: `เริ่มภายใน ${SOON_DAYS} วัน`, items: notLive(feed.soon) },
    { key: 'open', title: 'เปิดรับสมัคร', note: '', items: notLive(feed.open) },
    { key: 'notYet', title: 'ยังไม่เปิดรับ', note: '', items: notLive(feed.notYet) },
  ].filter((s) => s.items.length > 0)

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]">
      <motion.header {...rise(0)} className="flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}nu-emblem.png`} alt="ตรามหาวิทยาลัยนเรศวร" width={40} height={40} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl leading-tight font-semibold">{firstName ? `สวัสดี ${firstName}` : 'จิตอาสา มน.'}</h1>
          {student && <p className="num truncate text-[13.5px] text-muted">{student.id}</p>}
        </div>
        <button
          type="button"
          aria-label={ui.view === 'cal' ? 'ดูเป็นรายการ' : 'ดูเป็นปฏิทิน'}
          aria-pressed={ui.view === 'cal'}
          onClick={() => ui.set({ view: ui.view === 'cal' ? 'list' : 'cal' })}
          className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink"
        >
          {ui.view === 'cal' ? <ListBullets size={22} /> : <CalendarBlank size={22} />}
        </button>
      </motion.header>

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

      <motion.section {...rise(1)} className="mt-5 rounded-[var(--radius-card)] bg-surface p-5" aria-label="ชั่วโมงจิตอาสาสะสม">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-normal text-muted">ชั่วโมงจิตอาสาสะสม</h2>
          <Link to="/me" className="pressable -my-3 -mr-1 inline-flex min-h-11 items-center gap-0.5 pl-3 text-[15px] font-medium">
            ดูประวัติ <CaretRight size={16} />
          </Link>
        </div>
        <p className="mt-2 flex items-baseline gap-2.5">
          <CountUp value={total} className="text-[72px] leading-none font-semibold tracking-tight" />
          <span className="text-[17px] text-muted">ชั่วโมง</span>
        </p>
        <p className="num mt-2 text-[13.5px] text-muted">{total > 0 ? `จาก ${credits.length} กิจกรรม` : 'เข้าร่วมกิจกรรมแล้วสแกน QR เพื่อรับชั่วโมง'}</p>
        {total > 0 && perCategory.length > 0 && (
          <>
            <div className="mt-5 flex h-2 gap-[3px]" aria-hidden>
              {perCategory.map(({ k, hours }, i) => (
                <motion.div
                  key={k}
                  initial={{ transform: 'scaleX(0)' }}
                  animate={{ transform: 'scaleX(1)' }}
                  transition={{ duration: 0.7, ease, delay: 0.3 + i * 0.08 }}
                  className="origin-left rounded-full"
                  style={{ flex: `${hours} 1 0`, backgroundColor: colors[i] }}
                />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-muted">
              {perCategory.map(({ k, hours }, i) => (
                <li key={k} className="flex items-center gap-1.5">
                  <i aria-hidden className="size-2 rounded-full" style={{ backgroundColor: colors[i] }} />
                  {CATEGORIES[k].label} <b className="num font-semibold text-ink">{fmtHours(hours)}</b>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.section>

      {live.map((a, i) => (
        <motion.section key={a.id} {...rise(2 + i)} className="mt-3 rounded-[var(--radius-card)] bg-ink p-4 text-bg" aria-label="กิจกรรมที่กำลังดำเนินอยู่">
          <div className="flex items-center gap-3.5">
            <img src={a.poster} alt="" className="size-16 shrink-0 rounded-2xl bg-bg/10 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="num flex items-center gap-2 text-[13.5px] font-semibold">
                <span aria-hidden className="live-dot size-2 shrink-0" />
                กำลังดำเนินอยู่ ถึง {thTime(a.end)} น.
              </p>
              <Link to={`/a/${a.id}`} className="mt-1 line-clamp-2 block text-[17px] leading-[1.35] font-semibold text-balance">
                {a.title}
              </Link>
              <p className="num mt-0.5 flex gap-3 text-[13.5px] text-bg/65">
                {a.place && <span className="min-w-0 truncate">{a.place}</span>}
                <span className="shrink-0">
                  {a.categoryKey === 'bottle' ? 'สูงสุด' : 'รับ'} {fmtHours(a.hours)} ชั่วโมง
                </span>
              </p>
            </div>
          </div>
          {a.categoryKey === 'bottle' ? (
            <Link
              to={`/a/${a.id}`}
              className="pressable mt-4 flex min-h-14 w-full items-center justify-center rounded-full bg-bg/10 px-7 text-[17px] font-semibold whitespace-nowrap"
            >
              ดูจุดรับขวด
            </Link>
          ) : (
            <LinkButton to="/scan" variant="accent" className="mt-4 w-full">
              <QrCode size={22} weight="bold" /> สแกนรับชั่วโมง
            </LinkButton>
          )}
        </motion.section>
      ))}

      <motion.h2 {...rise(3 + live.length)} className="pt-9 text-2xl font-bold tracking-tight">
        กิจกรรมจิตอาสา
      </motion.h2>

      <motion.div {...rise(4 + live.length)} className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pt-4" role="group" aria-label="กรองตามหมวด">
        <Chip selected={ui.category === null} onClick={() => ui.set({ category: null })}>
          ทุกหมวด
        </Chip>
        {CATEGORY_KEYS.filter((k) => k !== 'other' || ui.category === 'other' || activities.some((a) => a.categoryKey === 'other')).map((k) => (
          <Chip key={k} selected={ui.category === k} onClick={() => ui.set({ category: k })}>
            {CATEGORIES[k].label}
          </Chip>
        ))}
      </motion.div>

      {inList && (
        <motion.div {...rise(5 + live.length)} className="mt-3">
          <Segmented label="กรองตามวัน" options={DAYS} value={ui.when} onChange={(when) => ui.set({ when })} />
        </motion.div>
      )}

      {filtered && inList && (
        <div className="mt-2 flex min-h-11 items-center justify-between gap-3">
          <p className="num text-[15px] text-muted">พบ {feed.items.length} กิจกรรม</p>
          <button type="button" className="pressable -mr-2 min-h-11 rounded-full px-2 text-[15px] font-semibold" onClick={() => ui.set({ category: null, when: 'all' })}>
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {!loaded ? (
        <div className="mt-6">
          <Skeleton />
        </div>
      ) : failed ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="rounded-[var(--radius-card)] bg-bad-soft px-5 py-4 text-bad">โหลดกิจกรรมไม่ได้ ตรวจอินเทอร์เน็ตแล้วเปิดแอปใหม่</p>
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            loading={retrying}
            onClick={async () => {
              setRetrying(true)
              await refresh()
              setRetrying(false)
            }}
          >
            ลองอีกครั้ง
          </Button>
        </div>
      ) : ui.view === 'cal' ? (
        <div className="mt-6 flex flex-col gap-6">
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
              <p className="num text-xl font-semibold">กิจกรรมวันที่ {thDate(new Date(`${day}T00:00:00`).getTime())}</p>
              {dayItems.map((f, i) => (
                <ActivityCard key={f.a.id} {...f} now={now} index={i} />
              ))}
              {!dayItems.length && <p className="text-muted">ไม่มีกิจกรรมในวันนี้</p>}
            </>
          ) : (
            <p className="text-muted">แตะวันที่ที่มีจุดเพื่อดูกิจกรรม</p>
          )}
        </div>
      ) : sections.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-card)] bg-surface px-6 py-12 text-center">
          <p className="text-lg font-semibold">{filtered ? 'ไม่พบกิจกรรมตามตัวกรอง' : 'ยังไม่มีกิจกรรมเปิดรับ'}</p>
          <p className="mt-1.5 text-muted">{filtered ? 'ลองเปลี่ยนตัวกรอง หรือล้างตัวกรอง' : 'กิจกรรมใหม่จะแสดงที่นี่'}</p>
        </div>
      ) : (
        sections.map((s) => (
          <section key={s.key} aria-label={s.title}>
            <div className="flex items-baseline justify-between gap-3 pt-8 pb-4">
              <h2 className="text-xl font-semibold">
                {s.title} <span className="num font-medium text-muted">{s.items.length}</span>
              </h2>
              {s.note && <p className="text-[13.5px] text-muted">{s.note}</p>}
            </div>
            <div className="flex flex-col gap-7">
              {s.items.map((f, i) => (
                <ActivityCard key={f.a.id} {...f} now={now} index={i} />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  )
}
