import { describe, expect, it } from 'vitest'
import { itemLabel } from './labels'

describe('itemLabel', () => {
  it.each([
    ['verbs:write', 'write'],
    ['vocab:instruments:oscilloscope', 'oscilloscope'],
    ['vocab:trap:cache', 'cache'],
    ['spelling:letter:H', 'lettera H'],
    ['spelling:code:CAN FD', 'CAN FD'],
    ['numbers:L1:teen-ty', '-teen / -ty'],
    ['numbers:L5:time-unit', 'tempi (ns, µs, ms)'],
  ])('%s → %s', (id, label) => {
    expect(itemLabel(id)).toBe(label)
  })
})
