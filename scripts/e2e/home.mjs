// Supervisor home (dark, 390x844): header with the calendar link and menu, the green live card with the latest scan and
// the QR button, the groups "รอดำเนินการ" and "กิจกรรมที่จะจัดขึ้น", the folded "ส่งรายชื่อแล้ว", the academic-year tiles and
// the light "สร้างกิจกรรม" button. Also checks two columns from 900px. Screenshots: scripts/e2e/out/sup-home-*.png.
import { loginAsSup, seedSupHome } from '../lib/sup-fixture.mjs'

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

export default async function ({ browser, base, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  const noOverflow = async (label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w <= 390, `${label} is ${w}px wide`)
  }

  await seedSupHome(page, base)
  await loginAsSup(page)

  // Header: emblem, org line, supervisor name, calendar link and menu button, all 44px targets.
  await page.getByRole('heading', { name: 'ศูนย์จิตอาสา กองกิจการนิสิต' }).waitFor()
  const cal = page.getByRole('link', { name: 'ปฏิทินและสถิติ' })
  expect((await cal.getAttribute('href')).endsWith('#/sup/overview'), 'calendar button links to /sup/overview')
  const calBox = await cal.boundingBox()
  expect(Math.round(calBox.width) === 44 && Math.round(calBox.height) === 44, `calendar button is ${calBox.width}x${calBox.height}`)
  const emblem = await page.getByAltText('ตรามหาวิทยาลัยนเรศวร').boundingBox()
  expect(Math.round(emblem.width) === 40, `emblem is ${emblem.width}px`)
  expect((await page.getByRole('button', { name: 'ปฏิทิน' }).count()) === 0, 'no calendar sheet button on home')

  // Live card.
  await page.getByText(/^กำลังดำเนินการ ถึง \d\d:\d\d น\.$/).waitFor()
  await page.getByText(/ชั่วโมงต่อคน/).first().waitFor()
  await page.getByText('ได้รับชั่วโมงแล้ว', { exact: true }).waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('[data-value]')].some((e) => e.textContent === '7'))
  await page.getByText('ผู้ลงทะเบียน', { exact: false }).first().waitFor()
  const bar = page.getByRole('progressbar')
  expect((await bar.getAttribute('aria-valuenow')) === '35', 'progress is 7 of 20 registrants, 35 percent')
  const last = page.locator('.bump')
  await last.waitFor()
  expect(/ณัฐวุฒิ/.test(await last.innerText()), 'latest scan is the newest credit')
  const qr = page.getByRole('link', { name: 'แสดง QR รับชั่วโมง' })
  expect((await qr.count()) === 1, 'one live card with one QR button')
  expect((await qr.getAttribute('href')).endsWith('/sup/a/test-blood?qr=1'), 'QR button opens Manage with the QR revealed')
  const qrBox = await qr.boundingBox()
  expect(qrBox.height >= 56, `QR button is ${qrBox.height}px tall`)

  // Groups, in order, with counts.
  const headings = await page.getByRole('heading', { level: 2 }).allInnerTexts()
  const text = headings.map((h) => h.replace(/\s+/g, ' ').trim())
  expect(text.includes('รอดำเนินการ 2'), `to-do group is "รอดำเนินการ 2", got ${text.join(' | ')}`)
  expect(text.includes('กิจกรรมที่จะจัดขึ้น 2'), 'upcoming group has 2')
  expect(text.includes('ส่งรายชื่อแล้ว 1'), 'sent group has 1')
  expect(text.some((t) => /^ปีการศึกษา \d{4}$/.test(t)), 'academic-year block')
  expect(text.indexOf('รอดำเนินการ 2') < text.indexOf('กิจกรรมที่จะจัดขึ้น 2'), 'to-do comes before upcoming')

  const ended = page.getByRole('link', { name: /เก็บขยะริมแม่น้ำน่าน/ })
  expect((await ended.count()) === 1, 'the ended activity appears once')
  await ended.getByText('รอตรวจสอบ', { exact: true }).waitFor()
  await ended.getByText('3 คนได้รับชั่วโมงแล้ว').waitFor()
  const submit = page.getByRole('link', { name: /ปลูกป่าชายเลน/ })
  await submit.getByText('รอส่งรายชื่อ', { exact: true }).waitFor()
  await submit.getByText(/^ส่งภายใน \d+ [^ ]+ อีก \d+ วัน$/).waitFor()
  const later = page.getByRole('link', { name: /ครั้งที่ 3\/2569/ })
  await later.getByText('เปิดรับสมัคร', { exact: true }).waitFor()
  await later.getByText('ลงทะเบียน 182 จาก 300 คน').waitFor()
  const soon = page.getByRole('link', { name: /ทาสีรั้วโรงเรียนบ้านท่าโพธิ์/ })
  await soon.getByText('ยังไม่เปิดรับ', { exact: true }).waitFor()
  await soon.getByText(/^เปิดรับ \d+ [^ ]+ \d\d:\d\d น\.$/).waitFor()

  // The sent group is folded until opened.
  const sentToggle = page.getByRole('button', { name: /^ส่งรายชื่อแล้ว 1/ })
  expect((await sentToggle.getAttribute('aria-expanded')) === 'false', 'sent group starts folded')
  expect((await page.getByRole('link', { name: /ทาสีอาคารเรียนโรงเรียนวัดจันทร์/ }).count()) === 0, 'sent rows are hidden while folded')

  // Year tiles: no total hours anywhere, KPI is a percent.
  await page.getByText('เข้าร่วมจริง', { exact: true }).waitFor()
  await page.getByText(/^\d+%$/).waitFor()
  expect((await page.getByRole('link', { name: /^ดูสถิติทั้งหมด/ }).getAttribute('href')).endsWith('#/sup/overview'), 'see-all link goes to /sup/overview')
  const body = await page.locator('main').innerText()
  expect(!/[·—]/.test(body), 'no middle dot or em-dash on screen')
  expect(!/ชั่วโมงรวม/.test(body), 'no total hours figure')
  expect(!body.includes('ต้องทำต่อ') && !body.includes('คนได้ชั่วโมง'), 'old wording is gone')

  // Light "สร้างกิจกรรม" pill, bottom right, with the safe-area gap.
  const create = page.getByRole('link', { name: 'สร้างกิจกรรม' })
  expect((await create.getAttribute('href')).endsWith('#/sup/new'), 'create button links to /sup/new')
  const box = await create.boundingBox()
  expect(Math.round(box.height) === 56 && box.width > 56, `create pill is ${box.width}x${box.height}`)
  expect(box.x + box.width <= 390 && box.y + box.height <= 844 && box.x + box.width >= 370, 'create pill sits in the bottom-right corner')
  const bg = await create.evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(bg !== 'rgb(232, 89, 12)' && bg !== 'rgb(204, 72, 14)', `create pill is not orange (${bg})`)

  await noOverflow('home')
  await page.waitForTimeout(1300) // rise, count-up and ring finish
  await shot(page, 'sup-home-top', { viewport: true })
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(300)
  await shot(page, 'sup-home-lower', { viewport: true })
  await page.evaluate(() => scrollTo(0, 0))

  await sentToggle.click()
  await page.getByRole('link', { name: /ทาสีอาคารเรียนโรงเรียนวัดจันทร์/ }).getByText('ส่งรายชื่อแล้ว', { exact: true }).waitFor()
  await noOverflow('home with the sent group open')

  // Menu: logout is still reachable.
  await page.getByRole('button', { name: 'เมนู' }).click()
  const menu = page.getByRole('dialog', { name: 'เมนู' })
  await menu.getByRole('button', { name: 'ออกจากระบบ' }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })

  // Two columns from 900px: live card and year block on the left, the lists on the right.
  await page.setViewportSize({ width: 1100, height: 800 })
  await page.waitForTimeout(300)
  const left = await qr.boundingBox()
  const right = await ended.boundingBox()
  expect(right.x > left.x + left.width - 1, `lists sit right of the live card (${left.x}..${left.x + left.width} vs ${right.x})`)
  await page.setViewportSize({ width: 390, height: 844 })

  // A list row opens the manage page.
  await ended.click()
  await page.getByRole('heading', { name: 'เก็บขยะริมแม่น้ำน่าน' }).waitFor()

  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
