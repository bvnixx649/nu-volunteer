import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../data/api'
import type { Activity } from '../../data/types'
import { cleanName, isStudentId } from '../../lib/format'
import { identify } from '../../store'
import { Sheet } from '../../ui/Sheet'
import { Field } from '../../ui/Field'
import { Button } from '../../ui/Button'

/** For people who cannot scan (no phone, no internet): the supervisor types them in and gives full hours. */
export function AddPersonSheet({ open, activity, by, onClose }: { open: boolean; activity: Activity; by: string; onClose: () => void }) {
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [known, setKnown] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setId('')
      setName('')
      setKnown(false)
    }
  }, [open])

  // A known id fills its name, so typos in names do not create a second spelling.
  useEffect(() => {
    if (!isStudentId(id)) return setKnown(false)
    api.getStudent(id).then((s) => {
      setKnown(!!s)
      if (s) setName(s.name)
    })
  }, [id])

  const save = async () => {
    setBusy(true)
    try {
      const { student } = await identify(id, name)
      const r = await api.claim({ activityId: activity.id, student: { id: student.id, name: student.name }, hours: activity.hours, method: 'manual', flags: [], by })
      if (r.ok) {
        toast.success(`เพิ่ม ${student.name} แล้ว`)
        onClose()
      } else toast.error(r.reason === 'already' ? `${student.name} ได้ชั่วโมงแล้ว` : 'บันทึกไม่ได้เพราะไม่มีอินเทอร์เน็ต')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="เพิ่มคนเอง">
      <div className="flex flex-col gap-5">
        <Field label="รหัสนิสิต" inputMode="numeric" maxLength={8} value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, ''))} />
        <Field label="ชื่อ-นามสกุล" value={name} disabled={known} onChange={(e) => setName(e.target.value)} hint={known ? 'มีชื่อนี้ในระบบแล้ว' : undefined} />
        <Button size="lg" className="w-full" disabled={!isStudentId(id) || !cleanName(name)} loading={busy} onClick={save}>
          ให้ {activity.hours} ชั่วโมง
        </Button>
      </div>
    </Sheet>
  )
}
