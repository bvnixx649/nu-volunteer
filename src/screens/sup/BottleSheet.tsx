import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../data/api'
import type { Activity, Credit } from '../../data/types'
import { addBottles, bottleHours, bottleRemainder } from '../../lib/bottle'
import { cleanName, isStudentId } from '../../lib/format'
import { identify } from '../../store'
import { Button } from '../../ui/Button'
import { Chip } from '../../ui/Chip'
import { Field } from '../../ui/Field'
import { Sheet } from '../../ui/Sheet'

const QUICK = [10, 20]

/** The desk for a bottle exchange: type the student id, count the bottles, save. A second visit adds to the first. */
export function BottleSheet({ open, activity, by, onClose }: { open: boolean; activity: Activity; by: string; onClose: () => void }) {
  const perHour = activity.itemsPerHour ?? 20
  const max = activity.hours
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [known, setKnown] = useState(false)
  const [count, setCount] = useState('')
  const [credit, setCredit] = useState<Credit | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setId('')
      setName('')
      setKnown(false)
      setCount('')
      setCredit(null)
    }
  }, [open])

  // A known id fills its name; an id with bottles already saved shows them.
  useEffect(() => {
    if (!isStudentId(id)) {
      setKnown(false)
      setCredit(null)
      return
    }
    let stale = false
    api.getStudent(id).then((s) => {
      if (stale) return
      setKnown(!!s)
      if (s) setName(s.name)
    })
    api.getCredit(activity.id, id).then((c) => !stale && setCredit(c))
    return () => {
      stale = true
    }
  }, [id, activity.id])

  const add = count === '' ? 0 : Number(count)
  const before = credit?.items ?? 0
  const total = before + add
  const hours = bottleHours(total, perHour, max)
  const left = bottleRemainder(total, perHour, max)
  const canSave = isStudentId(id) && !!cleanName(name) && add > 0 && !busy

  const save = async () => {
    setBusy(true)
    try {
      const { student } = await identify(id, name)
      const out = await addBottles(api, activity, { id: student.id, name: student.name }, add, by)
      toast.success(`บันทึกของ ${student.name} แล้ว`, { description: `รวม ${out.items} ขวด ได้ ${out.hours} ชั่วโมง` })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error && e.message === 'offline' ? 'บันทึกไม่ได้เพราะไม่มีอินเทอร์เน็ต' : 'บันทึกไม่ได้ ลองอีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="บันทึกขวด">
      <div className="flex flex-col gap-5">
        <Field label="รหัสนิสิต" inputMode="numeric" maxLength={8} autoComplete="off" value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, ''))} />
        <Field label="ชื่อ-นามสกุล" value={name} disabled={known} onChange={(e) => setName(e.target.value)} />
        {credit && (
          <p className="num -mt-1 text-sm text-muted" data-testid="bottle-before">
            บันทึกไว้แล้ว {before} ขวด ได้ {credit.hours} ชั่วโมง
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Field
            label={credit ? 'จำนวนขวดที่เพิ่ม' : 'จำนวนขวด'}
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            value={count}
            onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <div className="flex flex-wrap gap-2">
            {QUICK.map((n) => (
              <Chip key={n} onClick={() => setCount(String(Math.min(9999, add + n)))}>
                +{n}
              </Chip>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] bg-surface-2 px-5 py-5 text-center" aria-live="polite" data-testid="bottle-preview">
          <p className="flex items-baseline justify-center gap-2">
            <span className="num text-6xl leading-none font-bold tracking-tight" data-testid="bottle-hours">
              {hours}
            </span>
            <span className="text-lg font-semibold">ชั่วโมง</span>
          </p>
          <p className="num mt-2 text-muted">รวม {total} ขวด</p>
          <p className="num mt-0.5 text-sm text-muted" data-testid="bottle-left">
            {left === null ? `ครบ ${max} ชั่วโมงแล้ว` : `อีก ${left} ขวดได้ชั่วโมงถัดไป`}
          </p>
        </div>

        <Button size="lg" className="w-full" disabled={!canSave} loading={busy} onClick={save}>
          บันทึก
        </Button>
      </div>
    </Sheet>
  )
}
