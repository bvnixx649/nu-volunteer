import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { CaretLeft, CaretRight, FileXls, GearSix, ListChecks, PencilSimple, QrCode, UserPlus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api, now } from '../../data/api'
import type { Activity, Credit, Registration } from '../../data/types'
import { thDate, thTime } from '../../lib/format'
import { downloadSupXlsx } from '../../lib/excel'
import { rosterRows, type RosterRow } from '../../lib/roster'
import { checkinSummary } from '../../lib/checkin'
import { canEdit, closedAt, stage } from '../../lib/stage'
import { useDevice } from '../../store'
import { Button } from '../../ui/Button'
import { Counter } from '../../ui/Counter'
import { Roster, Flags } from './Roster'
import { EditHoursSheet } from './EditHoursSheet'
import { AddPersonSheet } from './AddPersonSheet'
import { CheckinSettingsSheet } from './CheckinSettingsSheet'
import { PullToQr } from './PullToQr'
import { StageBar } from './StageBar'

/** A tappable list row inside a card: icon, title with a detail line, chevron. */
function Row({ icon, title, detail, onClick, disabled }: { icon: ReactNode; title: string; detail: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="pressable flex w-full items-center gap-3.5 py-3.5 text-left disabled:opacity-45">
      <span className="text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="num block truncate text-sm text-muted">{detail}</span>
      </span>
      <CaretRight size={18} className="shrink-0 text-muted" />
    </button>
  )
}

const useWide = () => {
  const q = '(min-width: 900px)'
  const [wide, setWide] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const m = matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

/** Pull-to-QR works while the activity runs, or any time on its day. */
const isLive = (a: Activity) => {
  const t = now()
  return (t >= a.start && t <= a.end) || new Date(t).toDateString() === new Date(a.start).toDateString()
}

export default function Manage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const sup = useDevice((s) => s.sup)
  const wide = useWide()
  const [activity, setActivity] = useState<Activity | null | undefined>(undefined)
  const [regs, setRegs] = useState<Registration[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [editing, setEditing] = useState<string>()
  const [adding, setAdding] = useState(false)
  const [settings, setSettings] = useState(false)

  useEffect(() => api.watchActivity(id, setActivity), [id])
  useEffect(() => api.watchRegistrations(id, setRegs), [id])
  useEffect(() => api.watchCredits(id, setCredits), [id])

  const rows = useMemo(() => rosterRows(regs, credits, 'all', ''), [regs, credits])
  const find = (sid?: string): RosterRow | null => (sid ? (rows.find((r) => r.studentId === sid) ?? null) : null)
  const openQr = useCallback(() => nav(`/sup/a/${id}/qr`), [nav, id])

  if (!sup) return <Navigate to="/sup/login" replace />
  if (activity === undefined) return null
  if (!activity) return <p className="p-6 text-muted">ไม่พบกิจกรรมนี้</p>

  const selected = find(selectedId)
  const editable = canEdit(activity)
  const closed = !!closedAt(activity, now())
  const st = stage(activity)
  const started = st !== 'scheduled' && st !== 'open'
  /** After the end, closing and sending the roster take over as the main action. */
  const ended = started && st !== 'live'
  const pick = (r: RosterRow) => {
    setSelectedId(r.studentId)
    if (!wide && editable) setEditing(r.studentId)
  }
  const exportXlsx = async () => {
    try {
      const out = await downloadSupXlsx(activity, regs, credits)
      toast.success('ดาวน์โหลดไฟล์ Excel แล้ว', { description: `${out.length} รายชื่อ ได้ชั่วโมง ${out.filter((r) => r['สถานะ'] !== 'ไม่มา').length} คน` })
    } catch {
      toast.error('สร้างไฟล์ Excel ไม่ได้')
    }
  }

  return (
    <PullToQr enabled={isLive(activity)} onOpen={openQr}>
      <main className="mx-auto max-w-6xl px-5 pt-4 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        <Link to="/sup" className="pressable -ml-2 inline-flex items-center gap-1 rounded-full px-2 py-2 text-muted">
          <CaretLeft size={18} /> กิจกรรมทั้งหมด
        </Link>
        <h1 className="mt-2 text-2xl leading-snug font-bold tracking-tight">{activity.title}</h1>
        <p className="num mt-1 text-muted">
          {thDate(activity.start)} {thTime(activity.start)} ถึง {thTime(activity.end)} น. {activity.place}
        </p>

        <StageBar activity={activity} regs={regs} credits={credits} />

        <section className="mt-6 rounded-[var(--radius-card)] bg-surface p-5 shadow-soft">
          <div className="flex items-end justify-between gap-4">
            <div>
              <Counter value={activity.creditCount} className="block text-6xl leading-none font-bold tracking-tight" />
              <p className="mt-2 text-muted">คนได้ชั่วโมงแล้ว</p>
            </div>
            <p className="num pb-1 text-right text-sm text-muted">
              {activity.capLimit ? `ลงชื่อ ${activity.regCount} จาก ${activity.capacity} คน` : `ลงชื่อ ${activity.regCount} คน`}
              <br />
              ได้คนละ {activity.hours} ชั่วโมง
            </p>
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
            <Button size="lg" variant={ended ? 'secondary' : 'primary'} onClick={openQr}>
              <QrCode size={22} weight="bold" /> เปิด QR
            </Button>
            <Button size="lg" variant="secondary" disabled={!editable} onClick={() => setAdding(true)} aria-label="เพิ่มคนเอง">
              <UserPlus size={22} />
            </Button>
          </div>
          {!editable && <p className="mt-3 text-sm text-muted">ส่งรายชื่อแล้ว แก้ไม่ได้</p>}
          <div className="mt-4 -mb-2 divide-y divide-line border-t border-line">
            <Row icon={<GearSix size={22} />} disabled={!editable} onClick={() => setSettings(true)} title="ตั้งค่าการเช็คชื่อ" detail={checkinSummary(activity)} />
            {editable && <Row icon={<PencilSimple size={22} />} onClick={() => nav(`/sup/edit/${id}`)} title="แก้ไขกิจกรรม" detail="ชื่อ รูป วันเวลา สถานที่ และการรับคน" />}
            <Row icon={<ListChecks size={22} />} onClick={() => nav(`/sup/a/${id}/roster`)} title="ตรวจสอบรายชื่อ" detail="ตารางเดียวกับไฟล์ Excel" />
            {started && <Row icon={<FileXls size={22} />} onClick={exportXlsx} title="โหลด Excel" detail="รายชื่อพร้อมชั่วโมงรายคน" />}
          </div>
        </section>

        <div className="mt-8 grid gap-6 min-[900px]:grid-cols-[1fr_360px]">
          <Roster regs={regs} credits={credits} selected={wide ? selectedId : undefined} closed={closed} onSelect={pick} />
          {wide && (
            <aside className="sticky top-4 self-start rounded-[var(--radius-card)] bg-surface p-5 shadow-soft">
              {selected ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xl font-semibold">{selected.name}</p>
                  <p className="num text-muted">{selected.studentId}</p>
                  <p className="num text-4xl font-bold">{selected.credit ? `${selected.credit.hours} ชม.` : 'ยังไม่สแกน'}</p>
                  {selected.credit && (
                    <p className="num text-sm text-muted">
                      สแกน {thTime(selected.credit.at)} น.
                      {selected.credit.editedBy && ` แก้โดย ${selected.credit.editedBy}`}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 empty:hidden">
                    <Flags row={selected} closed={closed} />
                  </div>
                  {editable ? (
                    <Button className="mt-2" onClick={() => setEditing(selected.studentId)}>
                      {selected.credit ? 'แก้ชั่วโมง' : 'ให้ชั่วโมง'}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted">ส่งรายชื่อแล้ว แก้ไม่ได้</p>
                  )}
                </div>
              ) : (
                <p className="text-muted">เลือกชื่อทางซ้ายเพื่อดูรายละเอียดหรือแก้ชั่วโมง</p>
              )}
            </aside>
          )}
        </div>
      </main>

      <EditHoursSheet row={find(editing)} activity={activity} by={sup.name} onClose={() => setEditing(undefined)} />
      <CheckinSettingsSheet open={settings} activity={activity} onClose={() => setSettings(false)} />
      <AddPersonSheet open={adding} activity={activity} by={sup.name} onClose={() => setAdding(false)} />
    </PullToQr>
  )
}
