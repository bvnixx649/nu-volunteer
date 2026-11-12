// Student side: welcome, home with category filter, activity detail, register, my activities, inbox, profile,
// success screen with neighbours. Dark screenshots at 390x844 in scripts/e2e/out/student-*.png, no horizontal scroll anywhere.
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const site = { latitude: 16.7466, longitude: 100.1948 }

export const localOnly = 'edits localStorage directly'

export default async function ({ browser, base, load, shot: rawShot }) {
  // Let the entrance animations finish so the pictures show the settled screen.
  const shot = async (page, name) => {
    await page.waitForTimeout(800)
    await rawShot(page, name)
  }
  const { makeToken } = await load('/src/lib/qr.ts')
  const { MESSAGES_ON } = await load('/src/config.ts')
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
    geolocation: site,
    permissions: ['geolocation'],
    locale: 'th-TH',
  })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  const noOverflow = async (label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w <= 390, `${label} is ${w}px wide`)
  }
  const name = 'ณัฐวุฒิพงศ์ แก้วประเสริฐกุลชัยวัฒน์'

  // Activities for the feed: the fixture's blood activity is live today, add one open activity with seats and a roster to stand in.
  await page.goto(`${base}#/welcome`)
  await page.waitForFunction(() => localStorage.getItem('nuv:db'))
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('nuv:db'))
    const h = 3600_000
    const blood = db.activities['test-blood']
    blood.start = Date.now() - h
    blood.end = Date.now() + 3 * h
    db.activities['test-later'] = {
      ...blood,
      id: 'test-later',
      title: 'จัดสถานที่ต้อนรับนิสิตใหม่',
      categoryKey: 'setup',
      hours: 5,
      capLimit: true,
      capacity: 10,
      walkIn: false,
      start: Date.now() + 5 * 24 * h,
      end: Date.now() + 5 * 24 * h + 4 * h,
      regCount: 8,
      creditCount: 0,
    }
    const people = [['65020001', 'สมชาย ใจดี'], ['65020002', 'สมหญิง รักเรียน'], ['65020003', 'ธนากร แสงทอง']]
    db.credits['test-blood'] = Object.fromEntries(
      people.map(([id, n], i) => [id, { studentId: id, name: n, hours: 6, fullHours: 6, at: Date.now() - (30 - i * 10) * 60_000, method: 'qr', flags: [] }]),
    )
    blood.creditCount = 3
    blood.regCount = 3
    localStorage.setItem('nuv:db', JSON.stringify(db))
  })
  await page.reload()

  // A student page without an identity goes to welcome, and comes back after.
  await page.goto(`${base}#/mine`)
  await page.getByRole('heading', { name: /ไม่พลาดกิจกรรมจิตอาสา/ }).waitFor()
  await page.getByLabel('รหัสนิสิต').fill('65010077')
  await page.getByLabel('ชื่อ-นามสกุล').fill(name)
  await noOverflow('welcome')
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click()
  await page.getByRole('heading', { name: 'กิจกรรมของฉัน' }).waitFor()
  await page.getByText('ยังไม่มีกิจกรรมที่ลงทะเบียน').waitFor()
  await noOverflow('mine empty')

  // Home: greeting, live card with scan button, category filter.
  await page.getByRole('link', { name: 'หน้าแรก' }).click()
  await page.getByRole('heading', { name: 'สวัสดี ณัฐวุฒิพงศ์' }).waitFor()
  // The tab bar has its own scan button, so the card is found by its region.
  const liveCard = page.getByRole('region', { name: 'กิจกรรมที่กำลังดำเนินอยู่' })
  await liveCard.getByRole('link', { name: 'สแกนรับชั่วโมง' }).waitFor()
  await page.getByRole('link', { name: /จัดสถานที่ต้อนรับนิสิตใหม่/ }).waitFor()
  await noOverflow('home')
  await shot(page, 'student-1-home')
  await page.getByRole('button', { name: 'จัดสถานที่', exact: true }).click()
  await page.getByText('พบ 1 กิจกรรม').waitFor()
  await page.getByRole('button', { name: 'แลกขวด', exact: true }).click()
  await page.getByText('ไม่พบกิจกรรมตามตัวกรอง').waitFor()
  await page.getByRole('button', { name: 'ทุกหมวด', exact: true }).click()
  // Day filter: nothing starts tomorrow, the activity five days out is inside 7 days.
  await page.getByRole('radio', { name: 'พรุ่งนี้' }).click()
  await page.getByText('ไม่พบกิจกรรมตามตัวกรอง').waitFor()
  await page.getByRole('radio', { name: '7 วัน' }).click()
  await page.getByRole('link', { name: /จัดสถานที่ต้อนรับนิสิตใหม่/ }).waitFor()
  await page.getByRole('radio', { name: 'ทุกวัน' }).click()
  await page.getByRole('heading', { name: /^เปิดรับสมัคร/ }).waitFor()
  await page.waitForTimeout(800)
  await shot(page, 'student-1b-home-list')
  // Calendar view and back.
  await page.getByRole('button', { name: 'ดูเป็นปฏิทิน' }).click()
  await page.getByText('แตะวันที่ที่มีจุดเพื่อดูกิจกรรม').waitFor()
  await noOverflow('home calendar')
  await shot(page, 'student-1c-home-calendar')
  await page.getByRole('button', { name: 'ดูเป็นรายการ' }).click()
  await page.getByRole('heading', { name: /^เปิดรับสมัคร/ }).waitFor()
  const text = await page.locator('main').innerText()
  expect(!/[·—]/.test(text), 'no middle dot or em-dash on screen')

  // Detail then register.
  await page.getByRole('link', { name: /จัดสถานที่ต้อนรับนิสิตใหม่/ }).click()
  await page.getByRole('heading', { name: 'จัดสถานที่ต้อนรับนิสิตใหม่' }).waitFor()
  await page.getByText('เหลือ 2 ที่').first().waitFor()
  await noOverflow('detail')
  await shot(page, 'student-2-detail')
  await rawShot(page, 'student-2a-detail-screen', { viewport: true })
  // The seat line is said once on the page.
  const detailText = await page.locator('main').innerText()
  expect(detailText.split('ลงทะเบียนแล้ว 8 จาก 10 คน').length === 2, 'seat line appears once on the detail page')
  // Private messages are off until supervisors can read them: no way in from the detail page.
  expect((await page.getByRole('button', { name: 'ส่งข้อความถึงผู้ดูแลกิจกรรม' }).count()) === (MESSAGES_ON ? 1 : 0), 'message button follows MESSAGES_ON')
  expect(MESSAGES_ON || (await page.getByText('ห้องแชทกิจกรรม').count()) === 0, 'no chat room row while messages are off')
  await page.getByRole('button', { name: 'ลงทะเบียน', exact: true }).click()
  await page.getByRole('button', { name: 'ยืนยันลงทะเบียน' }).waitFor()
  await shot(page, 'student-3-register-sheet')
  await page.getByRole('button', { name: 'ยืนยันลงทะเบียน' }).click()
  // Registered: the bar says so and its one button cancels.
  await page.getByText(/^ลงทะเบียนแล้ว \d/).waitFor()
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).waitFor()
  await page.waitForTimeout(600)
  await rawShot(page, 'student-3b-detail-registered', { viewport: true })
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click()
  await page.getByRole('button', { name: 'ยกเลิกการลงทะเบียน' }).waitFor()
  await shot(page, 'student-3c-cancel-sheet')
  await page.getByRole('button', { name: 'ไม่ยกเลิก' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })

  // A live activity that takes unregistered students: the bar's one button scans.
  await page.goto(`${base}#/a/test-blood`)
  await page.getByRole('link', { name: 'สแกนรับชั่วโมง' }).waitFor()
  await noOverflow('detail live')
  await page.waitForTimeout(600)
  await rawShot(page, 'student-2b-detail-live', { viewport: true })

  // Register for the live activity behind the UI so the list below has a live row.
  await page.evaluate((n) => {
    const db = JSON.parse(localStorage.getItem('nuv:db'))
    ;(db.regs['test-blood'] ??= {})['65010077'] = { studentId: '65010077', name: n, at: Date.now() - 86_400_000 }
    localStorage.setItem('nuv:db', JSON.stringify(db))
  }, name)

  // It shows up under my activities, and a notice was written.
  await page.goto(`${base}#/mine`)
  await page.reload()
  await page.getByRole('link', { name: /จัดสถานที่ต้อนรับนิสิตใหม่/ }).waitFor()
  await page.locator('main').getByRole('link', { name: 'สแกนรับชั่วโมง' }).waitFor()
  await noOverflow('mine')
  await shot(page, 'student-4-mine')
  await page.getByRole('link', { name: /แจ้งเตือน/ }).click()
  await page.getByText('ลงทะเบียนสำเร็จ').waitFor()
  await noOverflow('inbox')
  await shot(page, 'student-5-inbox')

  // Claim the live activity: success screen with the two people before and the own row highlighted.
  const token = makeToken({ a: 'test-blood', h: 6, la: site.latitude, lo: site.longitude, ac: 15 }, 'dynamic', Date.now())
  await page.goto(`${base}#/claim?t=${token}`)
  await page.getByRole('heading', { name }).waitFor({ timeout: 8000 })
  await page.locator('[data-own]').waitFor()
  await page.waitForFunction(() => document.querySelectorAll('li[class*="grid-cols"]').length >= 3)
  const rows = await page.locator('ul li[class*="grid-cols"]').allInnerTexts()
  expect(rows.length === 3 && rows[2].includes('65010077') && rows[1].includes('65020003'), `roster rows: ${JSON.stringify(rows)}`)
  await page.waitForTimeout(2200)
  await noOverflow('success with long name')
  await page.getByRole('link', { name: 'เสร็จสิ้น' }).waitFor()
  // The cumulative total: this credit is counted once (the claim wrote 6 hours and nothing else exists yet).
  await page.waitForFunction(() => [...document.querySelectorAll('[data-value]')].some((e) => e.getAttribute('data-value') === '6' && e.textContent === '6' && e.closest('p')))
  await shot(page, 'student-6-success')

  // The roster page lists all four, own row highlighted and in view.
  await page.getByRole('link', { name: 'ดูรายชื่อทั้งหมด' }).click()
  await page.locator('[data-own]').waitFor()
  await page.waitForFunction(() => document.querySelectorAll('ul li[class*="grid-cols"]').length === 4)
  const listed = await page.locator('ul li[class*="grid-cols"]').allInnerTexts()
  expect(listed.length === 4, `roster page lists ${listed.length}: ${JSON.stringify(listed)}`)
  await page.getByLabel('ค้นด้วยรหัสหรือชื่อ').fill('65020002')
  await page.getByText('พบ 1 จาก 4 คน').waitFor()
  await noOverflow('roster')

  // Profile: transcript, credits, long name.
  await page.goto(`${base}#/me`)
  await page.getByText('บันทึกชั่วโมงจิตอาสา', { exact: true }).waitFor()
  await page.getByText('สิทธิ์ยกเลิก').waitFor()
  await page.waitForTimeout(900)
  await noOverflow('profile')
  await shot(page, 'student-7-profile')

  // Home again with hours: the total, per-category bar and legend show, and the scan card is gone.
  await page.goto(`${base}#/`)
  await page.getByText('จาก 1 กิจกรรม').waitFor()
  expect((await page.getByRole('region', { name: 'กิจกรรมที่กำลังดำเนินอยู่' }).count()) === 0, 'no scan card after the hours are in')
  await noOverflow('home with hours')
  await shot(page, 'student-6b-home-hours')

  // Load failed: the message has a retry button, and pressing it brings the list back.
  await page.evaluate(async (b) => {
    const { useMine } = await import(`${new URL(b).pathname}src/data/mine.ts`)
    useMine.setState({ failed: true })
  }, base)
  await page.getByText('โหลดกิจกรรมไม่ได้').waitFor()
  await shot(page, 'student-1d-home-failed')
  await page.getByRole('button', { name: 'ลองอีกครั้ง' }).click()
  await page.getByText('โหลดกิจกรรมไม่ได้').waitFor({ state: 'detached' })
  await page.getByRole('link', { name: /จัดสถานที่ต้อนรับนิสิตใหม่/ }).waitFor()

  // The activity with hours moved to the past list.
  await page.goto(`${base}#/mine`)
  await page.getByRole('radio', { name: 'ที่ผ่านมา' }).click()
  await page.getByText('+6 ชั่วโมง').waitFor()
  await noOverflow('mine past')
  await shot(page, 'student-4b-mine-past')

  // Notification settings.
  await page.goto(`${base}#/settings/notify`)
  await page.getByRole('switch', { name: 'แจ้งเตือนบนเครื่อง' }).waitFor()
  expect((await page.getByRole('switch', { name: 'ข้อความจากผู้ดูแล' }).count()) === (MESSAGES_ON ? 1 : 0), 'message switch follows MESSAGES_ON')
  await noOverflow('notify settings')
  await shot(page, 'student-9-notify')

  // No camera in this browser: the scan page says how to scan instead.
  await page.goto(`${base}#/scan`)
  await page.getByRole('heading', { name: /เปิดกล้องไม่ได้|สแกนด้วยกล้องมือถือ/ }).waitFor()
  await noOverflow('scan without a camera')
  await shot(page, 'student-10-scan-no-camera')

  // Chat rooms open only for activities with chat; the private thread always works for a registered student.
  await page.goto(`${base}#/a/test-later/dm`)
  await page.getByPlaceholder('พิมพ์ข้อความถึงผู้ดูแล').fill('ขอแจ้งว่ามาไม่ได้')
  await page.getByRole('button', { name: 'ส่ง', exact: true }).click()
  await page.getByText('ขอแจ้งว่ามาไม่ได้').waitFor()
  await noOverflow('dm')
  await shot(page, 'student-8-dm')

  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
