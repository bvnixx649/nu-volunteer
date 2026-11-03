import { CATEGORIES } from './categories'
import type { LocalDb } from './local'
import type { Activity } from './types'

/**
 * Test data for development: two supervisor codes and one blood-donation activity running today.
 * Loaded into local storage in dev only; scripts/seed-test.mjs will push the same data to Firestore.
 */
export function FIXTURE(today = new Date()): Partial<LocalDb> {
  const at = (h: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), h).getTime()
  const blood = CATEGORIES.blood
  const activity: Activity = {
    id: 'test-blood',
    title: 'บริจาคโลหิต ครั้งที่ 2/2569',
    categoryKey: 'blood',
    org: 'ศูนย์จิตอาสา กองกิจการนิสิต',
    orgCode: 'BLOOD69',
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
    supervisor: { name: 'ศูนย์จิตอาสา', phone: '055961234' },
    chatEnabled: false,
    createdAt: at(0),
    regCount: 0,
    creditCount: 0,
  }
  return {
    orgs: {
      BLOOD69: { code: 'BLOOD69', name: 'ศูนย์จิตอาสา กองกิจการนิสิต', admin: false },
      NUADMIN: { code: 'NUADMIN', name: 'ศูนย์จิตอาสา กองกิจการนิสิต', admin: true },
    },
    activities: { [activity.id]: activity },
  }
}
