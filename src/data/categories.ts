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
    posters: p('blood'),
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
    description: 'สิ่งที่ต้องเตรียม: ชุดสุภาพที่ยกของได้ และขวดน้ำ\nงานจัดโต๊ะ เก้าอี้ ป้าย และเก็บสถานที่หลังจบงาน\nมาตรงเวลาเพื่อแบ่งหน้าที่',
    posters: p('openhouse', 'orient', 'grad'),
  },
  bottle: {
    label: 'เก็บขวด',
    hours: 1,
    capLimit: false,
    capacity: 0,
    walkIn: true,
    qrMode: 'static',
    locMode: 'off',
    radius: 150,
    qrInterval: 10,
    reasons: ['คิดตามจำนวนชิ้น'],
    description: 'นำขวดพลาสติกที่ล้างแล้วมาส่งที่จุดรับ\nผู้คุมนับจำนวนและให้ชั่วโมงตามจำนวนชิ้น\nสแกน QR ที่ติดไว้ตรงจุดรับได้เลย',
    posters: p('river', 'river-meet', 'tree'),
  },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[]

/** Preset for an activity's key. Old rows may still carry a removed key, so unknown keys fall back to blood. */
export const categoryOf = (key: string): CategoryPreset => (CATEGORIES as Record<string, CategoryPreset>)[key] ?? CATEGORIES.blood
