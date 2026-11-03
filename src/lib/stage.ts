import { now as serverNow } from '../data/api'
import type { Activity } from '../data/types'
import { AUTO_CLOSE_H, SUBMIT_DAYS } from '../config'

const H = 3600_000
const DAY = 24 * H

/**
 * Where an activity is in the supervisor's workflow.
 * scheduled > open > live > closing > submit > waiting (centre recording) > done
 */
export type Stage = 'scheduled' | 'open' | 'live' | 'closing' | 'submit' | 'waiting' | 'done'

export const STEPS = ['รอเปิดรับ', 'เปิดรับ', 'กำลังจัด', 'ปิดรายชื่อ', 'ส่งรายชื่อ', 'บันทึกแล้ว'] as const

/** Roster close time: set by the supervisor, or AUTO_CLOSE_H after the end. */
export function closedAt(a: Activity, now = serverNow()) {
  if (a.closedAt) return a.closedAt
  const auto = a.end + AUTO_CLOSE_H * H
  return now >= auto ? auto : undefined
}

export function stage(a: Activity, now = serverNow()): Stage {
  if (a.recordedAt) return 'done'
  if (a.submittedAt) return 'waiting'
  if (now > a.end) return closedAt(a, now) ? 'submit' : 'closing'
  if (now >= a.start) return 'live'
  if (a.opensAt && now < a.opensAt) return 'scheduled'
  return 'open'
}

/** Index of the current step in STEPS, and whether that step is finished. */
export function stepOf(s: Stage): { index: number; done: boolean } {
  switch (s) {
    case 'scheduled':
      return { index: 0, done: false }
    case 'open':
      return { index: 1, done: false }
    case 'live':
      return { index: 2, done: false }
    case 'closing':
      return { index: 3, done: false }
    case 'submit':
      return { index: 4, done: false }
    case 'waiting':
      return { index: 5, done: false }
    case 'done':
      return { index: 5, done: true }
  }
}

export const STAGE_LABEL: Record<Stage, string> = {
  scheduled: 'รอเปิดรับ',
  open: 'เปิดรับสมัคร',
  live: 'กำลังจัด',
  closing: 'รอปิดรายชื่อ',
  submit: 'รอส่งรายชื่อ',
  waiting: 'รอศูนย์บันทึก',
  done: 'บันทึกแล้ว',
}

export function submitDeadline(a: Activity) {
  return a.end + SUBMIT_DAYS * DAY
}

/** Whole days left until the roster must be sent (negative when late). */
export function daysToSubmit(a: Activity, now = serverNow()) {
  return Math.ceil((submitDeadline(a) - now) / DAY)
}

/** The supervisor can change the roster until it is sent to the centre. */
export function canEdit(a: Activity) {
  return !a.submittedAt && !a.recordedAt
}
