'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { api, ReviewItem } from '@/lib/api'

interface ReviewCardProps {
  challenge: ReviewItem
  onReviewed: () => void
}

export default function ReviewCard({ challenge, onReviewed }: ReviewCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  let responseData: Record<string, unknown> = {}
  try {
    responseData = JSON.parse(challenge.response_data)
  } catch {
    // failed to parse
  }

  const handleReview = async (approved: boolean) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await api.submitReview(challenge.id, approved)
      onReviewed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDrawingType = challenge.type.startsWith('draw_')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold px-2 py-1 bg-[#FFF0E0] text-[#FF8C42] rounded-full">
          {challenge.type}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(challenge.submitted_at).toLocaleString()}
        </span>
      </div>

      {/* Prompt */}
      <p className="text-sm text-gray-600 mb-3">
        Prompt: <span className="font-semibold text-[#1A1A1A]">{challenge.prompt}</span>
      </p>

      {/* Response visualization */}
      <div className="mb-4">
        {isDrawingType ? (
          <DrawingReplay strokes={(responseData.strokes as Array<{ x: number[]; y: number[]; t: number[] }>) || []} />
        ) : (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">User typed:</p>
            <p className="font-mono text-sm">
              {(responseData.typed as string) || JSON.stringify(responseData)}
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => handleReview(true)}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => handleReview(false)}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  )
}

// Sub-component: replays drawing strokes on a read-only canvas
function DrawingReplay({ strokes }: { strokes: Array<{ x: number[]; y: number[]; t: number[] }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawStrokes = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1A1A1A'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const stroke of strokes) {
      if (!stroke.x || stroke.x.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke.x[0], stroke.y[0])
      for (let i = 1; i < stroke.x.length; i++) {
        ctx.lineTo(stroke.x[i], stroke.y[i])
      }
      ctx.stroke()
    }
  }, [strokes])

  useEffect(() => {
    drawStrokes()
  }, [drawStrokes])

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="border border-[#E5E5E5] rounded-lg bg-white w-full max-w-[400px]"
      />
    </div>
  )
}
