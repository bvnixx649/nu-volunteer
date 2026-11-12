// Create and edit an activity at 390x844: pick the blood-donation template, fill the details page, publish, edit the
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

  await page.goto(`${base}#/sup/login`)
  await page.getByLabel('ชื่อผู้ดูแล').fill('พี่เต้')
  await page.getByLabel('รหัส', { exact: true }).fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.waitForURL(/#\/sup$/)

  // Closing with nothing entered leaves at once; closing after picking a template asks first.
  await page.goto(`${base}#/sup/new`)
  await h1('เลือกประเภทกิจกรรม')
  await page.getByRole('button', { name: 'ปิด' }).click()
  await page.waitForURL(/#\/sup$/)
  await page.goto(`${base}#/sup/new`)
  await h1('เลือกประเภทกิจกรรม')
  expect((await page.getByRole('button', { name: /แลกขวด/ }).count()) === 1, 'bottle template is offered')
  expect((await page.getByRole('button', { name: /เก็บขวด/ }).count()) === 0, 'old bottle name is gone')
  await snap('1-template')
  await page.getByRole('button', { name: /บริจาคโลหิต/ }).click()
  await h1('รายละเอียด')
  await page.getByRole('button', { name: 'ปิด' }).click()
  const discard = page.getByRole('dialog', { name: 'ออกโดยไม่บันทึกไหม' })
  await discard.waitFor()
  await discard.getByRole('button', { name: 'แก้ไขต่อ' }).click()
  await discard.waitFor({ state: 'detached' })

  // Details: the page is one screen. Defaults come from the template, empty required fields explain themselves.
  expect((await page.getByText('บัตรนิสิต').count()) > 0, 'description comes from the template')
  expect((await page.getByLabel('ชั่วโมงต่อคน').inputValue()) === '6', 'blood gives 6 hours')
  expect((await page.getByRole('switch', { name: 'จำกัดจำนวน' }).count()) === 0, 'extra settings start closed')
  await snap('2-details')
  await next()
  await page.getByText('ใส่ชื่อกิจกรรม').waitFor()
  await page.getByText('เลือกวันที่').waitFor()
  await page.getByText('ใส่สถานที่').waitFor()
  await h1('รายละเอียด')
  await snap('2b-details-errors')

  // The draft survives a reload.
  await page.getByLabel('ชื่อกิจกรรม').fill('บริจาคโลหิต ครั้งที่ 3/2569')
  await page.waitForTimeout(150)
  await page.reload()
  await h1('รายละเอียด')
  expect((await page.getByLabel('ชื่อกิจกรรม').inputValue()) === 'บริจาคโลหิต ครั้งที่ 3/2569', 'draft restored after reload')

  // Poster: an uploaded photo, then a template photo again.
  await page.getByRole('button', { name: 'เปลี่ยนรูปปก' }).click()
  const posters = page.getByRole('dialog', { name: 'รูปปก' })
  await posters.getByRole('radio', { name: 'รูปเทมเพลต 1' }).waitFor()
  await snap('2c-poster-sheet')
  await page.getByTestId('poster-file').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG })
  await posters.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'เปลี่ยนรูปปก' }).click()
  await posters.getByRole('radio', { name: 'รูปของคุณ' }).waitFor()
  const own = await posters.getByRole('radio', { name: 'รูปของคุณ' }).locator('img').getAttribute('src')
  expect(own.startsWith('data:image/jpeg'), 'upload becomes a jpeg data url')
  await posters.getByRole('radio', { name: 'รูปเทมเพลต 1' }).click()
  await posters.waitFor({ state: 'detached' })

  // When and where: end before start is refused, then fixed. GPS pin.
  await page.getByLabel('วันที่จัดกิจกรรม').fill('2026-11-20')
  await page.getByLabel('เวลาเริ่ม').fill('08:00')
  await page.getByLabel('เวลาจบ').fill('07:00')
  await page.getByText('เวลาจบต้องหลังเวลาเริ่ม').waitFor()
  await page.getByLabel('สถานที่', { exact: true }).fill('อาคารอเนกประสงค์ มหาวิทยาลัยนเรศวร')
  await next()
  await h1('รายละเอียด')
  await page.getByLabel('เวลาจบ').fill('16:00')
  await page.getByRole('button', { name: 'ใช้ตำแหน่งปัจจุบัน' }).click()
  await page.getByTestId('pin').waitFor()
  expect((await page.getByTestId('pin').innerText()).includes('16.74660, 100.19480'), 'pin shows the coordinates')

  // Hours checks.
  await page.getByLabel('ชั่วโมงต่อคน').fill('100')
  await page.getByText('ใส่จำนวนเต็ม 1 ถึง 99').waitFor()
  await next()
  await h1('รายละเอียด')
  await page.getByRole('button', { name: '6 ชม.', exact: true }).click()

  // Extra settings: open on demand, the summary says what is set while closed.
  const more = page.getByRole('button', { name: /ตั้งค่าเพิ่มเติม/ })
  expect((await more.getAttribute('aria-expanded')) === 'false', 'extra settings closed')
  expect((await more.innerText()).includes('รับผู้ไม่ได้ลงทะเบียน'), 'summary shows the walk-in choice')
  await more.click()
  expect((await page.getByRole('switch', { name: 'รับผู้ไม่ได้ลงทะเบียน' }).getAttribute('aria-checked')) === 'true', 'blood takes unregistered people')
  expect((await page.getByRole('switch', { name: 'จำกัดจำนวน' }).getAttribute('aria-checked')) === 'false', 'blood has no limit')
  await page.getByRole('switch', { name: 'จำกัดจำนวน' }).click()
  await page.getByLabel('รับได้กี่คน').fill('')
  await next()
  await page.getByText('ใส่จำนวนคน', { exact: true }).waitFor()
  await page.getByRole('switch', { name: 'จำกัดจำนวน' }).click()
  await page.getByRole('switch', { name: 'ตั้งเวลาเปิดรับสมัคร' }).click()
  await page.getByLabel('วันที่เปิดรับ').waitFor()
  await page.getByRole('switch', { name: 'ซ่อนจนถึงเวลาเปิดรับ' }).waitFor()
  await page.getByRole('switch', { name: 'ตั้งเวลาเปิดรับสมัคร' }).click()
  await page.getByLabel('วันที่เปิดรับ').waitFor({ state: 'detached' })
  await page.getByRole('radio', { name: /QR เปลี่ยนอัตโนมัติ/ }).waitFor()
  expect((await page.getByRole('switch', { name: 'รับผู้ไม่ได้ลงทะเบียน' }).count()) === 1, 'walk-in appears once')
  expect((await page.getByLabel('ชื่อผู้ดูแลกิจกรรม').inputValue()) === 'พี่เต้', 'supervisor name from the session')
  await page.getByLabel('เบอร์ติดต่อ').fill('055961234')
  await page.getByRole('switch', { name: 'เปิดห้องแชท' }).click()
  await page.getByLabel('ลิงก์ OpenChat').fill('line.me/x')
  await page.getByText('ลิงก์ต้องขึ้นต้นด้วย https://').waitFor()
  await next()
  await h1('รายละเอียด')
  await page.getByLabel('ลิงก์ OpenChat').fill('https://line.me/ti/g2/abc')
  await snap('3-more')

  // Review: preview as students see it, then publish.
  await next()
  await h1('ตรวจและเผยแพร่')
  const preview = page.getByTestId('preview')
  expect((await preview.innerText()).includes('บริจาคโลหิต ครั้งที่ 3/2569'), 'preview shows the title')
  expect((await preview.innerText()).includes('6 ชม.'), 'preview shows the hours')
  await snap('4-review')
  await page.getByRole('button', { name: 'ย้อนกลับ' }).click()
  await h1('รายละเอียด')
  await next()
  await h1('ตรวจและเผยแพร่')

  await page.getByRole('button', { name: 'เผยแพร่', exact: true }).click()
  await page.waitForURL(/#\/sup\/a\/[0-9a-z]{10}$/)
  const id = page.url().split('/').pop()
  await page.getByRole('heading', { name: 'บริจาคโลหิต ครั้งที่ 3/2569' }).waitFor()
  await snap('8-manage')
  const stored = await page.evaluate((i) => JSON.parse(localStorage.getItem('nuv:db')).activities[i], id)
  expect(stored.orgCode === 'NUVOL69' && stored.hours === 6 && stored.walkIn === true && stored.regCount === 0 && stored.creditCount === 0, `stored activity: ${JSON.stringify(stored)}`)
  expect(stored.lat === site.latitude && stored.supervisor.phone === '055961234' && stored.chatEnabled === true, 'pin, phone and chat saved')
  expect(stored.poster.includes('posters/'), 'template poster saved')
  expect(stored.itemsPerHour === undefined, 'no bottle rule on a blood activity')

  // The phone number is remembered for the next activity, and the saved draft is gone.
  await page.goto(`${base}#/sup/new`)
  await h1('เลือกประเภทกิจกรรม')
  await page.getByRole('button', { name: /จัดสถานที่/ }).click()
  await h1('รายละเอียด')
  await page.getByRole('button', { name: /ตั้งค่าเพิ่มเติม/ }).click()
  expect((await page.getByLabel('เบอร์ติดต่อ').inputValue()) === '055961234', 'phone prefilled from the last activity')
  expect((await page.getByLabel('ชื่อกิจกรรม').inputValue()) === '', 'new activity starts without a title')
  await page.getByRole('button', { name: 'ปิด' }).click()
  await page.getByRole('dialog', { name: 'ออกโดยไม่บันทึกไหม' }).getByRole('button', { name: 'ออกโดยไม่บันทึก' }).click()
  await page.waitForURL(/#\/sup$/)
  await page.goto(`${base}#/sup/a/${id}`)

  // Edit: starts on the details, change the title, save.
  await page.getByRole('button', { name: /แก้ไขรายละเอียดกิจกรรม/ }).click()
  await h1('รายละเอียด')
  expect((await page.getByRole('button', { name: 'ย้อนกลับ' }).count()) === 0, 'no way back to the template when editing')
  await page.getByLabel('ชื่อกิจกรรม').fill('บริจาคโลหิต ครั้งที่ 3/2569 (แก้แล้ว)')
  await next()
  await h1('ตรวจและเผยแพร่')
  await snap('9-edit-review')
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await page.waitForURL(new RegExp(`#/sup/a/${id}$`))
  await page.getByRole('heading', { name: 'บริจาคโลหิต ครั้งที่ 3/2569 (แก้แล้ว)' }).waitFor()

  // Check-in settings: walk-in off, saved, still off when reopened.
  await page.getByRole('button', { name: /^การเช็คชื่อ/ }).click()
  const sheet = page.getByRole('dialog', { name: 'ตั้งค่าการเช็คชื่อ' })
  const walk = sheet.getByRole('switch', { name: 'รับผู้ไม่ได้ลงทะเบียน' })
  await sheet.getByText('ผู้ไม่ได้ลงทะเบียน', { exact: true }).waitFor()
  expect((await walk.getAttribute('aria-checked')) === 'true', 'walk-in starts on')
  await walk.click()
  await sheet.getByText('สแกนได้เฉพาะผู้ลงทะเบียน').waitFor()
  await page.waitForTimeout(450)
  await shot(page, 'create-10-walkin-sheet')
  await sheet.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await sheet.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: /^การเช็คชื่อ/ }).click()
  const again = page.getByRole('dialog', { name: 'ตั้งค่าการเช็คชื่อ' })
  await again.getByRole('switch', { name: 'รับผู้ไม่ได้ลงทะเบียน' }).waitFor()
  expect((await again.getByRole('switch', { name: 'รับผู้ไม่ได้ลงทะเบียน' }).getAttribute('aria-checked')) === 'false', 'walk-in stays off after saving')
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
  expect((await page.getByRole('button', { name: /แก้ไขรายละเอียดกิจกรรม/ }).count()) === 0, 'no edit row after the roster is sent')
  await page.goto(`${base}#/sup/edit/${id}`)
  await page.getByText('ส่งรายชื่อแล้ว แก้ไขกิจกรรมไม่ได้').waitFor()
  await snap('11-blocked')

  expect(problems.length === 0, `console errors: ${problems.join(' | ')}`)
  await ctx.close()
}
