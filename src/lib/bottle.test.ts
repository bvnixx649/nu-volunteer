import { describe, expect, it } from 'vitest'
import { bottleHours, bottleRemainder } from './bottle'

describe('bottleHours', () => {
  it('counts whole hours', () => {
    expect(bottleHours(0, 20, 5)).toBe(0)
    expect(bottleHours(19, 20, 5)).toBe(0)
    expect(bottleHours(20, 20, 5)).toBe(1)
    expect(bottleHours(45, 20, 5)).toBe(2)
    expect(bottleHours(60, 20, 5)).toBe(3)
  })
  it('stops at the maximum', () => {
    expect(bottleHours(500, 20, 5)).toBe(5)
  })
  it('ignores bad input', () => {
    expect(bottleHours(-3, 20, 5)).toBe(0)
    expect(bottleHours(30, 0, 5)).toBe(0)
  })
})

describe('bottleRemainder', () => {
  it('says how many more bottles earn the next hour', () => {
    expect(bottleRemainder(0, 20, 5)).toBe(20)
    expect(bottleRemainder(45, 20, 5)).toBe(15)
    expect(bottleRemainder(60, 20, 5)).toBe(20)
  })
  it('is null at the maximum', () => {
    expect(bottleRemainder(100, 20, 5)).toBeNull()
    expect(bottleRemainder(130, 20, 5)).toBeNull()
  })
})
