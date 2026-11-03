// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Runs supabase/schema.sql in an in-process Postgres (PGlite) and calls the functions the way remote.ts does.
 * Supabase-only pieces are stubbed: the anon/authenticated roles, auth.uid() and the supabase_realtime publication.
 * One connection, so this proves the logic and the counters, not true parallel locking.
 */
const read = (f: string) => readFileSync(new URL(`../../supabase/${f}`, import.meta.url), 'utf8')
const schema = read('schema.sql')
const seed = read('seed-test.sql')
const clean = read('clean-test.sql')

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create publication supabase_realtime;
  `)
  await db.exec(schema)
  await db.exec(schema) // safe to run again
}, 60_000)

beforeEach(async () => {
  await db.exec(`delete from activities; delete from orgs;`)
  await db.exec(`insert into activities (id, title, category_key, org, org_code, start_at, end_at, hours, walk_in)
    values ('a1', 'บริจาคโลหิต', 'blood', 'org', 'X', now(), now() + interval '8 hours', 6, true)`)
})

type Credit = { student_id: string; hours: number; full_hours: number; flags: string[] }
type ClaimOut = { ok: boolean; credit: Credit }
type Counts = { reg_count: number; credit_count: number; closed_at: string | null; submitted_at: string | null }

const claim = async (student: string, device = 'dev-1') =>
  (
    await db.query<{ claim: ClaimOut }>('select claim($1,$2,$3,6,$4,$5,null,null,$6,$7,null)', [
      'a1', student, `นิสิต ${student}`, 'qr', [], device, 'R1',
    ])
  ).rows[0].claim
const act = async () => (await db.query<Counts>(`select * from activities where id = 'a1'`)).rows[0]
const count = async (table: string, id = 'a1') =>
  Number((await db.query<{ n: number }>(`select count(*)::int n from ${table} where activity_id = $1`, [id])).rows[0].n)

describe('claim', () => {
  it('is idempotent for one student', async () => {
    const [x, y] = await Promise.all([claim('65000001'), claim('65000001')])
    expect([x.ok, y.ok].sort()).toEqual([false, true])
    expect([x, y].find((r) => !r.ok)?.credit.student_id).toBe('65000001')
    expect(await count('credits')).toBe(1)
    expect((await act()).credit_count).toBe(1)
  })

  it('writes 300 credits for 300 students claiming at once', async () => {
    const ids = Array.from({ length: 300 }, (_, i) => String(65100000 + i))
    const results = await Promise.all(ids.map((id) => claim(id, `dev-${id}`)))
    expect(results.every((r) => r.ok)).toBe(true)
    expect(await count('credits')).toBe(300)
    expect(await count('registrations')).toBe(300)
    expect(await act()).toMatchObject({ credit_count: 300, reg_count: 300 })
  }, 60_000)

  it('creates a walk-in registration and keeps an existing one', async () => {
    await claim('65000002')
    const reg = (await db.query<{ walk_in: boolean }>(`select walk_in from registrations where student_id = '65000002'`)).rows[0]
    expect(reg.walk_in).toBe(true)
    await db.exec(`select register('a1', '65000003', 'x')`)
    expect((await act()).reg_count).toBe(2)
    await claim('65000003')
    expect(await act()).toMatchObject({ reg_count: 2, credit_count: 2 })
  })

  it('records full hours and flags every credit from a shared device', async () => {
    const first = await claim('65000004', 'shared')
    expect(first.credit).toMatchObject({ hours: 6, full_hours: 6, flags: [] })
    const second = await claim('65000005', 'shared')
    expect(second.credit.flags).toEqual(['device'])
    const rows = (await db.query<Credit>(`select * from credits where student_id = '65000004'`)).rows
    expect(rows[0].flags).toEqual(['device'])
    expect(await claim('65000006', 'other')).toMatchObject({ credit: { flags: [] } })
  })
})

describe('bottle exchange columns', () => {
  it('stores bottles per hour on the activity and bottles on the credit, null for everything else', async () => {
    expect((await db.query<{ items_per_hour: number | null }>(`select items_per_hour from activities where id = 'a1'`)).rows[0].items_per_hour).toBeNull()
    await db.exec(`update activities set items_per_hour = 20 where id = 'a1'`)
    const c = await claim('65000020')
    expect(c.credit).toMatchObject({ student_id: '65000020' })
    expect((c.credit as Credit & { items: number | null }).items).toBeNull()
    await db.exec(`update credits set items = 45 where activity_id = 'a1' and student_id = '65000020'`)
    await db.exec(`select set_hours('a1', '65000020', 2, '', 'พี่เต้')`)
    const row = (await db.query<{ items: number; hours: number }>(`select items, hours from credits where student_id = '65000020'`)).rows[0]
    expect(row).toMatchObject({ items: 45, hours: 2 })
    expect((await db.query<{ items_per_hour: number }>(`select items_per_hour from activities where id = 'a1'`)).rows[0].items_per_hour).toBe(20)
  })
})

describe('removal', () => {
  it('remove_registration lowers both counters, and never below 0', async () => {
    await claim('65000010')
    await db.exec(`select remove_registration('a1', '65000010')`)
    expect(await act()).toMatchObject({ reg_count: 0, credit_count: 0 })
    expect(await count('credits')).toBe(0)
    await db.exec(`select remove_registration('a1', '65000010'); select remove_credit('a1', '65000010')`)
    expect(await act()).toMatchObject({ reg_count: 0, credit_count: 0 })
    await db.exec(`update activities set reg_count = 0 where id = 'a1'; select register('a1', 'z', 'z'); update activities set reg_count = 0 where id = 'a1'`)
    await db.exec(`select remove_registration('a1', 'z')`)
    expect((await act()).reg_count).toBe(0)
  })

  it('remove_credit leaves the registration', async () => {
    await claim('65000011')
    await db.exec(`select remove_credit('a1', '65000011')`)
    expect(await act()).toMatchObject({ reg_count: 1, credit_count: 0 })
    expect(await count('registrations')).toBe(1)
  })

  it('does not lower reg_count for a registration that was already cancelled', async () => {
    await db.exec(`select register('a1', '65000012', 'x')`)
    await db.exec(`select cancel_registration('a1', '65000012')`)
    expect((await act()).reg_count).toBe(0)
    await db.exec(`select remove_registration('a1', '65000012')`)
    expect((await act()).reg_count).toBe(0)
  })
})

describe('roster', () => {
  it('close_roster keeps the first time', async () => {
    await db.exec(`select close_roster('a1')`)
    const first = (await act()).closed_at
    expect(first).not.toBeNull()
    await db.exec(`select pg_sleep(0.01); select close_roster('a1')`)
    expect((await act()).closed_at).toEqual(first)
  })

  it('submit_roster closes an open roster and only sets submitted_at once', async () => {
    await db.exec(`select submit_roster('a1')`)
    const a = await act()
    expect(a.submitted_at).not.toBeNull()
    expect(a.closed_at).toEqual(a.submitted_at)
    await db.exec(`select pg_sleep(0.01); select submit_roster('a1')`)
    expect((await act()).submitted_at).toEqual(a.submitted_at)
  })

  it('submit_roster keeps an earlier closing time', async () => {
    await db.exec(`update activities set closed_at = now() - interval '1 hour' where id = 'a1'`)
    const before = (await act()).closed_at
    await db.exec(`select submit_roster('a1')`)
    expect((await act()).closed_at).toEqual(before)
  })

  it('set_hours changes hours, keeps full hours and notes who', async () => {
    await claim('65000013')
    await db.exec(`select set_hours('a1', '65000013', 3, 'มาสาย', 'พี่เต้')`)
    const r = await db.query(`select hours, full_hours, reason, edited_by, edited_at is not null as edited from credits where student_id = '65000013'`)
    expect(r.rows[0]).toEqual({ hours: 3, full_hours: 6, reason: 'มาสาย', edited_by: 'พี่เต้', edited: true })
  })
})

describe('register', () => {
  it('stops at capacity when cap_limit is on', async () => {
    await db.exec(`update activities set cap_limit = true, capacity = 2 where id = 'a1'`)
    const reg = async (s: string) => (await db.query<{ register: boolean }>(`select register('a1', '${s}', 'x')`)).rows[0].register
    expect([await reg('1'), await reg('2'), await reg('3'), await reg('1')]).toEqual([true, true, false, false])
    expect((await act()).reg_count).toBe(2)
  })
})

describe('student side calls', () => {
  it('register, late cancel flag, and reading my rows as remote.ts does', async () => {
    const reg = async (s: string) => (await db.query<{ register: boolean }>('select register($1,$2,$3)', ['a1', s, `นิสิต ${s}`])).rows[0].register
    expect(await reg('65000001')).toBe(true)
    expect(await reg('65000001')).toBe(false)
    await db.query('select cancel_registration($1,$2)', ['a1', '65000001'])
    await db.query('update registrations set late = $3 where activity_id = $1 and student_id = $2', ['a1', '65000001', true])
    const mine = (await db.query<{ activity_id: string; late: boolean; cancelled_at: string | null }>('select * from registrations where student_id = $1', ['65000001'])).rows
    expect(mine).toMatchObject([{ activity_id: 'a1', late: true }])
    expect(mine[0].cancelled_at).not.toBeNull()
    expect((await act()).reg_count).toBe(0)
    expect(await reg('65000001')).toBe(true)
    expect((await act()).reg_count).toBe(1)
  })

  it('stores notices, messages and private messages with the columns remote.ts writes', async () => {
    await db.query(`insert into students (id, name) values ('65000002', 'x')`)
    await db.query(`update students set reminders = $2, notify = $3 where id = $1`, ['65000002', ['a1'], { enabled: true }])
    await db.query(`insert into notices (student_id, kind, title, body, activity_id, "to") values ('65000002', 'credit', 't', '', 'a1', null)`)
    await db.query(`update notices set read = true where student_id = '65000002' and read = false`)
    await db.query(`insert into messages (activity_id, author_id, author_name, text, sup) values ('a1', '65000002', 'x', 'hi', false)`)
    await db.query(`insert into dms (activity_id, student_id, from_sup, author_name, text) values ('a1', '65000002', true, 'sup', 'ok')`)
    await db.query(`update dms set read = true where activity_id = 'a1' and student_id = '65000002' and from_sup = true and read = false`)
    expect((await db.query<{ reminders: string[] }>(`select reminders from students where id = '65000002'`)).rows[0].reminders).toEqual(['a1'])
    expect((await db.query(`select 1 from notices where student_id = '65000002' and read`)).rows).toHaveLength(1)
    expect((await db.query(`select 1 from dms where read`)).rows).toHaveLength(1)
  })
})

describe('access', () => {
  it('get_org returns the org for a code and nothing for a wrong one', async () => {
    await db.exec(seed)
    const hit = await db.query(`select * from get_org('NUADMIN')`)
    expect(hit.rows).toEqual([{ code: 'NUADMIN', name: 'ศูนย์จิตอาสา กองกิจการนิสิต', admin: true }])
    expect((await db.query(`select * from get_org('nope')`)).rows).toEqual([])
  })

  it('signed-in users cannot read orgs directly but can use the tables and get_org', async () => {
    await db.exec(seed)
    await db.exec('set role authenticated')
    try {
      await expect(db.query('select * from orgs')).rejects.toThrow(/permission denied/)
      expect((await db.query('select * from activities')).rows.length).toBeGreaterThan(0)
      expect((await db.query(`select * from get_org('NUVOL69')`)).rows).toHaveLength(1)
    } finally {
      await db.exec('reset role')
    }
  })

  it('anon cannot read activities', async () => {
    await db.exec('set role anon')
    try {
      await expect(db.query('select * from activities')).rejects.toThrow(/permission denied/)
    } finally {
      await db.exec('reset role')
    }
  })
})

describe('templates', () => {
  it('stores a template per organisation, lets a signed-in user write it and keeps activities when it is deleted', async () => {
    await db.exec(`insert into templates (id, org_code, title, hours) values ('t1', 'NUVOL69', 'งานรับน้อง', 4), ('t2', 'OTHER', 'งานอื่น', 2)`)
    const t = (await db.query<{ poster: string; description: string; settings: unknown; created_by: string; created_at: string }>(`select * from templates where id = 't1'`)).rows[0]
    expect(t).toMatchObject({ poster: '', description: '', settings: {}, created_by: '' })
    expect(t.created_at).toBeTruthy()
    expect((await db.query(`select id from templates where org_code = 'NUVOL69'`)).rows).toEqual([{ id: 't1' }])

    await db.exec(`update activities set category_key = 'other', template_id = 't1' where id = 'a1'`)
    await db.exec(`delete from templates where id = 't1'`)
    expect((await db.query(`select category_key, template_id from activities where id = 'a1'`)).rows).toEqual([{ category_key: 'other', template_id: 't1' }])

    await db.exec('set role authenticated')
    try {
      await db.exec(`insert into templates (id, org_code, title, hours, settings) values ('t3', 'NUVOL69', 'ใหม่', 3, '{"capLimit":true}')`)
      await db.exec(`update templates set title = 'แก้' where id = 't3'`)
      expect((await db.query(`select title from templates where id = 't3'`)).rows).toEqual([{ title: 'แก้' }])
      await db.exec(`delete from templates where id = 't3'`)
    } finally {
      await db.exec('reset role')
    }
    await db.exec(`delete from templates`)
  })
})

describe('seed-test.sql', () => {
  it('mirrors the fixture, can be run twice and is removed by clean-test.sql', async () => {
    await db.exec(seed)
    await db.exec(seed)
    const a = (await db.query(`select id, reg_count, credit_count from activities order by id`)).rows
    expect(a).toEqual([
      { id: 'a1', reg_count: 0, credit_count: 0 },
      { id: 'test-blood', reg_count: 0, credit_count: 0 },
      { id: 'test-ended', reg_count: 4, credit_count: 3 },
    ])
    expect(await count('registrations', 'test-ended')).toBe(4)
    expect(await count('credits', 'test-ended')).toBe(3)
    await db.exec(clean)
    expect((await db.query(`select 1 from activities where id like 'test-%'`)).rows).toHaveLength(0)
    expect((await db.query(`select 1 from orgs`)).rows).toHaveLength(0)
  })
})
