// Supervisor-made templates at 390x844, dark: the round add button under the cards, the create form with an uploaded photo,
// the new card preselected, an activity made from it (category "อื่น ๆ", templateId saved), the student home filter chip,
// edit and delete from the "..." button and from a long press. Screenshots in out/template-*.png.
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
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('nuv:db')))

  await page.goto(`${base}#/sup/login`)
  await page.getByLabel('ชื่อผู้ดูแล').fill('พี่เต้')
  await page.getByLabel('รหัส', { exact: true }).fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.waitForURL(/#\/sup$/)

  // The add button: a circle of about 64px, centred under the cards, with its label.
  await page.goto(`${base}#/sup/new`)
  await h1('เลือกเทมเพลต')
  const add = page.getByRole('button', { name: 'เพิ่มกิจกรรม', exact: true })
  await add.waitFor()
  const box = await add.boundingBox()
  expect(Math.abs(box.width - 64) <= 1 && Math.abs(box.height - 64) <= 1, `add button is ${box.width}x${box.height}`)
  expect(Math.abs(box.x + box.width / 2 - 195) <= 1, `add button centre is ${box.x + box.width / 2}`)
  const lastCard = await page.getByRole('button', { name: /แลกขวด/ }).boundingBox()
  expect(box.y > lastCard.y + lastCard.height, 'add button sits under the cards')
  const radius = await add.evaluate((el) => getComputedStyle(el).borderRadius)
  expect(parseFloat(radius) >= 32, `add button is round (${radius})`)
  expect((await page.getByText('เพิ่มกิจกรรม', { exact: true }).count()) >= 1, 'label shown')
  await shot('1-picker')

  // Create: validation first, then the uploaded photo, hours and a capacity limit.
  await add.click()
  const form = page.getByRole('dialog', { name: 'เพิ่มกิจกรรม' })
  await form.waitFor()
  await form.getByRole('button', { name: 'บันทึกเทมเพลต' }).click()
  await form.getByText('ใส่ชื่อกิจกรรม').waitFor()
  await form.getByText('เลือกรูปปก').waitFor()
  await form.getByLabel('ชื่อกิจกรรม').fill('ช่วยงานกีฬาสี')
  await form.getByTestId('template-file').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG })
  await form.getByRole('button', { name: 'เปลี่ยนรูปปก' }).waitFor()
  await form.getByLabel('ชั่วโมงต่อคน').fill('4')
  await form.locator('textarea').fill('ช่วยจัดสนามและแจกน้ำ')
  await form.getByRole('switch', { name: 'จำกัดจำนวน' }).click()
  await form.getByLabel('รับได้กี่คน').fill('12')
  await shot('2-form')
  await form.getByRole('button', { name: 'บันทึกเทมเพลต' }).click()
  await form.waitFor({ state: 'detached' })

  // The card shows up right away and is preselected; the flow stays on the picker.
  const card = page.getByRole('button', { name: /ช่วยงานกีฬาสี/ }).first()
  await card.waitFor()
  expect((await card.getAttribute('aria-pressed')) === 'true', 'new template is preselected')
  await h1('เลือกเทมเพลต')
  expect((await page.getByRole('button', { name: 'เพิ่มกิจกรรม', exact: true }).count()) === 1, 'add button still there')
  await shot('3-card')
  let db = await stored()
  const tpls = Object.values(db.templates)
  expect(tpls.length === 1 && tpls[0].orgCode === 'NUVOL69' && tpls[0].hours === 4 && tpls[0].settings.capLimit && tpls[0].settings.capacity === 12, `stored template: ${JSON.stringify(tpls)}`)
  expect(tpls[0].poster.startsWith('data:image/jpeg'), 'uploaded photo kept as a jpeg data url')
  const tplId = tpls[0].id

  // Using it fills step 2 like a built-in; the activity is filed under "อื่น ๆ".
  await card.click()
  await h1('รายละเอียด')
  expect((await page.getByLabel('ชั่วโมงต่อคน').inputValue()) === '4', 'hours from the template')
  expect((await page.getByLabel('ชื่อกิจกรรม').inputValue()) === '', 'title starts empty')
  const poster = await page.getByRole('button', { name: 'เปลี่ยนรูปปก' }).locator('img').getAttribute('src')
  expect(poster === tpls[0].poster, 'poster is the template photo')
  await page.getByText('ช่วยจัดสนามและแจกน้ำ').waitFor()
  await page.getByRole('button', { name: /ตั้งค่าเพิ่มเติม/ }).click()
  expect((await page.getByRole('switch', { name: 'จำกัดจำนวน' }).getAttribute('aria-checked')) === 'true', 'capacity limit from the template')
  expect((await page.getByLabel('รับได้กี่คน').inputValue()) === '12', 'capacity from the template')
  const tomorrow = new Date(Date.now() + 86_400_000)
  await page.getByLabel('ชื่อกิจกรรม').fill('ช่วยงานกีฬาสี คณะวิทย์')
  await page.getByLabel('วันที่จัดกิจกรรม').fill(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`)
  await page.getByLabel('สถานที่', { exact: true }).fill('สนามกีฬากลาง')
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click()
  await h1('ตรวจและเผยแพร่')
  await page.getByText('อื่น ๆ').first().waitFor()
  await shot('4-review')
  await page.getByRole('button', { name: 'เผยแพร่', exact: true }).click()
  await page.waitForURL(/#\/sup\/a\/[0-9a-z]{10}$/)
  const actId = page.url().split('/').pop()
  db = await stored()
  const made = db.activities[actId]
  expect(made.categoryKey === 'other' && made.templateId === tplId && made.hours === 4 && made.capacity === 12 && made.poster === tpls[0].poster, `activity: ${JSON.stringify({ ...made, poster: '' })}`)

  // Student home: the "อื่น ๆ" chip appears and filters to the activity.
  await page.goto(`${base}#/welcome`)
  await page.getByLabel('รหัสนิสิต').fill('65010088')
  await page.getByLabel('ชื่อ-นามสกุล').fill('สมศรี ใจงาม')
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click()
  await page.getByRole('link', { name: 'หน้าแรก' }).click()
  await page.getByRole('link', { name: /ช่วยงานกีฬาสี คณะวิทย์/ }).first().waitFor()
  const chip = page.getByRole('button', { name: 'อื่น ๆ', exact: true })
  await chip.click()
  await page.getByText('พบ 1 กิจกรรม').waitFor()
  await shot('5-student-chip')
  await page.getByRole('link', { name: /ช่วยงานกีฬาสี คณะวิทย์/ }).click()
  await page.getByRole('heading', { name: 'ช่วยงานกีฬาสี คณะวิทย์' }).waitFor()
  expect((await page.getByText('อื่น ๆ', { exact: true }).count()) >= 1, 'detail shows the category')

  // Edit from the "..." button.
  await page.goto(`${base}#/sup/new`)
  await h1('เลือกเทมเพลต')
  await page.getByRole('button', { name: 'ตัวเลือกของ ช่วยงานกีฬาสี' }).click()
  const menu = page.getByRole('dialog', { name: 'ช่วยงานกีฬาสี' })
  await menu.getByRole('button', { name: 'ลบ', exact: true }).waitFor()
  await shot('6-menu')
  await menu.getByRole('button', { name: 'แก้ไข', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'แก้ไขเทมเพลต' })
  await edit.waitFor()
  expect((await edit.getByLabel('ชื่อกิจกรรม').inputValue()) === 'ช่วยงานกีฬาสี', 'form starts from the saved template')
  expect((await edit.getByLabel('รับได้กี่คน').inputValue()) === '12', 'saved capacity shown')
  await edit.getByLabel('ชื่อกิจกรรม').fill('ช่วยงานกีฬา')
  await edit.getByLabel('ชั่วโมงต่อคน').fill('5')
  await edit.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await edit.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: /ช่วยงานกีฬา$|ช่วยงานกีฬา 5/ }).first().waitFor()
  db = await stored()
  expect(db.templates[tplId].title === 'ช่วยงานกีฬา' && db.templates[tplId].hours === 5, 'edit saved')
  expect(db.activities[actId].hours === 4, 'activities already made keep their own hours')

  // Long press opens the same choices; delete asks first.
  const target = page.getByRole('button', { name: /^ช่วยงานกีฬา/ }).first()
  const tb = await target.boundingBox()
  await page.mouse.move(tb.x + tb.width / 2, tb.y + 40)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
  const menu2 = page.getByRole('dialog', { name: 'ช่วยงานกีฬา' })
  await menu2.waitFor()
  expect((await page.getByRole('heading', { level: 1, name: 'เลือกเทมเพลต' }).count()) === 1, 'long press did not pick the template')
  await menu2.getByRole('button', { name: 'ลบ', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: 'ลบเทมเพลตนี้ไหม' })
  await confirm.waitFor()
  await shot('7-delete')
  await confirm.getByRole('button', { name: 'ยกเลิก' }).click()
  await confirm.waitFor({ state: 'detached' })
  expect(Object.keys((await stored()).templates).length === 1, 'cancel keeps the template')
  await page.getByRole('button', { name: 'ตัวเลือกของ ช่วยงานกีฬา' }).click()
  await page.getByRole('dialog', { name: 'ช่วยงานกีฬา' }).getByRole('button', { name: 'ลบ', exact: true }).click()
  await page.getByRole('dialog', { name: 'ลบเทมเพลตนี้ไหม' }).getByRole('button', { name: 'ลบเทมเพลต' }).click()
  await page.getByRole('button', { name: 'ตัวเลือกของ ช่วยงานกีฬา' }).waitFor({ state: 'detached' })
  db = await stored()
  expect(Object.keys(db.templates).length === 0, 'template deleted')
  expect(db.activities[actId].templateId === tplId, 'the activity made from it stays')
  await shot('8-after-delete')

  // The built-in cards have no menu.
  expect((await page.getByRole('button', { name: /^ตัวเลือกของ/ }).count()) === 0, 'built-in templates have no options')

  expect(problems.length === 0, `console errors: ${problems.join(' | ')}`)
  await ctx.close()
}
