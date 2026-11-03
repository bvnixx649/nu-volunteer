import { beforeEach, describe, expect, it } from 'vitest'
import { resetLocal } from './data/local'
import { identify, useDevice } from './store'

beforeEach(() => resetLocal())

describe('identify', () => {
  it('creates a new student the first time', async () => {
    expect(await identify('65012345', '  สมชาย   ใจดี ')).toMatchObject({ kind: 'new', student: { name: 'สมชาย ใจดี' } })
  })
  it('returns the existing name and never overwrites it', async () => {
    await identify('65012345', 'สมชาย')
    expect(await identify('65012345', 'คนอื่น')).toMatchObject({ kind: 'existing', student: { name: 'สมชาย' } })
  })
})

describe('device', () => {
  it('has a device id that survives signing out', () => {
    const before = useDevice.getState().deviceId
    expect(before).toMatch(/[0-9a-f-]{36}/)
    useDevice.getState().setStudent('65012345')
    useDevice.getState().signOut()
    expect(useDevice.getState().studentId).toBeNull()
    expect(useDevice.getState().deviceId).toBe(before)
  })
})
