import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  BellRinging,
  BellSimple,
  CalendarBlank,
  CalendarX,
  CaretLeft,
  CaretRight,
  ChatCircleDots,
  ChatTeardropText,
  HourglassMedium,
  LinkSimple,
  LockSimple,
  MapPin,
  Phone,
  QrCode,
  ShareNetwork,
  UsersThree,
} from '@phosphor-icons/react'
import { api } from '../../data/api'
import { useMine } from '../../data/mine'
import { categoryOf } from '../../data/categories'
import type { Activity, Announcement, DirectMsg } from '../../data/types'
import { MESSAGES_ON, STRIKE_LIMIT } from '../../config'
import { countdown, fmtHours, initial, relDay, thDate, thTime, timeAgo } from '../../lib/format'
import { isBottle } from '../../lib/bottle'
import { haptic } from '../../lib/device'
import { useNow } from '../../lib/hooks'
import { creditsLeft, freeCancelUntil, isFull, isVisible, notOpenYet, phase, strikesOf } from '../../lib/student'
import { Button } from '../../ui/Button'
import { LinkButton } from '../../ui/LinkButton'
import { Sheet } from '../../ui/Sheet'
import { useBack } from '../../ui/BackBar'
import { Seats, weekday } from './ActivityCard'

/** One fact about the activity: a round icon, the answer, and a quieter second line. */
const Info = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="flex gap-3.5">
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">{icon}</span>
    <div className="flex min-h-10 min-w-0 flex-1 flex-col justify-center gap-0.5">{children}</div>
  </div>
)

/** A tappable row inside a card: icon chip, two lines, caret. */
const rowIcon = 'grid size-10 shrink-0 place-items-center rounded-full bg-surface-2'
const second = 'text-[15px] text-muted'
const round = 'pressable grid size-11 place-items-center rounded-full bg-black/50 text-ink'
const contact = 'pressable relative grid size-11 shrink-0 place-items-center rounded-full bg-surface-2'

export default function ActivityDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const back = useBack('/')
  const { student, activities, regs, credits, refresh, patchStudent } = useMine()
  const [fresh, setFresh] = useState<Activity | null | undefined>()
  const [notes, setNotes] = useState<Announcement[]>([])
  const [dms, setDms] = useState<DirectMsg[]>([])
  const [sheet, setSheet] = useState<null | 'register' | 'cancel' | 'blocked'>(null)
  const [busy, setBusy] = useState(false)
  const t = useNow()

  const load = useCallback(async () => {
    const a = await api.getActivity(id).catch(() => undefined)
    if (a !== undefined) setFresh(a)
  }, [id])
  useEffect(() => {
    load()
    api.listAnnouncements(id).then(setNotes, () => {})
  }, [load, id])
  useEffect(() => {
    if (MESSAGES_ON && student) api.listDms(id, student.id).then(setDms, () => {})
  }, [id, student])

  const cached = activities.find((a) => a.id === id)
  const a = fresh ?? cached
  const reg = regs.find((r) => r.activityId === id)
  const registered = !!reg && !reg.cancelledAt
  const lateCancelled = !!reg?.cancelledAt && !!reg.late
  const credit = credits.find((c) => c.activityId === id)
  const strikes = useMemo(() => strikesOf(activities, regs, credits, t), [activities, regs, credits, t])
  const left = creditsLeft(strikes)

  if (fresh === undefined && !cached) return <main className="mx-auto max-w-lg px-5 pt-20" aria-busy />
  if (!a || (!isVisible(a, t) && !registered && !credit)) {
    return (
      <main className="mx-auto max-w-lg px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
        <button onClick={back} className="pressable -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-muted">
          <CaretLeft size={20} /> กลับ
        </button>
        <h1 className="mt-10 text-[28px] leading-tight font-bold tracking-tight">ไม่พบกิจกรรมนี้</h1>
        <p className="mt-2 text-muted">กิจกรรมถูกลบหรือยังไม่เปิดให้ดู</p>
        <LinkButton to="/" variant="primary" className="mt-8 w-full">
          ไปหน้าแรก
        </LinkButton>
      </main>
    )
  }

  const ph = phase(a, t)
  const scheduled = notOpenYet(a, t)
  const reminding = !!student?.reminders?.includes(a.id)
  const freeUntil = freeCancelUntil(a)
  const late = t > freeUntil
  const unreadDm = dms.filter((m) => m.fromSup && !m.read).length
  const multiDay = new Date(a.start).toDateString() !== new Date(a.end).toDateString()
  const bottle = isBottle(a)
  const canScan = !bottle && ph === 'live' && !credit && (registered || a.walkIn)

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/a/${a.id}`
    try {
      if (navigator.share) await navigator.share({ title: a.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('คัดลอกลิงก์แล้ว')
      }
    } catch {
      /* the share sheet was closed */
    }
  }

  const register = async () => {
    if (!student) return
    setBusy(true)
    try {
      const r = await api.register(a.id, { id: student.id, name: student.name })
      setSheet(null)
      if (r === 'full') toast.error('ที่นั่งเต็มแล้ว')
      else {
        haptic.success()
        toast.success('ลงทะเบียนแล้ว')
        if (r === 'ok') await api.addNotice({ studentId: student.id, kind: 'registered', title: 'ลงทะเบียนสำเร็จ', body: a.title, activityId: a.id }).catch(() => {})
      }
      await Promise.all([refresh(), load()])
    } catch {
      toast.error('ลงทะเบียนไม่ได้ ลองอีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!student) return
    setBusy(true)
    try {
      await api.cancelRegistration(a.id, student.id, late)
      setSheet(null)
      if (late) toast.error('ยกเลิกแล้ว ถูกหักสิทธิ์ 1 ครั้ง', { description: `สิทธิ์ยกเลิกภาคนี้เหลือ ${Math.max(0, left - 1)} จาก ${STRIKE_LIMIT} ครั้ง` })
      else toast('ยกเลิกการลงทะเบียนแล้ว')
      await Promise.all([refresh(), load()])
    } catch {
      toast.error('ยกเลิกไม่ได้ ลองอีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  const toggleReminder = async () => {
    if (!student) return
    const reminders = reminding ? (student.reminders ?? []).filter((x) => x !== a.id) : [...(student.reminders ?? []), a.id]
    patchStudent({ reminders })
    haptic.tap()
    toast(reminding ? 'ยกเลิกการเตือนแล้ว' : 'จะแจ้งเตือนเมื่อเปิดรับสมัคร', { description: reminding ? undefined : `${relDay(a.opensAt!, t)} ${thTime(a.opensAt!)} น.` })
    try {
      await api.updateStudent(student.id, { reminders })
    } catch {
      toast.error('บันทึกการเตือนไม่ได้')
    }
  }

  const status = credit
    ? bottle
      ? a.recordedAt
        ? 'บันทึกแล้ว'
        : `แลก ${credit.items ?? 0} ขวด`
      : a.recordedAt
        ? 'บันทึกแล้ว'
        : 'รอบันทึกชั่วโมง'
    : ph === 'ended'
      ? 'กิจกรรมจบแล้ว'
      : bottle
        ? ph === 'live'
          ? 'รับขวดที่จุดรับตอนนี้'
          : `เริ่ม ${relDay(a.start, t)}`
        : scheduled
          ? `เปิดรับ${countdown(a.opensAt! - t)}`
          : registered
            ? `ลงทะเบียนแล้ว ${relDay(a.start, t)}`
            : lateCancelled
              ? 'ยกเลิกหลังกำหนด ลงทะเบียนซ้ำไม่ได้'
              : left === 0
                ? 'สิทธิ์ยกเลิกหมดแล้ว'
                : isFull(a)
                  ? 'ที่นั่งเต็มแล้ว'
                  : a.capLimit
                    ? `เหลือ ${a.capacity - a.regCount} ที่`
                    : `ลงทะเบียนแล้ว ${a.regCount} คน`

  const canChat = MESSAGES_ON && a.chatEnabled
  const supName = a.supervisor.name || 'ผู้ดูแลกิจกรรม'

  return (
    <>
      <main className="mx-auto max-w-lg pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
        <div className="relative h-[min(44dvh,380px)] bg-surface-2">
          <img src={a.poster} alt="" className="size-full object-cover" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
            <button onClick={back} aria-label="กลับ" className={round}>
              <CaretLeft size={22} weight="bold" />
            </button>
            <button onClick={share} aria-label="แชร์" className={round}>
              <ShareNetwork size={20} weight="bold" />
            </button>
          </div>
        </div>

        <div className="relative -mt-7 rounded-t-[var(--radius-sheet)] bg-bg px-5 pt-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
              <span className="text-muted">{categoryOf(a.categoryKey).label}</span>
              {ph === 'live' && (
                <span className="flex items-center gap-2 font-semibold text-accent">
                  <span aria-hidden className="live-dot size-2 shrink-0" /> กำลังดำเนินอยู่
                </span>
              )}
            </div>
            <h1 className="mt-1.5 text-[26px] leading-[1.25] font-bold tracking-tight text-balance break-words">{a.title}</h1>
            <p className="mt-1.5 text-muted">{a.org}</p>
          </motion.div>

          <div className="mt-7 flex flex-col gap-5">
            <Info icon={<CalendarBlank size={20} />}>
              <p className="num font-semibold">
                วัน{weekday(a.start)} {thDate(a.start)}
              </p>
              <p className={`num ${second}`}>{multiDay ? `${thTime(a.start)} น. ถึง ${thDate(a.end)} ${thTime(a.end)} น.` : `${thTime(a.start)} ถึง ${thTime(a.end)} น.`}</p>
            </Info>
            <Info icon={<MapPin size={20} />}>
              <p className="font-semibold">{a.place || 'ยังไม่ระบุสถานที่'}</p>
              {a.lat != null && a.lng != null && (
                <a
                  className="-my-2.5 inline-flex min-h-11 w-fit items-center text-[15px] font-medium underline decoration-faint underline-offset-4"
                  href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  เปิดใน Google Maps
                </a>
              )}
            </Info>
            <Info icon={<HourglassMedium size={20} />}>
              {bottle ? (
                <>
                  <p className="num font-semibold">
                    {a.itemsPerHour} ขวด = 1 ชั่วโมง ได้สูงสุด {fmtHours(a.hours)} ชั่วโมง
                  </p>
                  <p className={second}>นำขวดพลาสติกที่ล้างแล้วมาที่จุดรับในเวลากิจกรรม</p>
                </>
              ) : (
                <>
                  <p className="num font-semibold">ได้รับ {fmtHours(a.hours)} ชั่วโมง</p>
                  {a.walkIn && <p className={second}>รับผู้ไม่ได้ลงทะเบียน</p>}
                </>
              )}
            </Info>
            {!bottle && (
              <Info icon={<UsersThree size={20} />}>
                <Seats a={a} lead />
              </Info>
            )}
            {ph === 'upcoming' && !bottle && (
              <Info icon={<CalendarX size={20} />}>
                {scheduled && (
                  <p className="num font-semibold text-accent">
                    เปิดรับสมัคร {thDate(a.opensAt!)} {thTime(a.opensAt!)} น.
                  </p>
                )}
                <p className={`num ${scheduled ? second : 'font-semibold'}`}>
                  ยกเลิกได้ถึง {thDate(freeUntil)} {thTime(freeUntil)} น.
                </p>
                {(registered || left <= 1) && <p className={second}>ยกเลิกหลังกำหนดหรือไม่มา จะถูกหักสิทธิ์ 1 ครั้ง</p>}
              </Info>
            )}
          </div>

          {a.description && (
            <section className="mt-9">
              <h2 className="text-xl font-semibold">รายละเอียด</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-ink/80">{a.description}</p>
            </section>
          )}

          <div className="mt-9 flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4">
            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-lg font-semibold">
              {initial(supName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold break-words">{supName}</p>
              <p className="num text-[13.5px] text-muted">ผู้ดูแลกิจกรรม {a.supervisor.phone && `โทร ${a.supervisor.phone}`}</p>
            </div>
            {MESSAGES_ON && (
              <button onClick={() => nav(`/a/${a.id}/dm`)} aria-label="ส่งข้อความถึงผู้ดูแลกิจกรรม" className={contact}>
                <ChatTeardropText size={20} weight="fill" />
                {unreadDm > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-accent" />}
              </button>
            )}
            {a.supervisor.phone && (
              <a href={`tel:${a.supervisor.phone.replace(/\D/g, '')}`} aria-label="โทรหาผู้ดูแลกิจกรรม" className={contact}>
                <Phone size={20} weight="fill" />
              </a>
            )}
          </div>

          {(canChat || a.openChatUrl) && (
            <section className="mt-9">
              <h2 className="text-xl font-semibold">พูดคุยกับผู้เข้าร่วม</h2>
              <div className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
                {canChat && (
                  <button
                    onClick={() => (registered || credit ? nav(`/a/${a.id}/chat`) : toast('ลงทะเบียนก่อนจึงเข้าห้องแชทได้'))}
                    className="pressable flex w-full items-center gap-3.5 p-4 text-left"
                  >
                    <span className={rowIcon}>{registered || credit ? <ChatCircleDots size={20} weight="fill" /> : <LockSimple size={20} weight="fill" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">ห้องแชทกิจกรรม</span>
                      <span className="block text-[13.5px] text-muted">{registered || credit ? 'ผู้ดูแลและผู้เข้าร่วม' : 'เฉพาะผู้ลงทะเบียน'}</span>
                    </span>
                    <CaretRight size={18} className="text-muted" />
                  </button>
                )}
                {a.openChatUrl && (
                  <a href={a.openChatUrl} target="_blank" rel="noreferrer" className="pressable flex items-center gap-3.5 p-4">
                    <span className={rowIcon}>
                      <LinkSimple size={20} weight="bold" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">LINE OpenChat</span>
                      <span className="block text-[13.5px] text-muted">กลุ่มสนทนาใน LINE</span>
                    </span>
                    <CaretRight size={18} className="text-muted" />
                  </a>
                )}
              </div>
            </section>
          )}

          <section className="mt-9">
            <h2 className="text-xl font-semibold">ประกาศจากผู้ดูแล {notes.length > 0 && <span className="num font-medium text-muted">{notes.length}</span>}</h2>
            {notes.length === 0 ? (
              <p className="mt-2 text-muted">ยังไม่มีประกาศ</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-[var(--radius-card)] bg-surface p-4">
                    <p className="text-[13.5px] text-muted">{timeAgo(n.at, t)}</p>
                    <p className="mt-1 whitespace-pre-line">{n.text}</p>
                    {n.images.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {n.images.map((src, i) => (
                          <img key={i} src={src} alt="" loading="lazy" className="w-full rounded-2xl" />
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg">
        <div className="mx-auto flex max-w-lg items-center gap-4 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex min-h-14 min-w-0 flex-1 flex-col justify-center">
            <p className="num text-[22px] leading-tight font-semibold tracking-tight">
              {credit ? `ได้รับ ${fmtHours(credit.hours)} ชม.` : bottle ? `สูงสุด ${fmtHours(a.hours)} ชม.` : `+${fmtHours(a.hours)} ชม.`}
            </p>
            <p className="num text-[13.5px] leading-snug text-muted">{status}</p>
          </div>
          {credit ? (
            <LinkButton to={`/a/${a.id}/roster`} variant="secondary">
              ตรวจสอบรายชื่อ
            </LinkButton>
          ) : bottle ? null : ph === 'ended' ? (
            <Button size="lg" variant="secondary" disabled>
              จบแล้ว
            </Button>
          ) : canScan ? (
            <LinkButton to="/scan" variant="accent">
              <QrCode size={22} weight="bold" /> สแกนรับชั่วโมง
            </LinkButton>
          ) : registered ? (
            <Button size="lg" variant="secondary" onClick={() => setSheet('cancel')}>
              ยกเลิก
            </Button>
          ) : lateCancelled ? (
            <Button size="lg" variant="secondary" disabled>
              ยกเลิกแล้ว
            </Button>
          ) : isFull(a) ? (
            <Button size="lg" variant="secondary" disabled>
              เต็มแล้ว
            </Button>
          ) : scheduled ? (
            <Button size="lg" variant={reminding ? 'secondary' : 'primary'} onClick={toggleReminder}>
              {reminding ? <BellRinging size={20} weight="fill" /> : <BellSimple size={20} weight="bold" />}
              {reminding ? 'ตั้งเตือนแล้ว' : 'เตือนฉัน'}
            </Button>
          ) : left === 0 ? (
            <Button size="lg" variant="secondary" onClick={() => setSheet('blocked')}>
              ลงทะเบียนไม่ได้
            </Button>
          ) : (
            <Button size="lg" onClick={() => setSheet('register')}>
              ลงทะเบียน
            </Button>
          )}
        </div>
      </div>

      <Sheet open={sheet === 'register'} onClose={() => setSheet(null)} title="ลงทะเบียนกิจกรรม">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3.5">
            <img src={a.poster} alt="" className="size-16 shrink-0 rounded-2xl bg-surface-2 object-cover" />
            <div className="min-w-0">
              <p className="line-clamp-2 leading-snug font-semibold">{a.title}</p>
              <p className="num mt-0.5 text-[13.5px] text-muted">
                {thDate(a.start)} {thTime(a.start)} ถึง {thTime(a.end)} น.
              </p>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-y border-line py-4">
            <div className="min-w-0">
              <p className="text-[13.5px] text-muted">ลงทะเบียนในชื่อ</p>
              <p className="font-semibold break-words">{student?.name}</p>
            </div>
            <p className="num shrink-0 text-muted">{student?.id}</p>
          </div>
          <p className="num text-muted">สแกน QR ที่งานเพื่อรับ {fmtHours(a.hours)} ชั่วโมง</p>
          <div className={`rounded-2xl p-4 ${left === 1 ? 'bg-warn-soft' : 'bg-surface-2'}`}>
            <p className={`num font-semibold ${left === 1 ? 'text-warn' : ''}`}>{late ? 'เลยกำหนดยกเลิกฟรีแล้ว' : `ยกเลิกฟรีได้ถึง ${thDate(freeUntil)} ${thTime(freeUntil)} น.`}</p>
            <p className={`num mt-1 text-[13.5px] ${left === 1 ? 'text-ink/80' : 'text-muted'}`}>
              {late ? 'ยกเลิกหรือไม่มา' : 'ยกเลิกหลังกำหนดหรือไม่มา'} จะถูกหักสิทธิ์ยกเลิก 1 ครั้ง ภาคนี้เหลือ {left} จาก {STRIKE_LIMIT} ครั้ง
              {left === 1 && ' สิทธิ์หมดแล้วลงทะเบียนไม่ได้จนจบภาค'}
            </p>
          </div>
          <Button size="lg" className="w-full" loading={busy} onClick={register}>
            ยืนยันลงทะเบียน
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'cancel'} onClose={() => setSheet(null)} title="ยกเลิกการลงทะเบียน">
        <div className="flex flex-col gap-3">
          {late ? (
            <>
              <div className="rounded-2xl bg-bad-soft p-4">
                <p className="font-semibold text-bad">ยกเลิกตอนนี้จะถูกหักสิทธิ์ 1 ครั้ง</p>
                <p className="num mt-1 text-[13.5px] text-ink/80">
                  เลยกำหนดยกเลิกฟรีแล้ว สิทธิ์ภาคนี้จะเหลือ {Math.max(0, left - 1)} จาก {STRIKE_LIMIT} ครั้ง
                  {left <= 1 && ' ลงทะเบียนไม่ได้จนจบภาค'}
                </p>
              </div>
              {MESSAGES_ON && (
                <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">มีเหตุสุดวิสัย เช่น ป่วยหรืออุบัติเหตุ</p>
                    <p className="text-[13.5px] text-muted">ส่งข้อความถึงผู้ดูแลเพื่อขอคืนสิทธิ์</p>
                  </div>
                  <button
                    onClick={() => nav(`/a/${a.id}/dm`)}
                    aria-label="ส่งข้อความถึงผู้ดูแลกิจกรรม"
                    className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-surface-3"
                  >
                    <ChatTeardropText size={20} weight="fill" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="num text-muted">
              ยังยกเลิกได้ฟรีถึง {thDate(freeUntil)} {thTime(freeUntil)} น. ที่นั่งจะเปิดให้ผู้อื่น
            </p>
          )}
          <Button size="lg" variant="danger" className="mt-3 w-full" loading={busy} onClick={cancel}>
            {late ? 'ยกเลิกและหักสิทธิ์' : 'ยกเลิกการลงทะเบียน'}
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => setSheet(null)}>
            ไม่ยกเลิก
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'blocked'} onClose={() => setSheet(null)} title="สิทธิ์ยกเลิกหมดแล้ว">
        <div className="flex flex-col gap-4">
          <p className="num text-muted">ยกเลิกหลังกำหนดหรือไม่มาครบ {STRIKE_LIMIT} ครั้งในภาคนี้ ลงทะเบียนกิจกรรมใหม่ได้ในภาคหน้า</p>
          {MESSAGES_ON && <p className="text-muted">หากมีเหตุสุดวิสัย ส่งข้อความถึงผู้ดูแลกิจกรรมนั้นเพื่อขอคืนสิทธิ์</p>}
          <Button size="lg" className="mt-1 w-full" onClick={() => nav('/me')}>
            ดูสิทธิ์ยกเลิก
          </Button>
        </div>
      </Sheet>
    </>
  )
}
