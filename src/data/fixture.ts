import { CATEGORIES } from './categories'
import type { LocalDb } from './local'
import type { Activity, Credit, Registration } from './types'

/**
 * Test data for development: two supervisor codes, one blood-donation activity running today and one
 * river clean-up that ended 2 hours ago (roster still open, one no-show) for trying the closing flow.
 * Loaded into local storage in dev only; supabase/seed-test.sql inserts the same data into Supabase.
 */
export function FIXTURE(today = new Date()): Partial<LocalDb> {
  const at = (h: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), h).getTime()
  const blood = CATEGORIES.blood
  const activity: Activity = {
    id: 'test-blood',
    title: 'บริจาคโลหิต ครั้งที่ 2/2569',
    categoryKey: 'blood',
    org: 'ศูนย์จิตอาสา กองกิจการนิสิต',
    orgCode: 'NUVOL69',
    poster: blood.posters[0],
    description: blood.description,
    place: 'อาคารอเนกประสงค์ มหาวิทยาลัยนเรศวร',
    lat: 16.7466,
    lng: 100.1948,
    start: at(8),
    end: at(16),
    hours: blood.hours,
    capLimit: blood.capLimit,
    capacity: blood.capacity,
    walkIn: blood.walkIn,
    qrMode: blood.qrMode,
    locMode: blood.locMode,
    radius: blood.radius,
    qrInterval: blood.qrInterval,
    supervisor: { name: 'ศูนย์จิตอาสา', phone: '055961234' },
    chatEnabled: false,
    createdAt: at(0),
    regCount: 0,
    creditCount: 0,
  }

  const h = 3600_000
  const ended = today.getTime() - 2 * h
  const env = CATEGORIES.environment
  const done: Activity = {
    ...activity,
    id: 'test-ended',
    title: 'เก็บขยะริมแม่น้ำน่าน',
    categoryKey: 'environment',
    poster: env.posters[0],
    description: env.description,
    place: 'ท่าน้ำหน้ามหาวิทยาลัยนเรศวร',
    start: ended - 5 * h,
    end: ended,
    hours: env.hours,
    capLimit: env.capLimit,
    capacity: env.capacity,
    walkIn: env.walkIn,
    createdAt: ended - 72 * h,
    regCount: 4,
    creditCount: 3,
  }
  const people = [
    ['65030011', 'สมชาย ใจดี'],
    ['65030012', 'สมหญิง รักเรียน'],
    ['65030013', 'ธนากร แสงทอง'],
    ['65030014', 'ปวีณา มาสาย'],
  ]
  const regs: Record<string, Registration> = Object.fromEntries(
    people.map(([id, name], i) => [id, { studentId: id, name, at: ended - 48 * h + i * h, ...(i === 2 && { walkIn: true }) }]),
  )
  const credit = (i: number, extra: Partial<Credit> = {}): Credit => ({
    studentId: people[i][0],
    name: people[i][1],
    hours: done.hours,
    fullHours: done.hours,
    at: done.start + (i + 1) * 20 * 60_000,
    method: 'qr',
    flags: [],
    ...extra,
  })
  const credits: Record<string, Credit> = {
    [people[0][0]]: credit(0),
    [people[1][0]]: credit(1, { hours: 3, reason: 'กลับก่อน', editedBy: 'ศูนย์จิตอาสา', editedAt: ended }),
    [people[2][0]]: credit(2, { method: 'manual', editedBy: 'ศูนย์จิตอาสา' }),
  }
  // The fourth person registered and never came.

  return {
    orgs: {
      NUVOL69: { code: 'NUVOL69', name: 'ศูนย์จิตอาสา กองกิจการนิสิต', admin: false },
      NUADMIN: { code: 'NUADMIN', name: 'ศูนย์จิตอาสา กองกิจการนิสิต', admin: true },
    },
    activities: { [activity.id]: activity, [done.id]: done },
    regs: { [done.id]: regs },
    credits: { [done.id]: credits },
  }
}
