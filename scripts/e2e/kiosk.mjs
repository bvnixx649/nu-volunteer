// Venue screen on a tablet in dark mode: white QR page, live counter and feed, QR rotates every 10 s.
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const site = { latitude: 16.7466, longitude: 100.1948 }

export default async function ({ browser, base, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, colorScheme: 'dark', geolocation: site, permissions: ['geolocation'] })
  const kiosk = await ctx.newPage()
  await kiosk.goto(`${base}#/sup/login`)
  await kiosk.getByLabel('ชื่อผู้คุม').fill('พี่เต้')
  await kiosk.getByLabel('รหัสหน่วยงาน').fill('BLOOD69')
  await kiosk.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await kiosk.waitForURL(/#\/sup$/)
  await kiosk.goto(`${base}#/sup/a/test-blood/qr`)

  const qr = kiosk.locator('[data-token]')
  await qr.waitFor()
  // Wait for GPS to land in the token.
  await kiosk.getByText(/แม่นยำ/).waitFor({ timeout: 5000 })
  const token = await qr.getAttribute('data-token')
  const bg = await kiosk.evaluate(() => getComputedStyle(document.querySelector('[data-kiosk]')).backgroundColor)
  expect(bg === 'rgb(255, 255, 255)', `kiosk background is ${bg}`)

  const student = await ctx.newPage()
  await student.goto(`${base}#/claim?t=${token}`)
  await student.getByLabel('รหัสนิสิต').fill('65040001')
  await student.getByLabel('ชื่อ-นามสกุล').fill('ทดสอบ จอหน้างาน')
  await student.getByRole('button', { name: 'รับชั่วโมง' }).click()
  await student.getByRole('heading', { name: 'ทดสอบ จอหน้างาน' }).waitFor({ timeout: 8000 })

  await kiosk.locator('[data-feed]').getByText('ทดสอบ จอหน้างาน').waitFor({ timeout: 2000 })
  await kiosk.locator('[data-value="1"]').waitFor({ timeout: 2000 })
  await kiosk.waitForTimeout(800)
  await shot(kiosk, 'kiosk-tablet-dark')

  await kiosk.waitForTimeout(10_500)
  expect((await qr.getAttribute('data-token')) !== token, 'dynamic QR changes after 10 s')

  await kiosk.setViewportSize({ width: 390, height: 844 })
  await kiosk.waitForTimeout(400)
  await shot(kiosk, 'kiosk-phone-dark')
  await ctx.close()
}
