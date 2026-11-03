// Bottle exchange at 390x844: create the activity from the template, record bottles for a new student at the desk
// (45 bottles = 2 hours, 15 more = 3 hours), see it on the live roster and from the student side.
// Screenshots go to out/bottle-*.png.
export const localOnly = 'creates activities in the shared project'

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

export default async function ({ browser, base, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'th-TH' })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  const noOverflow = async (label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w <= 390, `${label} is ${w}px wide`)
  }
  const snap = async (name) => {
    await page.waitForTimeout(800)
    await noOverflow(name)
    await shot(page, `bottle-${name}`)
  }
  const h1 = (name) => page.getByRole('heading', { level: 1, name, exact: true }).waitFor()

  await page.goto(`${base}#/sup/login`)
  await page.getByLabel('ชื่อผู้ดูแล').fill('พี่เต้')
  await page.getByLabel('รหัสหน่วยงาน').fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.waitForURL(/#\/sup$/)

  // Create from the template: bottle rule fields, no QR or registration settings.
  await page.goto(`${base}#/sup/new`)
  await h1('เลือกเทมเพลต')
  await page.getByRole('button', { name: /แลกขวด/ }).click()
  await h1('รายละเอียด')
  expect((await page.getByLabel('กี่ขวดได้ 1 ชั่วโมง').inputValue()) === '20', 'default 20 bottles per hour')
  expect((await page.getByLabel('ชั่วโมงสูงสุดต่อคน').inputValue()) === '5', 'default 5 hours at most')
  const today = await page.evaluate(() => {
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  })
  await page.getByLabel('ชื่อกิจกรรม').fill('แลกขวดพลาสติกเป็นชั่วโมงจิตอาสา')
  await page.getByLabel('วันที่จัดกิจกรรม').fill(today)
  await page.getByLabel('เวลาเริ่ม').fill('00:00')
  await page.getByLabel('เวลาจบ').fill('23:59')
  await page.getByLabel('สถานที่', { exact: true }).fill('หน้าอาคารกิจกรรมนิสิต')
  await page.getByRole('button', { name: /ตั้งค่าเพิ่มเติม/ }).click()
  await page.getByLabel('ชื่อผู้ดูแลกิจกรรม').waitFor()
  for (const gone of ['จำกัดจำนวน', 'รับผู้ไม่ได้ลงทะเบียน', 'ตรวจสอบตำแหน่ง', 'ตั้งเวลาเปิดรับสมัคร']) {
    expect((await page.getByRole('switch', { name: gone }).count()) === 0, `${gone} is hidden for bottles`)
  }
  expect((await page.getByRole('radio', { name: /QR/ }).count()) === 0, 'no QR choices for bottles')
  await snap('1-details')
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click()
  await h1('ตรวจและเผยแพร่')
  expect((await page.getByTestId('preview').innerText()).includes('สูงสุด 5 ชม.'), 'preview says up to 5 hours')
  expect((await page.locator('main').innerText()).includes('20 ขวด ได้ 1 ชั่วโมง'), 'summary shows the rule')
  await snap('2-review')
  await page.getByRole('button', { name: 'เผยแพร่', exact: true }).click()
  await page.waitForURL(/#\/sup\/a\/[0-9a-z]{10}$/)
  const id = page.url().split('/').pop()
  const stored = await page.evaluate((i) => JSON.parse(localStorage.getItem('nuv:db')).activities[i], id)
  expect(stored.categoryKey === 'bottle' && stored.itemsPerHour === 20 && stored.hours === 5 && stored.walkIn === true && stored.capLimit === false, `stored: ${JSON.stringify(stored)}`)

  // Manage: the desk button replaces the QR button.
  await page.getByRole('heading', { name: 'แลกขวดพลาสติกเป็นชั่วโมงจิตอาสา' }).waitFor()
  expect((await page.getByRole('button', { name: 'เปิด QR' }).count()) === 0, 'no QR button')
  expect((await page.getByText('ตั้งค่าการเช็คชื่อ').count()) === 0, 'no check-in settings')
  await snap('3-manage')

  // First visit: a new student with 45 bottles.
  await page.getByRole('button', { name: 'บันทึกขวด' }).click()
  const sheet = page.getByRole('dialog', { name: 'บันทึกขวด' })
  await sheet.getByLabel('รหัสนิสิต').fill('65010123')
  await sheet.getByLabel('ชื่อ-นามสกุล').fill('สมศรี รักษ์โลก')
  expect((await sheet.getByRole('button', { name: 'บันทึก', exact: true }).isDisabled()), 'save needs the bottle count')
  await sheet.getByRole('button', { name: '+20' }).click()
  await sheet.getByRole('button', { name: '+20' }).click()
  await sheet.getByLabel('จำนวนขวด').fill('45')
  expect((await sheet.getByTestId('bottle-hours').innerText()) === '2', 'preview shows 2 hours')
  await sheet.getByText('อีก 15 ขวดได้ชั่วโมงถัดไป').waitFor()
  await page.waitForTimeout(500)
  await shot(page, 'bottle-4-desk')
  await sheet.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await sheet.waitFor({ state: 'detached' })
  await page.getByText('65010123 45 ขวด').waitFor()
  await page.getByText('2 ชม.').first().waitFor()
  let credit = await page.evaluate((i) => JSON.parse(localStorage.getItem('nuv:db')).credits[i]['65010123'], id)
  expect(credit.hours === 2 && credit.items === 45 && credit.method === 'manual', `first credit: ${JSON.stringify(credit)}`)

  // Second visit: the same student adds 15 more.
  await page.getByRole('button', { name: 'บันทึกขวด' }).click()
  await sheet.getByLabel('รหัสนิสิต').fill('65010123')
  await sheet.getByTestId('bottle-before').waitFor()
  expect((await sheet.getByLabel('ชื่อ-นามสกุล').inputValue()) === 'สมศรี รักษ์โลก', 'known student fills the name')
  await sheet.getByLabel('จำนวนขวดที่เพิ่ม').fill('15')
  expect((await sheet.getByTestId('bottle-hours').innerText()) === '3', 'preview shows 3 hours')
  await sheet.getByText('รวม 60 ขวด').waitFor()
  await sheet.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await sheet.waitFor({ state: 'detached' })
  await page.getByText('65010123 60 ขวด').waitFor()
  credit = await page.evaluate((i) => JSON.parse(localStorage.getItem('nuv:db')).credits[i]['65010123'], id)
  expect(credit.hours === 3 && credit.items === 60, `second credit: ${JSON.stringify(credit)}`)
  expect((await page.evaluate((i) => JSON.parse(localStorage.getItem('nuv:db')).activities[i].creditCount, id)) === 1, 'one credit, not two')
  await snap('5-roster')

  // The QR screen is not used here.
  await page.goto(`${base}#/sup/a/${id}/qr`)
  await page.waitForURL(new RegExp(`#/sup/a/${id}$`))

  // Student side: the rule is explained, nothing to scan or register, the credit shows the bottles.
  await page.goto(`${base}#/welcome`)
  await page.getByLabel('รหัสนิสิต').fill('65010123')
  await page.getByLabel('ชื่อ-นามสกุล').fill('สมศรี รักษ์โลก')
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click()
  await page.getByRole('button', { name: /ใช่/ }).first().click().catch(() => {})
  await page.goto(`${base}#/a/${id}`)
  await page.getByRole('heading', { name: 'แลกขวดพลาสติกเป็นชั่วโมงจิตอาสา' }).waitFor()
  await page.getByText('20 ขวด = 1 ชั่วโมง ได้สูงสุด 5 ชั่วโมง').waitFor()
  await page.getByText('นำขวดพลาสติกที่ล้างแล้วมาที่จุดรับในเวลากิจกรรม').waitFor()
  for (const gone of ['สแกน', 'ลงทะเบียน', 'เตือนฉัน']) {
    expect((await page.getByRole('link', { name: gone, exact: true }).count()) + (await page.getByRole('button', { name: gone, exact: true }).count()) === 0, `no ${gone} action`)
  }
  await page.getByText('แลก 60 ขวด').waitFor()
  await snap('6-student-detail')
  await page.goto(`${base}#/me`)
  await page.getByText('แลกขวด 60 ขวด').waitFor()
  await snap('7-student-history')

  expect(problems.length === 0, `console errors: ${problems.join(' | ')}`)
  await ctx.close()
}
