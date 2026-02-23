'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api, CaptchaChallenge } from '@/lib/api'
import DrawingCanvas from './DrawingCanvas'
import TypingChallenge from './TypingChallenge'

interface CaptchaModalProps {
  challenge: CaptchaChallenge
  onComplete: (captchaToken: string) => void
  onClose: () => void
}

export default function CaptchaModal({ challenge, onComplete, onClose }: CaptchaModalProps) {
  const [timeLeft, setTimeLeft] = useState(120)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const responseDataRef = useRef<string>('')
  const strokesRef = useRef<Array<{ x: number[]; y: number[]; t: number[] }>>([])
  const drawingStartTimeRef = useRef<number>(Date.now())

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Time expired
  useEffect(() => {
    if (timeLeft === 0) {
      setError('Time expired! Please try again.')
    }
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isDrawingType = challenge.type.startsWith('draw_')
  const isTypingType = challenge.type.startsWith('type_') || challenge.type === 'speed_type'

  const getSubtitle = () => {
    if (isDrawingType) return 'Show us your artistic side!'
    if (challenge.type === 'type_backwards') return 'Can you think in reverse?'
    if (challenge.type === 'type_pattern') return 'Pattern recognition time!'
    if (challenge.type === 'speed_type') return 'How fast can your fingers fly?'
    return 'Complete the challenge below'
  }

  const handleStrokesChange = useCallback((strokes: Array<{ x: number[]; y: number[]; t: number[] }>) => {
    strokesRef.current = strokes
  }, [])

  const handleResponseChange = useCallback((response: string) => {
    responseDataRef.current = response
  }, [])

  const handleSubmit = async () => {
    if (timeLeft === 0) return
    setError(null)
    setIsSubmitting(true)

    try {
      let responseData: string

      if (isDrawingType) {
        const durationMs = Date.now() - drawingStartTimeRef.current
        responseData = JSON.stringify({
          strokes: strokesRef.current,
          duration_ms: durationMs,
        })
      } else {
        responseData = responseDataRef.current
      }

      const result = await api.submitChallenge({
        challenge_id: challenge.challenge_id,
        response_data: responseData,
      })

      if (result.passed && result.captcha_token) {
        onComplete(result.captcha_token)
      } else {
        setError(result.message || 'Challenge failed. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Prove you&apos;re human!</h2>
              <p className="text-sm text-gray-500 mt-1">{getSubtitle()}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Timer */}
          <div className={`text-center text-2xl font-mono font-bold mb-4 ${
            timeLeft <= 30 ? 'text-red-500' : 'text-[#1A1A1A]'
          }`}>
            {formatTime(timeLeft)}
          </div>

          {/* Challenge Content */}
          <div className="mb-6">
            {isDrawingType && (
              <DrawingCanvas
                prompt={challenge.data}
                onStrokesChange={handleStrokesChange}
              />
            )}
            {isTypingType && (
              <TypingChallenge
                challenge={{ type: challenge.type, data: challenge.data }}
                onResponseChange={handleResponseChange}
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-[#E5E5E5] rounded-full font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || timeLeft === 0}
              className="flex-1 py-3 bg-[#FF8C42] text-white rounded-full font-semibold hover:bg-[#e67d3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Checking...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
