// /sup/overview (dark, 390x844): back button, tabs ปฏิทิน and สถิติ, the calendar (Sunday first, stage-coloured dots, only busy days
// tappable, today's list picked by default) and the statistics (turn-up ring, three counts, 12 monthly bars, this month).
// Screenshots: scripts/e2e/out/sup-overview-calendar.png and sup-overview-stats.png.
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
  await page.getByRole('link', { name: 'ปฏิทินและสถิติ' }).click()
  await page.getByRole('heading', { name: 'ภาพรวมกิจกรรม' }).waitFor()

  // Tabs.
  const tabs = page.getByRole('tablist', { name: 'มุมมอง' })
  expect((await tabs.getByRole('tab').count()) === 2, 'two tabs')
  expect((await tabs.getByRole('tab', { name: 'ปฏิทิน' }).getAttribute('aria-selected')) === 'true', 'calendar tab is first and selected')
  const back = page.getByRole('link', { name: 'กลับหน้าแรก' })
  const backBox = await back.boundingBox()
  expect(Math.round(backBox.width) === 44 && Math.round(backBox.height) === 44, `back button is ${backBox.width}x${backBox.height}`)

  // Calendar: Sunday first, month title with its count, today outlined with the day's list already open.
  const heads = await page.locator('[aria-label="ปฏิทินกิจกรรม"] .grid-cols-7').first().innerText()
  expect(heads.replace(/\s+/g, ' ').startsWith('อา จ อ พ พฤ ศ ส'), `weekday row is ${heads}`)
  await page.getByRole('heading', { name: /^(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม) \d{4}$/ }).waitFor()
  await page.getByText(/^\d+ กิจกรรม$/).first().waitFor()
  const today = new Date().getDate()
  const todayCell = page.getByRole('button', { name: new RegExp(`^วันที่ ${today} .* มี \\d+ กิจกรรม$`) })
  expect((await todayCell.getAttribute('aria-pressed')) === 'true', 'today is selected by default')
  const cellBox = await todayCell.boundingBox()
  expect(Math.round(cellBox.height) === 46, `day cell is ${cellBox.height}px tall`)
  await page.getByRole('heading', { name: /^วันที่ \d+ .* \d{4}$/ }).waitFor()
  const list = page.locator('main ul').first()
  const live = page.getByRole('link', { name: /บริจาคโลหิต ครั้งที่ 2\/2569/ })
  await live.getByText('กำลังดำเนินการ', { exact: true }).waitFor()
  expect((await live.getAttribute('href')).endsWith('/sup/a/test-blood'), 'day row links to the manage page')
  expect(/\d\d:\d\d ถึง \d\d:\d\d น\./.test(await live.innerText()), 'row shows the time range')

  // Only days with an activity are enabled.
  const enabled = await page.locator('[aria-label="ปฏิทินกิจกรรม"] button[aria-pressed]').count()
  const disabled = await page.locator('[aria-label="ปฏิทินกิจกรรม"] button[disabled]').count()
  expect(enabled >= 1 && disabled >= 20, `${enabled} busy days and ${disabled} disabled days`)
  expect(list !== null, 'list rendered')

  await noOverflow('calendar')
  await page.waitForTimeout(1000)
  await shot(page, 'sup-overview-calendar', { viewport: true })

  // Tapping the selected day clears it; another month starts with no day picked.
  await todayCell.click()
  await page.getByText('แตะวันที่มีจุดเพื่อดูกิจกรรม').waitFor()
  await todayCell.click()
  await page.getByRole('heading', { name: /^วันที่ \d+ .* \d{4}$/ }).waitFor()
  await page.getByRole('button', { name: 'เดือนถัดไป' }).click()
  await page.getByText('แตะวันที่มีจุดเพื่อดูกิจกรรม').waitFor()
  await page.getByRole('button', { name: 'เดือนก่อน' }).click()

  // Statistics.
  await page.getByRole('tab', { name: 'สถิติ' }).click()
  expect((await tabs.getByRole('tab', { name: 'สถิติ' }).getAttribute('aria-selected')) === 'true', 'stats tab selected')
  await page.getByRole('heading', { name: /^ปีการศึกษา \d{4}$/ }).waitFor()
  await page.getByText(/^1 พ\.ค\. \d{4} ถึง 30 เม\.ย\. \d{4}$/).waitFor()
  await page.getByText('เข้าร่วมจริงเทียบจำนวนที่รับ').waitFor()
  await page.getByText(/^นับเฉพาะกิจกรรมที่จบแล้วและจำกัดจำนวน \d+ กิจกรรม$/).waitFor()
  await page.getByRole('img', { name: /^เข้าร่วมจริง ร้อยละ \d+$/ }).waitFor()
  for (const t of ['กิจกรรม', 'ผู้ลงทะเบียน', 'ผู้ได้รับชั่วโมง']) await page.getByText(t, { exact: true }).first().waitFor()
  const chart = page.getByRole('img', { name: /^ผู้ได้รับชั่วโมงรายเดือน / })
  await chart.waitFor()
  expect((await chart.locator('.bar-grow').count()) === 12, 'twelve monthly bars')
  const monthNames = await chart.locator('.grid-cols-12').nth(1).innerText()
  expect(monthNames.replace(/\s+/g, ' ').trim().startsWith('พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค. ม.ค. ก.พ. มี.ค. เม.ย.'), `months run May to April, got ${monthNames}`)
  await page.getByRole('heading', { name: 'เดือนนี้' }).waitFor()
  for (const t of ['กิจกรรมที่จัดแล้ว', 'กิจกรรมที่จะจัดขึ้น', 'ผู้ได้รับชั่วโมง', 'รายชื่อที่ยังไม่ส่งศูนย์จิตอาสา']) await page.getByText(t, { exact: true }).first().waitFor()
  await page.getByText(/^\d+ กิจกรรม$/).last().waitFor()
  const body = await page.locator('main').innerText()
  expect(!/[·—]/.test(body), 'no middle dot or em-dash')
  expect(!/ชั่วโมงรวม/.test(body), 'no total hours figure')
  await noOverflow('stats')
  await page.waitForTimeout(1500) // ring fills and bars grow
  await shot(page, 'sup-overview-stats', { viewport: true })
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(200)
  await noOverflow('stats scrolled')

  // Back to the home page.
  await page.evaluate(() => scrollTo(0, 0))
  await back.click()
  await page.getByText('ผู้ดูแล พี่เต้').waitFor()

  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
