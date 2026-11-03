import { describe, expect, it } from 'vitest'
import { ATTEMPTS, dataUrlBytes, fitSize } from './image'

describe('fitSize', () => {
  it('scales the longer side down to the limit and keeps the ratio', () => {
    expect(fitSize(4000, 3000, 1000)).toEqual({ w: 1000, h: 750 })
    expect(fitSize(3000, 6000, 1500)).toEqual({ w: 750, h: 1500 })
  })
  it('never enlarges and never reaches 0', () => {
    expect(fitSize(800, 600, 1280)).toEqual({ w: 800, h: 600 })
    expect(fitSize(5000, 1, 100)).toEqual({ w: 100, h: 1 })
  })
})

describe('dataUrlBytes', () => {
  it('counts decoded bytes and takes padding off', () => {
    expect(dataUrlBytes('data:image/jpeg;base64,QUJD')).toBe(3)
    expect(dataUrlBytes('data:image/jpeg;base64,QUI=')).toBe(2)
    expect(dataUrlBytes('data:image/jpeg;base64,QQ==')).toBe(1)
  })
})

describe('ATTEMPTS', () => {
  it('only gets smaller', () => {
    for (let i = 1; i < ATTEMPTS.length; i++) {
      expect(ATTEMPTS[i][0]).toBeLessThan(ATTEMPTS[i - 1][0])
      expect(ATTEMPTS[i][1]).toBeLessThan(ATTEMPTS[i - 1][1])
    }
  })
})
