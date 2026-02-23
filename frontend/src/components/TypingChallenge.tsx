'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface TypingChallengeProps {
  challenge: {
    type: string
    data: string
  }
  onResponseChange: (response: string) => void
}

export default function TypingChallenge({ challenge, onResponseChange }: TypingChallengeProps) {
  const [input, setInput] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  let parsedData: { word?: string; phrase?: string } = {}
  try {
    parsedData = JSON.parse(challenge.data)
  } catch {
    // data might be a plain string
    parsedData = { word: challenge.data }
  }

  const isSpeedType = challenge.type === 'speed_type'

  // For speed_type, start timer on first keystroke
  const handleInputChange = useCallback((value: string) => {
    setInput(value)

    if (isSpeedType && !startTimeRef.current && value.length > 0) {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - (startTimeRef.current || Date.now()))
      }, 100)
    }

    // Build response data
    let responseData: Record<string, unknown> = {}

    if (challenge.type === 'type_backwards') {
      responseData = { typed: value }
    } else if (challenge.type === 'type_pattern') {
      responseData = { typed: value }
    } else if (challenge.type === 'speed_type') {
      responseData = {
        typed: value,
        duration_ms: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
      }
    }

    onResponseChange(JSON.stringify(responseData))
  }, [challenge.type, isSpeedType, onResponseChange])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const formatTimer = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const tenths = Math.floor((ms % 1000) / 100)
    return `${seconds}.${tenths}s`
  }

  if (challenge.type === 'type_backwards') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-600">
          Type &apos;<span className="font-semibold text-[#1A1A1A]">{parsedData.word}</span>&apos; backwards:
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-lg"
          placeholder="Type here..."
          autoFocus
        />
      </div>
    )
  }

  if (challenge.type === 'type_pattern') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-600">
          Type &apos;<span className="font-semibold text-[#1A1A1A]">{parsedData.word}</span>&apos; with alternating caps (starting lowercase):
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-lg"
          placeholder="Type here..."
          autoFocus
        />
      </div>
    )
  }

  if (challenge.type === 'speed_type') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-600">Type this as fast as you can:</p>
        <div className="bg-[#FFF0E0] rounded-lg p-4 text-center">
          <p className="font-mono text-lg font-semibold">{parsedData.phrase || parsedData.word}</p>
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-lg font-mono"
          placeholder="Start typing..."
          autoFocus
        />
        {startTimeRef.current && (
          <div className="text-center text-sm text-gray-500">
            Time: <span className="font-mono font-semibold">{formatTimer(elapsedMs)}</span>
          </div>
        )}
      </div>
    )
  }

  // Fallback for unknown type
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600">Complete the challenge:</p>
      <input
        type="text"
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
        placeholder="Your response..."
        autoFocus
      />
    </div>
  )
}
