// Manage page layout A and the Wallet-style QR reveal (dark, 390x844, touch): pull down past 110 px shows the real rotating QR
// behind the page, the page parks at 440 px with scrolling locked, the handle or a drag up puts it back, the "แสดง QR" button and
// `?qr=1` open it, and the QR's timers are gone once it is hidden. Screenshot: scripts/e2e/out/sup-manage-qr.png (and -top).
import { loginAsSup, seedSupHome } from '../lib/sup-fixture.mjs'

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const site = { latitude: 16.7466, longitude: 100.1948 }

export default async function ({ browser, base, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', hasTouch: true, geolocation: site, permissions: ['geolocation'] })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))

  /** One finger from (x, y0) to (x, y1) in steps. `hold` keeps it down, to look at the screen mid-drag. */
  const swipe = async (y0, y1, { hold = false } = {}) => {
    const x = 195
    const pt = (y) => [{ x, y, id: 1 }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(y0) })
    const steps = 12
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(y0 + ((y1 - y0) * i) / steps) })
      await page.waitForTimeout(16)
    }
    if (!hold) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const release = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const sheetY = () =>
    page.evaluate(() => {
      const m = new DOMMatrix(getComputedStyle(document.querySelector('[data-qr-sheet]')).transform)
      return Math.round(m.m42)
    })
  const layer = page.locator('[data-qr-layer]')

  await seedSupHome(page, base)
  await loginAsSup(page)
  await page.getByRole('link', { name: /บริจาคโลหิต ครั้งที่ 2\/2569/ }).first().click()
  await page.getByRole('heading', { name: 'บริจาคโลหิต ครั้งที่ 2/2569' }).waitFor()

  // Layout A: back link, live status, title, summary ring and tiles, buttons, latest scans, settings group, roster.
  await page.getByRole('link', { name: 'กิจกรรมทั้งหมด' }).waitFor()
  await page.getByText(/^กำลังดำเนินการ ถึง \d\d:\d\d น\.$/).waitFor()
  const h1 = await page.getByRole('heading', { level: 1 }).evaluate((e) => getComputedStyle(e).fontSize)
  expect(h1 === '26px', `title is ${h1}`)
  await page.getByText(/^ได้รับชั่วโมงแล้ว จากผู้ลงทะเบียน 20 คน$/).waitFor()
  await page.getByRole('img', { name: /^ได้รับชั่วโมงแล้ว ร้อยละ \d+$/ }).waitFor()
  const tiles = page.locator('section[aria-label="สรุปกิจกรรม"] button')
  expect((await tiles.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).join('|') === '1 ยังไม่ได้รับ|1 ไม่ได้ลงทะเบียน|1 ควรตรวจสอบ', 'three tiles with counts 1, 1, 1')
  await page.getByRole('button', { name: 'แสดง QR', exact: true }).waitFor()
  await page.getByRole('button', { name: 'เพิ่มรายชื่อ' }).waitFor()
  const feed = page.locator('[data-feed] li')
  expect((await feed.count()) === 3, 'three latest scans')
  expect(/ณัฐวุฒิ/.test(await feed.first().innerText()), 'newest scan is on top')
  await page.getByText('อัปเดตอัตโนมัติ').waitFor()
  await page.getByRole('heading', { name: 'การตั้งค่าและเอกสาร' }).waitFor()
  for (const t of ['การเช็คชื่อ', 'แก้ไขรายละเอียดกิจกรรม', 'ตรวจสอบรายชื่อ', 'ดาวน์โหลดไฟล์ Excel']) await page.getByRole('button', { name: new RegExp(t) }).waitFor()
  await page.getByText('ดึงลงเพื่อแสดง QR').waitFor()
  await page.getByRole('heading', { name: 'รายชื่อ' }).waitFor()

  const wide = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(wide <= 390, `manage page is ${wide}px wide`)
  await page.waitForTimeout(1200)
  await shot(page, 'sup-manage-top', { viewport: true })

  // A tile jumps to the roster with its filter on.
  await tiles.nth(2).click()
  await page.getByRole('button', { name: /^ควรตรวจสอบ/, pressed: true }).waitFor()
  await page.waitForTimeout(700)
  expect((await page.evaluate(() => scrollY)) > 200, 'page scrolled down to the roster')
  await page.evaluate(() => scrollTo(0, 0))
  await page.getByRole('button', { name: /^ทั้งหมด/ }).click()

  // Not at the top: a downward swipe is an ordinary scroll up, never a pull.
  await page.evaluate(() => scrollTo(0, 300))
  await swipe(300, 600)
  expect((await sheetY()) === 0 && (await layer.count()) === 0, 'no pull while scrolled down')
  await page.evaluate(() => scrollTo(0, 0))

  // A short pull springs back and the QR is unmounted again.
  await swipe(200, 320)
  await page.waitForTimeout(900)
  expect((await sheetY()) === 0, 'short pull snaps back')
  expect((await layer.count()) === 0, 'QR layer is gone after a short pull')
  expect((await page.evaluate(() => document.documentElement.style.overflow)) === '', 'page scroll not locked')

  // Mid-pull: hint flips past 110 px, the QR already shows behind the sheet.
  await swipe(200, 420, { hold: true }) // 220 px of finger = 165 px of sheet
  await page.getByText('ปล่อยเพื่อแสดง QR').waitFor()
  const y = await sheetY()
  expect(y > 110 && y < 440, `sheet follows the finger (${y})`)
  await layer.waitFor()
  const op = await page.locator('[data-qr-layer] > div').evaluate((e) => Number(getComputedStyle(e).opacity))
  expect(op > 0.15 && op < 1, `QR fades in behind the sheet (${op})`)
  await release()

  // Released past 110 px: parks at 440 px, handle appears, scroll is locked, the real QR is there.
  await page.getByRole('button', { name: 'ซ่อน QR' }).waitFor()
  await page.waitForTimeout(700)
  expect((await sheetY()) === 440, `sheet parks at 440 (${await sheetY()})`)
  expect((await page.evaluate(() => document.documentElement.style.overflow)) === 'hidden', 'page scroll is locked while open')
  await page.getByText('สแกนเพื่อรับ 6 ชั่วโมง').waitFor()
  const qr = page.locator('[data-qr-layer] [data-token]')
  await qr.waitFor()
  await page.waitForFunction(() => document.querySelector('[data-qr-layer] [data-token] svg'))
  const box = await qr.boundingBox()
  expect(Math.round(box.width) === 236, `QR is ${box.width}px`)
  const radius = await page.evaluate(() => getComputedStyle(document.querySelector('[data-qr-sheet]')).borderTopLeftRadius)
  expect(radius === '28px', `sheet corner is ${radius}`)
  await page.getByText(/^QR ใหม่ใน \d+ วินาที$/).waitFor()
  await page.getByRole('link', { name: 'เปิดเต็มจอสำหรับหน้างาน' }).waitFor()
  const t0 = await qr.getAttribute('data-token')
  await page.waitForTimeout(800)
  await shot(page, 'sup-manage-qr', { viewport: true })
  await page.waitForTimeout(10_500)
  expect((await qr.getAttribute('data-token')) !== t0, 'QR token changes after one window')

  // Drag the sheet up: closes. The QR layer unmounts so its timers stop.
  await swipe(700, 450)
  await page.getByText('ดึงลงเพื่อแสดง QR').waitFor()
  await page.waitForTimeout(900)
  expect((await sheetY()) === 0, 'drag up closes')
  expect((await layer.count()) === 0, 'QR layer unmounted after closing')
  expect((await page.evaluate(() => document.documentElement.style.overflow)) === '', 'scroll unlocked')

  // The button opens it, the handle closes it.
  await page.getByRole('button', { name: 'แสดง QR', exact: true }).click()
  await page.getByRole('button', { name: 'ซ่อน QR' }).waitFor()
  await page.waitForTimeout(700)
  expect((await sheetY()) === 440, 'button opens the reveal')
  await page.getByRole('button', { name: 'ซ่อน QR' }).click()
  await page.getByText('ดึงลงเพื่อแสดง QR').waitFor()
  await page.waitForTimeout(900)
  expect((await sheetY()) === 0 && (await layer.count()) === 0, 'handle closes it')

  // Full-screen link from the reveal still reaches the venue screen.
  await page.getByRole('button', { name: 'แสดง QR', exact: true }).click()
  await page.getByRole('link', { name: 'เปิดเต็มจอสำหรับหน้างาน' }).click()
  await page.locator('[data-kiosk]').waitFor()
  await page.goBack()
  await page.getByRole('heading', { name: 'บริจาคโลหิต ครั้งที่ 2/2569' }).waitFor()

  // From the home card: `?qr=1` opens it on arrival, from further down the page too, and the parameter is dropped.
  await page.goto(`${base}#/sup`)
  await page.getByRole('link', { name: 'แสดง QR รับชั่วโมง' }).click()
  await page.getByRole('button', { name: 'ซ่อน QR' }).waitFor()
  await page.waitForTimeout(700)
  expect((await sheetY()) === 440, 'home button opens Manage with the QR revealed')
  expect(!page.url().includes('qr=1'), `parameter is dropped (${page.url()})`)
  await layer.locator('[data-token]').waitFor()
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(overflowX <= 390, `page is ${overflowX}px wide`)

  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
