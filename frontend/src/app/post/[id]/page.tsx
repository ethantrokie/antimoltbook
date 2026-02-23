'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { api, Post } from '@/lib/api'
import PostCard from '@/components/PostCard'
import ComposeBox from '@/components/ComposeBox'

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPost = useCallback(async () => {
    try {
      const data = await api.getPost(id)
      setPost(data.post)
      setReplies(data.replies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post')
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    fetchPost().finally(() => setLoading(false))
  }, [fetchPost])

  const handleLike = async (postId: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    const targetPost = postId === post?.id ? post : replies.find((r) => r.id === postId)
    if (!targetPost) return

    try {
      if (targetPost.liked_by_me) {
        await api.unlikePost(postId)
        if (postId === post?.id) {
          setPost((prev) => prev ? { ...prev, liked_by_me: false, like_count: prev.like_count - 1 } : prev)
        } else {
          setReplies((prev) =>
            prev.map((r) =>
              r.id === postId ? { ...r, liked_by_me: false, like_count: r.like_count - 1 } : r
            )
          )
        }
      } else {
        await api.likePost(postId)
        if (postId === post?.id) {
          setPost((prev) => prev ? { ...prev, liked_by_me: true, like_count: prev.like_count + 1 } : prev)
        } else {
          setReplies((prev) =>
            prev.map((r) =>
              r.id === postId ? { ...r, liked_by_me: true, like_count: r.like_count + 1 } : r
            )
          )
        }
      }
    } catch {
      // fail silently
    }
  }

  const handleRepost = (postId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    // Could open repost modal; for now navigate to the post
    if (postId !== id) {
      router.push(`/post/${postId}`)
    }
  }

  const handleReply = (postId: string) => {
    if (postId !== id) {
      router.push(`/post/${postId}`)
    }
    // If it's the current post, scroll to compose box (handled by being on page)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-lg">{error || 'Post not found'}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-[#E5E5E5] px-4 py-3 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Post</h1>
        </div>
      </div>

      {/* Main Post */}
      <div className="border-b border-[#E5E5E5]">
        <PostCard
          post={post}
          onLike={handleLike}
          onRepost={handleRepost}
          onReply={handleReply}
        />
      </div>

      {/* Reply Compose */}
      {user && (
        <ComposeBox
          onPostCreated={() => fetchPost()}
          replyTo={id}
          placeholder={`Reply to @${post.author.username}...`}
        />
      )}

      {/* Replies */}
      {replies.length > 0 ? (
        <div className="divide-y divide-[#E5E5E5]">
          {replies.map((reply) => (
            <div key={reply.id}>
              <PostCard
                post={reply}
                onLike={handleLike}
                onRepost={handleRepost}
                onReply={handleReply}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-gray-500">No replies yet</p>
        </div>
      )}
    </div>
  )
}
