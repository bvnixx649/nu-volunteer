// SPEC 17 load test against the real Supabase project: 300 students claim at once on test-blood,
// then 20 duplicate claims race for one student. Cleans up the students it added.
// Run: node scripts/load-test.mjs
import { createClient } from '@supabase/supabase-js'

const URL = 'https://khavsmhheuabbkoybknm.supabase.co'
const KEY = 'sb_publishable_fwzsGRELcgZv6LboOYp1wg_WTv7-AZB'
const ACT = 'test-blood'
const N = 300

const db = createClient(URL, KEY, { auth: { persistSession: false } })
const fail = (msg) => {
  console.error('FAIL', msg)
  process.exitCode = 1
}

const { error: authErr } = await db.auth.signInAnonymously()
if (authErr) throw authErr

const org = await db.rpc('get_org', { p_code: 'NUVOL69' })
if (org.data?.[0]?.code !== 'NUVOL69') fail(`get_org NUVOL69: ${JSON.stringify(org)}`)
const orgsDirect = await db.from('orgs').select('code')
if (!orgsDirect.error) fail('orgs readable directly')

const ids = Array.from({ length: N }, (_, i) => `6999${String(i).padStart(4, '0')}`)
const claim = (id, device) =>
  db.rpc('claim', {
    p_activity: ACT, p_student: id, p_name: `ทดสอบโหลด ${id}`, p_hours: 6, p_method: 'qr', p_flags: [],
    p_distance: null, p_accuracy: null, p_device: device, p_ref: null, p_by: null,
  })

const count = async () => {
  const { data } = await db.from('activities').select('credit_count, reg_count').eq('id', ACT).single()
  const { count: rows } = await db.from('credits').select('*', { count: 'exact', head: true }).eq('activity_id', ACT).like('student_id', '6999%')
  return { ...data, rows }
}

const before = await count()
let t = Date.now()
const res = await Promise.all(ids.map((id) => claim(id, `dev-${id}`)))
const ms = Date.now() - t
const errors = res.filter((r) => r.error)
const ok = res.filter((r) => r.data?.ok).length
const after = await count()
console.log(`${N} claims in ${ms} ms, ok ${ok}, errors ${errors.length}`)
if (errors.length) console.log(errors[0].error)
if (ok !== N) fail(`ok ${ok} != ${N}`)
if (after.rows !== N) fail(`credit rows ${after.rows} != ${N}`)
if (after.credit_count - before.credit_count !== N) fail(`credit_count rose ${after.credit_count - before.credit_count}`)

t = Date.now()
const dup = await Promise.all(Array.from({ length: 20 }, () => claim(ids[0], `dev-${ids[0]}`)))
const dupOk = dup.filter((r) => r.data?.ok).length
const after2 = await count()
console.log(`20 duplicate claims in ${Date.now() - t} ms, accepted ${dupOk}`)
if (dupOk !== 0) fail(`duplicate accepted ${dupOk}`)
if (after2.credit_count !== after.credit_count) fail('credit_count changed on duplicates')

await Promise.all(ids.map((id) => db.rpc('remove_registration', { p_activity: ACT, p_student: id })))
await db.from('students').delete().like('id', '6999%')
const end = await count()
console.log('cleaned up:', end, 'started at:', before)
if (end.rows !== 0 || end.credit_count !== before.credit_count || end.reg_count !== before.reg_count) fail('cleanup mismatch')
console.log(process.exitCode ? 'LOAD TEST FAILED' : 'LOAD TEST PASSED')
