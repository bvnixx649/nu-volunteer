import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../data/api'
import type { Activity } from '../../data/types'
import { checkinOf } from '../../lib/checkin'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { CheckinFields, type CheckinDraft } from './CheckinFields'

const draftOf = (a: Activity): CheckinDraft => ({ qrMode: a.qrMode, ...checkinOf(a) })

/** Edit QR and location settings of one activity. Saves with one button. */
export function CheckinSettingsSheet({ open, activity, onClose }: { open: boolean; activity: Activity; onClose: () => void }) {
  const [draft, setDraft] = useState(() => draftOf(activity))
  const [busy, setBusy] = useState(false)

  // Start from the saved values each time the sheet opens.
  useEffect(() => {
    if (open) setDraft(draftOf(activity))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const save = async () => {
    setBusy(true)
    try {
      await api.updateActivity(activity.id, draft)
      toast.success('บันทึกการตั้งค่าแล้ว')
      onClose()
    } catch {
      toast.error('บันทึกไม่ได้ ลองอีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="ตั้งค่าการเช็คชื่อ">
      <CheckinFields value={draft} onChange={setDraft} />
      <Button size="lg" className="mt-6 w-full" loading={busy} onClick={save}>
        บันทึก
      </Button>
    </Sheet>
  )
}
