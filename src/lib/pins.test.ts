import { describe, expect, it } from 'vitest'
import { PINS_KEY, readPins, togglePinned, writePins } from './pins'

/** A tiny in-memory Storage, enough for the pin functions. */
const memory = (initial?: string) => {
  const m = new Map<string, string>(initial ? [[PINS_KEY, initial]] : [])
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  } as unknown as Storage
}

describe('pins', () => {
  it('reads an empty list when nothing is stored', () => {
    expect(readPins(memory())).toEqual([])
  })

  it('reads only string ids from a stored list', () => {
    expect(readPins(memory('["a","b",3,null]'))).toEqual(['a', 'b'])
  })

  it('reads nothing from a value that is not a list, or is not JSON', () => {
    expect(readPins(memory('{"a":1}'))).toEqual([])
    expect(readPins(memory('not json'))).toEqual([])
  })

  it('reads nothing when storage throws or is missing', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage
    expect(readPins(broken)).toEqual([])
    expect(readPins(undefined)).toEqual([])
  })

  it('writes the ids under the pins key and survives a blocked storage', () => {
    const s = memory()
    writePins(['x', 'y'], s)
    expect(readPins(s)).toEqual(['x', 'y'])
    const blocked = {
      setItem: () => {
        throw new Error('full')
      },
    } as unknown as Storage
    expect(() => writePins(['x'], blocked)).not.toThrow()
  })

  it('pins an activity that is not pinned, and unpins one that is', () => {
    expect(togglePinned([], 'a')).toEqual(['a'])
    expect(togglePinned(['a', 'b'], 'a')).toEqual(['b'])
    expect(togglePinned(['a'], 'b')).toEqual(['a', 'b'])
  })
})
