import { describe, expect, it } from 'vitest'
import { canEdit, closedAt, daysToSubmit, stage, STAGE_LABEL, submitDeadline } from './stage'
import type { Activity } from '../data/types'

const H = 3600_000
const DAY = 24 * H
const start = Date.UTC(2026, 10, 20, 1)
const end = start + 8 * H
const act = (extra: Partial<Activity> = {}) => ({ id: 'a', start, end, ...extra }) as Activity

describe('stage', () => {
  it('walks scheduled, open, live, closing, submit, waiting, done', () => {
    expect(stage(act({ opensAt: start - DAY }), start - 2 * DAY)).toBe('scheduled')
    expect(stage(act({ opensAt: start - DAY }), start - H)).toBe('open')
    expect(stage(act(), start - H)).toBe('open')
    expect(stage(act(), start)).toBe('live')
    expect(stage(act(), end + H)).toBe('closing')
    expect(stage(act({ closedAt: end + H }), end + 2 * H)).toBe('submit')
    expect(stage(act({ closedAt: end + H, submittedAt: end + 2 * H }), end + 3 * H)).toBe('waiting')
    expect(stage(act({ submittedAt: 1, recordedAt: 2 }), end + 3 * H)).toBe('done')
  })

  it('closes by itself 24 hours after the end', () => {
    expect(stage(act(), end + 24 * H - 1)).toBe('closing')
    expect(stage(act(), end + 24 * H)).toBe('submit')
    expect(closedAt(act(), end + 24 * H)).toBe(end + 24 * H)
    expect(closedAt(act(), end + H)).toBeUndefined()
    expect(closedAt(act({ closedAt: 5 }), end + H)).toBe(5)
  })
})

describe('STAGE_LABEL', () => {
  it('has a plain label for every stage', () => {
    expect(STAGE_LABEL.scheduled).toBe('ยังไม่เปิดรับ')
    expect(STAGE_LABEL.live).toBe('กำลังดำเนินการ')
    expect(STAGE_LABEL.closing).toBe('รอตรวจรายชื่อ')
    expect(STAGE_LABEL.submit).toBe('รอส่งรายชื่อ')
    expect(STAGE_LABEL.waiting).toBe('ส่งรายชื่อแล้ว')
    expect(STAGE_LABEL.done).toBe('บันทึกแล้ว')
  })
})

describe('submit deadline', () => {
  it('is 30 days after the end and counts whole days up', () => {
    expect(submitDeadline(act())).toBe(end + 30 * DAY)
    expect(daysToSubmit(act(), end + DAY)).toBe(29)
    expect(daysToSubmit(act(), end + 29 * DAY + H)).toBe(1)
    expect(daysToSubmit(act(), end + 31 * DAY)).toBe(-1)
  })
})

describe('canEdit', () => {
  it('is false once the roster is submitted or recorded', () => {
    expect(canEdit(act())).toBe(true)
    expect(canEdit(act({ closedAt: 1 }))).toBe(true)
    expect(canEdit(act({ submittedAt: 1 }))).toBe(false)
    expect(canEdit(act({ recordedAt: 1 }))).toBe(false)
  })
})
