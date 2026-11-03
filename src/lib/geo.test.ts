import { describe, expect, it } from 'vitest'
import { allowedRadius, distanceM } from './geo'

describe('geo', () => {
  it('caps each side accuracy at 100 m', () => expect(allowedRadius(250, 30)).toBe(280))
  it('is 150 m with perfect fixes', () => expect(allowedRadius(0, 0)).toBe(150))
  it('uses the radius the activity sets', () => expect(allowedRadius(10, 20, 300)).toBe(330))
  it('measures about 111 m per 0.001 degree of latitude', () => {
    const d = distanceM({ lat: 16.745, lng: 100.195 }, { lat: 16.746, lng: 100.195 })
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(112)
  })
})
