// The other three supervisor tabs (dark, 390x844): /sup/calendar (title, Sunday-first calendar with stage-coloured dots, only busy days
// tappable, today's list picked by default, 48px posters in the day list), /sup/stats (title, turn-up ring, three counts, 12 monthly
// bars, this month), /sup/me (account card, install card, sign out). Also: the tab bar moves the active tab, /sup/overview redirects
// to the calendar, and a signed-out visit to a tab goes to the login page.
// Screenshots: scripts/e2e/out/sup-calendar.png, sup-stats.png, sup-me.png.
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
  const tab = (name) => page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('link', { name })
  const h1 = async (name) => {
    const h = page.getByRole('heading', { level: 1, name })
    await h.waitFor()
    const size = await h.evaluate((e) => getComputedStyle(e).fontSize)
    expect(size === '26px', `title "${name}" is ${size}`)
  }

  // Signed out: a tab sends you to the login page.
  await page.goto(`${base}#/sup/stats`)
  await page.getByLabel('ชื่อผู้ดูแล').waitFor()
  expect(page.url().endsWith('#/sup/login'), `signed-out visit lands on ${page.url()}`)

  await seedSupHome(page, base)
  await loginAsSup(page)

  // The old link keeps working.
  await page.goto(`${base}#/sup/overview`)
  await h1('ปฏิทิน')
  expect(page.url().endsWith('#/sup/calendar'), `/sup/overview redirects to ${page.url()}`)
  expect((await tab('ปฏิทิน').getAttribute('aria-current')) === 'page', 'calendar tab is current')
  expect((await tab('กิจกรรม').getAttribute('aria-current')) === null, 'home tab is not current')

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
  const live = page.getByRole('link', { name: /บริจาคโลหิต ครั้งที่ 2\/2569/ })
  await live.getByText('กำลังดำเนินการ', { exact: true }).waitFor()
  expect((await live.getAttribute('href')).endsWith('/sup/a/test-blood'), 'day row links to the manage page')
  expect(/\d\d:\d\d ถึง \d\d:\d\d น\./.test(await live.innerText()), 'row shows the time range')
  const thumb = await live.locator('img').boundingBox()
  expect(Math.round(thumb.width) === 48 && Math.round(thumb.height) === 48, `day row poster is ${thumb.width}x${thumb.height}`)
  await page.waitForFunction(() => [...document.querySelectorAll('main ul img')].every((i) => i.complete && i.naturalWidth > 0))

  // Only days with an activity are enabled.
  const enabled = await page.locator('[aria-label="ปฏิทินกิจกรรม"] button[aria-pressed]').count()
  const disabled = await page.locator('[aria-label="ปฏิทินกิจกรรม"] button[disabled]').count()
  expect(enabled >= 1 && disabled >= 20, `${enabled} busy days and ${disabled} disabled days`)

  await noOverflow('calendar')
  await page.waitForTimeout(1000)
  await shot(page, 'sup-calendar', { viewport: true })

  // Tapping the selected day clears it; another month starts with no day picked.
  await todayCell.click()
  await page.getByText('แตะวันที่มีจุดเพื่อดูกิจกรรม').waitFor()
  await todayCell.click()
  await page.getByRole('heading', { name: /^วันที่ \d+ .* \d{4}$/ }).waitFor()
  await page.getByRole('button', { name: 'เดือนถัดไป' }).click()
  await page.getByText('แตะวันที่มีจุดเพื่อดูกิจกรรม').waitFor()
  await page.getByRole('button', { name: 'เดือนก่อน' }).click()

  // Statistics.
  await tab('สถิติ').click()
  await h1('สถิติ')
  expect(page.url().endsWith('#/sup/stats'), 'stats tab opens /sup/stats')
  expect((await tab('สถิติ').getAttribute('aria-current')) === 'page', 'stats tab is current')
  const pill = await tab('สถิติ').locator('span').first().boundingBox()
  expect(Math.round(pill.width) === 56 && Math.round(pill.height) === 30, `active pill is ${pill.width}x${pill.height}`)
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
  const body = await page.locator('main').innerText()
  expect(!/[·—]/.test(body), 'no middle dot or em-dash')
  expect(!/ชั่วโมงรวม/.test(body), 'no total hours figure')
  await noOverflow('stats')
  await page.waitForTimeout(1500) // ring fills and bars grow
  await shot(page, 'sup-stats', { viewport: true })
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(200)
  await noOverflow('stats scrolled')
  const lastRow = await page.getByText('รายชื่อที่ยังไม่ส่งศูนย์จิตอาสา', { exact: true }).boundingBox()
  const navTop = (await page.getByRole('navigation', { name: 'เมนูหลัก' }).boundingBox()).y
  expect(lastRow.y + lastRow.height <= navTop, 'the last statistics row scrolls clear of the tab bar')
  await page.evaluate(() => scrollTo(0, 0))

  // Account.
  await tab('บัญชี').click()
  await h1('บัญชี')
  expect(page.url().endsWith('#/sup/me'), 'account tab opens /sup/me')
  expect((await tab('บัญชี').getAttribute('aria-current')) === 'page', 'account tab is current')
  const emblem = await page.getByAltText('ตรามหาวิทยาลัยนเรศวร').boundingBox()
  expect(Math.round(emblem.width) === 72, `account emblem is ${emblem.width}px`)
  await page.getByRole('heading', { level: 2, name: 'ศูนย์จิตอาสา กองกิจการนิสิต' }).waitFor()
  await page.getByText('ผู้ดูแล พี่เต้', { exact: true }).waitFor()
  expect((await page.getByText('เห็นกิจกรรมทุกหน่วยงาน').count()) === 0, 'the all-organisations tag is for admins only')
  await page.getByText('ติดตั้งแอปลงเครื่อง').waitFor()
  const out = page.getByRole('button', { name: 'ออกจากระบบ' })
  const outBox = await out.boundingBox()
  expect(outBox.height >= 56 && outBox.width >= 340, `sign-out row is ${outBox.width}x${outBox.height}`)
  expect((await out.evaluate((e) => getComputedStyle(e).color)) === 'rgb(242, 122, 110)', 'sign-out text is the danger colour')
  const meBody = await page.locator('main').innerText()
  expect(!/[·—]/.test(meBody), 'no middle dot or em-dash on the account page')
  await noOverflow('account')
  await page.waitForTimeout(900)
  await shot(page, 'sup-me', { viewport: true })

  // Sign out: back to the login page, and a tab no longer opens.
  await out.click()
  await page.getByLabel('ชื่อผู้ดูแล').waitFor()
  expect(page.url().endsWith('#/sup/login'), `sign-out lands on ${page.url()}`)
  await page.goto(`${base}#/sup/me`)
  await page.getByLabel('ชื่อผู้ดูแล').waitFor()

  // An admin sees the extra tag.
  await page.getByLabel('ชื่อผู้ดูแล').fill('พี่แอดมิน')
  await page.getByLabel('รหัส', { exact: true }).fill('NUADMIN')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.getByText('ผู้ดูแล พี่แอดมิน').waitFor()
  await tab('บัญชี').click()
  await page.getByText('เห็นกิจกรรมทุกหน่วยงาน', { exact: true }).waitFor()

  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
