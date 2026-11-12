// Supervisor templates and one-off activities at 390x844, dark: the "กำหนดเอง" card in the picker, a one-off activity
// published without a template, the same activity published with "บันทึกเป็นเทมเพลต" on (the template then shows in the
// picker and fills step 2), edit and delete from the "..." button and from a long press. Screenshots in out/template-*.png.
export const localOnly = 'creates templates and activities in the shared project'

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
// 1x1 PNG, enough to run the resize path.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const pad = (n) => String(n).padStart(2, '0')

export default async function ({ browser, base, shot: rawShot }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'th-TH' })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  const noOverflow = async (label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w <= 390, `${label} is ${w}px wide`)
  }
  const shot = async (name) => {
    await page.waitForTimeout(700)
    await noOverflow(name)
    await rawShot(page, `template-${name}`)
  }
  const h1 = (name) => page.getByRole('heading', { level: 1, name, exact: true }).waitFor()
  // Leaves the editor first: opening the same address again would keep the step it is on.
  const openNew = async () => {
    await page.goto(`${base}#/sup`)
    await page.getByPlaceholder('ค้นหากิจกรรม').waitFor()
    // A half-filled activity is kept as a draft and would reopen on its own step.
    await page.evaluate(() => localStorage.removeItem('nuv:draft'))
    await page.goto(`${base}#/sup/new`)
  }
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('nuv:db')))
  const tomorrow = new Date(Date.now() + 86_400_000)
  const tomorrowYmd = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`

  await page.goto(`${base}#/sup/login`)
  await page.getByLabel('ชื่อผู้ดูแล').fill('พี่เต้')
  await page.getByLabel('รหัส', { exact: true }).fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.waitForURL(/#\/sup$/)

  // The picker has no add button. "กำหนดเอง" sits in the grid after the built-in cards.
  await openNew()
  await h1('เลือกประเภทกิจกรรม')
  const custom = page.getByRole('button', { name: /^กำหนดเอง/ })
  await custom.waitFor()
  expect((await custom.getByText('กิจกรรมใหม่ที่ไม่มีในรายการ').count()) === 1, 'sub line on the custom card')
  expect((await page.getByRole('button', { name: 'เพิ่มเทมเพลต', exact: true }).count()) === 0, 'no add button any more')
  const lastCard = await page.getByRole('button', { name: /แลกขวด/ }).boundingBox()
  const customBox = await custom.boundingBox()
  expect(customBox.y > lastCard.y - 1, 'custom card sits after the built-in cards')
  await shot('1-picker')

  // Fill step 2 for a one-off activity. The switch on the review step decides whether a template is kept.
  const oneOff = async (title, keepTemplate) => {
    await openNew()
    await h1('เลือกประเภทกิจกรรม')
    await page.getByRole('button', { name: /^กำหนดเอง/ }).click()
    await h1('รายละเอียด')
    expect((await page.getByLabel('ชื่อกิจกรรม').inputValue()) === '', 'title starts empty')
    await page.getByLabel('ชื่อกิจกรรม').fill(title)
    await page.getByTestId('poster-file').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG })
    await page.getByRole('button', { name: 'เปลี่ยนรูปปก' }).locator('img').waitFor()
    await page.getByLabel('ชั่วโมงต่อคน').fill('4')
    await page.getByLabel('วันที่จัดกิจกรรม').fill(tomorrowYmd)
    await page.getByLabel('สถานที่', { exact: true }).fill('สนามกีฬากลาง')
    await page.getByRole('button', { name: 'ถัดไป', exact: true }).click()
    await h1('ตรวจและเผยแพร่')
    await page.getByText('ใช้ซ้ำได้ในครั้งถัดไป').waitFor()
    const sw = page.getByRole('switch', { name: 'บันทึกเป็นเทมเพลต' })
    expect((await sw.getAttribute('aria-checked')) === 'false', 'switch starts off')
    if (keepTemplate) await sw.click()
    expect((await sw.getAttribute('aria-checked')) === String(keepTemplate), 'switch state')
    return sw
  }

  // A one-off activity with the switch off: published, no template kept.
  await oneOff('ค่ายอาสาเล็ก', false)
  await shot('2-review-off')
  await page.getByRole('button', { name: 'เผยแพร่', exact: true }).click()
  await page.waitForURL(/#\/sup\/a\/[0-9a-z]{10}$/)
  // Let the manage page finish loading before leaving it, or the editor is still on screen when the next step opens it again.
  await page.getByText('กิจกรรมทั้งหมด').first().waitFor()
  let db = await stored()
  const plainId = page.url().split('/').pop()
  expect(db.activities[plainId].categoryKey === 'other' && !db.activities[plainId].templateId, 'one-off activity filed under อื่น ๆ without a template')
  expect(Object.keys(db.templates ?? {}).length === 0, 'no template saved when the switch is off')

  // A one-off activity with the switch on: the template is saved from the same fields.
  await oneOff('ช่วยงานกีฬาสี', true)
  await shot('3-review-on')
  await page.getByRole('button', { name: 'เผยแพร่', exact: true }).click()
  await page.waitForURL(/#\/sup\/a\/[0-9a-z]{10}$/)
  await page.getByText('กิจกรรมทั้งหมด').first().waitFor()
  const actId = page.url().split('/').pop()
  db = await stored()
  const made = db.activities[actId]
  expect(made.categoryKey === 'other' && !made.templateId && made.hours === 4 && made.title === 'ช่วยงานกีฬาสี', `activity: ${JSON.stringify({ ...made, poster: '' })}`)
  const tpls = Object.values(db.templates ?? {})
  expect(
    tpls.length === 1 && tpls[0].title === 'ช่วยงานกีฬาสี' && tpls[0].hours === 4 && tpls[0].orgCode === 'NUVOL69',
    `stored template: ${JSON.stringify({ ...tpls[0], poster: '' })}`,
  )
  expect(tpls[0].poster.startsWith('data:image/jpeg'), 'uploaded photo kept as a jpeg data url')
  const tplId = tpls[0].id

  // The saved template is reusable from the picker: it fills step 2 like a built-in.
  await openNew()
  await h1('เลือกประเภทกิจกรรม')
  await page.getByRole('button', { name: 'ช่วยงานกีฬาสี', exact: true }).click()
  await h1('รายละเอียด')
  expect((await page.getByLabel('ชั่วโมงต่อคน').inputValue()) === '4', 'hours from the template')
  expect((await page.getByLabel('ชื่อกิจกรรม').inputValue()) === '', 'title starts empty')
  await shot('4-picked-template')

  // Edit from the "..." button.
  await openNew()
  await h1('เลือกประเภทกิจกรรม')
  await page.getByRole('button', { name: 'ตัวเลือกของ ช่วยงานกีฬาสี' }).click()
  const menu = page.getByRole('dialog', { name: 'ช่วยงานกีฬาสี' })
  await menu.getByRole('button', { name: 'ลบ', exact: true }).waitFor()
  await shot('5-menu')
  await menu.getByRole('button', { name: 'แก้ไข', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'แก้ไขเทมเพลต' })
  await edit.waitFor()
  expect((await edit.getByLabel('ชื่อกิจกรรม').inputValue()) === 'ช่วยงานกีฬาสี', 'form starts from the saved template')
  await edit.getByLabel('ชื่อกิจกรรม').fill('ช่วยงานกีฬา')
  await edit.getByLabel('ชั่วโมงต่อคน').fill('5')
  await edit.getByRole('button', { name: 'บันทึกเทมเพลต', exact: true }).click()
  await edit.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'ช่วยงานกีฬา', exact: true }).waitFor()
  db = await stored()
  expect(db.templates[tplId].title === 'ช่วยงานกีฬา' && db.templates[tplId].hours === 5, 'edit saved')
  expect(db.activities[actId].hours === 4, 'activities already made keep their own hours')

  // Long press opens the same choices; delete asks first.
  const target = page.getByRole('button', { name: 'ช่วยงานกีฬา', exact: true })
  const tb = await target.boundingBox()
  await page.mouse.move(tb.x + tb.width / 2, tb.y + 40)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
  const menu2 = page.getByRole('dialog', { name: 'ช่วยงานกีฬา' })
  await menu2.waitFor()
  expect((await page.getByRole('heading', { level: 1, name: 'เลือกประเภทกิจกรรม' }).count()) === 1, 'long press did not pick the template')
  await menu2.getByRole('button', { name: 'ลบ', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: 'ลบเทมเพลตนี้ไหม' })
  await confirm.waitFor()
  await shot('6-delete')
  await confirm.getByRole('button', { name: 'ยกเลิก' }).click()
  await confirm.waitFor({ state: 'detached' })
  expect(Object.keys((await stored()).templates).length === 1, 'cancel keeps the template')
  await page.getByRole('button', { name: 'ตัวเลือกของ ช่วยงานกีฬา' }).click()
  await page.getByRole('dialog', { name: 'ช่วยงานกีฬา' }).getByRole('button', { name: 'ลบ', exact: true }).click()
  await page.getByRole('dialog', { name: 'ลบเทมเพลตนี้ไหม' }).getByRole('button', { name: 'ลบเทมเพลต' }).click()
  await page.getByRole('button', { name: 'ตัวเลือกของ ช่วยงานกีฬา' }).waitFor({ state: 'detached' })
  db = await stored()
  expect(Object.keys(db.templates).length === 0, 'template deleted')
  expect(db.activities[actId].categoryKey === 'other' && !db.activities[actId].templateId, 'the activity made from a one-off stays')
  await shot('7-after-delete')

  // The built-in cards have no menu.
  expect((await page.getByRole('button', { name: /^ตัวเลือกของ/ }).count()) === 0, 'built-in templates have no options')

  expect(problems.length === 0, `console errors: ${problems.join(' | ')}`)
  await ctx.close()
}
