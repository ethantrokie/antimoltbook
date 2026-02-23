import { describe, it, expect } from 'vitest'
import { api } from '@/lib/api'

describe('ApiClient', () => {
  it('has all required auth methods', () => {
    expect(api.login).toBeDefined()
    expect(api.register).toBeDefined()
    expect(api.refresh).toBeDefined()
  })

  it('has all required post methods', () => {
    expect(api.getGlobalFeed).toBeDefined()
    expect(api.getHomeFeed).toBeDefined()
    expect(api.createPost).toBeDefined()
    expect(api.getPost).toBeDefined()
    expect(api.deletePost).toBeDefined()
    expect(api.likePost).toBeDefined()
    expect(api.unlikePost).toBeDefined()
    expect(api.repost).toBeDefined()
    expect(api.reply).toBeDefined()
  })

  it('has all required user methods', () => {
    expect(api.getUser).toBeDefined()
    expect(api.updateProfile).toBeDefined()
    expect(api.follow).toBeDefined()
    expect(api.unfollow).toBeDefined()
  })

  it('has all required captcha methods', () => {
    expect(api.getChallenge).toBeDefined()
    expect(api.submitChallenge).toBeDefined()
    expect(api.getReviewQueue).toBeDefined()
    expect(api.submitReview).toBeDefined()
  })

  it('has media upload method', () => {
    expect(api.uploadMedia).toBeDefined()
  })

  it('can set and get token', () => {
    api.setToken('test-token')
    expect(api.getToken()).toBe('test-token')
    api.setToken(null)
    expect(api.getToken()).toBeNull()
  })
})
