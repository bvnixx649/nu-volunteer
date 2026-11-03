export type CategoryKey = 'blood' | 'setup' | 'bottle'
export type QrMode = 'dynamic' | 'static'
export type LocMode = 'on' | 'off'
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
  /** Metres from the QR screen that count as at the activity. */
  radius: number
  /** Seconds between dynamic QR codes. */
  qrInterval: number
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

/** What createActivity takes: everything but the id, the server time and the counters. */
export type NewActivity = Omit<Activity, 'id' | 'createdAt' | 'regCount' | 'creditCount'>

/** Fields the editor and the settings sheet may change. A key present with value undefined clears an optional field. */
export type ActivityEdit = Partial<Omit<NewActivity, 'org' | 'orgCode' | 'closedAt' | 'submittedAt' | 'recordedAt' | 'hidden'>>
