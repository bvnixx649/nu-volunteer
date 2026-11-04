// Supervisor home, the first of four tabs (dark, 390x844). With an activity running: header without buttons, the poster-first live
// card with the latest scan and the QR button, "รอดำเนินการ" rows with poster thumbnails, three big poster cards and compact rows
// under "กิจกรรมที่จะจัดขึ้น", the folded "ส่งรายชื่อแล้ว", the floating "สร้างกิจกรรม" above the tab bar. With nothing running: the
// nearest upcoming activity as the hero card. The tab bar shows on this page and not on sub-pages.
// Screenshots: scripts/e2e/out/sup-home-live.png, sup-home-upcoming.png, sup-home-idle.png.
import { loginAsSup, seedSupHome } from '../lib/sup-fixture.mjs'

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const H = 3600_000
const DAY = 24 * H

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
  /** Scrolls the whole page once so lazy images load, then checks that every poster decoded. Returns how many posters there are. */
  const postersLoaded = async (label) => {
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 400) {
        scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 60))
      }
      scrollTo(0, 0)
    })
    await page.waitForFunction(() => [...document.querySelectorAll('main img[alt=""]')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 }).catch(() => {})
    const r = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('main img[alt=""]')]
      return { n: imgs.length, broken: imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).length }
    })
    expect(r.broken === 0, `${label}: ${r.broken} of ${r.n} posters did not load`)
    return r.n
  }

  await seedSupHome(page, base)
  // Two more upcoming activities, so the list has three big cards and one compact row, and one of them is a bottle exchange.
  await page.evaluate(
    ([H, DAY]) => {
      const db = JSON.parse(localStorage.getItem('nuv:db'))
      const now = Date.now()
      const later = db.activities['test-later']
      db.activities['test-up-a'] = { ...later, id: 'test-up-a', title: 'จัดสถานที่งานลอยกระทง มน.', start: now + 12 * DAY, end: now + 12 * DAY + 5 * H, regCount: 0, capLimit: false }
      db.activities['test-up-b'] = { ...later, id: 'test-up-b', title: 'แลกขวดพลาสติก รอบเดือนธันวาคม', start: now + 14 * DAY, end: now + 14 * DAY + 6 * H, regCount: 0, capLimit: false, itemsPerHour: 10, hours: 3 }
      localStorage.setItem('nuv:db', JSON.stringify(db))
    },
    [H, DAY],
  )
  await page.reload()
  await loginAsSup(page)

  // Header: emblem 44px, org line, supervisor name. No calendar button and no menu button any more.
  await page.getByRole('heading', { level: 1, name: 'ศูนย์จิตอาสา กองกิจการนิสิต' }).waitFor()
  const emblem = await page.getByAltText('ตรามหาวิทยาลัยนเรศวร').boundingBox()
  expect(Math.round(emblem.width) === 44, `emblem is ${emblem.width}px`)
  expect((await page.getByRole('link', { name: 'ปฏิทินและสถิติ' }).count()) === 0, 'no calendar link in the header')
  expect((await page.getByRole('button', { name: 'เมนู' }).count()) === 0, 'no menu button in the header')

  // Tab bar: four tabs, the first one current, every target at least 44px.
  const nav = page.getByRole('navigation', { name: 'เมนูหลัก' })
  const tabs = nav.getByRole('link')
  expect((await tabs.count()) === 4, 'four tabs')
  expect((await tabs.allInnerTexts()).map((t) => t.trim()).join('|') === 'กิจกรรม|ปฏิทิน|สถิติ|บัญชี', 'tab labels')
  const hrefs = await tabs.evaluateAll((els) => els.map((e) => e.getAttribute('href')))
  expect(hrefs.join('|') === '#/sup|#/sup/calendar|#/sup/stats|#/sup/me', `tab links are ${hrefs.join('|')}`)
  expect((await tabs.nth(0).getAttribute('aria-current')) === 'page', 'first tab is current')
  expect((await tabs.nth(1).getAttribute('aria-current')) === null, 'second tab is not current')
  for (let i = 0; i < 4; i++) {
    const b = await tabs.nth(i).boundingBox()
    expect(b.height >= 44 && b.width >= 44, `tab ${i} is ${b.width}x${b.height}`)
  }
  const navBox = await nav.boundingBox()
  expect(Math.round(navBox.y + navBox.height) === 844, 'tab bar sits at the bottom edge')

  // Live card: poster first (links to the manage page), the pill, title with place and hours, count, bar, latest scan, QR button.
  const live = page.locator('section[aria-label="กำลังดำเนินการ"]')
  const posterLink = live.locator('a[href$="/sup/a/test-blood"]').first()
  const posterBox = await posterLink.boundingBox()
  expect(Math.round(posterBox.height) === 176, `live poster is ${posterBox.height}px tall`)
  await live.getByText(/^กำลังดำเนินการ ถึง \d\d:\d\d น\.$/).waitFor()
  await live.getByText(/ชั่วโมงต่อคน/).waitFor()
  await live.getByText('ได้รับชั่วโมงแล้ว', { exact: true }).waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('[data-value]')].some((e) => e.textContent === '7'))
  await live.getByText(/^จากผู้ลงทะเบียน 20 คน$/).waitFor()
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

  // Groups, in order, with counts. The year statistics are on the สถิติ tab now.
  const headings = await page.getByRole('heading', { level: 2 }).allInnerTexts()
  const text = headings.map((h) => h.replace(/\s+/g, ' ').trim())
  expect(text.includes('รอดำเนินการ 2'), `to-do group is "รอดำเนินการ 2", got ${text.join(' | ')}`)
  expect(text.includes('กิจกรรมที่จะจัดขึ้น 4'), `upcoming group has 4, got ${text.join(' | ')}`)
  expect(text.includes('ส่งรายชื่อแล้ว 1'), 'sent group has 1')
  expect(text.indexOf('รอดำเนินการ 2') < text.indexOf('กิจกรรมที่จะจัดขึ้น 4'), 'to-do comes before upcoming')
  expect(!text.some((t) => /^ปีการศึกษา/.test(t)), 'no year statistics on the home page')
  expect((await page.getByRole('link', { name: /^ดูสถิติทั้งหมด/ }).count()) === 0, 'no see-all-statistics link')

  // To-do rows: 64px poster thumbnail, tag and one short line.
  const ended = page.getByRole('link', { name: /เก็บขยะริมแม่น้ำน่าน/ })
  expect((await ended.count()) === 1, 'the ended activity appears once')
  await ended.getByText('รอตรวจสอบ', { exact: true }).waitFor()
  await ended.getByText('ได้รับชั่วโมง 3 คน').waitFor()
  const thumb = await ended.locator('img').boundingBox()
  expect(Math.round(thumb.width) === 64 && Math.round(thumb.height) === 64, `row poster is ${thumb.width}x${thumb.height}`)
  const submit = page.getByRole('link', { name: /ปลูกป่าชายเลน/ })
  await submit.getByText('รอส่งรายชื่อ', { exact: true }).waitFor()
  await submit.getByText(/^อีก \d+ วัน$/).waitFor()

  // Upcoming: the first three are poster cards with a status chip on the photo, the fourth is a compact row with the date on its poster.
  const later = page.getByRole('link', { name: /ครั้งที่ 3\/2569/ })
  expect((await later.count()) === 1, 'the nearest upcoming activity appears once while something is live')
  await later.getByText('เปิดรับสมัคร', { exact: true }).waitFor()
  await later.getByText('ลงทะเบียนแล้ว 182 จาก 300 คน').waitFor()
  await later.getByText('เหลือ 118 ที่').waitFor()
  expect((await later.getByRole('img', { name: 'ลงทะเบียนแล้ว 182 จาก 300 คน' }).count()) === 1, 'seat bar on a limited activity')
  const bigPoster = await later.locator('img').boundingBox()
  expect(Math.round(bigPoster.height) === 176, `big card poster is ${bigPoster.height}px tall`)
  const soon = page.getByRole('link', { name: /ทาสีรั้วโรงเรียนบ้านท่าโพธิ์/ })
  await soon.getByText('ยังไม่เปิดรับ', { exact: true }).waitFor()
  await soon.getByText(/^เปิดรับ \d+ [^ ]+ \d\d:\d\d น\.$/).waitFor()
  const flag = page.getByRole('link', { name: /จัดสถานที่งานลอยกระทง/ })
  expect((await flag.getByRole('img').count()) === 0, 'no seat bar when the activity does not limit its numbers')
  await flag.getByText('ลงทะเบียนแล้ว 0 คน').waitFor()
  const bottle = page.getByRole('link', { name: /แลกขวดพลาสติก รอบเดือนธันวาคม/ })
  await bottle.getByText('10 ขวด = 1 ชั่วโมง').waitFor()
  expect((await bottle.locator('img').count()) === 1, 'the compact row has a poster')
  const small = await bottle.locator('img').boundingBox()
  expect(Math.round(small.width) === 64, `compact row poster is ${small.width}px`)
  expect((await bottle.getByText(/^\d+$/).count()) === 1, 'day number on the compact row poster')

  // The sent group is folded until opened.
  const sentToggle = page.getByRole('button', { name: /^ส่งรายชื่อแล้ว 1/ })
  expect((await sentToggle.getAttribute('aria-expanded')) === 'false', 'sent group starts folded')
  expect((await page.getByRole('link', { name: /ทาสีอาคารเรียนโรงเรียนวัดจันทร์/ }).count()) === 0, 'sent rows are hidden while folded')

  const body = await page.locator('main').innerText()
  expect(!/[·—]/.test(body), 'no middle dot or em-dash on screen')
  expect(!/ชั่วโมงรวม/.test(body), 'no total hours figure')

  // Posters all load (the lazy ones too).
  const posters = await postersLoaded('home')
  expect(posters >= 7, `${posters} poster images on home`)

  // Floating "สร้างกิจกรรม": light pill, bottom right, above the tab bar.
  const create = page.getByRole('link', { name: 'สร้างกิจกรรม' })
  expect((await create.getAttribute('href')).endsWith('#/sup/new'), 'create button links to /sup/new')
  const box = await create.boundingBox()
  expect(Math.round(box.height) === 56 && box.width > 56, `create pill is ${box.width}x${box.height}`)
  expect(box.x + box.width <= 390 && box.x + box.width >= 370, 'create pill sits at the right')
  expect(box.y + box.height <= navBox.y, `create pill (bottom ${box.y + box.height}) sits above the tab bar (top ${navBox.y})`)
  const bg = await create.evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(bg !== 'rgb(232, 89, 12)' && bg !== 'rgb(204, 72, 14)', `create pill is not orange (${bg})`)

  await noOverflow('home')
  await page.waitForTimeout(1300) // rise, count-up and seat bars finish
  await shot(page, 'sup-home-live', { viewport: true })
  await page.getByRole('heading', { name: /^กิจกรรมที่จะจัดขึ้น/ }).evaluate((e) => scrollTo(0, e.getBoundingClientRect().top + scrollY - 70))
  await page.waitForTimeout(900)
  await shot(page, 'sup-home-upcoming', { viewport: true })
  // A computer screen keeps one centred column and the tab bar.
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(400)
  await shot(page, 'sup-home-desktop', { viewport: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(300)
  const mainBottom = await page.locator('main').evaluate((e) => e.getBoundingClientRect().bottom)
  expect(mainBottom <= navBox.y + 120, 'end of the page can scroll clear of the tab bar')
  await page.evaluate(() => scrollTo(0, 0))

  await sentToggle.click()
  const sent = page.getByRole('link', { name: /ทาสีอาคารเรียนโรงเรียนวัดจันทร์/ })
  await sent.getByText('ส่งรายชื่อแล้ว', { exact: true }).waitFor()
  await sent.getByText(/^ส่งแล้ว \d+ [^ ]+ \d{4}$/).waitFor()
  const sentThumb = await sent.locator('img').boundingBox()
  expect(Math.round(sentThumb.width) === 48, `sent row poster is ${sentThumb.width}px`)
  await noOverflow('home with the sent group open')

  // A row opens the manage page, which has no tab bar.
  await ended.click()
  await page.getByRole('heading', { name: 'เก็บขยะริมแม่น้ำน่าน' }).waitFor()
  expect((await page.getByRole('navigation', { name: 'เมนูหลัก' }).count()) === 0, 'no tab bar on /sup/a/:id')
  await page.goto(`${base}#/sup/new`)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  expect((await page.getByRole('navigation', { name: 'เมนูหลัก' }).count()) === 0, 'no tab bar on /sup/new')

  // Nothing running: the blood drive moves to the far future and the nearest activity becomes the hero card.
  await page.goto(`${base}#/sup`)
  await page.evaluate(
    ([DAY, H]) => {
      const db = JSON.parse(localStorage.getItem('nuv:db'))
      const now = Date.now()
      Object.assign(db.activities['test-blood'], { start: now + 16 * DAY, end: now + 16 * DAY + 7 * H, creditCount: 0 })
      localStorage.setItem('nuv:db', JSON.stringify(db))
    },
    [DAY, H],
  )
  await page.reload()
  const hero = page.locator('section[aria-label="กิจกรรมถัดไป"]')
  await hero.waitFor()
  expect((await page.locator('section[aria-label="กำลังดำเนินการ"]').count()) === 0, 'no live card when nothing is running')
  expect((await page.getByRole('progressbar').count()) === 0, 'no progress bar when nothing is running')
  await hero.getByText('อีก 2 วัน', { exact: true }).waitFor()
  await hero.getByText('บริจาคโลหิต ครั้งที่ 3/2569').waitFor()
  await hero.getByText('เปิดรับสมัคร', { exact: true }).waitFor()
  await hero.getByText('ลงทะเบียนแล้ว 182 จาก 300 คน').waitFor()
  await hero.getByText('เหลือ 118 ที่').waitFor()
  const heroPoster = await hero.locator('img').boundingBox()
  expect(Math.round(heroPoster.height) === 220, `hero poster is ${heroPoster.height}px tall`)
  expect((await hero.locator('a').getAttribute('href')).endsWith('/sup/a/test-later'), 'hero opens the activity')
  expect((await page.getByRole('link', { name: /ครั้งที่ 3\/2569/ }).count()) === 1, 'the hero is not repeated in the upcoming list')
  const idleHeads = (await page.getByRole('heading', { level: 2 }).allInnerTexts()).map((h) => h.replace(/\s+/g, ' ').trim())
  expect(idleHeads.includes('กิจกรรมที่จะจัดขึ้น 4'), `upcoming count leaves the hero out, got ${idleHeads.join(' | ')}`)
  await postersLoaded('idle home')
  await noOverflow('idle home')
  await page.waitForTimeout(1300)
  await shot(page, 'sup-home-idle', { viewport: true })

  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
