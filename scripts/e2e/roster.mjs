// Supervisor roster table: Excel columns as a web table, download button, link from the manage page, no page-level horizontal scroll at 390px.
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const HEADERS = ['ลำดับ', 'รหัสนิสิต', 'ชื่อ', 'กิจกรรม', 'หมวด', 'วันที่', 'ชั่วโมง', 'สถานะ', 'เวลายืนยัน', 'ยืนยันโดย', 'หมายเหตุ']

export default async function ({ browser, base, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', acceptDownloads: true })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))

  await page.goto(`${base}#/sup/login`)
  await page.getByLabel('ชื่อผู้ดูแล').fill('พี่เต้')
  await page.getByLabel('รหัสหน่วยงาน').fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.getByRole('heading', { name: 'สวัสดี พี่เต้' }).waitFor()

  await page.goto(`${base}#/sup/a/test-ended`)
  await page.getByRole('button', { name: /ตรวจสอบรายชื่อ/ }).click()
  await page.getByRole('heading', { name: 'ตรวจสอบรายชื่อ' }).waitFor()
  const heads = await page.locator('thead th').allInnerTexts()
  expect(JSON.stringify(heads) === JSON.stringify(HEADERS), `headers: ${heads}`)
  expect((await page.locator('tbody tr').count()) === 4, 'four people in the fixture')
  const body = await page.locator('tbody').innerText()
  expect(body.includes('ไม่มา') && body.includes('ไม่ได้ลงทะเบียน') && body.includes('กลับก่อน'), 'status and note columns are filled')
  const w = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(w <= 390, `page is ${w}px wide`)
  await page.waitForTimeout(300)
  await shot(page, 'sup-roster-dark')

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'โหลด Excel' }).click()])
  expect(download.suggestedFilename().endsWith('รายชื่อ.xlsx'), `file name ${download.suggestedFilename()}`)
  expect(!problems.length, `console problems: ${problems.join(' | ')}`)
  await ctx.close()
}
