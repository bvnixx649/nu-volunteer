// The other supervisor tabs (dark, 390x844): /sup/calendar (title, Sunday-first calendar with stage-coloured dots, only busy days
// tappable, today's list picked by default, 48px posters in the day list), /sup/list (ended activities under month headings, the
// segmented filter, the empty state), /sup/me (account card, the statistics card with three numbers and its link, install card, sign out),
// /sup/stats (opened from the account, with a back control, the account tab stays highlighted there; title, turn-up ring, three counts,
// 12 monthly bars, this month). Also: the tab bar moves the active tab, /sup/overview redirects to the calendar, and a signed-out visit
// to a tab goes to the login page.
// Screenshots: scripts/e2e/out/sup-calendar.png, sup-list.png, sup-me.png, sup-stats.png.
import { loginAsSup, seedSupHome } from '../lib/sup-fixture.mjs'

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const MONTH_HEADING = /^(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม) \d{4}$/

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
  const tab = (name) => page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('link', { name, exact: true })
  const h1 = async (name) => {
    const h = page.getByRole('heading', { level: 1, name })
    await h.waitFor()
    const size = await h.evaluate((e) => getComputedStyle(e).fontSize)
    expect(size === '28px', `title "${name}" is ${size}`)
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
  expect((await tab('สถิติ').count()) === 0, 'there is no statistics tab')

  // Calendar: Sunday first, month title with its count, today outlined with the day's list already open.
  const heads = await page.locator('[aria-label="ปฏิทินกิจกรรม"] .grid-cols-7').first().innerText()
  expect(heads.replace(/\s+/g, ' ').startsWith('อา จ อ พ พฤ ศ ส'), `weekday row is ${heads}`)
  await page.getByRole('heading', { name: MONTH_HEADING }).waitFor()
  await page
    .getByText(/^\d+ กิจกรรม$/)
    .first()
    .waitFor()
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

  // List tab: the ended activities (closing, sent, recorded), newest first under month headings. Future ones are not here.
  await tab('รายการ').click()
  await h1('รายการ')
  expect(page.url().endsWith('#/sup/list'), 'list tab opens /sup/list')
  expect((await tab('รายการ').getAttribute('aria-current')) === 'page', 'list tab is current')
  const seg = page.getByRole('radiogroup', { name: 'กรองรายการ' })
  const rowsOf = () => page.locator('main a[href*="/sup/a/"]')
  await page.getByRole('heading', { level: 2, name: MONTH_HEADING }).first().waitFor()
  expect((await rowsOf().count()) === 3, `three ended activities, got ${await rowsOf().count()}`)
  const ended = page.getByRole('link', { name: /เก็บขยะริมแม่น้ำน่าน/ })
  await ended.getByText('รอตรวจสอบ', { exact: true }).waitFor()
  await ended.getByText(/^\d+ คน \d+(\.\d)? ชั่วโมงต่อคน$/).waitFor()
  const endedThumb = await ended.locator('img').boundingBox()
  expect(Math.round(endedThumb.width) === 56 && Math.round(endedThumb.height) === 56, `list poster is ${endedThumb.width}x${endedThumb.height}`)
  expect((await page.getByRole('link', { name: /ครั้งที่ 3\/2569/ }).count()) === 0, 'future activities are not on the list')
  const sentRow = page.getByRole('link', { name: /ทาสีอาคารเรียนโรงเรียนวัดจันทร์/ })
  await sentRow.getByText('ส่งรายชื่อแล้ว', { exact: true }).waitFor()
  await seg.getByRole('radio', { name: 'รอบันทึก' }).click()
  expect((await seg.getByRole('radio', { name: 'รอบันทึก' }).getAttribute('aria-checked')) === 'true', 'the waiting filter is chosen')
  expect((await rowsOf().count()) === 1, 'only the roster sent and not recorded')
  await seg.getByRole('radio', { name: 'บันทึกแล้ว' }).click()
  await page.getByText('ยังไม่มีกิจกรรมที่จบแล้ว', { exact: true }).waitFor()
  await noOverflow('list')
  await seg.getByRole('radio', { name: 'ทั้งหมด' }).click()
  await page.waitForTimeout(700)
  await shot(page, 'sup-list', { viewport: true })

  // Account: the statistics card (three numbers, the link to the full page), the install card, the sign-out row.
  await tab('บัญชี').click()
  await h1('บัญชี')
  expect(page.url().endsWith('#/sup/me'), 'account tab opens /sup/me')
  expect((await tab('บัญชี').getAttribute('aria-current')) === 'page', 'account tab is current')
  const emblem = await page.getByAltText('ตรามหาวิทยาลัยนเรศวร').boundingBox()
  expect(Math.round(emblem.width) === 72, `account emblem is ${emblem.width}px`)
  await page.getByRole('heading', { level: 2, name: 'ศูนย์จิตอาสา กองกิจการนิสิต' }).waitFor()
  await page.getByText('ผู้ดูแล พี่เต้', { exact: true }).waitFor()
  expect((await page.getByText('เห็นกิจกรรมทุกหน่วยงาน').count()) === 0, 'the all-organisations tag is for admins only')
  const stats = page.getByRole('region', { name: 'สถิติ' })
  await stats.getByRole('heading', { level: 2, name: 'สถิติ' }).waitFor()
  await stats.getByText(/^ปีการศึกษา \d{4}$/).waitFor()
  for (const t of ['กิจกรรม', 'ผู้ได้รับชั่วโมง', 'เข้าร่วมจริง']) await stats.getByText(t, { exact: true }).waitFor()
  const statsLink = page.getByRole('link', { name: 'ดูสถิติทั้งหมด' })
  expect((await statsLink.getAttribute('href')).endsWith('#/sup/stats'), 'the statistics row links to the full page')
  const linkBox = await statsLink.boundingBox()
  expect(linkBox.height >= 44 && linkBox.width >= 340, `statistics row is ${linkBox.width}x${linkBox.height}`)
  const order = (await page.locator('main').innerText()).indexOf('ติดตั้งแอปลงเครื่อง')
  expect(order > (await page.locator('main').innerText()).indexOf('ดูสถิติทั้งหมด'), 'statistics card sits above the install card')
  await page.getByText('ติดตั้งแอปลงเครื่อง').waitFor()
  const out = page.getByRole('button', { name: 'ออกจากระบบ' })
  const outBox = await out.boundingBox()
  expect(outBox.height >= 56 && outBox.width >= 340, `sign-out row is ${outBox.width}x${outBox.height}`)
  expect((await out.evaluate((e) => getComputedStyle(e).color)) === 'rgb(255, 106, 92)', 'sign-out text is the danger colour')
  const meBody = await page.locator('main').innerText()
  expect(!/[·—]/.test(meBody), 'no middle dot or em-dash on the account page')
  await noOverflow('account')
  await page.waitForTimeout(900)
  await shot(page, 'sup-me', { viewport: true })

  // The statistics page from the account: a back control returns to the account, and the account tab stays highlighted there.
  await statsLink.click()
  await h1('สถิติ')
  expect(page.url().endsWith('#/sup/stats'), 'the link opens /sup/stats')
  await page.waitForTimeout(300) // colour transition
  expect((await tab('บัญชี').evaluate((e) => getComputedStyle(e).color)) === 'rgb(244, 244, 245)', 'the account tab stays white on the statistics page')
  expect((await tab('รายการ').evaluate((e) => getComputedStyle(e).color)) === 'rgb(161, 161, 170)', 'other tabs are muted on the statistics page')
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
  await page.getByRole('button', { name: 'กลับ' }).click()
  await h1('บัญชี')
  expect(page.url().endsWith('#/sup/me'), `back control returns to the account, got ${page.url()}`)

  // Sign out asks first, then goes back to the login page, and a tab no longer opens.
  await out.click()
  const ask = page.getByRole('dialog', { name: 'ออกจากระบบ' })
  await ask.waitFor()
  await page.waitForTimeout(500)
  await shot(page, 'sup-me-signout', { viewport: true })
  await ask.getByRole('button', { name: 'ออกจากระบบ' }).click()
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
