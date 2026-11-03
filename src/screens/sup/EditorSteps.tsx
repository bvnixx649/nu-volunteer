import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDown, Check, DotsThree, ImageSquare, MapPin, PencilSimple, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { HOUR_CHIPS } from '../../config'
import { categoryOf, CATEGORIES, BUILTIN_KEYS } from '../../data/categories'
import type { CategoryKey, Template } from '../../data/types'
import { checkinSummary } from '../../lib/checkin'
import { isBottleDraft, toMs, ymd, posterChoices, type Draft } from '../../lib/draft'
import { thDate, thTime } from '../../lib/format'
import { getFix, type GeoError } from '../../lib/geo'
import { resizeToDataUrl } from '../../lib/image'
import { Button } from '../../ui/Button'
import { Chip } from '../../ui/Chip'
import { Field } from '../../ui/Field'
import { Sheet } from '../../ui/Sheet'
import { Switch } from '../../ui/Switch'
import { CheckinFields, type CheckinDraft } from './CheckinFields'

export type StepProps = { d: Draft; set: (p: Partial<Draft>) => void; errors: Record<string, string> }

export const TITLES = ['เลือกเทมเพลต', 'รายละเอียด', 'ตรวจและเผยแพร่']

/** A rounded group that holds switches, like the sections of the check-in settings. */
function Group({ children }: { children: ReactNode }) {
  return <div className="rounded-[var(--radius-field)] bg-surface px-4 ring-1 ring-line">{children}</div>
}

/** Height-animated block for controls that only exist while a switch is on. */
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="-m-1 overflow-hidden p-1"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** A card-sized button that opens a block under it. The closed state shows a summary so nothing is hidden blind. */
function Disclosure({ title, summary, open, onToggle, children }: { title: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
      <button type="button" aria-expanded={open} onClick={onToggle} className="pressable flex w-full items-start gap-3 rounded-[var(--radius-card)] px-5 py-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          {!open && <span className="num mt-0.5 line-clamp-2 block text-sm text-muted">{summary}</span>}
        </span>
        <CaretDown size={20} weight="bold" className={`mt-0.5 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <Reveal show={open}>
        <div className="px-5 pb-5">{children}</div>
      </Reveal>
    </section>
  )
}

const num = (s: string) => s.replace(/\D/g, '').slice(0, 4)

/* Step 1 ------------------------------------------------------------------------------------------ */

type CategoryProps = {
  d: Draft
  templates: Template[]
  onPick: (k: CategoryKey) => void
  onPickTemplate: (t: Template) => void
  onAdd: () => void
  /** Opens the edit and delete choices for a custom template. */
  onMenu: (t: Template) => void
}

const LONG_PRESS_MS = 480

/** A custom template card. A tap picks it; a long press or the "..." button opens edit and delete. */
function TemplateCard({ t, on, onPick, onMenu }: { t: Template; on: boolean; onPick: () => void; onMenu: () => void }) {
  const timer = useRef<number>(0)
  const held = useRef(false)
  const stop = () => window.clearTimeout(timer.current)
  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 transition-shadow duration-200 ${on ? 'ring-2 ring-accent' : 'ring-line'}`}>
      <button
        type="button"
        aria-pressed={on}
        onClick={() => {
          if (held.current) held.current = false
          else onPick()
        }}
        onPointerDown={() => {
          held.current = false
          stop()
          timer.current = window.setTimeout(() => {
            held.current = true
            navigator.vibrate?.(10)
            onMenu()
          }, LONG_PRESS_MS)
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onPointerMove={(e) => (Math.abs(e.movementX) + Math.abs(e.movementY) > 6 ? stop() : undefined)}
        onContextMenu={(e) => e.preventDefault()}
        className="pressable block w-full text-left select-none [-webkit-touch-callout:none]"
      >
        <img src={t.poster} alt="" draggable={false} className="aspect-[4/3] w-full object-cover" />
        <span className="block py-3 pr-12 pl-3.5">
          <span className="block truncate font-semibold">{t.title}</span>
          <span className="num block text-sm text-muted">{t.hours} ชม.</span>
        </span>
      </button>
      <button
        type="button"
        aria-label={`ตัวเลือกของ ${t.title}`}
        onClick={onMenu}
        className="pressable absolute right-0 bottom-0 grid size-12 place-items-center text-muted"
      >
        <DotsThree size={26} weight="bold" />
      </button>
    </div>
  )
}

export function StepCategory({ d, templates, onPick, onPickTemplate, onAdd, onMenu }: CategoryProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {BUILTIN_KEYS.map((k) => {
          const c = CATEGORIES[k]
          const on = d.categoryKey === k
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(k)}
              className={`pressable overflow-hidden rounded-[var(--radius-card)] bg-surface text-left shadow-soft ring-1 transition-shadow duration-200 ${on ? 'ring-2 ring-accent' : 'ring-line'}`}
            >
              <img src={posterChoices(k)[0]} alt="" className="aspect-[4/3] w-full object-cover" />
              <span className="block px-3.5 py-3">
                <span className="block font-semibold">{c.label}</span>
                <span className="num block text-sm text-muted">{c.itemsPerHour ? `สูงสุด ${c.hours} ชม.` : `${c.hours} ชม.`}</span>
              </span>
            </button>
          )
        })}
        {templates.map((t) => (
          <TemplateCard key={t.id} t={t} on={d.templateId === t.id} onPick={() => onPickTemplate(t)} onMenu={() => onMenu(t)} />
        ))}
      </div>
      <div className="mt-8 flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label="เพิ่มกิจกรรม"
          onClick={onAdd}
          className="pressable grid size-16 place-items-center rounded-full bg-accent-soft text-accent"
        >
          <Plus size={28} weight="bold" />
        </button>
        <span aria-hidden className="text-sm text-muted">
          เพิ่มกิจกรรม
        </span>
      </div>
    </>
  )
}

/* Step 2 ------------------------------------------------------------------------------------------ */

const areaClass =
  'min-h-44 w-full resize-none rounded-[var(--radius-field)] bg-surface-2 px-4 py-3 text-[17px] leading-relaxed ring-1 ring-line transition-shadow duration-150 outline-none placeholder:text-muted focus:ring-2 focus:ring-accent'

function PosterTile({ src, selected, label, onClick }: { src: string; selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className={`pressable relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-field)] ring-1 ${selected ? 'ring-2 ring-accent' : 'ring-line'}`}
    >
      <img src={src} alt="" className="size-full object-cover" />
      {selected && (
        <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-accent-strong text-on-accent">
          <Check size={14} weight="bold" />
        </span>
      )}
    </button>
  )
}

/** The cover photo, large. Tapping it opens the template photos and the upload button. */
function PosterPicker({ d, set }: Pick<StepProps, 'd' | 'set'>) {
  const file = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const choices = d.categoryKey ? posterChoices(d.categoryKey) : []
  const own = d.poster && !choices.includes(d.poster)

  const upload = async (f?: File) => {
    if (!f) return
    setBusy(true)
    try {
      set({ poster: await resizeToDataUrl(f) })
      setOpen(false)
    } catch {
      toast.error('ใช้รูปนี้ไม่ได้ ลองรูปอื่น')
    } finally {
      setBusy(false)
      if (file.current) file.current.value = ''
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="เปลี่ยนรูปปก"
        onClick={() => setOpen(true)}
        className="pressable relative block aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-card)] bg-surface-2 shadow-soft"
      >
        {d.poster && <img src={d.poster} alt="" className="size-full object-cover" />}
        <span className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/60 px-3.5 text-sm font-medium text-white backdrop-blur-sm">
          <PencilSimple size={16} weight="bold" /> เปลี่ยนรูป
        </span>
      </button>
      <input ref={file} type="file" accept="image/*" hidden data-testid="poster-file" onChange={(e) => upload(e.target.files?.[0])} />

      <Sheet open={open} onClose={() => setOpen(false)} title="รูปปก">
        <div role="radiogroup" aria-label="รูปปก" className="grid grid-cols-2 gap-3">
          {own && <PosterTile src={d.poster} selected label="รูปของคุณ" onClick={() => setOpen(false)} />}
          {choices.map((p, i) => (
            <PosterTile
              key={p}
              src={p}
              selected={d.poster === p}
              label={`รูปเทมเพลต ${i + 1}`}
              onClick={() => {
                set({ poster: p })
                setOpen(false)
              }}
            />
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => file.current?.click()}
            className="pressable flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-field)] bg-surface font-medium text-muted border-2 border-dashed border-line disabled:opacity-45"
          >
            <ImageSquare size={26} />
            {busy ? 'กำลังย่อรูป' : 'อัปโหลดรูป'}
          </button>
        </div>
      </Sheet>
    </>
  )
}

const GEO_MSG: Record<GeoError, string> = {
  denied: 'ไม่ได้รับสิทธิ์ใช้ตำแหน่ง เปิดสิทธิ์ในตั้งค่าเบราว์เซอร์แล้วลองใหม่',
  timeout: 'หาตำแหน่งไม่ทัน ลองใหม่ในที่โล่ง',
  unavailable: 'หาตำแหน่งไม่ได้ ลองใหม่ในที่โล่ง',
  unsupported: 'เครื่องนี้ไม่รองรับการหาตำแหน่ง',
}

/** Summary line shown while "ตั้งค่าเพิ่มเติม" is closed. */
export function settingsSummary(d: Draft): string {
  const who = d.supName.trim() ? `ผู้ดูแล ${d.supName.trim()}` : ''
  if (isBottleDraft(d)) return who
  const parts = [
    d.capLimit ? `รับ ${d.capacity} คน` : 'ไม่จำกัดจำนวน',
    d.walkIn && 'รับผู้ไม่ได้ลงทะเบียน',
    checkinSummary(d),
    Number(d.cancelDays) === 0 ? 'ยกเลิกได้ถึงวันงาน' : `ยกเลิกฟรี ${d.cancelDays} วัน`,
    who,
  ]
  return parts.filter(Boolean).join(', ')
}

export function StepDetails({ d, set, errors, advancedOpen, onAdvanced }: StepProps & { advancedOpen: boolean; onAdvanced: (open: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const [geoError, setGeoError] = useState<string>()
  const [descOpen, setDescOpen] = useState(false)
  const bottle = isBottleDraft(d)

  const locate = async () => {
    setBusy(true)
    setGeoError(undefined)
    try {
      const f = await getFix()
      set({ lat: f.lat, lng: f.lng, accuracy: Math.round(f.acc) })
    } catch (e) {
      setGeoError(GEO_MSG[e as GeoError] ?? GEO_MSG.unavailable)
    } finally {
      setBusy(false)
    }
  }
  const toggleScheduled = (on: boolean) => {
    if (!on) return set({ scheduled: false, hideUntilOpen: false })
    const before = d.date ? ymd(toMs(d.date, '00:00') - 86_400_000) : ''
    set({ scheduled: true, openDate: d.openDate || before, openT: d.openT || '08:00' })
  }
  const checkin: CheckinDraft = { qrMode: d.qrMode, qrInterval: d.qrInterval, locMode: d.locMode, radius: d.radius, walkIn: d.walkIn }
  const onCheckin = (v: CheckinDraft) => {
    const changed: Partial<Draft> = {}
    for (const k of ['qrMode', 'qrInterval', 'locMode', 'radius'] as const) if (v[k] !== d[k]) Object.assign(changed, { [k]: v[k] })
    set(changed)
  }

  return (
    <div className="flex flex-col gap-6">
      <PosterPicker d={d} set={set} />

      <Field label="ชื่อกิจกรรม" value={d.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} autoComplete="off" />

      <div className="flex flex-col gap-5">
        <Field label="วันที่จัดกิจกรรม" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} error={errors.date} />
        <div className="grid grid-cols-2 items-start gap-3">
          <Field label="เวลาเริ่ม" type="time" className="min-w-0" value={d.startT} onChange={(e) => set({ startT: e.target.value })} error={errors.startT} />
          <Field label="เวลาจบ" type="time" className="min-w-0" value={d.endT} onChange={(e) => set({ endT: e.target.value })} error={errors.endT} />
        </div>
        <Field label="สถานที่" value={d.place} onChange={(e) => set({ place: e.target.value })} error={errors.place} autoComplete="off" />
        <div className="flex flex-col gap-2.5">
          <Button type="button" variant="secondary" loading={busy} onClick={locate} className="w-full">
            <MapPin size={20} weight="bold" /> ใช้ตำแหน่งปัจจุบัน
          </Button>
          {geoError && <p className="text-sm text-bad">{geoError}</p>}
          {d.lat !== undefined && d.lng !== undefined && !geoError && (
            <p className="num text-sm text-muted" data-testid="pin">
              บันทึกตำแหน่ง {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
              {d.accuracy !== undefined && ` คลาดเคลื่อนราว ${d.accuracy} ม.`}
            </p>
          )}
        </div>
      </div>

      {bottle ? (
        <div className="grid grid-cols-2 items-start gap-3">
          <Field
            label="กี่ขวดได้ 1 ชั่วโมง"
            type="number"
            inputMode="numeric"
            min={1}
            className="min-w-0"
            value={d.itemsPerHour}
            onChange={(e) => set({ itemsPerHour: num(e.target.value) })}
            error={errors.itemsPerHour}
          />
          <Field
            label="ชั่วโมงสูงสุดต่อคน"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            className="min-w-0"
            value={d.hours}
            onChange={(e) => set({ hours: num(e.target.value) })}
            error={errors.hours}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Field
            label="ชั่วโมงต่อคน"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={d.hours}
            onChange={(e) => set({ hours: num(e.target.value) })}
            error={errors.hours}
          />
          <div className="flex flex-wrap gap-2">
            {HOUR_CHIPS.map((n) => (
              <Chip key={n} selected={d.hours === String(n)} onClick={() => set({ hours: String(n) })}>
                {n} ชม.
              </Chip>
            ))}
          </div>
        </div>
      )}

      <Disclosure title="คำอธิบาย" summary={d.description.trim().replace(/\s*\n\s*/g, ' ') || 'ยังไม่มีคำอธิบาย'} open={descOpen} onToggle={() => setDescOpen((v) => !v)}>
        <label htmlFor="desc" className="sr-only">
          คำอธิบาย
        </label>
        <textarea id="desc" rows={7} className={areaClass} value={d.description} onChange={(e) => set({ description: e.target.value })} />
      </Disclosure>

      <Group>
        <Switch checked={d.chatEnabled} onChange={(v) => set({ chatEnabled: v })} label="เปิดห้องแชท" />
        <Reveal show={d.chatEnabled}>
          <div className="pb-4">
            <Field
              label="ลิงก์ OpenChat"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="https://line.me/ti/g2/"
              value={d.openChatUrl}
              onChange={(e) => set({ openChatUrl: e.target.value })}
              error={errors.openChatUrl}
            />
          </div>
        </Reveal>
      </Group>

      <Disclosure title="ตั้งค่าเพิ่มเติม" summary={settingsSummary(d)} open={advancedOpen} onToggle={() => onAdvanced(!advancedOpen)}>
        <div className="flex flex-col gap-6 pt-1">
          {!bottle && (
            <>
              <Group>
                <Switch checked={d.capLimit} onChange={(v) => set({ capLimit: v })} label="จำกัดจำนวน" />
                <Reveal show={d.capLimit}>
                  <div className="pb-4">
                    <Field label="รับได้กี่คน" type="number" inputMode="numeric" min={1} value={d.capacity} onChange={(e) => set({ capacity: num(e.target.value) })} error={errors.capacity} />
                  </div>
                </Reveal>
              </Group>

              <Group>
                <Switch
                  checked={d.walkIn}
                  onChange={(v) => set({ walkIn: v })}
                  label="รับผู้ไม่ได้ลงทะเบียน"
                  hint={d.walkIn ? undefined : 'สแกนได้เฉพาะผู้ลงทะเบียน'}
                />
              </Group>

              <Group>
                <Switch checked={d.scheduled} onChange={toggleScheduled} label="ตั้งเวลาเปิดรับสมัคร" hint={d.scheduled ? undefined : 'ไม่ตั้ง เปิดรับทันทีที่เผยแพร่'} />
                <Reveal show={d.scheduled}>
                  <div className="flex flex-col gap-4 pb-3">
                    <div className="grid grid-cols-2 items-start gap-3">
                      <Field label="วันที่เปิดรับ" type="date" className="min-w-0" value={d.openDate} onChange={(e) => set({ openDate: e.target.value })} error={errors.openDate} />
                      <Field label="เวลาเปิดรับ" type="time" className="min-w-0" value={d.openT} onChange={(e) => set({ openT: e.target.value })} />
                    </div>
                    <Switch checked={d.hideUntilOpen} onChange={(v) => set({ hideUntilOpen: v })} label="ซ่อนจนถึงเวลาเปิดรับ" />
                  </div>
                </Reveal>
              </Group>

              <Field
                label="ยกเลิกฟรีได้กี่วันก่อนงาน"
                type="number"
                inputMode="numeric"
                min={0}
                max={14}
                value={d.cancelDays}
                onChange={(e) => set({ cancelDays: num(e.target.value) })}
                error={errors.cancelDays}
                hint="0 คือยกเลิกได้ถึงวันงาน"
              />

              <CheckinFields value={checkin} onChange={onCheckin} hideWalkIn />
            </>
          )}

          <div className="flex flex-col gap-5">
            <Field label="ชื่อผู้ดูแลกิจกรรม" value={d.supName} onChange={(e) => set({ supName: e.target.value })} error={errors.supName} autoComplete="name" />
            <Field label="เบอร์ติดต่อ" type="tel" inputMode="tel" autoComplete="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
        </div>
      </Disclosure>
    </div>
  )
}

/* Step 3 ------------------------------------------------------------------------------------------ */

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <dt className="w-24 shrink-0 text-[15px] text-muted">{label}</dt>
      <dd className="num min-w-0 flex-1 text-[15px] leading-relaxed break-words">{children}</dd>
    </div>
  )
}

export function StepReview({ d, templateName }: { d: Draft; templateName?: string }) {
  const start = toMs(d.date, d.startT)
  const end = toMs(d.date, d.endT)
  const open = d.scheduled ? toMs(d.openDate, d.openT) : NaN
  const valid = !Number.isNaN(start) && !Number.isNaN(end)
  const when = valid ? `${thDate(start)} ${thTime(start)} ถึง ${thTime(end)} น.` : ''
  const bottle = isBottleDraft(d)
  const cancel = Number(d.cancelDays) === 0 ? 'ยกเลิกฟรีถึงวันงาน' : `ยกเลิกฟรีถึง ${d.cancelDays} วันก่อนงาน`
  const contact = [d.supName, d.phone].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-6">
      <article className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-lift" data-testid="preview">
        <div className="relative">
          {d.poster && <img src={d.poster} alt="" className="aspect-[16/9] w-full object-cover" />}
          <span className="num absolute top-3 right-3 rounded-full bg-surface px-3 py-1 text-[15px] font-semibold shadow-soft">
            {bottle ? `สูงสุด ${d.hours} ชม.` : `${d.hours} ชม.`}
          </span>
        </div>
        <div className="px-5 py-4">
          <h2 className="line-clamp-2 text-xl leading-snug font-bold">{d.title}</h2>
          <p className="num mt-1.5 text-muted">{when}</p>
          <p className="mt-0.5 text-muted">{d.place}</p>
        </div>
      </article>

      <dl className="divide-y divide-line">
        <SummaryRow label="เทมเพลต">{d.categoryKey ? categoryOf(d.categoryKey).label : ''}
          {templateName && (
            <>
              <br />
              {templateName}
            </>
          )}
        </SummaryRow>
        {bottle ? (
          <SummaryRow label="การแลก">
            {d.itemsPerHour} ขวด ได้ 1 ชั่วโมง
            <br />
            สูงสุด {d.hours} ชั่วโมงต่อคน
            <br />
            ผู้ดูแลบันทึกที่จุดรับ ไม่ต้องลงทะเบียน
          </SummaryRow>
        ) : (
          <>
            <SummaryRow label="ชั่วโมง">{d.hours} ชม. ต่อคน</SummaryRow>
            <SummaryRow label="การรับคน">
              {d.capLimit ? `จำกัด ${d.capacity} คน` : 'ไม่จำกัดจำนวน'}
              <br />
              {d.walkIn ? 'รับผู้ไม่ได้ลงทะเบียน' : 'เฉพาะผู้ลงทะเบียน'}
              {d.scheduled && !Number.isNaN(open) && (
                <>
                  <br />
                  เปิดรับ {thDate(open)} {thTime(open)} น.{d.hideUntilOpen && ' ซ่อนจนถึงเวลาเปิด'}
                </>
              )}
              <br />
              {cancel}
            </SummaryRow>
            <SummaryRow label="การเช็คชื่อ">{checkinSummary(d)}</SummaryRow>
          </>
        )}
        <SummaryRow label="ผู้ดูแล">
          {contact}
          {d.chatEnabled && (
            <>
              <br />
              เปิดห้องแชท{d.openChatUrl.trim() && ' มีลิงก์ OpenChat'}
            </>
          )}
        </SummaryRow>
      </dl>
    </div>
  )
}
