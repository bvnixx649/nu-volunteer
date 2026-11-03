import type { CategoryKey, LocMode, QrMode } from './types'

export interface CategoryPreset {
  label: string
  hours: number
  capLimit: boolean
  capacity: number
  walkIn: boolean
  qrMode: QrMode
  locMode: LocMode
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
    locMode: 'flex',
    reasons: [],
    description:
      'สิ่งที่ต้องเตรียม: บัตรนิสิต นอนหลับให้พอ และทานอาหารก่อนมา\nผู้บริจาคอายุ 17 ปีขึ้นไป น้ำหนัก 45 กิโลกรัมขึ้นไป สุขภาพแข็งแรง\nคนที่ไม่ผ่านการคัดกรองก็ได้ชั่วโมงเต็ม',
    posters: p('blood'),
  },
  environment: {
    label: 'สิ่งแวดล้อม',
    hours: 5,
    capLimit: true,
    capacity: 50,
    walkIn: false,
    qrMode: 'dynamic',
    locMode: 'flex',
    reasons: [],
    description: 'สิ่งที่ต้องเตรียม: ชุดที่เปื้อนได้ หมวก และขวดน้ำ\nอุปกรณ์ทำงานมีให้ที่จุดนัดพบ',
    posters: p('river', 'tree', 'river-meet'),
  },
  ceremony: {
    label: 'ช่วยงานพิธี',
    hours: 5,
    capLimit: true,
    capacity: 30,
    walkIn: false,
    qrMode: 'dynamic',
    locMode: 'flex',
    reasons: [],
    description: 'แต่งกายชุดนิสิตถูกระเบียบ\nมาถึงก่อนเวลาเริ่มอย่างน้อย 30 นาทีเพื่อรับมอบหน้าที่',
    posters: p('wai', 'grad', 'orient'),
  },
  camp: {
    label: 'สอนและค่าย',
    hours: 18,
    capLimit: true,
    capacity: 30,
    walkIn: false,
    qrMode: 'dynamic',
    locMode: 'flex',
    reasons: ['อยู่ไม่ครบค่าย'],
    description: 'สิ่งที่ต้องเตรียม: ของใช้ส่วนตัวสำหรับค้างคืน และยาประจำตัว\nต้องอยู่ครบทุกวันของค่ายจึงได้ชั่วโมงเต็ม',
    posters: p('teach', 'camp'),
  },
  repair: {
    label: 'ซ่อมแซมและทาสี',
    hours: 9,
    capLimit: true,
    capacity: 30,
    walkIn: false,
    qrMode: 'dynamic',
    locMode: 'flex',
    reasons: [],
    description: 'สิ่งที่ต้องเตรียม: เสื้อผ้าที่เปื้อนสีได้ และรองเท้าหุ้มส้น\nอุปกรณ์และสีมีให้ที่หน้างาน',
    posters: p('paint', 'mural', 'dorm'),
  },
  recycle: {
    label: 'รีไซเคิลนับชิ้น',
    hours: 1,
    capLimit: false,
    capacity: 0,
    walkIn: true,
    qrMode: 'static',
    locMode: 'off',
    reasons: ['คิดตามจำนวนชิ้น'],
    description: 'นำขยะรีไซเคิลที่คัดแยกแล้วมาส่งที่จุดรับ\nชั่วโมงคิดตามจำนวนชิ้นที่นำมา',
    posters: [],
  },
  staff: {
    label: 'สตาฟงานและบูธ',
    hours: 5,
    capLimit: true,
    capacity: 20,
    walkIn: false,
    qrMode: 'dynamic',
    locMode: 'flex',
    reasons: [],
    description: 'แต่งกายสุภาพ มาถึงก่อนเวลาเริ่มเพื่อรับมอบหน้าที่\nมีอาหารกลางวันให้',
    posters: p('openhouse'),
  },
  other: {
    label: 'อื่น ๆ',
    hours: 1,
    capLimit: true,
    capacity: 30,
    walkIn: false,
    qrMode: 'dynamic',
    locMode: 'flex',
    reasons: [],
    description: '',
    posters: p('river', 'wai', 'paint', 'teach'),
  },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[]
