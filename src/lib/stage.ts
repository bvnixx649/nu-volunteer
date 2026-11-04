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

export const STAGE_LABEL: Record<Stage, string> = {
  scheduled: 'ยังไม่เปิดรับ',
  open: 'เปิดรับสมัคร',
  live: 'กำลังดำเนินการ',
  closing: 'รอตรวจสอบ',
  submit: 'รอส่งรายชื่อ',
  waiting: 'ส่งรายชื่อแล้ว',
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

/** SPEC 14.1: the roster and hours also stay open to the centre admin after the supervisor sent them, until recorded. */
export function canEditRoster(a: Activity, admin = false) {
  return admin ? !a.recordedAt : canEdit(a)
}
