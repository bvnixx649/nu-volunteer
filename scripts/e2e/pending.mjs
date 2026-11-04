// A scan with no network is kept on the phone (SPEC 5.2): pending screen instead of success, a card on the home page,
// automatic send when the network returns, the real scan time and the "ส่งภายหลัง" flag on the supervisor side.
export const localOnly = 'takes the network away from the local data layer'

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const site = { latitude: 16.7466, longitude: 100.1948 }

export default async function ({ browser, base, load, shot }) {
  const { makeToken } = await load('/src/lib/qr.ts')
  const token = () => makeToken({ a: 'test-blood', h: 6, la: site.latitude, lo: site.longitude, ac: 15 }, 'dynamic', Date.now())
  const open = async (ctx) => {
    const page = await ctx.newPage()
    const problems = []
    page.on('pageerror', (e) => problems.push(e.message))
    // Going offline makes the browser log failed requests; only real script errors matter here.
    // The fixture's blood activity is 08:00 to 16:00 today; make it live whatever time this runs.
    await page.goto(`${base}#/sup/login`)
    await page.waitForFunction(() => localStorage.getItem('nuv:db'))
    await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('nuv:db'))
      db.activities['test-blood'].start = Date.now() - 3600_000
      db.activities['test-blood'].end = Date.now() + 3 * 3600_000
      localStorage.setItem('nuv:db', JSON.stringify(db))
    })
    await page.goto(`${base}#/claim?t=${token()}`)
    await page.reload()
    return { page, problems }
  }
  const noOverflow = async (page, label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w <= 390, `${label} is ${w}px wide`)
  }
  const ctxOpts = { viewport: { width: 390, height: 844 }, colorScheme: 'dark', geolocation: site, permissions: ['geolocation'], locale: 'th-TH' }
  const queue = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('nuv:pending') ?? '[]'))

  // 1. Offline scan, then the home card, then the network returns.
  {
    const ctx = await browser.newContext(ctxOpts)
    const { page, problems } = await open(ctx)
    await page.getByLabel('รหัสนิสิต').waitFor()
    await ctx.setOffline(true)
    await page.getByLabel('รหัสนิสิต').fill('65010021')
    await page.getByLabel('ชื่อ-นามสกุล').fill('ทดสอบ ส่งภายหลัง')
    await page.getByRole('button', { name: 'รับชั่วโมง' }).click()
    await page.getByRole('heading', { name: 'บันทึกการสแกนไว้ในเครื่องแล้ว' }).waitFor({ timeout: 8000 })
    const text = await page.evaluate(() => document.body.innerText)
    expect(text.includes('ชั่วโมงยังไม่ถูกบันทึก'), 'pending screen says the hours are not recorded')
    expect(!text.includes('ได้รับชั่วโมงแล้ว') && !text.includes('ชม.'), 'no received hours on the pending screen')
    expect(!(await page.getByRole('heading', { name: 'ทดสอบ ส่งภายหลัง' }).count()), 'pending must not look like success')
    expect(await page.getByText(/สแกนเมื่อ \d{2}:\d{2} น\./).isVisible(), 'scan time shown')
    await noOverflow(page, 'pending screen')
    await page.waitForTimeout(450)
    await shot(page, 'pending-screen-dark')

    const [kept] = await queue(page)
    expect(kept && kept.input.student.id === '65010021' && kept.token && kept.scannedAt, 'one entry saved with token and scan time')
    expect((await queue(page)).length === 1, 'exactly one entry')

    // Retrying while offline keeps it queued and says so.
    await page.getByRole('button', { name: 'ส่งอีกครั้ง' }).click()
    await page.getByText('ยังส่งไม่ได้').waitFor()
    expect((await queue(page)).length === 1, 'still queued after a failed retry')

    // Home shows the waiting scan.
    await page.getByRole('link', { name: 'ไปหน้าแรก' }).click()
    await page.getByText('มีการสแกนรอส่ง 1 รายการ').waitFor()
    await noOverflow(page, 'home with pending card')
    await page.waitForTimeout(300)
    await shot(page, 'pending-home-dark')

    // Network back: the app sends by itself and the card goes away.
    await ctx.setOffline(false)
    await page.getByText('มีการสแกนรอส่ง').waitFor({ state: 'detached', timeout: 10_000 })
    expect((await queue(page)).length === 0, 'queue empty after sending')
    const credit = await page.evaluate(() => JSON.parse(localStorage.getItem('nuv:db')).credits['test-blood']['65010021'])
    expect(credit.flags.includes('offline'), `credit flags: ${credit.flags}`)
    expect(credit.at === kept.scannedAt, `credit time ${credit.at} vs scan ${kept.scannedAt}`)
    expect(credit.hours === 6, 'hours credited')

    // The supervisor sees it was sent late.
    await page.goto(`${base}#/sup/login`)
    await page.getByLabel('ชื่อผู้ดูแล').fill('พี่เต้')
    await page.getByLabel('รหัส', { exact: true }).fill('NUVOL69')
    await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
    await page.getByText('กองกิจการนิสิต มหาวิทยาลัยนเรศวร').waitFor()
    await page.goto(`${base}#/sup/a/test-blood`)
    await page.getByText('ทดสอบ ส่งภายหลัง').first().waitFor()
    await page.getByText('ส่งภายหลัง', { exact: true }).first().waitFor()
    await noOverflow(page, 'supervisor manage page')
    await page.waitForTimeout(300)
    await shot(page, 'pending-sup-live-dark')
    await page.goto(`${base}#/sup/a/test-blood/roster`)
    await page.getByRole('heading', { name: 'ตรวจสอบรายชื่อ' }).waitFor()
    const row = await page.locator('tbody tr', { hasText: '65010021' }).innerText()
    expect(row.includes('ส่งภายหลัง'), `roster note: ${row}`)
    expect(!problems.length, `script errors: ${problems.join(' | ')}`)
    await ctx.close()
  }

  // 2. Stay on the pending screen: when the network returns it turns into the normal success screen.
  {
    const ctx = await browser.newContext(ctxOpts)
    const { page } = await open(ctx)
    await page.getByLabel('รหัสนิสิต').waitFor()
    await ctx.setOffline(true)
    await page.getByLabel('รหัสนิสิต').fill('65010022')
    await page.getByLabel('ชื่อ-นามสกุล').fill('ทดสอบ รอหน้าเดิม')
    await page.getByRole('button', { name: 'รับชั่วโมง' }).click()
    await page.getByRole('heading', { name: 'บันทึกการสแกนไว้ในเครื่องแล้ว' }).waitFor({ timeout: 8000 })
    await ctx.setOffline(false)
    await page.getByRole('heading', { name: 'ทดสอบ รอหน้าเดิม' }).waitFor({ timeout: 10_000 })
    await page.waitForFunction(() => document.querySelector('[data-value="6"]')?.textContent === '6')
    expect(!(await page.getByText('บันทึกการสแกนไว้ในเครื่องแล้ว').count()), 'pending text gone after success')
    expect((await queue(page)).length === 0, 'queue empty')
    await noOverflow(page, 'success after pending')
    await ctx.close()
  }
}
