// Supervisor home: create button, live card for the blood activity, to-do rows for the ended activity,
// calendar day filter, activity-year stats. Light and dark screenshots at 390x844 in scripts/e2e/out/home-*.png.
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

export default async function ({ browser, base, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  const noOverflow = async (label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w <= 390, `${label} is ${w}px wide`)
  }
  const both = async (name) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await shot(page, `${name}-light`)
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(250) // let the 160 ms colour transitions finish
    await shot(page, `${name}-dark`)
    await page.emulateMedia({ colorScheme: 'light' })
  }

  // The fixture's blood activity is 08:00 to 16:00 today. Move it around now so it is live whatever time this runs,
  // and add one activity two days away so the day filter has something to hide.
  await page.goto(`${base}#/sup/login`)
  await page.waitForFunction(() => localStorage.getItem('nuv:db'))
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('nuv:db'))
    const h = 3600_000
    const blood = db.activities['test-blood']
    blood.start = Date.now() - h
    blood.end = Date.now() + 3 * h
    blood.creditCount = 7
    db.activities['test-later'] = {
      ...blood,
      id: 'test-later',
      title: 'ปลูกป่าชายเลน',
      start: Date.now() + 48 * h,
      end: Date.now() + 52 * h,
      creditCount: 0,
      regCount: 12,
    }
    localStorage.setItem('nuv:db', JSON.stringify(db))
  })
  await page.reload()

  await page.getByLabel('ชื่อผู้คุม').fill('พี่เต้')
  await page.getByLabel('รหัสหน่วยงาน').fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.getByRole('heading', { name: 'สวัสดี พี่เต้' }).waitFor()

  // Big create button.
  const create = page.getByRole('link', { name: 'สร้างกิจกรรม' })
  await create.waitFor()
  expect((await create.getAttribute('href')).endsWith('#/sup/new'), 'create button links to /sup/new')
  const box = await create.boundingBox()
  expect(box.height >= 56 && box.width >= 300, `create button is ${box.width}x${box.height}`)

  // Live card for the blood activity.
  await page.getByRole('heading', { name: 'กำลังจัดตอนนี้' }).waitFor()
  const qr = page.getByRole('link', { name: 'เปิด QR' })
  expect((await qr.count()) === 1, 'one live card')
  expect((await qr.getAttribute('href')).endsWith('/sup/a/test-blood/qr'), 'QR button links to the QR screen')
  await page.getByRole('link', { name: /บริจาคโลหิต ครั้งที่ 2\/2569/ }).waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('[data-value]')].some((e) => e.textContent === '7'))

  // To-do rows: the ended river clean-up still needs its roster closed.
  await page.getByRole('heading', { name: 'ต้องทำต่อ' }).waitFor()
  const todo = page.getByRole('link', { name: /^ปิดรายชื่อ\s*เก็บขยะริมแม่น้ำน่าน/ })
  expect((await todo.count()) === 1, 'one to-do row for the ended activity')

  // Status groups and stats.
  await page.getByRole('heading', { name: 'กำลังจะมาถึง' }).waitFor()
  await page.getByRole('heading', { name: 'รอปิดหรือส่งรายชื่อ' }).waitFor()
  await page.getByRole('heading', { name: /^ปีกิจกรรม \d{4}$/ }).waitFor()
  const body = await page.locator('main').innerText()
  expect(!/[·—]/.test(body), 'no middle dot or em-dash on screen')

  await noOverflow('home')
  await both('home-1-top')
  await page.getByRole('heading', { name: /^ปีกิจกรรม/ }).scrollIntoViewIfNeeded()
  await both('home-2-lower')

  // Calendar: today has a dot, tapping filters the list, tapping again clears it.
  const today = new Date().getDate()
  const cell = page.getByRole('button', { name: `วันที่ ${today} มีกิจกรรม` })
  await page.getByRole('heading', { name: /^(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม) \d{4}$/ }).waitFor()
  await cell.click()
  await page.getByText(/^กิจกรรมวันที่/).waitFor()
  expect((await page.getByRole('link', { name: /ปลูกป่าชายเลน/ }).count()) === 0, 'other day is hidden while filtered')
  expect((await page.getByRole('link', { name: /เก็บขยะริมแม่น้ำน่าน/ }).count()) >= 1, 'ended activity is on today')
  await noOverflow('filtered')
  await both('home-3-filtered')
  await cell.click()
  await page.getByText(/^กิจกรรมวันที่/).waitFor({ state: 'detached' })
  await page.getByRole('link', { name: /ปลูกป่าชายเลน/ }).waitFor()

  // A to-do row opens the manage page.
  await todo.click()
  await page.getByRole('heading', { name: 'เก็บขยะริมแม่น้ำน่าน' }).waitFor()

  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
