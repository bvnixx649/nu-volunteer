import { describe, expect, it } from 'vitest'
import { fromActivityPatch, fromNewActivity, fromNewTemplate, fromStudent, fromTemplatePatch, toActivity, toCredit, toMyRegistration, toNotice, toRegistration, toStudent, toTemplate } from './rows'

const row = {
  id: 'a1', title: 't', category_key: 'blood', org: 'o', org_code: 'X', poster: '', description: '', place: 'p',
  lat: null, lng: null, start_at: '2026-11-20T01:00:00+00:00', end_at: '2026-11-20T09:00:00.500Z', hours: 6,
  cap_limit: false, capacity: 0, walk_in: true, qr_mode: 'dynamic', loc_mode: 'on', radius: 150, qr_interval: 10,
  supervisor_name: 'ก', supervisor_phone: '055', chat_enabled: false, open_chat_url: null, opens_at: null,
  cancel_days: null, closed_at: null, submitted_at: '2026-11-20T10:00:00Z', recorded_at: null, hidden: null,
  hide_until_open: null, created_at: '2026-11-01T00:00:00Z', reg_count: 2, credit_count: 1,
}

describe('rows', () => {
  it('maps an activity row to camelCase with ms timestamps and drops nulls', () => {
    const a = toActivity(row)
    expect(a).toMatchObject({
      categoryKey: 'blood', orgCode: 'X', start: Date.parse('2026-11-20T01:00:00Z'), end: Date.parse('2026-11-20T09:00:00.500Z'),
      supervisor: { name: 'ก', phone: '055' }, submittedAt: Date.parse('2026-11-20T10:00:00Z'), regCount: 2, creditCount: 1,
    })
    for (const k of ['lat', 'closedAt', 'opensAt', 'hidden', 'openChatUrl']) expect(k in a).toBe(false)
  })

  it('maps credits and registrations, leaving optional fields absent', () => {
    const c = toCredit({ student_id: 's', name: 'n', hours: '3', full_hours: 6, at: '2026-11-20T01:00:00Z', method: 'qr', flags: ['device'], distance: null, device_id: 'd', edited_at: null })
    expect(c).toEqual({ studentId: 's', name: 'n', hours: 3, fullHours: 6, at: Date.parse('2026-11-20T01:00:00Z'), method: 'qr', flags: ['device'], deviceId: 'd' })
    const r = toRegistration({ student_id: 's', name: 'n', at: '2026-11-20T01:00:00Z', walk_in: false, cancelled_at: null, late: false, waived: true })
    expect(r).toEqual({ studentId: 's', name: 'n', at: Date.parse('2026-11-20T01:00:00Z'), waived: true })
  })

  it('maps writes back to columns', () => {
    expect(fromActivityPatch({ qrMode: 'static', radius: 200 })).toEqual({ qr_mode: 'static', radius: 200 })
    expect(fromStudent({ id: '1', name: 'n', createdAt: 0 })).toEqual({ id: '1', name: 'n', created_at: '1970-01-01T00:00:00.000Z' })
  })

  it('maps every editor field, splits the supervisor and turns a cleared field into null', () => {
    expect(fromActivityPatch({ walkIn: false, start: 0, supervisor: { name: 'ก', phone: '055' }, opensAt: undefined, openChatUrl: undefined })).toEqual({
      walk_in: false, start_at: '1970-01-01T00:00:00.000Z', supervisor_name: 'ก', supervisor_phone: '055', opens_at: null, open_chat_url: null,
    })
    expect(fromActivityPatch({})).toEqual({})
  })

  it('builds an insert row that leaves created_at and the counters to the database', () => {
    const a = toActivity(row)
    const { id, createdAt, regCount, creditCount, ...input } = a
    void id, createdAt, regCount, creditCount
    const out = fromNewActivity('abc', input)
    expect(out).toMatchObject({ id: 'abc', title: 't', category_key: 'blood', walk_in: true, supervisor_name: 'ก', start_at: '2026-11-20T01:00:00.000Z' })
    for (const k of ['created_at', 'reg_count', 'credit_count']) expect(k in out).toBe(false)
  })
})

describe('student rows', () => {
  it('maps a notice with its optional fields left out when null', () => {
    const n = toNotice({ id: 'n1', student_id: '65010001', kind: 'credit', title: 'ได้รับ 6 ชั่วโมง', body: 'งาน', activity_id: null, to: null, at: '2026-11-20T03:00:00Z', read: false })
    expect(n).toEqual({ id: 'n1', studentId: '65010001', kind: 'credit', title: 'ได้รับ 6 ชั่วโมง', body: 'งาน', at: Date.parse('2026-11-20T03:00:00Z'), read: false })
  })
  it('maps a registration with its activity id and the late flag', () => {
    expect(toMyRegistration({ activity_id: 'a1', student_id: '65010001', name: 'x', at: '2026-11-01T00:00:00Z', cancelled_at: '2026-11-02T00:00:00Z', late: true, waived: false, walk_in: false })).toMatchObject({
      activityId: 'a1',
      late: true,
      cancelledAt: Date.parse('2026-11-02T00:00:00Z'),
    })
  })
  it('gives a student without reminders an empty list', () => {
    expect(toStudent({ id: '65010001', name: 'x', created_at: '2026-11-01T00:00:00Z', reminders: null, notify: null })).toMatchObject({ reminders: [], notify: {} })
  })
})

describe('template rows', () => {
  it('maps a template row and fills missing settings', () => {
    const t = toTemplate({ id: 't1', org_code: 'X', title: 'งานกีฬา', poster: 'p', description: null, hours: 4, settings: { capLimit: true, capacity: 12, qrMode: 'static' }, created_by: 'ก', created_at: '2026-11-04T00:00:00Z' })
    expect(t).toEqual({
      id: 't1', orgCode: 'X', title: 'งานกีฬา', poster: 'p', description: '', hours: 4, createdBy: 'ก', createdAt: Date.parse('2026-11-04T00:00:00Z'),
      settings: { capLimit: true, capacity: 12, walkIn: false, qrMode: 'static', qrInterval: 10, locMode: 'on', radius: 150 },
    })
    expect(toTemplate({ id: 't', org_code: 'X', title: 't', hours: 1, created_by: null, settings: null, created_at: null }).settings).toMatchObject({ capacity: 30, qrMode: 'dynamic' })
  })

  it('maps writes back to columns', () => {
    const settings = toTemplate({ id: 't', org_code: 'X', title: 't', hours: 1 }).settings
    expect(fromNewTemplate('t9', { orgCode: 'X', title: 'a', poster: 'p', description: 'd', hours: 3, settings, createdBy: 'ก' })).toEqual({
      id: 't9', org_code: 'X', title: 'a', poster: 'p', description: 'd', hours: 3, settings, created_by: 'ก',
    })
    expect(fromTemplatePatch({ title: 'b' })).toEqual({ title: 'b' })
  })

  it('carries template_id on activities', () => {
    expect(toActivity({ ...row, category_key: 'other', template_id: 't1' })).toMatchObject({ categoryKey: 'other', templateId: 't1' })
    expect('templateId' in toActivity(row)).toBe(false)
    expect(fromActivityPatch({ templateId: undefined })).toEqual({ template_id: null })
  })
})
