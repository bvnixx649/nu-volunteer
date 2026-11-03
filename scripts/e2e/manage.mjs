// Supervisor: log in, see a scan from another tab appear live, cut that person's hours with a reason.
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const site = { latitude: 16.7466, longitude: 100.1948 }

export default async function ({ browser, base, load, shot }) {
  const { makeToken } = await load('/src/lib/qr.ts')
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: site, permissions: ['geolocation'] })
  const sup = await ctx.newPage()

  await sup.goto(`${base}#/sup/login`)
  await sup.getByLabel('ชื่อผู้คุม').fill('พี่เต้')
  await sup.getByLabel('รหัสหน่วยงาน').fill('nope')
  await sup.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await sup.getByText('ไม่พบรหัสหน่วยงานนี้').waitFor()
  await sup.getByLabel('รหัสหน่วยงาน').fill('BLOOD69')
  await sup.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await sup.getByRole('link', { name: /บริจาคโลหิต ครั้งที่ 2\/2569/ }).click()
  await sup.getByRole('button', { name: 'เปิด QR' }).waitFor()

  const student = await ctx.newPage()
  const token = makeToken({ a: 'test-blood', h: 6, la: site.latitude, lo: site.longitude, ac: 15 }, 'dynamic', Date.now())
  await student.goto(`${base}#/claim?t=${token}`)
  await student.getByLabel('รหัสนิสิต').fill('65030001')
  await student.getByLabel('ชื่อ-นามสกุล').fill('ทดสอบ รายชื่อสด')
  await student.getByRole('button', { name: 'รับชั่วโมง' }).click()
  await student.getByRole('heading', { name: 'ทดสอบ รายชื่อสด' }).waitFor({ timeout: 8000 })

  const row = sup.getByRole('button', { name: /ทดสอบ รายชื่อสด/ })
  await row.waitFor({ timeout: 2000 })
  await row.click()
  await sup.getByRole('dialog', { name: 'แก้ชั่วโมง' }).waitFor()
  await sup.getByLabel('ชั่วโมงที่ได้').fill('9')
  expect(await sup.getByRole('button', { name: 'บันทึก' }).isDisabled(), 'save is off for more than full hours')
  await sup.getByLabel('ชั่วโมงที่ได้').fill('3')
  await sup.getByRole('button', { name: 'มาสาย' }).click()
  await sup.getByRole('button', { name: 'บันทึก' }).click()
  await sup.getByRole('dialog').waitFor({ state: 'detached' })
  await row.getByText('3 ชม.').waitFor()
  await row.getByText('มาสาย').waitFor()

  const width = await sup.evaluate(() => document.documentElement.scrollWidth)
  expect(width <= 390, `manage page is ${width}px wide`)
  await shot(sup, 'manage-light')
  await ctx.close()
}
