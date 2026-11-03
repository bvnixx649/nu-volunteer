import type { Activity, Credit, CreditFlag, Org, Registration, Student } from './types'

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

type ActivityPatch = Partial<Pick<Activity, 'qrMode' | 'qrInterval' | 'locMode' | 'radius'>>

/** Column values for the check-in settings an updateActivity call may change. */
export const fromActivityPatch = (p: ActivityPatch): Row =>
  defined({ qr_mode: p.qrMode, qr_interval: p.qrInterval, loc_mode: p.locMode, radius: p.radius })

export const fromStudent = (s: Student): Row => ({ id: s.id, name: s.name, created_at: new Date(s.createdAt).toISOString() })
