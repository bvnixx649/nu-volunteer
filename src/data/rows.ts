import type { Activity, ActivityEdit, Credit, CreditFlag, NewActivity, Org, Registration, Student } from './types'

/** Database rows (snake_case, timestamptz as ISO strings) and the one place they become the camelCase types (ms numbers). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const ms = (v: string | null | undefined) => (v ? Date.parse(v) : undefined)
const opt = <T>(v: T | null | undefined) => v ?? undefined
/** Drops keys without a value, so optional fields stay absent like in local.ts. */
const defined = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

export const toStudent = (r: Row): Student => ({ id: r.id, name: r.name, createdAt: ms(r.created_at) ?? 0 })

export const toOrg = (r: Row): Org => ({ code: r.code, name: r.name, admin: r.admin })

export const toActivity = (r: Row): Activity =>
  defined({
    id: r.id,
    title: r.title,
    categoryKey: r.category_key,
    org: r.org,
    orgCode: r.org_code,
    poster: r.poster,
    description: r.description,
    place: r.place,
    lat: opt(r.lat),
    lng: opt(r.lng),
    start: ms(r.start_at) ?? 0,
    end: ms(r.end_at) ?? 0,
    hours: Number(r.hours),
    capLimit: r.cap_limit,
    capacity: r.capacity,
    walkIn: r.walk_in,
    qrMode: r.qr_mode,
    locMode: r.loc_mode,
    radius: r.radius,
    qrInterval: r.qr_interval,
    supervisor: { name: r.supervisor_name, phone: r.supervisor_phone },
    chatEnabled: r.chat_enabled,
    openChatUrl: opt(r.open_chat_url),
    opensAt: ms(r.opens_at),
    cancelDays: opt(r.cancel_days),
    closedAt: ms(r.closed_at),
    submittedAt: ms(r.submitted_at),
    recordedAt: ms(r.recorded_at),
    hidden: opt(r.hidden),
    hideUntilOpen: opt(r.hide_until_open),
    createdAt: ms(r.created_at) ?? 0,
    regCount: r.reg_count,
    creditCount: r.credit_count,
  })

export const toRegistration = (r: Row): Registration =>
  defined({
    studentId: r.student_id,
    name: r.name,
    at: ms(r.at) ?? 0,
    walkIn: r.walk_in || undefined,
    cancelledAt: ms(r.cancelled_at),
    late: r.late || undefined,
    waived: r.waived || undefined,
  })

export const toCredit = (r: Row): Credit =>
  defined({
    studentId: r.student_id,
    name: r.name,
    hours: Number(r.hours),
    fullHours: Number(r.full_hours),
    at: ms(r.at) ?? 0,
    method: r.method,
    distance: opt(r.distance),
    accuracy: opt(r.accuracy),
    flags: (r.flags ?? []) as CreditFlag[],
    deviceId: opt(r.device_id),
    ref: opt(r.ref),
    editedBy: opt(r.edited_by),
    editedAt: ms(r.edited_at),
    reason: opt(r.reason),
  })

const iso = (v: number | undefined) => (v === undefined ? null : new Date(v).toISOString())

/** Column values per Activity field. A key whose value is undefined becomes null, which is how an optional field is cleared. */
const COLUMNS: { [K in keyof NewActivity]-?: (v: NewActivity[K]) => Row } = {
  title: (v) => ({ title: v }),
  categoryKey: (v) => ({ category_key: v }),
  org: (v) => ({ org: v }),
  orgCode: (v) => ({ org_code: v }),
  poster: (v) => ({ poster: v }),
  description: (v) => ({ description: v }),
  place: (v) => ({ place: v }),
  lat: (v) => ({ lat: v ?? null }),
  lng: (v) => ({ lng: v ?? null }),
  start: (v) => ({ start_at: iso(v) }),
  end: (v) => ({ end_at: iso(v) }),
  hours: (v) => ({ hours: v }),
  capLimit: (v) => ({ cap_limit: v }),
  capacity: (v) => ({ capacity: v }),
  walkIn: (v) => ({ walk_in: v }),
  qrMode: (v) => ({ qr_mode: v }),
  locMode: (v) => ({ loc_mode: v }),
  radius: (v) => ({ radius: v }),
  qrInterval: (v) => ({ qr_interval: v }),
  supervisor: (v) => ({ supervisor_name: v.name, supervisor_phone: v.phone }),
  chatEnabled: (v) => ({ chat_enabled: v }),
  openChatUrl: (v) => ({ open_chat_url: v ?? null }),
  opensAt: (v) => ({ opens_at: iso(v) }),
  cancelDays: (v) => ({ cancel_days: v ?? null }),
  closedAt: (v) => ({ closed_at: iso(v) }),
  submittedAt: (v) => ({ submitted_at: iso(v) }),
  recordedAt: (v) => ({ recorded_at: iso(v) }),
  hidden: (v) => ({ hidden: v ?? null }),
  hideUntilOpen: (v) => ({ hide_until_open: v ?? null }),
}

const columns = (p: Partial<NewActivity>): Row =>
  Object.assign({}, ...(Object.keys(p) as (keyof NewActivity)[]).filter((k) => k in COLUMNS).map((k) => (COLUMNS[k] as (v: unknown) => Row)(p[k])))

/** Column values for the fields an updateActivity call may change. */
export const fromActivityPatch = (p: ActivityEdit): Row => columns(p)

/** A full insert row. created_at and the counters come from the column defaults. */
export const fromNewActivity = (id: string, a: NewActivity): Row => ({ id, ...columns(a) })

export const fromStudent = (s: Student): Row => ({ id: s.id, name: s.name, created_at: new Date(s.createdAt).toISOString() })
