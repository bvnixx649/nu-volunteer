// Resets (or with clean: true removes) the test data on the real Supabase project: the two activities from
// src/data/fixture.ts with their registrations and credits, plus the students and notices that e2e runs and the load
// test leave behind. Orgs are never touched. Used by scripts/seed-test.mjs and by the e2e runner between specs.
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createServer } from 'vite'
import { config, signedInClient } from './remote-db.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

let cached
async function connect() {
  if (cached) return cached
  const vite = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' })
  const { FIXTURE } = await vite.ssrLoadModule('/src/data/fixture.ts')
  await vite.close()
  const { db } = await signedInClient(await config())
  return (cached = { db, FIXTURE })
}

export async function seedTestData({ clean = false } = {}) {
  const { db, FIXTURE } = await connect()
  const ok = async (p) => {
    const { error } = await p
    if (error) throw new Error(error.message)
  }

  const ACTIVITIES = ['test-blood', 'test-ended']
  // Everything the specs, the fixture and the load test create: 65010xxx, 65030xxx, 65040xxx, 65099999, 651xxxxx, 6999xxxx.
  const STUDENT_PREFIXES = ['65010', '65030', '65040', '65099', '651', '6999']

  const iso = (v) => (v == null ? null : new Date(v).toISOString())
  const activityRow = (a) => ({
    id: a.id, title: a.title, category_key: a.categoryKey, org: a.org, org_code: a.orgCode, poster: a.poster,
    description: a.description, place: a.place, lat: a.lat ?? null, lng: a.lng ?? null, start_at: iso(a.start), end_at: iso(a.end),
    hours: a.hours, cap_limit: a.capLimit, capacity: a.capacity, walk_in: a.walkIn, qr_mode: a.qrMode, loc_mode: a.locMode,
    radius: a.radius, qr_interval: a.qrInterval, supervisor_name: a.supervisor.name, supervisor_phone: a.supervisor.phone,
    chat_enabled: a.chatEnabled, open_chat_url: a.openChatUrl ?? null, opens_at: iso(a.opensAt), cancel_days: a.cancelDays ?? null,
    closed_at: iso(a.closedAt), submitted_at: iso(a.submittedAt), recorded_at: iso(a.recordedAt), hidden: a.hidden ?? null,
    hide_until_open: a.hideUntilOpen ?? null, created_at: iso(a.createdAt), reg_count: a.regCount, credit_count: a.creditCount,
  })
  const regRow = (activity, r) => ({
    activity_id: activity, student_id: r.studentId, name: r.name, at: iso(r.at), walk_in: !!r.walkIn,
    cancelled_at: iso(r.cancelledAt), late: !!r.late, waived: !!r.waived,
  })
  const creditRow = (activity, c) => ({
    activity_id: activity, student_id: c.studentId, name: c.name, hours: c.hours, full_hours: c.fullHours, at: iso(c.at),
    method: c.method, distance: c.distance ?? null, accuracy: c.accuracy ?? null, flags: c.flags, device_id: c.deviceId ?? null,
    ref: c.ref ?? null, edited_by: c.editedBy ?? null, edited_at: iso(c.editedAt), reason: c.reason ?? null,
  })

  // Registrations, credits, announcements, messages and dms go with their activity (on delete cascade).
  await ok(db.from('activities').delete().in('id', ACTIVITIES))
  await ok(db.from('notices').delete().or(STUDENT_PREFIXES.map((p) => `student_id.like.${p}%`).join(',')))
  await ok(db.from('students').delete().or(STUDENT_PREFIXES.map((p) => `id.like.${p}%`).join(',')))

  if (clean) return 'test data removed'
  const f = FIXTURE()
  await ok(db.from('activities').insert(Object.values(f.activities).map(activityRow)))
  const regs = Object.entries(f.regs).flatMap(([a, m]) => Object.values(m).map((r) => regRow(a, r)))
  const credits = Object.entries(f.credits).flatMap(([a, m]) => Object.values(m).map((c) => creditRow(a, c)))
  await ok(db.from('registrations').insert(regs))
  await ok(db.from('credits').insert(credits))
  return `seeded ${Object.keys(f.activities).length} activities, ${regs.length} registrations, ${credits.length} credits`
}
