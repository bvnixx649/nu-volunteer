import { toast } from 'sonner'
import { api } from '../data/api'
import type { NotifyPrefs, Student } from '../data/types'
import { askNotifyPermission } from './device'

export const NOTIFY_DEFAULTS: NotifyPrefs = { enabled: false, openings: true, announcements: true, messages: true }
export const prefsOf = (s: Student | null): NotifyPrefs => ({ ...NOTIFY_DEFAULTS, ...s?.notify })

export async function saveNotify(student: Student, patch: Partial<NotifyPrefs>, patchStudent: (p: Partial<Student>) => void) {
  const notify = { ...prefsOf(student), ...patch }
  patchStudent({ notify })
  try {
    await api.updateStudent(student.id, { notify })
  } catch {
    toast.error('บันทึกการตั้งค่าไม่ได้')
  }
}

/** Asks the browser for permission, then turns the master switch on. */
export async function enablePush(student: Student, patchStudent: (p: Partial<Student>) => void) {
  const r = await askNotifyPermission()
  if (r === 'granted') {
    await saveNotify(student, { enabled: true }, patchStudent)
    toast.success('เปิดการแจ้งเตือนแล้ว')
  } else if (r === 'unsupported') {
    await saveNotify(student, { enabled: true }, patchStudent)
    toast('เบราว์เซอร์นี้ไม่รองรับแจ้งเตือนบนหน้าจอ จะแจ้งในแอปแทน')
  } else {
    toast.error('ยังไม่ได้อนุญาตการแจ้งเตือน', { description: 'เปิดได้ในการตั้งค่าของเบราว์เซอร์' })
  }
}

