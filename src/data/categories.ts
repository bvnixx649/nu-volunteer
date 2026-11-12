import type { CategoryKey, LocMode, QrMode } from './types'

export interface CategoryPreset {
  label: string
  hours: number
  capLimit: boolean
  capacity: number
  walkIn: boolean
  qrMode: QrMode
  locMode: LocMode
  radius: number
  qrInterval: number
  /** Bottle exchange: bottles that make one hour. `hours` is then the most one person can get. */
  itemsPerHour?: number
  /** Extra reasons for cutting someone's hours, on top of COMMON_REASONS. */
  reasons: string[]
  description: string
  posters: string[]
}

/** Reasons every category offers when a supervisor lowers someone's hours. "อื่น ๆ" opens a text field. */
export const COMMON_REASONS = ['มาสาย', 'กลับก่อน', 'ช่วยไม่ครบเวลา']

const p = (...names: string[]) => names.map((n) => `./posters/${n}.jpg`)

/** Presets only: picking a category fills the editor, and every field stays editable. SPEC section 7. */
export const CATEGORIES: Record<CategoryKey, CategoryPreset> = {
  blood: {
    label: 'บริจาคโลหิต',
    hours: 6,
    capLimit: false,
    capacity: 0,
    walkIn: true,
    qrMode: 'dynamic',
    locMode: 'on',
    radius: 150,
    qrInterval: 10,
    reasons: [],
    description:
      'สิ่งที่ต้องเตรียม: บัตรนิสิต นอนหลับให้พอ และทานอาหารก่อนมา\nผู้บริจาคอายุ 17 ปีขึ้นไป น้ำหนัก 45 กิโลกรัมขึ้นไป สุขภาพแข็งแรง\nคนที่ไม่ผ่านการคัดกรองก็ได้ชั่วโมงเต็ม',
    posters: p('blood', 'blood-2', 'blood-3', 'blood-4', 'blood-5'),
  },
  setup: {
    label: 'จัดสถานที่',
    hours: 5,
    capLimit: true,
    capacity: 20,
    walkIn: false,
    qrMode: 'dynamic',
    locMode: 'on',
    radius: 150,
    qrInterval: 10,
    reasons: [],
    description: 'หน้าที่: จัดโต๊ะ เก้าอี้ เวที ป้าย และเก็บสถานที่หลังจบงาน\nสิ่งที่ต้องเตรียม: ชุดสุภาพที่ยกของได้ และขวดน้ำ\nมาตรงเวลาเพื่อแบ่งหน้าที่',
    posters: p('setup-3', 'setup-2', 'grad', 'wai'),
  },
  bottle: {
    label: 'แลกขวด',
    hours: 5,
    capLimit: false,
    capacity: 0,
    walkIn: true,
    qrMode: 'static',
    locMode: 'off',
    radius: 150,
    qrInterval: 10,
    itemsPerHour: 20,
    reasons: ['นับขวดใหม่'],
    description: 'นำขวดพลาสติกที่ล้างสะอาดแล้วมาที่จุดรับในเวลากิจกรรม\nเจ้าหน้าที่นับขวดและบันทึกชั่วโมงให้ที่โต๊ะ ไม่ต้องสแกน QR',
    posters: p('bottle', 'bottle-2', 'bottle-3'),
  },
  // Activities made from a supervisor's own template. The values come from the template, so these are only a fallback.
  other: {
    label: 'อื่น ๆ',
    hours: 3,
    capLimit: false,
    capacity: 0,
    walkIn: false,
    qrMode: 'dynamic',
    locMode: 'on',
    radius: 150,
    qrInterval: 10,
    reasons: [],
    description: '',
    posters: [],
  },
}

/** Every key, for labels, filters and stats. */
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[]
/** The templates built into the app, in the order the picker shows them. "อื่น ๆ" has no card: it comes from custom templates. */
export const BUILTIN_KEYS = CATEGORY_KEYS.filter((k) => k !== 'other')

/** Preset for an activity's key. Old rows may still carry a removed key, so unknown keys fall back to blood. */
export const categoryOf = (key: string): CategoryPreset => (CATEGORIES as Record<string, CategoryPreset>)[key] ?? CATEGORIES.blood
