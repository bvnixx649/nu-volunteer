// Check-in settings: pick 15 s and 200 m in the sheet, see the summary, open the QR screen on a 15 s interval,
// then claim from ~180 m (passes clean) and ~400 m (passes with the location flag). Light and dark at 390x844.
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const site = { latitude: 16.7466, longitude: 100.1948 }
// 0.0016 degrees of latitude is about 178 m, 0.0036 about 400 m.
const at = (dLat) => ({ latitude: site.latitude + dLat, longitude: site.longitude, accuracy: 10 })
const decode = (token) => JSON.parse(Buffer.from(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))

export default async function ({ browser, base, shot, mode }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: site, permissions: ['geolocation'], locale: 'th-TH' })
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

  await page.goto(`${base}#/sup/login`)
  await page.getByLabel('ชื่อผู้ดูแล').fill('พี่เต้')
  await page.getByLabel('รหัสหน่วยงาน').fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.getByRole('link', { name: /บริจาคโลหิต/ }).first().click()
  await page.getByRole('heading', { name: /บริจาคโลหิต/ }).waitFor()
  await page.getByText('QR เปลี่ยนทุก 10 วิ ตรวจตำแหน่ง 150 ม.').waitFor()
  await noOverflow('manage')
  await both('settings-1-manage')

  // Sheet: change to 15 s and 200 m.
  await page.getByRole('button', { name: 'ตั้งค่าการเช็คชื่อ' }).click()
  const sheet = page.getByRole('dialog', { name: 'ตั้งค่าการเช็คชื่อ' })
  await sheet.getByRole('radio', { name: 'ทุก 15 วิ', exact: true }).click()
  await sheet.getByRole('radio', { name: '200 ม.', exact: true }).click()
  await sheet.getByRole('radio', { name: /QR เปลี่ยนอัตโนมัติ/ }).waitFor()
  await page.waitForTimeout(500)
  await noOverflow('sheet')
  await both('settings-2-sheet')

  // Static with location off shows the forwarding warning, then back again without saving.
  await sheet.getByRole('radio', { name: /QR แบบพิมพ์/ }).click()
  await sheet.getByRole('switch', { name: 'ตรวจสอบตำแหน่ง' }).click()
  await sheet.getByText(/ภาพ QR ส่งต่อกันได้/).waitFor()
  await both('settings-3-warning')
  await sheet.getByRole('radio', { name: /QR เปลี่ยนอัตโนมัติ/ }).click()
  await sheet.getByRole('switch', { name: 'ตรวจสอบตำแหน่ง' }).click()
  await sheet.getByRole('radio', { name: '200 ม.', exact: true }).click()

  await sheet.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.getByText('QR เปลี่ยนทุก 15 วิ ตรวจตำแหน่ง 200 ม.').waitFor()
  await both('settings-4-saved')

  // QR screen runs on 15 s.
  await page.getByRole('button', { name: 'เปิด QR' }).click()
  await page.getByText('QR เปลี่ยนทุก 15 วินาที').waitFor()
  const bar = page.locator('[data-interval]')
  expect((await bar.getAttribute('data-interval')) === '15', 'countdown bar uses 15 s')
  await page.waitForFunction(() => {
    const t = document.querySelector('[data-token]')?.getAttribute('data-token') ?? ''
    try {
      return JSON.parse(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).la !== undefined
    } catch {
      return false
    }
  })
  const token = await page.locator('[data-token]').getAttribute('data-token')
  const payload = decode(token)
  expect(payload.i === 15, `token interval is ${payload.i}`)
  const ms = await bar.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration) * 1000)
  expect(ms > 0 && ms <= 15_000, `countdown runs ${ms} ms`)
  await noOverflow('qr')
  await both('settings-5-qr')

  // Settings changed while the QR is open: the screen follows (other tab of the same browser).
  const other = await ctx.newPage()
  await other.goto(`${base}#/sup/a/test-blood`)
  await other.getByRole('button', { name: 'ตั้งค่าการเช็คชื่อ' }).click()
  await other.getByRole('dialog').getByRole('radio', { name: 'ทุก 10 วิ', exact: true }).click()
  await other.getByRole('dialog').getByRole('button', { name: 'บันทึก', exact: true }).click()
  await other.getByRole('dialog').waitFor({ state: 'detached' })
  await other.close()
  await page.getByText('QR เปลี่ยนทุก 10 วินาที').waitFor()
  expect((await bar.getAttribute('data-interval')) === '10', 'countdown follows the new interval')
  const other2 = await ctx.newPage()
  await other2.goto(`${base}#/sup/a/test-blood`)
  await other2.getByRole('button', { name: 'ตั้งค่าการเช็คชื่อ' }).click()
  await other2.getByRole('dialog').getByRole('radio', { name: 'ทุก 15 วิ', exact: true }).click()
  await other2.getByRole('dialog').getByRole('button', { name: 'บันทึก', exact: true }).click()
  await other2.getByRole('dialog').waitFor({ state: 'detached' })
  await other2.close()
  await page.getByText('QR เปลี่ยนทุก 15 วินาที').waitFor()

  // Claims: a fresh 15 s token, student 180 m away passes clean, 400 m away passes with the flag.
  const fresh = await page.locator('[data-token]').getAttribute('data-token')
  const claim = async (id, dLat) => {
    await ctx.setGeolocation(at(dLat))
    // One browser plays every phone, so forget the student the last claim remembered.
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('nuv:device'))
      d.state.studentId = null
      localStorage.setItem('nuv:device', JSON.stringify(d))
    })
    const p = await ctx.newPage()
    await p.goto(`${base}#/claim?t=${fresh}`)
    await p.getByLabel('รหัสนิสิต').fill(id)
    await p.getByLabel('ชื่อ-นามสกุล').fill('ณัฐวุฒิ แก้วประเสริฐ')
    await p.getByRole('button', { name: 'รับชั่วโมง' }).click()
    await p.getByRole('heading', { name: 'ณัฐวุฒิ แก้วประเสริฐ' }).waitFor({ timeout: 8000 })
    await p.close()
  }
  // Local mode keeps credits in the page's storage; remote mode reads them back from the project.
  const credits = async () => {
    if (mode !== 'remote') return page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('nuv:db')).credits['test-blood'] ?? {}))
    const { config, signedInClient } = await import('../lib/remote-db.mjs')
    const { db } = await signedInClient(await config())
    const { data, error } = await db.from('credits').select('*').eq('activity_id', 'test-blood')
    if (error) throw new Error(error.message)
    return data.map((c) => ({ studentId: c.student_id, flags: c.flags }))
  }
  // The QR screen must have coordinates from the site fix, so claim from the same spot first.
  await ctx.setGeolocation(site)
  await claim('65010001', 0.0016)
  await claim('65010002', 0.0036)
  const list = await credits()
  const near = list.find((c) => c.studentId === '65010001')
  const far = list.find((c) => c.studentId === '65010002')
  expect(near && !near.flags.includes('location'), `180 m should pass clean: ${JSON.stringify(near?.flags)}`)
  expect(far && far.flags.includes('location'), `400 m should carry the location flag: ${JSON.stringify(far?.flags)}`)

  expect(problems.length === 0, `console errors: ${problems.join(' | ')}`)
  await ctx.close()
}
