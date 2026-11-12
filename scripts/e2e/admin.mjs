// Centre admin (NUADMIN, dark, 390x844): the home sections and their order (pinned first, then the rosters to record, the to-do list, the organisations
// that have not sent, then what is coming), the recorded rosters on the list tab, the yearly target card with the org and category breakdowns on
// the statistics page (opened from the account), the manage page of a sent roster (edit hours still open, admin Excel, "บันทึกลงระบบแล้ว" flow
// with the 'recorded' notices and the student's own page), and a plain supervisor (NUVOL69) who sees none of it.
// Screenshots: scripts/e2e/out/admin-home.png, admin-home-lower.png, admin-stats.png, admin-stats-lower.png, admin-manage-waiting.png, admin-record-sheet.png.
import { unzipSync, strFromU8 } from 'fflate'
import { readFileSync } from 'node:fs'
import { loginAsSup, seedSupHome } from '../lib/sup-fixture.mjs'

export const localOnly = 'seeds the browser storage of the local data layer'

const H = 3600_000
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

/** Adds the other organisations' activities on top of the shared supervisor fixture. */
async function seedAdmin(page) {
  await page.evaluate((H) => {
    const db = JSON.parse(localStorage.getItem('nuv:db'))
    const now = Date.now()
    const base = { ...db.activities['test-sent'], hidden: false }
    const credit = (id, name, hours, extra = {}) => ({ studentId: id, name, hours, fullHours: 6, at: now - 300 * H, method: 'qr', flags: [], ...extra })
    const reg = (id, name) => ({ studentId: id, name, at: now - 400 * H })
    const add = (a, people) => {
      db.activities[a.id] = a
      db.credits[a.id] = Object.fromEntries(people.map((p) => [p.studentId, p]))
      db.regs[a.id] = Object.fromEntries(people.map((p) => [p.studentId, reg(p.studentId, p.name)]))
    }
    // The supervisor fixture's sent roster (NUVOL69, sent 200 h ago) gets two people: one full, one edited.
    const sent = db.activities['test-sent']
    Object.assign(sent, { creditCount: 2, regCount: 2, hours: 6 })
    db.credits['test-sent'] = Object.fromEntries([credit('65010011', 'อรอุมา ตัวอย่าง', 6), credit('65010012', 'ธีรภัทร ตัวอย่าง', 4, { reason: 'กลับก่อน', editedBy: 'พี่เต้', editedAt: now - 290 * H })].map((c) => [c.studentId, c]))
    db.regs['test-sent'] = Object.fromEntries(['65010011', '65010012'].map((id) => [id, reg(id, id)]))

    // Another org's roster, sent 100 h ago, to be recorded in this spec.
    add(
      { ...base, id: 'adm-wait2', title: 'จัดเวทีงานปฐมนิเทศ', categoryKey: 'setup', org: 'คณะวิทยาศาสตร์', orgCode: 'NUSCI', hours: 5, start: now - 130 * H, end: now - 125 * H, closedAt: now - 110 * H, submittedAt: now - 100 * H, creditCount: 2, regCount: 2 },
      [credit('65010001', 'สมศรี ทดสอบ', 5, { fullHours: 5 }), credit('65010002', 'สมชาย ทดสอบ', 2, { fullHours: 5, reason: 'มาสาย', editedBy: 'พี่ต้น', editedAt: now - 120 * H })],
    )
    // Another org's activity that ended 35 days ago and was never sent: past the 30 days.
    add({ ...base, id: 'adm-late', title: 'ค่ายอาสาพัฒนาชุมชน', categoryKey: 'other', org: 'คณะวิศวกรรมศาสตร์', orgCode: 'NUENG', hours: 9, start: now - 35 * 24 * H - 9 * H, end: now - 35 * 24 * H, closedAt: now - 34 * 24 * H, submittedAt: undefined, creditCount: 12, regCount: 14 }, [])
    // The centre's own activity that ended 5 h ago: its roster is still being checked.
    add({ ...base, id: 'adm-own', title: 'ประชุมสรุปงานศูนย์จิตอาสา', categoryKey: 'other', org: 'ศูนย์จิตอาสา กองกิจการนิสิต', orgCode: 'NUADMIN', hours: 3, start: now - 8 * H, end: now - 5 * H, closedAt: undefined, submittedAt: undefined, creditCount: 5, regCount: 6 }, [])
    // Recorded already.
    add({ ...base, id: 'adm-done', title: 'แลกขวดเพื่อโลกสีเขียว', categoryKey: 'bottle', org: 'คณะวิศวกรรมศาสตร์', orgCode: 'NUENG', hours: 5, start: now - 420 * H, end: now - 415 * H, closedAt: now - 410 * H, submittedAt: now - 400 * H, recordedAt: now - 300 * H, creditCount: 1, regCount: 1 }, [
      credit('65010003', 'มณีรัตน์ ทดสอบ', 5, { fullHours: 5, items: 25 }),
    ])
    // The two students that the record flow tells.
    db.students = { ...db.students, '65010001': { id: '65010001', name: 'สมศรี ทดสอบ', createdAt: now - 500 * H }, '65010002': { id: '65010002', name: 'สมชาย ทดสอบ', createdAt: now - 500 * H } }
    localStorage.setItem('nuv:db', JSON.stringify(db))
  }, H)
  await page.reload()
}

const dayMonth = (ms) => {
  const d = new Date(ms)
  return `${d.getDate()} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][d.getMonth()]}`
}

export default async function ({ browser, base, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', acceptDownloads: true })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  const noOverflow = async (label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w <= 390, `${label} is ${w}px wide`)
  }
  const tab = (name) => page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('link', { name })
  const db = () => page.evaluate(() => JSON.parse(localStorage.getItem('nuv:db')))

  await seedSupHome(page, base)
  await seedAdmin(page)

  // ---------- Home ----------
  await loginAsSup(page, 'NUADMIN', 'พี่ศูนย์')
  const wanted = ['รอบันทึกลงระบบ', 'ต้องดำเนินการ', 'หน่วยงานที่ยังไม่ส่งรายชื่อ', 'จะจัดขึ้น']
  await page.getByRole('heading', { level: 2, name: /^ต้องดำเนินการ/ }).waitFor()
  const heads = (await page.locator('main h2').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
  const order = wanted.map((w) => heads.findIndex((h) => h.startsWith(w)))
  expect(order.every((i) => i >= 0) && order.every((v, k) => k === 0 || v > order[k - 1]), `home sections ${JSON.stringify(heads)}`)
  expect(heads[order[0]] === 'รอบันทึกลงระบบ 2', `waiting heading: ${heads[order[0]]}`)
  expect(heads[order[1]] === 'ต้องดำเนินการ 3', `own to-do heading: ${heads[order[1]]}`)
  expect(heads[order[2]] === 'หน่วยงานที่ยังไม่ส่งรายชื่อ 1', `unsent heading: ${heads[order[2]]}`)

  const section = (name) => page.locator('section', { has: page.getByRole('heading', { level: 2, name: new RegExp(`^${name}`) }) })
  const rows = async (name) => section(name).locator('li').allInnerTexts()
  const clean = (t) => t.replace(/\s+/g, ' ').trim()

  // Waiting: oldest sent first, tag with the sent date, people and hours each, org under the title.
  const waiting = (await rows('รอบันทึกลงระบบ')).map(clean)
  const db0 = await db()
  expect(waiting.length === 2 && waiting[0].includes('ทาสีอาคารเรียนโรงเรียนวัดจันทร์') && waiting[1].includes('จัดเวทีงานปฐมนิเทศ'), `waiting order: ${JSON.stringify(waiting)}`)
  expect(waiting[0].includes(`ส่งแล้ว ${dayMonth(db0.activities['test-sent'].submittedAt)}`) && waiting[0].includes('2 คน 6 ชั่วโมงต่อคน'), `waiting row 1: ${waiting[0]}`)
  expect(waiting[1].includes('คณะวิทยาศาสตร์') && waiting[1].includes('2 คน 5 ชั่วโมงต่อคน'), `waiting row 2: ${waiting[1]}`)
  const link = section('รอบันทึกลงระบบ').getByRole('link', { name: /จัดเวทีงานปฐมนิเทศ/ })
  expect((await link.getAttribute('href')).endsWith('/sup/a/adm-wait2'), 'waiting row links to the manage page')
  const thumb = await link.locator('img').boundingBox()
  expect(Math.round(thumb.width) === 56 && Math.round(thumb.height) === 56, `poster is ${thumb.width}x${thumb.height}`)

  // Own to-do: the centre's activities under either of its codes (NUADMIN, and NUVOL69 which shares its name).
  const own = await rows('ต้องดำเนินการ')
  expect(own.length === 3 && own.some((r) => r.includes('ประชุมสรุปงานศูนย์จิตอาสา')) && own.some((r) => r.includes('ปลูกป่าชายเลน')) && own.some((r) => r.includes('เก็บขยะริมแม่น้ำน่าน')), `own to-do: ${JSON.stringify(own)}`)

  // Other orgs that have not sent, the late one in red.
  const unsent = (await rows('หน่วยงานที่ยังไม่ส่งรายชื่อ')).map(clean)
  expect(unsent.length === 1 && unsent[0].includes('ค่ายอาสาพัฒนาชุมชน'), `unsent: ${JSON.stringify(unsent)}`)
  expect(unsent[0].includes('คณะวิศวกรรมศาสตร์') && unsent[0].includes('เลยกำหนดส่งแล้ว') && unsent[0].includes('ยังไม่ส่งรายชื่อ'), `unsent row 1: ${unsent[0]}`)
  const late = await section('หน่วยงานที่ยังไม่ส่งรายชื่อ').getByText('เลยกำหนดส่งแล้ว').evaluate((e) => getComputedStyle(e).color)
  expect(late === 'rgb(255, 106, 92)', `late text colour ${late}`)

  // Recorded rosters are not on the home; they are on the list tab.
  expect((await page.getByText('แลกขวดเพื่อโลกสีเขียว').count()) === 0, 'recorded activities are not on the home')
  expect((await page.getByRole('button', { name: /^ส่งรายชื่อแล้ว/ }).count()) === 0, 'no supervisor-style sent group for the admin')

  await noOverflow('admin home')
  await page.waitForTimeout(1000)
  await shot(page, 'admin-home', { viewport: true })
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  await noOverflow('admin home scrolled')
  await shot(page, 'admin-home-lower', { viewport: true })
  await page.evaluate(() => scrollTo(0, 0))

  // The list tab: every organisation's ended activities, the recorded ones under their filter, with the organisation on each row.
  await tab('รายการ').click()
  await page.getByRole('heading', { level: 1, name: 'รายการ' }).waitFor()
  await page.getByRole('radio', { name: 'บันทึกแล้ว' }).click()
  const recorded = page.getByRole('link', { name: /แลกขวดเพื่อโลกสีเขียว/ })
  await recorded.getByText('บันทึกแล้ว', { exact: true }).waitFor()
  expect((await recorded.innerText()).includes('คณะวิศวกรรมศาสตร์') || (await recorded.innerText()).includes('คณะวิทยาศาสตร์'), 'the list shows the organisation')
  await page.getByRole('radio', { name: 'ทั้งหมด' }).click()
  await recorded.waitFor()

  // ---------- Stats ----------
  await page.goto(`${base}#/sup/stats`)
  await page.getByRole('heading', { level: 1, name: 'สถิติ' }).waitFor()
  const target = page.getByRole('region', { name: 'เป้าหมายปีการศึกษา' })
  await target.waitFor()
  await target.getByText(/^เป้าหมายปีการศึกษา \d{4}$/).waitFor()
  await target.getByText('จาก 100 กิจกรรม').waitFor()
  // Activity year runs 1 May to 30 April; the target counts what has started in it.
  const started = await page.evaluate(() => {
    const t = new Date()
    const y = t.getMonth() >= 4 ? t.getFullYear() : t.getFullYear() - 1
    const [from, to] = [new Date(y, 4, 1).getTime(), new Date(y + 1, 4, 1).getTime()]
    return Object.values(JSON.parse(localStorage.getItem('nuv:db')).activities).filter((a) => a.start >= from && a.start < to && a.start <= Date.now()).length
  })
  const bar = target.getByRole('progressbar')
  expect((await bar.getAttribute('aria-valuenow')) === String(started) && (await bar.getAttribute('aria-valuemax')) === '100', `progress ${await bar.getAttribute('aria-valuenow')} of ${await bar.getAttribute('aria-valuemax')}, expected ${started}`)
  expect((await target.locator('[data-value]').getAttribute('data-value')) === String(started), 'big number is the started count')
  await target.getByText(`อีก ${100 - started} กิจกรรม`).waitFor()
  // The target card sits above the turn-up ring card.
  const yTarget = (await target.boundingBox()).y
  const yRing = (await page.getByText('เข้าร่วมจริงเทียบจำนวนที่รับ').boundingBox()).y
  expect(yTarget < yRing, 'target card is above the turn-up card')

  // Per organisation: busiest first, credited people, amber tag for rosters waiting.
  await page.getByRole('heading', { level: 2, name: 'แยกตามหน่วยงาน' }).waitFor()
  const orgRows = (await page.locator('ul', { has: page.getByText(/ผู้ได้รับชั่วโมง \d+ คน/) }).first().locator('li').allInnerTexts()).map(clean)
  expect(orgRows[0].startsWith('ศูนย์จิตอาสา กองกิจการนิสิต'), `busiest org first: ${JSON.stringify(orgRows)}`)
  const sci = orgRows.find((r) => r.startsWith('คณะวิทยาศาสตร์'))
  expect(sci && /1 กิจกรรม/.test(sci) && /ผู้ได้รับชั่วโมง 2 คน/.test(sci) && sci.includes('รอบันทึก 1'), `science row: ${sci}`)
  const eng = orgRows.find((r) => r.startsWith('คณะวิศวกรรมศาสตร์'))
  expect(eng && /2 กิจกรรม/.test(eng) && !eng.includes('รอบันทึก'), `engineering row: ${eng}`)
  const centre = orgRows[0]
  expect(centre.includes('รอบันทึก 1'), `the centre's own row counts the sent roster: ${centre}`)
  expect(!/[·—]/.test(orgRows.join('')), 'no middle dot in org rows')
  const tag = page.getByText('รอบันทึก 1', { exact: true }).first()
  expect((await tag.evaluate((e) => getComputedStyle(e).color)) === 'rgb(242, 189, 75)', 'waiting tag is amber')

  // Per category, with hours from the credits (read once).
  await page.getByRole('heading', { level: 2, name: 'แยกตามหมวด' }).waitFor()
  await page.getByText(/^ชั่วโมงที่ออกให้ \d/).first().waitFor()
  const catRows = (await page.locator('ul', { has: page.getByText(/^ชั่วโมงที่ออกให้/) }).first().locator('li').allInnerTexts()).map(clean)
  const expected = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('nuv:db'))
    const out = {}
    for (const a of Object.values(db.activities)) {
      if (a.start > Date.now()) continue
      const o = (out[a.categoryKey] ??= { n: 0, h: 0 })
      o.n += 1
      o.h += Object.values(db.credits[a.id] ?? {}).reduce((s, c) => s + c.hours, 0)
    }
    return out
  })
  const labels = { blood: 'บริจาคโลหิต', setup: 'จัดสถานที่', bottle: 'แลกขวด', other: 'อื่น ๆ' }
  for (const [k, { n, h }] of Object.entries(expected)) {
    const row = catRows.find((r) => r.startsWith(labels[k]))
    expect(row && row.includes(`${n} กิจกรรม`) && row.includes(`ชั่วโมงที่ออกให้ ${h}`), `category ${k} expected ${n} activities ${h} hours, row: ${row}`)
  }
  await noOverflow('admin stats')
  await page.waitForTimeout(1300)
  await shot(page, 'admin-stats', { viewport: true })
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(400)
  await noOverflow('admin stats scrolled')
  await shot(page, 'admin-stats-lower', { viewport: true })
  await page.evaluate(() => scrollTo(0, 0))

  // ---------- Manage page of a sent roster: edit hours open, admin Excel ----------
  await page.goto(`${base}#/sup/a/test-sent`)
  await page.getByText(/^ส่งรายชื่อมาเมื่อ .+ น\.$/).waitFor()
  await page.locator('main').getByText('2 คนได้รับชั่วโมง', { exact: true }).waitFor()
  expect((await page.getByText('ส่งรายชื่อให้ศูนย์แล้ว').count()) === 0, 'the supervisor note is replaced')
  expect(!(await page.getByRole('button', { name: 'เพิ่มรายชื่อ' }).isDisabled()), 'admin can still add people to a sent roster')
  await page.getByText('อรอุมา ตัวอย่าง').first().click()
  await page.getByRole('dialog').or(page.getByText('แก้ชั่วโมง', { exact: true })).first().waitFor()
  await page.getByText('แก้ชั่วโมง', { exact: true }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByText('แก้ชั่วโมง', { exact: true }).waitFor({ state: 'detached' })

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /ดาวน์โหลดไฟล์ Excel/ }).click()])
  expect(download.suggestedFilename() === 'ทาสีอาคารเรียนโรงเรียนวัดจันทร์ บันทึกชั่วโมง.xlsx', `admin file name ${download.suggestedFilename()}`)
  const files = unzipSync(new Uint8Array(readFileSync(await download.path())))
  const shared = files['xl/sharedStrings.xml'] ? [...strFromU8(files['xl/sharedStrings.xml']).matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]) : []
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml'])
  const firstRow = sheet.match(/<row[^>]*>([\s\S]*?)<\/row>/)[1]
  const cells = [...firstRow.matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((m) => {
    const v = m[2]?.match(/<v>([^<]*)<\/v>/)?.[1] ?? m[2]?.match(/<t[^>]*>([^<]*)<\/t>/)?.[1] ?? ''
    return /t="s"/.test(m[1]) ? shared[Number(v)] : v
  })
  expect(
    JSON.stringify(cells) === JSON.stringify(['รหัสนิสิต', 'ชื่อ', 'กิจกรรม', 'หน่วยงาน', 'หมวด', 'วันที่', 'ชั่วโมง']),
    `admin header row: ${JSON.stringify(cells)}`,
  )
  expect((sheet.match(/<row[\s>]/g) ?? []).length === 3, 'header plus two credited people')
  await page.getByText('ดาวน์โหลดไฟล์ Excel แล้ว').first().waitFor()

  // ---------- Record another org's roster ----------
  await page.goto(`${base}#/sup/a/adm-wait2`)
  const send = page.getByText(/^ส่งรายชื่อมาเมื่อ .+ น\.$/)
  await send.waitFor()
  const stamp = await send.innerText()
  const sentAt = new Date((await db()).activities['adm-wait2'].submittedAt)
  expect(stamp.includes(String(sentAt.getFullYear() + 543)) && /\d\d:\d\d น\.$/.test(stamp), `stamp: ${stamp}`)
  await page.locator('main').getByText('2 คนได้รับชั่วโมง', { exact: true }).waitFor()
  const record = page.getByRole('button', { name: 'บันทึกลงระบบแล้ว', exact: true })
  const rb = await record.boundingBox()
  expect(rb.height >= 56 && rb.width >= 300, `record button is ${rb.width}x${rb.height}`)
  await noOverflow('manage waiting')
  // The Excel toast from the page before is still on screen; wait for it to go, then look at the top of the page.
  await page.getByText('ดาวน์โหลดไฟล์ Excel แล้ว').first().waitFor({ state: 'detached', timeout: 10_000 })
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(900)
  await shot(page, 'admin-manage-waiting', { viewport: true })

  await record.click()
  const sheet2 = page.getByRole('dialog', { name: 'บันทึกลงระบบแล้ว' })
  await sheet2.waitFor()
  await sheet2.getByText('ได้รับชั่วโมง (คน)').waitFor()
  await sheet2.getByText('นิสิต 2 คนจะได้รับแจ้งว่าบันทึกชั่วโมงแล้ว').waitFor()
  await sheet2.getByRole('button', { name: 'ยังไม่บันทึก' }).waitFor()
  await page.waitForTimeout(700)
  await shot(page, 'admin-record-sheet', { viewport: true })
  // Not yet: closing the sheet changes nothing.
  await sheet2.getByRole('button', { name: 'ยังไม่บันทึก' }).click()
  await sheet2.waitFor({ state: 'detached' })
  expect(!(await db()).activities['adm-wait2'].recordedAt, 'declining records nothing')
  await record.click()
  await sheet2.getByRole('button', { name: 'ยืนยัน' }).click()
  await page.getByText('ศูนย์บันทึกชั่วโมงแล้ว').waitFor()
  await page.getByText('บันทึกลงระบบแล้ว', { exact: true }).first().waitFor()
  expect((await page.getByRole('button', { name: 'บันทึกลงระบบแล้ว', exact: true }).count()) === 0, 'the record button is gone once recorded')
  expect(await page.getByRole('button', { name: 'เพิ่มรายชื่อ' }).isDisabled(), 'the roster locks for the admin once recorded')
  const after = await db()
  expect(after.activities['adm-wait2'].recordedAt, 'recordedAt is set')
  const notices = after.notices.filter((n) => n.kind === 'recorded' && n.activityId === 'adm-wait2')
  expect(notices.length === 2, `two recorded notices, got ${notices.length}`)
  const first = notices.find((n) => n.studentId === '65010001')
  expect(first && first.title === 'บันทึกชั่วโมงลงระบบแล้ว' && first.body === 'จัดเวทีงานปฐมนิเทศ 5 ชั่วโมง' && first.read === false, `notice: ${JSON.stringify(first)}`)
  expect(notices.find((n) => n.studentId === '65010002').body === 'จัดเวทีงานปฐมนิเทศ 2 ชั่วโมง', 'the edited hours are in the second notice')

  // Home: the recorded activity left the waiting list. On the list tab it shows under the recorded filter, with the one that was recorded before.
  await page.goto(`${base}#/sup`)
  await page.getByRole('heading', { level: 2, name: 'รอบันทึกลงระบบ 1' }).waitFor()
  await page.goto(`${base}#/sup/list`)
  await page.getByRole('radio', { name: 'บันทึกแล้ว' }).click()
  expect((await page.locator('main a[href*="/sup/a/"]').count()) === 2, 'two recorded activities on the list')

  // ---------- The student's own page ----------
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nuv:device'))
    d.state.studentId = '65010001'
    localStorage.setItem('nuv:device', JSON.stringify(d))
  })
  await page.goto(`${base}#/me`)
  await page.reload()
  const history = page.locator('li', { hasText: 'จัดเวทีงานปฐมนิเทศ' })
  await history.getByText('บันทึกแล้ว', { exact: true }).waitFor()
  await page.goto(`${base}#/inbox`)
  await page.getByText('บันทึกชั่วโมงลงระบบแล้ว').first().waitFor()
  expect(((await db()).notices.filter((n) => n.kind === 'recorded' && n.activityId === 'adm-wait2')).length === 2, 'the student side does not add a second notice')

  // ---------- A plain supervisor sees none of it ----------
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nuv:device'))
    d.state.sup = null
    d.state.studentId = null
    localStorage.setItem('nuv:device', JSON.stringify(d))
  })
  await page.goto(`${base}#/sup/login`)
  await page.reload()
  await loginAsSup(page)
  await page.getByRole('searchbox').waitFor()
  const plain = (await page.locator('main h2').allInnerTexts()).join(' | ')
  for (const w of ['รอบันทึกลงระบบ', 'หน่วยงานที่ยังไม่ส่งรายชื่อ', 'บันทึกแล้ว']) expect(!plain.includes(w), `a supervisor sees "${w}": ${plain}`)
  expect((await page.getByText('คณะวิทยาศาสตร์').count()) === 0, 'a supervisor does not see other orgs')
  await page.goto(`${base}#/sup/stats`)
  await page.getByRole('heading', { level: 2, name: /^ปีการศึกษา \d{4}$/ }).waitFor()
  for (const w of ['เป้าหมายปีการศึกษา', 'แยกตามหน่วยงาน', 'แยกตามหมวด']) expect((await page.getByText(w).count()) === 0, `a supervisor sees "${w}" on the stats tab`)
  // A sent roster stays locked and keeps the old note for the supervisor.
  await page.goto(`${base}#/sup/a/test-sent`)
  await page.getByText('ส่งรายชื่อให้ศูนย์แล้ว').waitFor()
  expect((await page.getByRole('button', { name: 'บันทึกลงระบบแล้ว', exact: true }).count()) === 0, 'no record button for a supervisor')
  expect(await page.getByRole('button', { name: 'เพิ่มรายชื่อ' }).isDisabled(), 'a supervisor cannot add to a sent roster')

  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
