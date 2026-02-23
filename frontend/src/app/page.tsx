'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { api, Post } from '@/lib/api'
import ComposeBox from '@/components/ComposeBox'
import PostCard from '@/components/PostCard'

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [feedLoading, setFeedLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFeed = useCallback(async (offset?: number) => {
    try {
      const res = await api.getHomeFeed(offset)
      if (offset) {
        setPosts((prev) => [...prev, ...res.posts])
      } else {
        setPosts(res.posts)
      }
      setNextOffset(res.next_offset)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    }
  }, [])

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push('/explore')
      return
    }

    setFeedLoading(true)
    fetchFeed().finally(() => setFeedLoading(false))
  }, [user, isLoading, router, fetchFeed])

  const handleLoadMore = async () => {
    if (nextOffset === null || loadingMore) return
    setLoadingMore(true)
    await fetchFeed(nextOffset)
    setLoadingMore(false)
  }

  const handleLike = async (id: string) => {
    const post = posts.find((p) => p.id === id)
    if (!post) return

    try {
      if (post.liked_by_me) {
        await api.unlikePost(id)
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, liked_by_me: false, like_count: p.like_count - 1 } : p
          )
        )
      } else {
        await api.likePost(id)
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, liked_by_me: true, like_count: p.like_count + 1 } : p
          )
        )
      }
    } catch {
      // Silently fail
    }
  }

  const handleRepost = async (id: string) => {
    try {
      const challenge = await api.getChallenge()
      // For simplicity, we'd normally show a modal. Here we open post page for repost.
      router.push(`/post/${id}`)
    } catch {
      // Silently fail
    }
  }

  const handleReply = (id: string) => {
    router.push(`/post/${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-[#E5E5E5] px-4 py-3 z-10">
        <h1 className="text-xl font-bold">Home</h1>
      </div>

      {/* Compose */}
      <ComposeBox onPostCreated={() => fetchFeed()} />

      {/* Feed */}
      {feedLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-500">{error}</div>
      ) : posts.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 text-lg">Follow some people to see posts here</p>
          <a href="/explore" className="text-[#FF8C42] hover:underline mt-2 inline-block">
            Explore posts
          </a>
        </div>
      ) : (
        <div className="divide-y divide-[#E5E5E5]">
          {posts.map((post) => (
            <div key={post.id} className="px-0">
              <PostCard
                post={post}
                onLike={handleLike}
                onRepost={handleRepost}
                onReply={handleReply}
              />
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {nextOffset !== null && (
        <div className="p-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 text-[#FF8C42] hover:bg-[#FFF0E0] rounded-full transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
