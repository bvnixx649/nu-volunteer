// Worst cases: a 60-character name on the success page, and a 600-person roster on a phone.
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

/** Writes 600 rows straight into the page's localStorage, which only exists in local mode; run.mjs skips this spec with --remote. */
export const localOnly = 'injects rows into local storage'

export default async function ({ browser, base, load, shot }) {
  const { makeToken } = await load('/src/lib/qr.ts')
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, geolocation: { latitude: 16.7466, longitude: 100.1948 }, permissions: ['geolocation'] })
  const page = await ctx.newPage()

  const long = 'ศรีสุวรรณวงศ์ไพบูลย์ประเสริฐสุขเจริญรุ่งเรืองกิจ ณ อยุธยามหาสารคาม'.slice(0, 60)
  const token = makeToken({ a: 'test-blood', h: 6 }, 'dynamic', Date.now())
  await page.goto(`${base}#/claim?t=${token}`)
  await page.getByLabel('รหัสนิสิต').fill('65099999')
  await page.getByLabel('ชื่อ-นามสกุล').fill(long)
  await page.getByRole('button', { name: 'รับชั่วโมง' }).click()
  await page.getByRole('heading', { name: long }).waitFor({ timeout: 8000 })
  await page.waitForTimeout(700)
  await shot(page, 'stress-long-name')
  let width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width <= 360, `long name page is ${width}px wide`)

  // 600 credits with a mix of flags, written straight into local storage.
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('nuv:db'))
    const credits = (db.credits['test-blood'] ??= {})
    const regs = (db.regs['test-blood'] ??= {})
    for (let i = 0; i < 600; i++) {
      const id = String(65100000 + i)
      const name = `นิสิตทดสอบ คนที่ ${i + 1}`
      regs[id] = { studentId: id, name, at: i, walkIn: i % 3 === 0 }
      credits[id] = { studentId: id, name, hours: i % 7 === 0 ? 3 : 6, fullHours: 6, at: Date.now() - i * 1000, method: 'qr', flags: i % 11 === 0 ? ['location', 'device'] : [], distance: 412, reason: i % 7 === 0 ? 'กลับก่อน' : undefined }
    }
    db.activities['test-blood'].creditCount = Object.keys(credits).length
    db.activities['test-blood'].regCount = Object.keys(regs).length
    localStorage.setItem('nuv:db', JSON.stringify(db))
  })
  await page.goto(`${base}#/sup/login`)
  await page.getByLabel('ชื่อผู้คุม').fill('พี่เต้')
  await page.getByLabel('รหัสหน่วยงาน').fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.waitForURL(/#\/sup$/)
  const t0 = Date.now()
  await page.goto(`${base}#/sup/a/test-blood`)
  await page.getByRole('button', { name: /65100000/ }).waitFor()
  const ms = Date.now() - t0
  expect(ms < 3000, `600-row roster took ${ms} ms`)
  await page.getByLabel('ค้นด้วยรหัสหรือชื่อ').fill('651005')
  await page.getByRole('button', { name: /65100599/ }).waitFor()
  await page.getByLabel('ค้นด้วยรหัสหรือชื่อ').fill('')
  width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width <= 360, `roster is ${width}px wide`)
  await shot(page, 'stress-roster-600')
  console.log(`  600-row roster rendered in ${ms} ms`)
  await ctx.close()
}
