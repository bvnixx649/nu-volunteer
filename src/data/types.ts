export type CategoryKey = 'blood' | 'environment' | 'ceremony' | 'camp' | 'repair' | 'recycle' | 'staff' | 'other'
export type QrMode = 'dynamic' | 'static'
export type LocMode = 'strict' | 'flex' | 'off'
export type CreditFlag = 'location' | 'device'

export interface Student {
  id: string
  name: string
  createdAt: number
}

export interface Org {
  code: string
  name: string
  admin: boolean
}

export interface Activity {
  id: string
  title: string
  categoryKey: CategoryKey
  org: string
  orgCode: string
  poster: string
  description: string
  place: string
  lat?: number
  lng?: number
  start: number
  end: number
  hours: number
  capLimit: boolean
  capacity: number
  walkIn: boolean
  qrMode: QrMode
  locMode: LocMode
  supervisor: { name: string; phone: string }
  chatEnabled: boolean
  openChatUrl?: string
  opensAt?: number
  cancelDays?: number
  closedAt?: number
  submittedAt?: number
  recordedAt?: number
  hidden?: boolean
  hideUntilOpen?: boolean
  createdAt: number
  regCount: number
  creditCount: number
}

export interface Registration {
  studentId: string
  name: string
  at: number
  walkIn?: boolean
  cancelledAt?: number
  late?: boolean
  waived?: boolean
}

export interface Credit {
  studentId: string
  name: string
  hours: number
  fullHours: number
  at: number
  method: 'qr' | 'manual'
  distance?: number
  accuracy?: number
  flags: CreditFlag[]
  deviceId?: string
  ref?: string
  editedBy?: string
  editedAt?: number
  reason?: string
}
