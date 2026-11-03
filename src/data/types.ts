export type CategoryKey = 'blood' | 'setup' | 'bottle' | 'other'
export type QrMode = 'dynamic' | 'static'
export type LocMode = 'on' | 'off'
export type CreditFlag = 'location' | 'device'

/** Device-notification switches, stored per student. `enabled` is the master switch. */
export interface NotifyPrefs {
  enabled: boolean
  openings: boolean
  announcements: boolean
  messages: boolean
}

export interface Student {
  id: string
  name: string
  createdAt: number
  /** Activities whose registration opening the student asked to be reminded about. */
  reminders?: string[]
  notify?: Partial<NotifyPrefs>
}

export type NoticeKind = 'registered' | 'announce' | 'credit' | 'recorded' | 'chat' | 'open'

export interface Notice {
  id: string
  studentId: string
  kind: NoticeKind
  title: string
  body: string
  activityId?: string
  /** Where tapping the notice goes. Defaults to the activity page. */
  to?: string
  at: number
  read: boolean
}

export interface Announcement {
  id: string
  activityId: string
  text: string
  images: string[]
  at: number
}

export interface ChatMsg {
  id: string
  activityId: string
  authorId: string
  authorName: string
  text: string
  at: number
  sup: boolean
}

/** Private thread between one student and the supervisors of one activity. */
export interface DirectMsg {
  id: string
  activityId: string
  studentId: string
  fromSup: boolean
  authorName: string
  text: string
  at: number
  /** Read by the other side. */
  read: boolean
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
  /** The supervisor-made template this activity started from (categoryKey is then 'other'). The template may be deleted later. */
  templateId?: string
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
  /** Bottle exchange only: how many bottles make one hour. `hours` is then the most one person can get. */
  itemsPerHour?: number
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

/** A registration seen from the student's side, which needs to know the activity. */
export type MyRegistration = Registration & { activityId: string }

export interface Credit {
  studentId: string
  name: string
  hours: number
  fullHours: number
  /** Bottle exchange only: how many bottles the hours were counted from. */
  items?: number
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

export type MyCredit = Credit & { activityId: string }

/** What createActivity takes: everything but the id, the server time and the counters. */
export type NewActivity = Omit<Activity, 'id' | 'createdAt' | 'regCount' | 'creditCount'>

/** Fields the editor and the settings sheet may change. A key present with value undefined clears an optional field. */
export type ActivityEdit = Partial<Omit<NewActivity, 'org' | 'orgCode' | 'closedAt' | 'submittedAt' | 'recordedAt' | 'hidden'>>

/** Defaults a template carries for the check-in and intake settings. */
export interface TemplateSettings {
  capLimit: boolean
  capacity: number
  walkIn: boolean
  qrMode: QrMode
  qrInterval: number
  locMode: LocMode
  radius: number
}

/** A template a supervisor made, shared by everyone who signs in with the same organisation code. */
export interface Template {
  id: string
  orgCode: string
  title: string
  poster: string
  description: string
  hours: number
  settings: TemplateSettings
  createdBy: string
  createdAt: number
}

/** What createTemplate takes: everything but the id and the server time. */
export type NewTemplate = Omit<Template, 'id' | 'createdAt'>

/** Fields editing a template may change. */
export type TemplateEdit = Partial<Pick<Template, 'title' | 'poster' | 'description' | 'hours' | 'settings'>>
