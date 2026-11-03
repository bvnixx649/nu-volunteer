// Student claim page: first visit, repeat scan, offline, expired QR, layout width. Light and dark.
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const site = { latitude: 16.7466, longitude: 100.1948 }

export default async function ({ browser, base, load, shot }) {
  const { makeToken } = await load('/src/lib/qr.ts')
  const token = (at = Date.now()) =>
    makeToken({ a: 'test-blood', h: 6, la: site.latitude, lo: site.longitude, ac: 15 }, 'dynamic', at)
  const ctxOpts = (colorScheme) => ({
    viewport: { width: 390, height: 844 },
    colorScheme,
    geolocation: site,
    permissions: ['geolocation'],
    locale: 'th-TH',
  })

  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext(ctxOpts(scheme))
    const page = await ctx.newPage()
    const id = scheme === 'light' ? '65010001' : '65010002'
    const url = `${base}#/claim?t=${token()}`

    await page.goto(url)
    await page.getByText('บริจาคโลหิต ครั้งที่ 2/2569').first().waitFor()
    await shot(page, `claim-form-${scheme}`)
    await page.getByLabel('รหัสนิสิต').fill(id)
    await page.getByLabel('ชื่อ-นามสกุล').fill('ณัฐวุฒิ แก้วประเสริฐ')
    await page.getByRole('button', { name: 'รับชั่วโมง' }).click()
    await page.getByRole('heading', { name: 'ณัฐวุฒิ แก้วประเสริฐ' }).waitFor({ timeout: 8000 })
    expect(await page.getByText(id).isVisible(), 'ticket shows the student id')
    await page.waitForTimeout(700)
    await shot(page, `claim-success-${scheme}`)
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width <= 390, `success page is ${width}px wide`)

    // Same phone scans again: it already knows the student and says so.
    await page.goto('about:blank')
    await page.goto(url)
    await page.getByText('ได้รับชั่วโมงกิจกรรมนี้แล้ว').waitFor({ timeout: 8000 })
    await page.getByRole('button', { name: 'ดูบัตร' }).click()
    await page.getByRole('heading', { name: 'ณัฐวุฒิ แก้วประเสริฐ' }).waitFor()
    await ctx.close()
  }

  // A new phone with no internet: must not show success.
  const ctx = await browser.newContext(ctxOpts('light'))
  const page = await ctx.newPage()
  await page.goto(`${base}#/claim?t=${token()}`)
  await page.getByLabel('รหัสนิสิต').waitFor()
  await ctx.setOffline(true)
  await page.getByLabel('รหัสนิสิต').fill('65010003')
  await page.getByLabel('ชื่อ-นามสกุล').fill('ทดสอบ ไม่มีเน็ต')
  await page.getByRole('button', { name: 'รับชั่วโมง' }).click()
  await page.getByText('บันทึกไม่ได้เพราะไม่มีอินเทอร์เน็ต').waitFor({ timeout: 8000 })
  expect(!(await page.getByRole('heading', { name: 'ทดสอบ ไม่มีเน็ต' }).count()), 'offline claim must not reach success')
  await shot(page, 'claim-offline')
  await ctx.setOffline(false)

  // An old QR.
  await page.goto('about:blank')
  await page.goto(`${base}#/claim?t=${token(Date.now() - 120_000)}`)
  await page.getByText('QR หมดอายุ').waitFor({ timeout: 8000 })
  await shot(page, 'claim-expired')
  await ctx.close()
}
