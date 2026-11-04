// Shared set-up for the supervisor home, overview and QR-reveal specs (local mode only).
// Starts from the app's own fixture (blood drive today, river clean-up that ended 2 hours ago) and adds
// activities in every stage, so the home groups, calendar dots and statistics all have something to show.

const H = 3600_000

/** Opens the login page, rewrites the stored fixture, and reloads so the app reads it. */
export async function seedSupHome(page, base) {
  await page.goto(`${base}#/sup/login`)
  await page.waitForFunction(() => localStorage.getItem('nuv:db'))
  await page.evaluate((H) => {
    const db = JSON.parse(localStorage.getItem('nuv:db'))
    const blood = db.activities['test-blood']
    const ended = db.activities['test-ended']
    const now = Date.now()
    // Running now, with 7 people credited out of 20 registered and a seat limit of 300.
    Object.assign(blood, { start: now - H, end: now + 3 * H, creditCount: 7, regCount: 20, capLimit: true, capacity: 300 })
    db.regs ??= {}
    db.credits ??= {}
    const names = [
      ['66320087', 'ธนกร แสงทอง'],
      ['66310214', 'ศิริพร ทองดี'],
      ['66340112', 'ปวีณา ใจงาม'],
      ['66300451', 'กิตติพัฒน์ ศรีวงศ์'],
    ]
    db.regs['test-blood'] = Object.fromEntries(names.map(([id, name], i) => [id, { studentId: id, name, at: now - 30 * H + i }]))
    db.regs['test-blood']['66399999'] = { studentId: '66399999', name: 'ณัฐวุฒิ ไม่ได้ลงทะเบียน', at: now - 5 * 60_000, walkIn: true }
    db.credits['test-blood'] = Object.fromEntries(
      [...names.slice(0, 3), ['66399999', 'ณัฐวุฒิ ไม่ได้ลงทะเบียน']].map(([id, name], i) => [
        id,
        { studentId: id, name, hours: 6, fullHours: 6, at: now - (40 - i * 10) * 60_000, method: 'qr', flags: i === 1 ? ['location'] : [] },
      ]),
    )
    Object.assign(ended, { capLimit: true, capacity: 50 })
    const base = { ...blood, creditCount: 0, regCount: 0, capLimit: true, capacity: 100 }
    // Ended three days ago, roster closed: waits to be sent.
    db.activities['test-submit'] = { ...base, id: 'test-submit', title: 'ปลูกป่าชายเลน', start: now - 74 * H, end: now - 70 * H, closedAt: now - 60 * H, creditCount: 80, regCount: 90 }
    // Already sent to the centre.
    db.activities['test-sent'] = { ...base, id: 'test-sent', title: 'ทาสีอาคารเรียนโรงเรียนวัดจันทร์', start: now - 250 * H, end: now - 245 * H, closedAt: now - 230 * H, submittedAt: now - 200 * H, creditCount: 60, regCount: 70 }
    // Open for registration, two days away.
    db.activities['test-later'] = { ...base, id: 'test-later', title: 'บริจาคโลหิต ครั้งที่ 3/2569', start: now + 48 * H, end: now + 56 * H, regCount: 182, capacity: 300 }
    // Not open yet: registration opens in a week.
    db.activities['test-soon'] = { ...base, id: 'test-soon', title: 'ทาสีรั้วโรงเรียนบ้านท่าโพธิ์', start: now + 240 * H, end: now + 248 * H, opensAt: now + 168 * H }
    localStorage.setItem('nuv:db', JSON.stringify(db))
  }, H)
  await page.reload()
}

export async function loginAsSup(page) {
  await page.getByLabel('ชื่อผู้ดูแล').fill('พี่เต้')
  await page.getByLabel('รหัส', { exact: true }).fill('NUVOL69')
  await page.getByRole('button', { name: 'เข้าใช้งาน' }).click()
  await page.getByText('ผู้ดูแล พี่เต้').waitFor()
}
