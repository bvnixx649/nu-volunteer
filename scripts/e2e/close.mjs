// Supervisor closing flow on an activity that ended 2 hours ago: stage bar, close roster, no-show flag,
// Excel download, submit, then the roster is locked. Light and dark screenshots at 390x844.
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

export default async function ({ browser, base, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
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
  await page.getByLabel('รหัส', { exact: true }).fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.getByRole('link', { name: /เก็บขยะริมแม่น้ำน่าน/ }).first().click()
  await page.getByRole('heading', { name: 'เก็บขยะริมแม่น้ำน่าน' }).waitFor()

  // Status tag above the title; no progress bar.
  await page.getByText('รอตรวจสอบ', { exact: true }).waitFor()
  expect((await page.locator('ol > li').count()) === 0, 'no stage bar')
  await page.getByText(/ระบบปิดให้อัตโนมัติ/).waitFor()
  await noOverflow('closing')
  await both('close-1-closing')

  // Close roster: confirm sheet shows 2 got hours (3 credits) and 1 no-show.
  await page.getByRole('button', { name: 'ปิดรายชื่อ', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'ปิดรายชื่อ' })
  await sheet.locator('.num').first().waitFor()
  expect((await sheet.locator('.num').allInnerTexts()).join(',') === '3,1', 'close sheet shows 3 got hours and 1 no-show')
  await both('close-2-confirm')
  await sheet.getByRole('button', { name: 'ปิดรายชื่อ', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.getByText('รอส่งรายชื่อ', { exact: true }).waitFor()
  await page.getByText(/ส่งรายชื่อให้ศูนย์จิตอาสาภายใน/).waitFor()
  await page.getByText('ไม่เข้าร่วม', { exact: true }).waitFor()
  expect((await page.getByText('ไม่เข้าร่วม', { exact: true }).count()) === 1, 'exactly one no-show flag')
  await noOverflow('closed')
  await both('close-3-closed')

  // Excel download.
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'ดาวน์โหลดไฟล์ Excel' }).click()])
  expect(download.suggestedFilename() === 'เก็บขยะริมแม่น้ำน่าน รายชื่อ.xlsx', `file name is ${download.suggestedFilename()}`)
  await page.getByText('ดาวน์โหลดไฟล์ Excel แล้ว').waitFor()

  // Remove the no-show from the roster with two taps.
  await page.getByRole('button', { name: /ปวีณา มาสาย/ }).click()
  const edit = page.getByRole('dialog', { name: 'ให้ชั่วโมง' })
  await edit.getByRole('button', { name: 'ลบออกจากรายชื่อ' }).click()
  await edit.getByRole('button', { name: /กดอีกครั้งเพื่อลบรายชื่อ/ }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  // With a remote database the list refreshes a moment after the dialog closes, so wait for it instead of counting at once.
  await page.getByRole('button', { name: /ปวีณา มาสาย/ }).waitFor({ state: 'detached', timeout: 8000 })
  await page.getByText('ไม่เข้าร่วม', { exact: true }).waitFor({ state: 'detached', timeout: 8000 })

  // Submit: confirm sheet shows who got hours and who did not (the no-show was removed), no total of hours, and the warning.
  await page.getByRole('button', { name: 'ส่งรายชื่อให้ศูนย์' }).click()
  const send = page.getByRole('dialog', { name: 'ส่งรายชื่อให้ศูนย์' })
  await send.locator('.num').first().waitFor()
  expect((await send.locator('.num').allInnerTexts()).join(',') === '3,0', 'submit sheet shows 3 got hours and 0 not attending')
  expect(!(await send.getByText('ชั่วโมงรวม').count()), 'submit sheet has no total hours')
  await send.getByText('แก้รายชื่อและชั่วโมงไม่ได้อีก').waitFor()
  await both('close-4-submit')
  await send.getByRole('button', { name: 'ส่งรายชื่อ', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.getByText(/รอศูนย์จิตอาสาบันทึกชั่วโมง/).waitFor()
  await page.getByText('ส่งรายชื่อแล้ว', { exact: true }).waitFor()

  // Locked: reason shown, add disabled, rows no longer open the edit sheet.
  await page.getByText('ส่งรายชื่อแล้ว แก้ไม่ได้').waitFor()
  expect(await page.getByRole('button', { name: 'เพิ่มรายชื่อ' }).isDisabled(), 'add person is disabled after submit')
  await page.getByRole('button', { name: /สมชาย ใจดี/ }).click()
  await page.waitForTimeout(500)
  expect((await page.getByRole('dialog').count()) === 0, 'edit sheet stays closed after submit')
  await noOverflow('locked')
  await both('close-5-locked')

  expect(problems.length === 0, `console errors: ${problems.join(' | ')}`)
  await ctx.close()
}
