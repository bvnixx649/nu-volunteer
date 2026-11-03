import { useEffect } from 'react'
import { create } from 'zustand'
import { api, now } from './api'
import type { Activity, MyCredit, MyRegistration, Notice, Student } from './types'
import { useDevice } from '../store'
import { systemNotify } from '../lib/device'

/**
 * What the signed-in student's screens share: the activity list, their own registrations, credits and notices.
 * Read once and again on focus, never over realtime (SPEC 9.3). Notices nobody on the server creates yet are
 * made here, at the moment the app notices the event (see produceNotices).
 */
interface Mine {
  student: Student | null
  activities: Activity[]
  regs: MyRegistration[]
  credits: MyCredit[]
  notices: Notice[]
  loaded: boolean
  failed: boolean
  refresh: () => Promise<void>
  patchStudent: (p: Partial<Student>) => void
}

let seen: Set<string> | null = null

export const useMine = create<Mine>((set, get) => ({
  student: null,
  activities: [],
  regs: [],
  credits: [],
  notices: [],
  loaded: false,
  failed: false,
  patchStudent: (p) => set((s) => (s.student ? { student: { ...s.student, ...p } } : s)),
  async refresh() {
    const id = useDevice.getState().studentId
    if (!id) return set({ student: null, regs: [], credits: [], notices: [], loaded: true })
    try {
      const [student, activities, regs, credits] = await Promise.all([
        api.getStudent(id),
        api.listActivities(),
        api.studentRegistrations(id),
        api.studentCredits(id),
      ])
      await produceNotices(id, student, activities, credits)
      const notices = await api.listNotices(id)
      set({ student, activities, regs, credits, notices, loaded: true, failed: false })
      announceNew(notices, student)
    } catch {
      set({ loaded: true, failed: !get().activities.length })
    }
  },
}))

/** Shows a device notification for notices that arrived since the last look, when the student turned them on. */
function announceNew(notices: Notice[], student: Student | null) {
  const ids = new Set(notices.map((n) => n.id))
  if (seen && student?.notify?.enabled) {
    for (const n of notices) {
      if (!n.read && !seen.has(n.id)) systemNotify(n.title, n.body, n.to ?? (n.activityId ? `/a/${n.activityId}` : '/inbox'))
    }
  }
  seen = ids
}

/**
 * Notices with no server-side producer yet. Both are idempotent: a reminder is removed once it fires,
 * and "recorded" is written once per activity.
 *  - open: a registration the student asked to be reminded about has opened
 *  - recorded: the centre recorded the hours the student earned
 */
async function produceNotices(id: string, student: Student | null, activities: Activity[], credits: MyCredit[]) {
  if (!student) return
  const t = now()
  const byId = new Map(activities.map((a) => [a.id, a]))
  const reminders = student.reminders ?? []
  const fired = reminders.filter((aid) => {
    const a = byId.get(aid)
    return a && (!a.opensAt || a.opensAt <= t)
  })
  for (const aid of fired) {
    const a = byId.get(aid)!
    await api.addNotice({ studentId: id, kind: 'open', title: 'เปิดรับสมัครแล้ว', body: a.title, activityId: aid })
  }
  if (fired.length) {
    const next = reminders.filter((x) => !fired.includes(x))
    await api.updateStudent(id, { reminders: next })
    student.reminders = next
  }

  const have = await api.listNotices(id)
  for (const c of credits) {
    const a = byId.get(c.activityId)
    if (a?.recordedAt && !have.some((n) => n.kind === 'recorded' && n.activityId === a.id)) {
      await api.addNotice({ studentId: id, kind: 'recorded', title: 'บันทึกชั่วโมงลงระบบแล้ว', body: a.title, activityId: a.id })
    }
  }
}

/** Loads the student's data on mount, and again when the tab comes back to the front. */
export function useMineSync() {
  const studentId = useDevice((s) => s.studentId)
  const refresh = useMine((s) => s.refresh)
  useEffect(() => {
    if (!studentId) return
    // A different student on this phone must not see the last one's data while theirs loads.
    if (useMine.getState().student?.id !== studentId) useMine.setState({ student: null, regs: [], credits: [], notices: [], loaded: false })
    refresh()
    const onShow = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onShow)
    const t = setInterval(onShow, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onShow)
      clearInterval(t)
    }
  }, [studentId, refresh])
}
