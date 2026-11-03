import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from './data/api'
import type { Student } from './data/types'
import { cleanName } from './lib/format'

export interface SupSession {
  name: string
  orgCode: string
  orgName: string
  admin: boolean
}

interface DeviceState {
  /** The student this phone belongs to. Remembered so the next scan goes straight through. */
  studentId: string | null
  /** Random per browser. Two students claiming from one deviceId get the "เครื่องซ้ำ" flag. */
  deviceId: string
  sup: SupSession | null
  /** Last contact phone a supervisor typed on this device, to prefill the next activity. */
  supPhone: string
  setSupPhone: (p: string) => void
  setStudent: (id: string) => void
  signOut: () => void
  setSup: (s: SupSession) => void
  clearSup: () => void
}

export const useDevice = create<DeviceState>()(
  persist(
    (set) => ({
      studentId: null,
      deviceId: crypto.randomUUID(),
      sup: null,
      supPhone: '',
      setSupPhone: (supPhone) => set({ supPhone }),
      setStudent: (studentId) => set({ studentId }),
      signOut: () => set({ studentId: null }),
      setSup: (sup) => set({ sup }),
      clearSup: () => set({ sup: null }),
    }),
    { name: 'nuv:device' },
  ),
)

/** Looks up a student id. A known id keeps its stored name; a new one is created with the typed name. */
export async function identify(id: string, name: string): Promise<{ kind: 'existing' | 'new'; student: Student }> {
  const found = await api.getStudent(id)
  if (found) return { kind: 'existing', student: found }
  const student: Student = { id, name: cleanName(name), createdAt: Date.now() }
  await api.createStudent(student)
  return { kind: 'new', student }
}
