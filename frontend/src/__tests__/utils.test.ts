import { describe, it, expect } from 'vitest'
import { timeAgo } from '@/lib/utils'

describe('timeAgo', () => {
  it('returns "just now" for recent dates', () => {
    const now = new Date().toISOString()
    expect(timeAgo(now)).toBe('0s')
  })

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(timeAgo(fiveMinAgo)).toBe('5m')
  })

  it('returns hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(twoHoursAgo)).toBe('2h')
  })

  it('returns days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(threeDaysAgo)).toBe('3d')
  })
})
