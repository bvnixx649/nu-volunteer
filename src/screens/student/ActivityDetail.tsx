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
  Check,
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
import { STRIKE_LIMIT } from '../../config'
import { countdown, fmtHours, relDay, thDate, thTime, timeAgo } from '../../lib/format'
import { haptic } from '../../lib/device'
import { useNow } from '../../lib/hooks'
import { creditsLeft, freeCancelUntil, isFull, isVisible, notOpenYet, phase, strikesOf } from '../../lib/student'
import { Button } from '../../ui/Button'
import { LinkButton } from '../../ui/LinkButton'
import { Sheet } from '../../ui/Sheet'
import { useBack } from '../../ui/BackBar'
import { Seats } from './ActivityCard'

const Fact = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="flex gap-4 px-5 py-4">
    <span className="mt-0.5 text-muted">{icon}</span>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
  </div>
)

const circle = 'pressable grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md'

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
    if (student) api.listDms(id, student.id).then(setDms, () => {})
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
        <button onClick={back} className="pressable -ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-muted">
          <CaretLeft size={20} /> กลับ
        </button>
        <h1 className="mt-10 text-2xl font-bold">ไม่พบกิจกรรมนี้</h1>
        <p className="mt-2 text-muted">กิจกรรมอาจถูกลบ หรือผู้คุมยังไม่เปิดให้เห็น</p>
        <LinkButton to="/" className="mt-8 w-full">
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
  const canScan = ph === 'live' && !credit && (registered || a.walkIn)

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
      if (late) toast.error('ยกเลิกแล้ว ถูกหักเครดิต 1 ครั้ง', { description: `ภาคนี้เหลือ ${Math.max(0, left - 1)} จาก ${STRIKE_LIMIT} ครั้ง` })
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
    ? a.recordedAt
      ? 'บันทึกลงระบบแล้ว'
      : 'รอศูนย์บันทึก'
    : ph === 'ended'
      ? 'กิจกรรมจบแล้ว'
      : scheduled
        ? `เปิดรับ${countdown(a.opensAt! - t)}`
        : registered
          ? `ลงทะเบียนแล้ว ${relDay(a.start, t)}`
          : lateCancelled
            ? 'ยกเลิกหลังกำหนด ลงทะเบียนซ้ำไม่ได้'
            : left === 0
              ? 'เครดิตภาคนี้หมดแล้ว'
              : isFull(a)
                ? 'ที่นั่งเต็มแล้ว'
                : a.capLimit
                  ? `เหลือ ${a.capacity - a.regCount} ที่`
                  : `ลงชื่อแล้ว ${a.regCount} คน`

  return (
    <>
      <main className="mx-auto max-w-lg pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="relative">
          <img src={a.poster} alt="" className="aspect-[4/3] w-full bg-surface-2 object-cover" />
          <div className="absolute inset-x-0 top-0 flex justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
            <button onClick={back} aria-label="กลับ" className={circle}>
              <CaretLeft size={22} weight="bold" />
            </button>
            <button onClick={share} aria-label="แชร์" className={circle}>
              <ShareNetwork size={20} weight="bold" />
            </button>
          </div>
        </div>

        <div className="px-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }} className="pt-6">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-surface-2 px-3 text-sm font-medium">{categoryOf(a.categoryKey).label}</span>
              {ph === 'live' && (
                <span className="inline-flex h-7 items-center gap-2 rounded-full bg-accent-soft px-3 text-sm font-medium text-accent-strong">
                  <span className="size-2 animate-pulse rounded-full bg-accent" /> กำลังดำเนินอยู่
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl leading-tight font-bold tracking-tight break-words">{a.title}</h1>
            <p className="mt-2 text-muted">{a.org}</p>
          </motion.div>

          <div className="mt-6 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
            <Fact icon={<CalendarBlank size={22} />}>
              <p className="font-semibold">{thDate(a.start)}</p>
              <p className="num text-muted">
                {multiDay ? `${thTime(a.start)} น. ถึง ${thDate(a.end)} ${thTime(a.end)} น.` : `${thTime(a.start)} ถึง ${thTime(a.end)} น.`}
              </p>
            </Fact>
            <Fact icon={<MapPin size={22} />}>
              <p className="font-semibold">{a.place || 'ยังไม่ระบุสถานที่'}</p>
              {a.lat != null && a.lng != null && (
                <a className="font-medium text-accent-strong" href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`} target="_blank" rel="noreferrer">
                  เปิดใน Google Maps
                </a>
              )}
            </Fact>
            {ph === 'upcoming' && (
              <Fact icon={<CalendarX size={22} />}>
                {scheduled && (
                  <p className="font-semibold text-accent-strong">
                    เปิดรับสมัคร {thDate(a.opensAt!)} {thTime(a.opensAt!)} น.
                  </p>
                )}
                <p className={scheduled ? 'text-muted' : 'font-semibold'}>
                  ยกเลิกฟรีได้ถึง {thDate(freeUntil)} {thTime(freeUntil)} น.
                </p>
                <p className="text-muted">ยกเลิกหลังจากนั้นหรือไม่มา จะถูกหักเครดิต</p>
              </Fact>
            )}
            <Fact icon={<HourglassMedium size={22} />}>
              <p className="font-semibold">ได้รับ {fmtHours(a.hours)} ชั่วโมง</p>
              {a.walkIn && <p className="text-muted">ไม่ได้ลงชื่อก็มาสแกนรับชั่วโมงได้</p>}
            </Fact>
            <Fact icon={<UsersThree size={22} />}>
              <p className="num font-semibold">ลงทะเบียนแล้ว {a.regCount}{a.capLimit ? ` จาก ${a.capacity}` : ''} คน</p>
              {a.capLimit && (
                <div className="mt-1">
                  <Seats a={a} />
                </div>
              )}
            </Fact>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{a.supervisor.name || 'ผู้คุมกิจกรรม'}</p>
              <p className="num text-sm text-muted">ผู้คุมกิจกรรม {a.supervisor.phone && `โทร ${a.supervisor.phone}`}</p>
            </div>
            <button onClick={() => nav(`/a/${a.id}/dm`)} aria-label="ส่งข้อความถึงผู้คุมกิจกรรม" className="pressable relative grid size-12 place-items-center rounded-full bg-surface-2">
              <ChatTeardropText size={22} weight="fill" />
              {unreadDm > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-accent" />}
            </button>
            {a.supervisor.phone && (
              <a href={`tel:${a.supervisor.phone.replace(/\D/g, '')}`} aria-label="โทรหาผู้คุมกิจกรรม" className="pressable grid size-12 place-items-center rounded-full bg-surface-2">
                <Phone size={22} weight="fill" />
              </a>
            )}
          </div>

          {a.description && (
            <section className="mt-9">
              <h2 className="text-xl font-semibold">รายละเอียด</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-muted">{a.description}</p>
            </section>
          )}

          {(a.chatEnabled || a.openChatUrl) && (
            <section className="mt-9">
              <h2 className="text-xl font-semibold">พูดคุยกับผู้เข้าร่วม</h2>
              <div className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
                {a.chatEnabled && (
                  <button
                    onClick={() => (registered || credit ? nav(`/a/${a.id}/chat`) : toast('ลงทะเบียนก่อนเพื่อเข้าห้องแชท'))}
                    className="pressable flex w-full items-center gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-accent-strong">{registered || credit ? <ChatCircleDots size={24} weight="fill" /> : <LockSimple size={24} weight="fill" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">ห้องแชทกิจกรรม</span>
                      <span className="block text-sm text-muted">{registered || credit ? 'คุยกับผู้คุมและผู้เข้าร่วม' : 'สำหรับคนที่ลงทะเบียนแล้ว'}</span>
                    </span>
                    <CaretRight size={18} className="text-muted" />
                  </button>
                )}
                {a.openChatUrl && (
                  <a href={a.openChatUrl} target="_blank" rel="noreferrer" className="pressable flex items-center gap-4 px-5 py-4">
                    <span className="text-ok">
                      <LinkSimple size={24} weight="bold" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">LINE OpenChat</span>
                      <span className="block text-sm text-muted">สำหรับคนที่สะดวกคุยใน LINE</span>
                    </span>
                    <CaretRight size={18} className="text-muted" />
                  </a>
                )}
              </div>
            </section>
          )}

          <section className="mt-9">
            <h2 className="text-xl font-semibold">
              ประกาศจากผู้คุม {notes.length > 0 && <span className="num text-muted">{notes.length}</span>}
            </h2>
            {notes.length === 0 ? (
              <p className="mt-3 text-muted">ยังไม่มีประกาศ ถ้ามีการเปลี่ยนแปลงจะแจ้งที่นี่</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-[var(--radius-card)] bg-surface p-4 shadow-soft">
                    <p className="text-sm text-muted">{timeAgo(n.at, t)}</p>
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-4 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="min-w-0 flex-1">
            <p className="num text-2xl leading-tight font-bold">{credit ? `ได้รับ ${fmtHours(credit.hours)} ชม.` : `+${fmtHours(a.hours)} ชม.`}</p>
            <p className={`truncate text-sm ${scheduled ? 'font-semibold text-accent-strong' : 'text-muted'}`}>{status}</p>
          </div>
          {credit ? (
            <LinkButton to={`/a/${a.id}/roster`} variant="primary">
              ตรวจสอบรายชื่อ
            </LinkButton>
          ) : ph === 'ended' ? (
            <Button size="lg" variant="secondary" disabled>
              จบแล้ว
            </Button>
          ) : canScan ? (
            <LinkButton to="/scan" variant="primary">
              <QrCode size={22} weight="bold" /> สแกน
            </LinkButton>
          ) : registered ? (
            <Button size="lg" variant="secondary" onClick={() => setSheet('cancel')}>
              <Check size={20} weight="bold" /> ลงทะเบียนแล้ว
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
              {reminding ? 'จะเตือนคุณ' : 'เตือนฉัน'}
            </Button>
          ) : left === 0 ? (
            <Button size="lg" variant="secondary" onClick={() => setSheet('blocked')}>
              สมัครไม่ได้
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
          <div className="flex gap-4">
            <img src={a.poster} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0">
              <p className="line-clamp-2 font-semibold">{a.title}</p>
              <p className="num text-sm text-muted">
                {thDate(a.start)} {thTime(a.start)} ถึง {thTime(a.end)} น.
              </p>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-y border-line py-4">
            <div className="min-w-0">
              <p className="text-sm text-muted">ลงทะเบียนในชื่อ</p>
              <p className="truncate font-semibold">{student?.name}</p>
            </div>
            <p className="num text-muted">{student?.id}</p>
          </div>
          <p className="text-muted">เมื่อจบกิจกรรม สแกน QR จากผู้คุมเพื่อรับ {fmtHours(a.hours)} ชั่วโมง</p>
          <div className={`rounded-2xl bg-surface-2 p-4 ${left === 1 ? 'ring-2 ring-accent' : ''}`}>
            <p className="font-semibold">{late ? 'เลยกำหนดยกเลิกฟรีแล้ว' : `ยกเลิกฟรีได้ถึง ${thDate(freeUntil)} ${thTime(freeUntil)} น.`}</p>
            <p className="mt-1 text-sm text-muted">
              {late ? 'ถ้ายกเลิกหรือไม่มา' : 'ยกเลิกหลังจากนั้นหรือไม่มา'} จะถูกหักเครดิต 1 ครั้ง ภาคนี้เหลือ {left} จาก {STRIKE_LIMIT} ครั้ง
              {left === 1 && ' ถ้าหมดจะสมัครกิจกรรมไม่ได้จนจบภาคการศึกษา'}
            </p>
          </div>
          <Button size="lg" className="w-full" loading={busy} onClick={register}>
            ยืนยันลงทะเบียน
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'cancel'} onClose={() => setSheet(null)} title="ยกเลิกการลงทะเบียน">
        <div className="flex flex-col gap-4">
          {late ? (
            <>
              <div className="rounded-2xl bg-bad-soft p-4">
                <p className="font-semibold text-bad">ยกเลิกตอนนี้จะถูกหักเครดิต 1 ครั้ง</p>
                <p className="mt-1 text-sm">
                  เลยกำหนดยกเลิกฟรีแล้ว ภาคนี้จะเหลือ {Math.max(0, left - 1)} จาก {STRIKE_LIMIT} ครั้ง
                  {left <= 1 && ' และจะสมัครกิจกรรมไม่ได้จนจบภาคการศึกษา'}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">มีเหตุสุดวิสัย เช่น ป่วยหรืออุบัติเหตุ</p>
                  <p className="text-sm text-muted">ส่งข้อความถึงผู้คุม ผู้คุมคืนเครดิตให้ได้</p>
                </div>
                <button onClick={() => nav(`/a/${a.id}/dm`)} aria-label="ส่งข้อความถึงผู้คุมกิจกรรม" className="pressable grid size-12 shrink-0 place-items-center rounded-full bg-surface">
                  <ChatTeardropText size={22} weight="fill" />
                </button>
              </div>
            </>
          ) : (
            <p className="text-muted">ยังยกเลิกได้ฟรีถึง {thDate(freeUntil)} {thTime(freeUntil)} น. ที่นั่งของคุณจะเปิดให้คนอื่นลงทะเบียนแทน</p>
          )}
          <Button size="lg" variant="danger" className="mt-2 w-full" loading={busy} onClick={cancel}>
            {late ? 'ยกเลิกและเสียเครดิต' : 'ยกเลิกการลงทะเบียน'}
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => setSheet(null)}>
            ไม่ยกเลิก
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'blocked'} onClose={() => setSheet(null)} title="เครดิตภาคนี้หมดแล้ว">
        <div className="flex flex-col gap-4">
          <p className="text-muted">ยกเลิกหลังกำหนดหรือไม่มาครบ {STRIKE_LIMIT} ครั้งในภาคการศึกษานี้ จึงสมัครกิจกรรมใหม่ไม่ได้จนถึงภาคการศึกษาหน้า</p>
          <p className="text-muted">ถ้าครั้งไหนมีเหตุสุดวิสัย ส่งข้อความถึงผู้คุมกิจกรรมนั้นเพื่อขอคืนเครดิต</p>
          <Button size="lg" className="w-full" onClick={() => nav('/me')}>
            ดูเครดิตของฉัน
          </Button>
        </div>
      </Sheet>
    </>
  )
}
