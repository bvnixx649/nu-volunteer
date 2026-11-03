import { useRef, useState } from 'react'
import { ImageSquare, PencilSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { HOUR_CHIPS } from '../../config'
import type { NewTemplate, Template } from '../../data/types'
import { resizeToDataUrl } from '../../lib/image'
import { Button } from '../../ui/Button'
import { Chip } from '../../ui/Chip'
import { Field } from '../../ui/Field'
import { Sheet } from '../../ui/Sheet'
import { Switch } from '../../ui/Switch'
import { CheckinFields } from './CheckinFields'

type Form = {
  title: string
  poster: string
  hours: string
  description: string
  capLimit: boolean
  capacity: string
  walkIn: boolean
  qrMode: Template['settings']['qrMode']
  qrInterval: number
  locMode: Template['settings']['locMode']
  radius: number
}

const blank = (): Form => ({ title: '', poster: '', hours: '3', description: '', capLimit: false, capacity: '30', walkIn: false, qrMode: 'dynamic', qrInterval: 10, locMode: 'on', radius: 150 })
const formOf = (t: Template): Form => ({ title: t.title, poster: t.poster, hours: String(t.hours), description: t.description, ...t.settings, capacity: String(t.settings.capacity) })

const num = (s: string) => s.replace(/\D/g, '').slice(0, 4)
const whole = (s: string) => /^\d+$/.test(s.trim())

function templateErrors(f: Form): Record<string, string> {
  const e: Record<string, string> = {}
  if (!f.title.trim()) e.title = 'ใส่ชื่อกิจกรรม'
  if (!f.poster) e.poster = 'เลือกรูปปก'
  if (!f.hours.trim()) e.hours = 'ใส่จำนวนชั่วโมง'
  else if (!whole(f.hours) || +f.hours < 1 || +f.hours > 99) e.hours = 'ใส่ตัวเลข 1 ถึง 99'
  if (f.capLimit && (!whole(f.capacity) || +f.capacity < 1 || +f.capacity > 9999)) e.capacity = 'ใส่จำนวนคน 1 ถึง 9999'
  return e
}

const areaClass =
  'min-h-32 w-full resize-none rounded-[var(--radius-field)] bg-surface px-4 py-3 text-[17px] leading-relaxed ring-1 ring-line transition-shadow duration-150 outline-none placeholder:text-muted focus:ring-2 focus:ring-accent'

type Props = {
  open: boolean
  onClose: () => void
  /** Template being edited, or null for a new one. */
  editing: Template | null
  who: { orgCode: string; name: string }
  onSave: (t: NewTemplate, id?: string) => Promise<void>
}

/** Create or edit a supervisor-made template. The body remounts per template so the form starts from the right values. */
export function TemplateForm({ open, onClose, editing, who, onSave }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'แก้ไขเทมเพลต' : 'เพิ่มกิจกรรม'}>
      <Body key={editing?.id ?? 'new'} editing={editing} who={who} onSave={onSave} />
    </Sheet>
  )
}

function Body({ editing, who, onSave }: Pick<Props, 'editing' | 'who' | 'onSave'>) {
  const [f, setF] = useState<Form>(() => (editing ? formOf(editing) : blank()))
  const [attempted, setAttempted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const set = (p: Partial<Form>) => setF((v) => ({ ...v, ...p }))
  const errors = attempted ? templateErrors(f) : {}

  const upload = async (picked?: File) => {
    if (!picked) return
    setPhotoBusy(true)
    try {
      set({ poster: await resizeToDataUrl(picked) })
    } catch {
      toast.error('ใช้รูปนี้ไม่ได้ ลองรูปอื่น')
    } finally {
      setPhotoBusy(false)
      if (file.current) file.current.value = ''
    }
  }

  const save = async () => {
    if (Object.keys(templateErrors(f)).length) {
      setAttempted(true)
      setTimeout(() => document.querySelector('[role="dialog"] [aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
      return
    }
    setBusy(true)
    try {
      await onSave(
        {
          orgCode: who.orgCode,
          title: f.title.trim(),
          poster: f.poster,
          description: f.description.trim(),
          hours: Number(f.hours),
          settings: { capLimit: f.capLimit, capacity: Number(f.capacity) > 0 ? Number(f.capacity) : 30, walkIn: f.walkIn, qrMode: f.qrMode, qrInterval: f.qrInterval, locMode: f.locMode, radius: f.radius },
          createdBy: who.name,
        },
        editing?.id,
      )
    } catch {
      toast.error('บันทึกไม่ได้ ลองอีกครั้ง')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-medium">รูปปก</span>
        <button
          type="button"
          aria-label={f.poster ? 'เปลี่ยนรูปปก' : 'อัปโหลดรูปปก'}
          aria-invalid={!!errors.poster || undefined}
          disabled={photoBusy}
          onClick={() => file.current?.click()}
          className={`pressable relative block aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-card)] bg-surface-2 ${f.poster ? 'shadow-soft' : 'border-2 border-dashed border-line'} ${errors.poster ? 'ring-2 ring-bad' : ''}`}
        >
          {f.poster ? (
            <>
              <img src={f.poster} alt="" className="size-full object-cover" />
              <span className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/60 px-3.5 text-sm font-medium text-white backdrop-blur-sm">
                <PencilSimple size={16} weight="bold" /> เปลี่ยนรูป
              </span>
            </>
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-1.5 font-medium text-muted">
              <ImageSquare size={28} />
              {photoBusy ? 'กำลังย่อรูป' : 'อัปโหลดรูป'}
            </span>
          )}
        </button>
        <input ref={file} type="file" accept="image/*" hidden data-testid="template-file" onChange={(e) => upload(e.target.files?.[0])} />
        {errors.poster && <p className="text-sm text-bad">{errors.poster}</p>}
      </div>

      <Field label="ชื่อกิจกรรม" value={f.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} autoComplete="off" />

      <div className="flex flex-col gap-3">
        <Field label="ชั่วโมงต่อคน" type="number" inputMode="numeric" min={1} max={99} value={f.hours} onChange={(e) => set({ hours: num(e.target.value) })} error={errors.hours} />
        <div className="flex flex-wrap gap-2">
          {HOUR_CHIPS.map((n) => (
            <Chip key={n} selected={f.hours === String(n)} onClick={() => set({ hours: String(n) })}>
              {n} ชม.
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="tpl-desc" className="text-[15px] font-medium">
          คำอธิบาย
        </label>
        <textarea id="tpl-desc" rows={5} className={areaClass} value={f.description} onChange={(e) => set({ description: e.target.value })} />
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">ตั้งค่าเพิ่มเติม</h3>
        <div className="rounded-[var(--radius-field)] bg-surface px-4 ring-1 ring-line">
          <Switch checked={f.capLimit} onChange={(v) => set({ capLimit: v })} label="จำกัดจำนวน" />
          {f.capLimit && (
            <div className="pb-4">
              <Field label="รับได้กี่คน" type="number" inputMode="numeric" min={1} value={f.capacity} onChange={(e) => set({ capacity: num(e.target.value) })} error={errors.capacity} />
            </div>
          )}
        </div>
        <div className="rounded-[var(--radius-field)] bg-surface px-4 ring-1 ring-line">
          <Switch checked={f.walkIn} onChange={(v) => set({ walkIn: v })} label="รับผู้ไม่ได้ลงทะเบียน" hint={f.walkIn ? undefined : 'สแกนได้เฉพาะผู้ลงทะเบียน'} />
        </div>
        <CheckinFields
          hideWalkIn
          value={{ qrMode: f.qrMode, qrInterval: f.qrInterval, locMode: f.locMode, radius: f.radius, walkIn: f.walkIn }}
          onChange={(v) => set({ qrMode: v.qrMode, qrInterval: v.qrInterval, locMode: v.locMode, radius: v.radius })}
        />
      </div>

      <Button size="lg" className="w-full" loading={busy} onClick={save}>
        {editing ? 'บันทึก' : 'บันทึกเทมเพลต'}
      </Button>
    </div>
  )
}
