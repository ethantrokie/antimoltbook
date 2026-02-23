'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api, ReviewItem } from '@/lib/api'
import ReviewCard from '@/components/ReviewCard'

export default function ReviewPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [queue, setQueue] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    try {
      const data = await api.getReviewQueue()
      setQueue(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review queue')
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchQueue().finally(() => setLoading(false))
  }, [user, authLoading, fetchQueue])

  const handleReviewed = () => {
    fetchQueue()
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-[#E5E5E5] px-4 py-3 z-10">
        <h1 className="text-xl font-bold">Review Queue</h1>
      </div>

      {authLoading || loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : !user ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 text-lg">Log in to review challenges</p>
          <a href="/login" className="text-[#FF8C42] hover:underline mt-2 inline-block font-semibold">
            Log In
          </a>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-500">{error}</div>
      ) : queue.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 text-lg">No challenges to review right now</p>
          <p className="text-gray-400 text-sm mt-2">Check back later!</p>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-4">
          <p className="text-sm text-gray-500">{queue.length} challenge{queue.length !== 1 ? 's' : ''} to review</p>
          {queue.map((item) => (
            <ReviewCard
              key={item.id}
              challenge={item}
              onReviewed={handleReviewed}
            />
          ))}
        </div>
      )}
    </div>
  )
}
