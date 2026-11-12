// Supervisor home, the first of four tabs (dark, 390x844). With an activity running: header, search field and three chips, the poster-first live
// card with the latest scan and the QR button, then the sections "ต้องดำเนินการ" and "จะจัดขึ้น" as compact rows with a day thumbnail and a dots button.
// The dots open a sheet with pin, QR and edit. A pinned activity moves to "ปักหมุด" and only shows there. The chips narrow the sections and the
// search matches titles. The sent rosters are not on the home any more (they are on the list tab). The tab bar shows on this page and not on sub-pages.
// Screenshots: scripts/e2e/out/sup-home-live.png, sup-home-upcoming.png, sup-home-desktop.png, sup-home-idle.png, sup-home-menu.png.
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
  const headings = async () => (await page.getByRole('heading', { level: 2 }).allInnerTexts()).map((h) => h.replace(/\s+/g, ' ').trim())

  await seedSupHome(page, base)
  // Two more upcoming activities, so the list has three rows, and one of them is a bottle exchange (no QR option in its menu).
  await page.evaluate(
    ([H, DAY]) => {
      const db = JSON.parse(localStorage.getItem('nuv:db'))
      const now = Date.now()
      const later = db.activities['test-later']
      db.activities['test-up-a'] = { ...later, id: 'test-up-a', title: 'จัดสถานที่งานลอยกระทง มน.', start: now + 12 * DAY, end: now + 12 * DAY + 5 * H, regCount: 0, capLimit: false }
      db.activities['test-up-b'] = {
        ...later,
        id: 'test-up-b',
        title: 'แลกขวดพลาสติก รอบเดือนธันวาคม',
        start: now + 14 * DAY,
        end: now + 14 * DAY + 6 * H,
        regCount: 0,
        capLimit: false,
        categoryKey: 'bottle',
        itemsPerHour: 10,
        hours: 3,
      }
      localStorage.setItem('nuv:db', JSON.stringify(db))
      localStorage.removeItem('nuv:pins')
    },
    [H, DAY],
  )
  await page.reload()
  await loginAsSup(page)

  // Header: emblem 44px, org line, supervisor name. No calendar button and no menu button any more.
  await page.getByRole('heading', { level: 1, name: 'ศูนย์จิตอาสา กองกิจการนิสิต' }).waitFor()
  const emblem = await page.getByAltText('ตรามหาวิทยาลัยนเรศวร').boundingBox()
  expect(Math.round(emblem.width) === 44, `emblem is ${emblem.width}px`)
  expect((await page.getByRole('button', { name: 'เมนู' }).count()) === 0, 'no menu button in the header')

  // Search field: 16px, placeholder, at least 44px tall.
  const search = page.getByRole('searchbox', { name: 'ค้นหากิจกรรม' })
  expect((await search.getAttribute('placeholder')) === 'ค้นหากิจกรรม', 'search placeholder')
  expect((await search.evaluate((e) => getComputedStyle(e).fontSize)) === '16px', 'search font is 16px')
  const searchBox = await search.boundingBox()
  expect(searchBox.height >= 44, `search field is ${searchBox.height}px tall`)

  // Chips: three, the first one pressed, the counts of the two sections they narrow to.
  const chipAll = page.getByRole('button', { name: 'ทั้งหมด', exact: true })
  const chipTodo = page.getByRole('button', { name: /^ต้องดำเนินการ 2$/ })
  const chipUp = page.getByRole('button', { name: /^จะจัดขึ้น 4$/ })
  expect((await chipAll.getAttribute('aria-pressed')) === 'true', 'the all chip starts pressed')
  expect((await chipTodo.count()) === 1 && (await chipUp.count()) === 1, 'chips show 2 to do and 4 upcoming')
  for (const c of [chipAll, chipTodo, chipUp]) expect((await c.boundingBox()).height >= 44, 'chip is at least 44px tall')

  // Tab bar: four tabs around the create button, the first one current, every target at least 44px.
  const nav = page.getByRole('navigation', { name: 'เมนูหลัก' })
  expect((await nav.getByRole('link').count()) === 5, 'four tabs and the create button')
  const tabs = nav.locator('a:not([aria-label])')
  expect((await tabs.count()) === 4, 'four tabs')
  expect((await tabs.allInnerTexts()).map((t) => t.trim()).join('|') === 'กิจกรรม|รายการ|ปฏิทิน|บัญชี', 'tab labels')
  const hrefs = await tabs.evaluateAll((els) => els.map((e) => e.getAttribute('href')))
  expect(hrefs.join('|') === '#/sup|#/sup/list|#/sup/calendar|#/sup/me', `tab links are ${hrefs.join('|')}`)
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

  // Sections, in order, with counts. The year statistics are on the statistics page; sent rosters are on the list tab.
  const text = await headings()
  expect(text.includes('ต้องดำเนินการ 2'), `to-do section is "ต้องดำเนินการ 2", got ${text.join(' | ')}`)
  expect(text.includes('จะจัดขึ้น 4'), `upcoming section has 4, got ${text.join(' | ')}`)
  expect(text.indexOf('ต้องดำเนินการ 2') < text.indexOf('จะจัดขึ้น 4'), 'to-do comes before upcoming')
  expect(!text.some((t) => /^ส่งรายชื่อแล้ว|^กิจกรรมที่จะจัดขึ้น|^รอดำเนินการ|^ปีการศึกษา/.test(t)), `old headings are gone, got ${text.join(' | ')}`)
  expect(!text.some((t) => /^ปักหมุด/.test(t)), 'no pinned section before anything is pinned')
  expect((await page.getByRole('button', { name: /^ส่งรายชื่อแล้ว/ }).count()) === 0, 'no folded sent group on the home')
  expect((await page.getByRole('link', { name: /ทาสีอาคารเรียนโรงเรียนวัดจันทร์/ }).count()) === 0, 'sent rosters are not on the home')
  expect((await page.getByRole('link', { name: /^ดูสถิติทั้งหมด/ }).count()) === 0, 'no see-all-statistics link on the home')

  // To-do rows: 56px day thumbnail, one-line title, tag and one short line, and a 44px dots button next to the link.
  const ended = page.getByRole('link', { name: /เก็บขยะริมแม่น้ำน่าน/ })
  expect((await ended.count()) === 1, 'the ended activity appears once')
  await ended.getByText('รอตรวจสอบ', { exact: true }).waitFor()
  await ended.getByText('ได้รับชั่วโมง 3 คน').waitFor()
  const thumb = await ended.locator('img').boundingBox()
  expect(Math.round(thumb.width) === 56 && Math.round(thumb.height) === 56, `row poster is ${thumb.width}x${thumb.height}`)
  const dots = page.getByRole('button', { name: 'ตัวเลือกของ เก็บขยะริมแม่น้ำน่าน' })
  const dotsBox = await dots.boundingBox()
  expect(dotsBox.width >= 44 && dotsBox.height >= 44, `dots button is ${dotsBox.width}x${dotsBox.height}`)
  expect((await ended.locator('button').count()) === 0, 'the dots button is not nested inside the row link')
  const submit = page.getByRole('link', { name: /ปลูกป่าชายเลน/ })
  await submit.getByText('ยังไม่ส่งรายชื่อ', { exact: true }).waitFor()
  await submit.getByText(/^อีก \d+ วัน$/).waitFor()

  // Upcoming rows: the status and one line (registrations, when it opens, the bottle rate, or nothing yet).
  const later = page.getByRole('link', { name: /ครั้งที่ 3\/2569/ })
  await later.getByText('เปิดรับสมัคร', { exact: true }).waitFor()
  await later.getByText('ลงทะเบียน 182 จาก 300 คน').waitFor()
  const soon = page.getByRole('link', { name: /ทาสีรั้วโรงเรียนบ้านท่าโพธิ์/ })
  await soon.getByText('ยังไม่เปิดรับ', { exact: true }).waitFor()
  await soon.getByText(/^เปิดรับ \d+ [^ ]+ \d\d:\d\d น\.$/).waitFor()
  const flag = page.getByRole('link', { name: /จัดสถานที่งานลอยกระทง/ })
  await flag.getByText('ลงทะเบียน 0 คน').waitFor()
  const bottle = page.getByRole('link', { name: /แลกขวดพลาสติก รอบเดือนธันวาคม/ })
  await bottle.getByText('10 ขวด = 1 ชั่วโมง').waitFor()
  const small = await bottle.locator('img').boundingBox()
  expect(Math.round(small.width) === 56, `upcoming row poster is ${small.width}px`)
  expect((await bottle.getByText(/^\d+$/).count()) === 1, 'day number on the row poster')

  const body = await page.locator('main').innerText()
  expect(!/[·—]/.test(body), 'no middle dot or em-dash on screen')
  expect(!/ชั่วโมงรวม/.test(body), 'no total hours figure')

  // Posters all load (the lazy ones too).
  const posters = await postersLoaded('home')
  expect(posters >= 7, `${posters} poster images on home`)

  // "สร้างกิจกรรม": one white circle raised in the middle of the tab bar (orange is kept for scanning). Nothing floats over the page.
  const create = page.getByRole('link', { name: 'สร้างกิจกรรม' })
  expect((await create.count()) === 1, 'one create button on the page')
  expect((await nav.getByRole('link', { name: 'สร้างกิจกรรม' }).count()) === 1, 'the create button is in the tab bar')
  expect((await create.getAttribute('href')).endsWith('#/sup/new'), 'create button links to /sup/new')
  const box = await create.boundingBox()
  expect(Math.round(box.width) === 56 && Math.round(box.height) === 56, `create button is ${box.width}x${box.height}`)
  expect(Math.abs(box.x + box.width / 2 - 195) <= 1, `create button is centred (${box.x + box.width / 2})`)
  expect(box.y < navBox.y && box.y + box.height > navBox.y, 'create button is raised over the top edge of the tab bar')
  const bg = await create.evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(bg === 'rgb(244, 244, 245)', `create button is white (${bg})`)

  await noOverflow('home')
  await page.waitForTimeout(1300) // rise, count-up and bars finish
  await shot(page, 'sup-home-live', { viewport: true })
  await page.getByRole('heading', { name: /^จะจัดขึ้น/ }).evaluate((e) => scrollTo(0, e.getBoundingClientRect().top + scrollY - 70))
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
  expect(mainBottom <= box.y, 'end of the page scrolls clear of the tab bar and the create button')
  await page.evaluate(() => scrollTo(0, 0))

  // The row menu: the dots open a sheet titled with the activity, with pin, QR (while the roster is still open) and edit.
  await dots.click()
  const sheet = page.getByRole('dialog', { name: 'เก็บขยะริมแม่น้ำน่าน' })
  await sheet.waitFor()
  expect((await sheet.getByRole('button', { name: 'ปักหมุดไว้บนสุด' }).count()) === 1, 'the menu offers to pin')
  expect((await sheet.getByRole('link', { name: 'แสดง QR รับชั่วโมง' }).count()) === 1, 'the QR option while the roster is open')
  expect((await sheet.getByRole('link', { name: 'แก้ไขกิจกรรม' }).count()) === 1, 'the edit option while the roster is open')
  await page.waitForTimeout(500)
  await shot(page, 'sup-home-menu', { viewport: true })
  await page.keyboard.press('Escape')
  await sheet.waitFor({ state: 'detached' })
  // A bottle exchange has no QR option, only edit.
  await page.getByRole('button', { name: 'ตัวเลือกของ แลกขวดพลาสติก รอบเดือนธันวาคม' }).click()
  const bottleSheet = page.getByRole('dialog', { name: 'แลกขวดพลาสติก รอบเดือนธันวาคม' })
  await bottleSheet.waitFor()
  expect((await bottleSheet.getByRole('link', { name: 'แสดง QR รับชั่วโมง' }).count()) === 0, 'a bottle exchange has no QR option')
  await page.keyboard.press('Escape')
  await bottleSheet.waitFor({ state: 'detached' })

  // Pinning moves the activity to the pinned section, which is first, and out of its own section.
  await page.getByRole('button', { name: 'ตัวเลือกของ บริจาคโลหิต ครั้งที่ 3/2569' }).click()
  const menuLater = page.getByRole('dialog', { name: 'บริจาคโลหิต ครั้งที่ 3/2569' })
  await menuLater.getByRole('link', { name: 'แสดง QR รับชั่วโมง' }).waitFor()
  await menuLater.getByRole('button', { name: 'ปักหมุดไว้บนสุด' }).click()
  await menuLater.waitFor({ state: 'detached' })
  await page.getByRole('heading', { name: /^ปักหมุด 1$/ }).waitFor()
  const afterPin = await headings()
  expect(afterPin[0] === 'ปักหมุด 1', `pinned section is first, got ${afterPin.join(' | ')}`)
  expect(afterPin.includes('จะจัดขึ้น 3'), `upcoming drops the pinned one, got ${afterPin.join(' | ')}`)
  expect((await page.getByRole('link', { name: /ครั้งที่ 3\/2569/ }).count()) === 1, 'the pinned activity shows once')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('nuv:pins') ?? '[]').includes('test-later')), 'pin is saved on this device')
  // Unpin it again, so the rest of the spec sees the usual lists.
  await page.getByRole('button', { name: 'ตัวเลือกของ บริจาคโลหิต ครั้งที่ 3/2569' }).click()
  await page.getByRole('dialog', { name: 'บริจาคโลหิต ครั้งที่ 3/2569' }).getByRole('button', { name: 'เลิกปักหมุด' }).click()
  await page.getByRole('heading', { name: /^ปักหมุด/ }).waitFor({ state: 'detached' })

  // Chips narrow the sections; the search matches titles and finds nothing when no title matches.
  await chipTodo.click()
  expect((await chipTodo.getAttribute('aria-pressed')) === 'true', 'the to-do chip is pressed')
  const onlyTodo = await headings()
  expect(onlyTodo.length === 1 && onlyTodo[0] === 'ต้องดำเนินการ 2', `to-do chip shows only its section, got ${onlyTodo.join(' | ')}`)
  await chipUp.click()
  const onlyUp = await headings()
  expect(onlyUp.length === 1 && onlyUp[0] === 'จะจัดขึ้น 4', `upcoming chip shows only its section, got ${onlyUp.join(' | ')}`)
  await chipAll.click()
  await search.fill('ลอยกระทง')
  const found = await headings()
  expect(found.length === 1 && found[0] === 'จะจัดขึ้น 1', `search narrows the sections, got ${found.join(' | ')}`)
  expect((await page.locator('section[aria-label="กำลังดำเนินการ"]').count()) === 0, 'the live card goes when the search does not match it')
  await search.fill('ไม่มีกิจกรรมแบบนี้')
  await page.getByText('ไม่พบกิจกรรม', { exact: true }).waitFor()
  await search.fill('')
  await page.getByRole('heading', { name: /^ต้องดำเนินการ 2$/ }).waitFor()

  // Nothing running: the blood drive moves to the far future and the list is all upcoming.
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
  await page.getByRole('heading', { name: /^จะจัดขึ้น 5$/ }).waitFor()
  expect((await page.locator('section[aria-label="กำลังดำเนินการ"]').count()) === 0, 'no live card when nothing is running')
  expect((await page.getByRole('progressbar').count()) === 0, 'no progress bar when nothing is running')
  await noOverflow('idle home')
  await postersLoaded('idle home')
  await page.waitForTimeout(1300)
  await shot(page, 'sup-home-idle', { viewport: true })

  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
