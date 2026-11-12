import { CANCEL_DAYS, QR_INTERVAL_DEFAULT, RADIUS_DEFAULT } from '../config'
import { categoryOf } from '../data/categories'
import type { Activity, ActivityEdit, CategoryKey, LocMode, NewActivity, QrMode, Template } from '../data/types'

/** Everything the create and edit flow holds while the supervisor types. Numbers stay strings until they are checked. */
export interface Draft {
  categoryKey: CategoryKey | null
  /** Set when the activity starts from a supervisor-made template; categoryKey is then 'other'. */
  templateId: string | null
  title: string
  poster: string
  description: string
  date: string
  startT: string
  endT: string
  place: string
  lat?: number
  lng?: number
  /** From the GPS button only; not saved with the activity. */
  accuracy?: number
  hours: string
  /** Bottle exchange only: bottles per hour, as typed. Empty for other categories. */
  itemsPerHour: string
  capLimit: boolean
  capacity: string
  walkIn: boolean
  scheduled: boolean
  openDate: string
  openT: string
  hideUntilOpen: boolean
  cancelDays: string
  qrMode: QrMode
  qrInterval: number
  locMode: LocMode
  radius: number
  supName: string
  phone: string
  chatEnabled: boolean
  openChatUrl: string
}

/** Fields a category fills in. Once the supervisor edits one, picking another category leaves it alone. */
export const DEFAULT_KEYS = ['poster', 'description', 'hours', 'itemsPerHour', 'capLimit', 'capacity', 'walkIn', 'qrMode', 'qrInterval', 'locMode', 'radius'] as const
export type DefaultKey = (typeof DEFAULT_KEYS)[number]

/** Template photos of a category. Categories without any (recycling) borrow the ones of "อื่น ๆ". */
export const posterChoices = (key: CategoryKey) => categoryOf(key).posters

export function blankDraft(supName = '', phone = ''): Draft {
  return {
    categoryKey: null,
    templateId: null,
    title: '',
    poster: '',
    description: '',
    date: '',
    startT: '09:00',
    endT: '16:00',
    place: '',
    hours: '',
    itemsPerHour: '',
    capLimit: false,
    capacity: '30',
    walkIn: false,
    scheduled: false,
    openDate: '',
    openT: '',
    hideUntilOpen: false,
    cancelDays: String(CANCEL_DAYS),
    qrMode: 'dynamic',
    qrInterval: QR_INTERVAL_DEFAULT,
    locMode: 'on',
    radius: RADIUS_DEFAULT,
    supName,
    phone,
    chatEnabled: false,
    openChatUrl: '',
  }
}

/** Sets the category and fills every default field the supervisor has not touched. */
export function applyCategory(d: Draft, key: CategoryKey, touched: ReadonlySet<string>): Draft {
  const c = categoryOf(key)
  const defaults: Pick<Draft, DefaultKey> = {
    poster: posterChoices(key)[0],
    description: c.description,
    hours: String(c.hours),
    itemsPerHour: c.itemsPerHour ? String(c.itemsPerHour) : '',
    capLimit: c.capLimit,
    capacity: String(c.capacity > 0 ? c.capacity : 30),
    walkIn: c.walkIn,
    qrMode: c.qrMode,
    qrInterval: c.qrInterval,
    locMode: c.locMode,
    radius: c.radius,
  }
  const next: Draft = { ...d, categoryKey: key, templateId: null }
  for (const k of DEFAULT_KEYS) if (!touched.has(k)) Object.assign(next, { [k]: defaults[k] })
  return next
}

/** Same as applyCategory for a supervisor-made template: category "อื่น ๆ" and the template's own values. */
export function applyTemplate(d: Draft, t: Template, touched: ReadonlySet<string>): Draft {
  const defaults: Pick<Draft, DefaultKey> = {
    poster: t.poster,
    description: t.description,
    hours: String(t.hours),
    itemsPerHour: '',
    capLimit: t.settings.capLimit,
    capacity: String(t.settings.capacity > 0 ? t.settings.capacity : 30),
    walkIn: t.settings.walkIn,
    qrMode: t.settings.qrMode,
    qrInterval: t.settings.qrInterval,
    locMode: t.settings.locMode,
    radius: t.settings.radius,
  }
  const next: Draft = { ...d, categoryKey: 'other', templateId: t.id }
  for (const k of DEFAULT_KEYS) if (!touched.has(k)) Object.assign(next, { [k]: defaults[k] })
  return next
}

const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const hm = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** Years the date inputs accept (CE). Anything outside is a typo. */
export const MIN_DATE = '2020-01-01'
export const MAX_DATE = '2100-12-31'

/**
 * A date input value in CE. A Buddhist year typed into the input (2569-11-03) is read as CE by the browser and
 * would be shown as 3112 after thDate adds 543, so a year above 2400 is taken as BE and brought back to CE.
 */
export function fixDate(date: string) {
  const m = /^(\d{4,6})-(\d{2})-(\d{2})$/.exec(date)
  if (!m || +m[1] <= 2400) return date
  return `${String(+m[1] - 543).padStart(4, '0')}-${m[2]}-${m[3]}`
}

/** Local date and time inputs to epoch ms, NaN when either is empty or malformed. */
export const toMs = (date: string, time: string) => (date && time ? new Date(`${fixDate(date)}T${time}`).getTime() : NaN)

export function draftOf(a: Activity): Draft {
  return {
    categoryKey: a.categoryKey,
    templateId: a.templateId ?? null,
    title: a.title,
    poster: a.poster,
    description: a.description,
    date: ymd(a.start),
    startT: hm(a.start),
    endT: hm(a.end),
    place: a.place,
    lat: a.lat,
    lng: a.lng,
    hours: String(a.hours),
    itemsPerHour: a.itemsPerHour ? String(a.itemsPerHour) : '',
    capLimit: a.capLimit,
    capacity: String(a.capacity > 0 ? a.capacity : 30),
    walkIn: a.walkIn,
    scheduled: !!a.opensAt,
    openDate: a.opensAt ? ymd(a.opensAt) : '',
    openT: a.opensAt ? hm(a.opensAt) : '',
    hideUntilOpen: !!a.hideUntilOpen,
    cancelDays: String(a.cancelDays ?? CANCEL_DAYS),
    qrMode: a.qrMode,
    qrInterval: a.qrInterval || QR_INTERVAL_DEFAULT,
    locMode: a.locMode === 'off' ? 'off' : 'on',
    radius: a.radius || RADIUS_DEFAULT,
    supName: a.supervisor.name,
    phone: a.supervisor.phone,
    chatEnabled: a.chatEnabled,
    openChatUrl: a.openChatUrl ?? '',
  }
}

/** Steps: 1 template, 2 details, 3 review and publish. */
export const STEP_COUNT = 3

export interface Check {
  /** The step can move on. */
  ok: boolean
  /** Messages by field for values that are wrong. */
  errors: Record<string, string>
  /** Messages by field for required fields still empty; shown once the supervisor tries to move on. */
  missing: Record<string, string>
}

/** Keeps what the supervisor typed (up to 6 characters) so "2.5" or "-3" stays visible and check() rejects it, instead of turning into another number. */
export const typedNumber = (s: string) => s.slice(0, 6)
const whole = (s: string) => /^\d+$/.test(s.trim())
const isUrl = (s: string) => {
  try {
    return /^https?:$/.test(new URL(s).protocol)
  } catch {
    return false
  }
}

/** Bottle exchange: no registration, no QR, no location. The desk adds people by hand. */
export const isBottleDraft = (d: Pick<Draft, 'categoryKey'>) => d.categoryKey === 'bottle'

/** Fields that live inside the collapsed "ตั้งค่าเพิ่มเติม" section. */
export const ADVANCED_FIELDS = ['capacity', 'openDate', 'cancelDays', 'supName', 'openChatUrl']

/** Checks one step (1 to 3; step 3 checks everything). */
export function check(step: number, d: Draft): Check {
  if (step === 3) {
    const all = [check(1, d), check(2, d)]
    return { ok: all.every((c) => c.ok), errors: Object.assign({}, ...all.map((c) => c.errors)), missing: Object.assign({}, ...all.map((c) => c.missing)) }
  }
  const errors: Record<string, string> = {}
  const missing: Record<string, string> = {}
  let ok = true
  const need = (field: string, cond: boolean, msg: string) => {
    if (!cond) {
      missing[field] = msg
      ok = false
    }
  }
  const bad = (field: string, msg: string) => {
    errors[field] = msg
    ok = false
  }

  if (step === 1) return { ok: d.categoryKey !== null, errors, missing }

  const bottle = isBottleDraft(d)
  need('title', d.title.trim().length > 0, 'ใส่ชื่อกิจกรรม')
  need('date', !!d.date, 'เลือกวันที่')
  if (d.date && (fixDate(d.date) < MIN_DATE || fixDate(d.date) > MAX_DATE)) bad('date', 'ปีของวันที่ไม่ถูกต้อง')
  need('startT', !!d.startT, 'ใส่เวลาเริ่ม')
  need('endT', !!d.endT, 'ใส่เวลาจบ')
  need('place', d.place.trim().length > 0, 'ใส่สถานที่')
  const s = toMs(d.date, d.startT)
  const e = toMs(d.date, d.endT)
  if (!Number.isNaN(s) && !Number.isNaN(e) && e <= s) bad('endT', 'เวลาจบต้องหลังเวลาเริ่ม')

  if (!d.hours.trim()) need('hours', false, bottle ? 'ใส่ชั่วโมงสูงสุด' : 'ใส่จำนวนชั่วโมง')
  else if (!whole(d.hours) || +d.hours < 1 || +d.hours > 99) bad('hours', 'ใส่จำนวนเต็ม 1 ถึง 99')
  if (bottle) {
    if (!d.itemsPerHour.trim()) need('itemsPerHour', false, 'ใส่จำนวนขวด')
    else if (!whole(d.itemsPerHour) || +d.itemsPerHour < 1 || +d.itemsPerHour > 999) bad('itemsPerHour', 'ใส่จำนวนเต็ม 1 ถึง 999')
  } else {
    if (d.capLimit) {
      if (!d.capacity.trim()) need('capacity', false, 'ใส่จำนวนคน')
      else if (!whole(d.capacity) || +d.capacity < 1 || +d.capacity > 9999) bad('capacity', 'ใส่จำนวนเต็ม 1 ถึง 9999')
    }
    if (d.scheduled) {
      const o = toMs(d.openDate, d.openT)
      if (Number.isNaN(o)) need('openDate', false, 'ใส่วันและเวลาเปิดรับ')
      else if (o >= toMs(d.date, d.startT)) bad('openDate', 'เวลาเปิดรับต้องก่อนเวลาเริ่มกิจกรรม')
    }
    if (!whole(d.cancelDays) || +d.cancelDays > 14) bad('cancelDays', 'ใส่จำนวนเต็ม 0 ถึง 14')
  }
  need('supName', d.supName.trim().length > 0, 'ใส่ชื่อผู้ดูแล')
  if (d.chatEnabled && d.openChatUrl.trim() && !isUrl(d.openChatUrl.trim())) bad('openChatUrl', 'ลิงก์ต้องขึ้นต้นด้วย https://')
  return { ok, errors, missing }
}

/** The activity the draft describes, ready for createActivity. Call only when check(7) is ok. */
export function toNewActivity(d: Draft, who: { orgCode: string; orgName: string }): NewActivity {
  const bottle = isBottleDraft(d)
  const open = d.scheduled && !bottle ? toMs(d.openDate, d.openT) : undefined
  return {
    title: d.title.trim(),
    categoryKey: d.categoryKey ?? 'blood',
    templateId: d.categoryKey === 'other' ? (d.templateId ?? undefined) : undefined,
    org: who.orgName,
    orgCode: who.orgCode,
    poster: d.poster,
    description: d.description.trim(),
    place: d.place.trim(),
    lat: d.lat,
    lng: d.lng,
    start: toMs(d.date, d.startT),
    end: toMs(d.date, d.endT),
    hours: Number(d.hours),
    itemsPerHour: bottle ? Number(d.itemsPerHour) : undefined,
    capLimit: !bottle && d.capLimit,
    capacity: !bottle && d.capLimit ? Number(d.capacity) : 0,
    walkIn: bottle || d.walkIn,
    qrMode: bottle ? 'static' : d.qrMode,
    locMode: bottle ? 'off' : d.locMode,
    radius: d.radius,
    qrInterval: d.qrInterval,
    supervisor: { name: d.supName.trim(), phone: d.phone.trim() },
    chatEnabled: d.chatEnabled,
    openChatUrl: d.chatEnabled && d.openChatUrl.trim() ? d.openChatUrl.trim() : undefined,
    opensAt: open,
    cancelDays: Number(d.cancelDays),
    hideUntilOpen: d.scheduled && !bottle && d.hideUntilOpen ? true : undefined,
  }
}

/** Same as toNewActivity without the owner, for updateActivity. Cleared optional fields stay as undefined keys. */
export function toEdit(d: Draft): ActivityEdit {
  const { org, orgCode, ...rest } = toNewActivity(d, { orgCode: '', orgName: '' })
  void org
  void orgCode
  return rest
}

/** Whether the supervisor changed anything since the flow opened. */
export const isDirty = (d: Draft, initial: Draft) => JSON.stringify(d) !== JSON.stringify(initial)
