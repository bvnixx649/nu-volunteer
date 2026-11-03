// Create and edit an activity at 390x844: pick the blood-donation category, walk through the 7 steps, publish, edit the
// title from the manage page, then turn walk-in off in the check-in settings and see it persist. Screenshots of every step
// go to out/create-*.png. Also covers validation, the discard sheet and the block on a sent roster.
export const localOnly = 'creates activities in the shared project'

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const site = { latitude: 16.7466, longitude: 100.1948 }
// 1x1 PNG, enough to run the resize path.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

export default async function ({ browser, base, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: site, permissions: ['geolocation'], locale: 'th-TH' })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  const noOverflow = async (label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w <= 390, `${label} is ${w}px wide`)
  }
  const h1 = (name) => page.getByRole('heading', { level: 1, name, exact: true }).waitFor()
  const settle = () => page.waitForTimeout(450)
  const snap = async (name, label) => {
    await settle()
    await noOverflow(label ?? name)
    await shot(page, `create-${name}`)
  }
  const next = () => page.getByRole('button', { name: 'ถัดไป', exact: true }).click()
  const nextDisabled = () => page.getByRole('button', { name: 'ถัดไป', exact: true }).isDisabled()

  await page.goto(`${base}#/sup/login`)
  await page.getByLabel('ชื่อผู้คุม').fill('พี่เต้')
  await page.getByLabel('รหัสหน่วยงาน').fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.waitForURL(/#\/sup$/)

  // Closing with nothing entered leaves at once; closing after picking a category asks first.
  await page.goto(`${base}#/sup/new`)
  await h1('เลือกหมวด')
  await page.getByRole('button', { name: 'ปิด' }).click()
  await page.waitForURL(/#\/sup$/)
  await page.goto(`${base}#/sup/new`)
  await h1('เลือกหมวด')
  await snap('1-category')
  await page.getByRole('button', { name: /บริจาคโลหิต/ }).click()
  await h1('ชื่อและรูป')
  await page.getByRole('button', { name: 'ปิด' }).click()
  const discard = page.getByRole('dialog', { name: 'ทิ้งที่กรอกไว้ไหม' })
  await discard.waitFor()
  await discard.getByRole('button', { name: 'กรอกต่อ' }).click()
  await discard.waitFor({ state: 'detached' })

  // Step 2: defaults from the category, an uploaded photo, then a template again.
  expect((await page.getByLabel('คำอธิบาย').inputValue()).includes('บัตรนิสิต'), 'description comes from the category')
  await page.getByLabel('ชื่อกิจกรรม').fill('บริจาคโลหิต ครั้งที่ 3/2569')
  expect(!(await nextDisabled()), 'next enabled with a title')
  await page.getByLabel('ชื่อกิจกรรม').fill('')
  expect(await nextDisabled(), 'next disabled without a title')
  await page.getByLabel('ชื่อกิจกรรม').fill('บริจาคโลหิต ครั้งที่ 3/2569')
  await page.getByTestId('poster-file').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('radio', { name: 'รูปของคุณ' }).waitFor()
  const own = await page.getByRole('radio', { name: 'รูปของคุณ' }).locator('img').getAttribute('src')
  expect(own.startsWith('data:image/jpeg'), 'upload becomes a jpeg data url')
  await page.getByRole('radio', { name: 'รูปเทมเพลต 1' }).click()
  await snap('2-title')
  await next()

  // Step 3: end before start is refused, then fixed. GPS pin.
  await h1('วันเวลาและสถานที่')
  await page.getByLabel('วันที่จัดกิจกรรม').fill('2026-11-20')
  await page.getByLabel('เวลาเริ่ม').fill('08:00')
  await page.getByLabel('เวลาจบ').fill('07:00')
  await page.getByText('เวลาจบต้องหลังเวลาเริ่ม').waitFor()
  await page.getByLabel('สถานที่', { exact: true }).fill('อาคารอเนกประสงค์ มหาวิทยาลัยนเรศวร')
  expect(await nextDisabled(), 'next disabled while the end is before the start')
  await page.getByLabel('เวลาจบ').fill('16:00')
  await page.getByRole('button', { name: 'ใช้ตำแหน่งที่ฉันอยู่ตอนนี้' }).click()
  await page.getByTestId('pin').waitFor()
  expect((await page.getByTestId('pin').innerText()).includes('16.74660, 100.19480'), 'pin shows the coordinates')
  await snap('3-when')
  await next()

  // Step 4: blood defaults, then the checks.
  await h1('ชั่วโมงและการรับคน')
  expect((await page.getByLabel('ชั่วโมงที่ได้ต่อคน').inputValue()) === '6', 'blood gives 6 hours')
  expect((await page.getByRole('switch', { name: 'จำกัดจำนวน' }).getAttribute('aria-checked')) === 'false', 'blood has no limit')
  expect((await page.getByRole('switch', { name: 'รับ walk-in' }).getAttribute('aria-checked')) === 'true', 'blood takes walk-ins')
  await page.getByLabel('ชั่วโมงที่ได้ต่อคน').fill('100')
  await page.getByText('ใส่ตัวเลข 1 ถึง 99').waitFor()
  expect(await nextDisabled(), 'next disabled for 100 hours')
  await page.getByRole('button', { name: '6 ชม.', exact: true }).click()
  await page.getByRole('switch', { name: 'จำกัดจำนวน' }).click()
  await page.getByLabel('รับได้กี่คน').fill('')
  expect(await nextDisabled(), 'next disabled for an empty capacity')
  await page.getByRole('switch', { name: 'จำกัดจำนวน' }).click()
  await page.getByRole('switch', { name: 'ตั้งเวลาเปิดรับสมัคร' }).click()
  await page.getByLabel('วันที่เปิดรับ').waitFor()
  await page.getByRole('switch', { name: 'ซ่อนจนถึงเวลาเปิดรับ' }).waitFor()
  await snap('4-people')
  await page.getByRole('switch', { name: 'ตั้งเวลาเปิดรับสมัคร' }).click()
  await page.getByLabel('วันที่เปิดรับ').waitFor({ state: 'detached' })
  await next()

  // Step 5: no walk-in section here, it lives on step 4.
  await h1('การเช็คชื่อ')
  expect((await page.getByRole('switch', { name: 'รับ walk-in' }).count()) === 0, 'walk-in is not on the check-in step')
  await snap('5-checkin')
  await next()

  // Step 6: name from the session.
  await h1('ติดต่อ')
  expect((await page.getByLabel('ชื่อผู้คุม').inputValue()) === 'พี่เต้', 'supervisor name from the session')
  await page.getByLabel('เบอร์ติดต่อ').fill('055961234')
  await page.getByRole('switch', { name: 'เปิดห้องแชท' }).click()
  await page.getByLabel('ลิงก์ OpenChat').fill('line.me/x')
  await page.getByText('ลิงก์ต้องขึ้นต้นด้วย https://').waitFor()
  expect(await nextDisabled(), 'next disabled for a bad link')
  await page.getByLabel('ลิงก์ OpenChat').fill('https://line.me/ti/g2/abc')
  await snap('6-contact')
  await next()

  // Step 7: review, jump to a step and come back.
  await h1('ตรวจทาน')
  const preview = page.getByTestId('preview')
  expect((await preview.innerText()).includes('บริจาคโลหิต ครั้งที่ 3/2569'), 'preview shows the title')
  expect((await preview.innerText()).includes('6 ชม.'), 'preview shows the hours')
  await snap('7-review')
  await page.getByRole('button', { name: 'แก้ชื่อและรูป' }).click()
  await h1('ชื่อและรูป')
  await next()
  await h1('ตรวจทาน')

  await page.getByRole('button', { name: 'เผยแพร่', exact: true }).click()
  await page.waitForURL(/#\/sup\/a\/[0-9a-z]{10}$/)
  const id = page.url().split('/').pop()
  await page.getByRole('heading', { name: 'บริจาคโลหิต ครั้งที่ 3/2569' }).waitFor()
  await snap('8-manage')
  const stored = await page.evaluate((i) => JSON.parse(localStorage.getItem('nuv:db')).activities[i], id)
  expect(stored.orgCode === 'NUVOL69' && stored.hours === 6 && stored.walkIn === true && stored.regCount === 0 && stored.creditCount === 0, `stored activity: ${JSON.stringify(stored)}`)
  expect(stored.lat === site.latitude && stored.supervisor.phone === '055961234' && stored.chatEnabled === true, 'pin, phone and chat saved')
  expect(stored.poster.includes('posters/'), 'template poster saved')

  // Edit: starts on the review, change the title, save.
  await page.getByRole('button', { name: /แก้ไขกิจกรรม/ }).click()
  await h1('ตรวจทาน')
  await page.getByRole('button', { name: 'แก้ชื่อและรูป' }).click()
  await h1('ชื่อและรูป')
  await page.getByLabel('ชื่อกิจกรรม').fill('บริจาคโลหิต ครั้งที่ 3/2569 (แก้แล้ว)')
  await next()
  await h1('ตรวจทาน')
  await snap('9-edit-review')
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await page.waitForURL(new RegExp(`#/sup/a/${id}$`))
  await page.getByRole('heading', { name: 'บริจาคโลหิต ครั้งที่ 3/2569 (แก้แล้ว)' }).waitFor()

  // Check-in settings: walk-in off, saved, still off when reopened.
  await page.getByRole('button', { name: 'ตั้งค่าการเช็คชื่อ' }).click()
  const sheet = page.getByRole('dialog', { name: 'ตั้งค่าการเช็คชื่อ' })
  const walk = sheet.getByRole('switch', { name: 'รับ walk-in' })
  await sheet.getByText('คนที่ไม่ได้ลงชื่อไว้').waitFor()
  expect((await walk.getAttribute('aria-checked')) === 'true', 'walk-in starts on')
  await walk.click()
  await sheet.getByText('สแกนได้เฉพาะคนที่ลงชื่อไว้').waitFor()
  await page.waitForTimeout(450)
  await shot(page, 'create-10-walkin-sheet')
  await sheet.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await sheet.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'ตั้งค่าการเช็คชื่อ' }).click()
  const again = page.getByRole('dialog', { name: 'ตั้งค่าการเช็คชื่อ' })
  await again.getByRole('switch', { name: 'รับ walk-in' }).waitFor()
  expect((await again.getByRole('switch', { name: 'รับ walk-in' }).getAttribute('aria-checked')) === 'false', 'walk-in stays off after saving')
  const after = await page.evaluate((i) => JSON.parse(localStorage.getItem('nuv:db')).activities[i], id)
  expect(after.walkIn === false && after.title.endsWith('(แก้แล้ว)') && after.hours === 6, 'settings save kept the edited title')
  await again.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await again.waitFor({ state: 'detached' })

  // A sent roster cannot be edited and has no edit row.
  await page.evaluate((i) => {
    const db = JSON.parse(localStorage.getItem('nuv:db'))
    db.activities[i].submittedAt = Date.now()
    localStorage.setItem('nuv:db', JSON.stringify(db))
  }, id)
  await page.reload()
  await page.getByRole('heading', { name: 'บริจาคโลหิต ครั้งที่ 3/2569 (แก้แล้ว)' }).waitFor()
  expect((await page.getByRole('button', { name: /แก้ไขกิจกรรม/ }).count()) === 0, 'no edit row after the roster is sent')
  await page.goto(`${base}#/sup/edit/${id}`)
  await page.getByText('ส่งรายชื่อแล้ว แก้ไขกิจกรรมไม่ได้').waitFor()
  await snap('11-blocked')

  expect(problems.length === 0, `console errors: ${problems.join(' | ')}`)
  await ctx.close()
}
