'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Stroke {
  x: number[]
  y: number[]
  t: number[]
}

interface DrawingCanvasProps {
  prompt: string
  onStrokesChange: (strokes: Stroke[]) => void
}

export default function DrawingCanvas({ prompt, onStrokesChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const currentStrokeRef = useRef<Stroke | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [])

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const redrawCanvas = useCallback((currentStrokes: Stroke[], activeStroke?: Stroke) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1A1A1A'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const allStrokes = activeStroke ? [...currentStrokes, activeStroke] : currentStrokes

    for (const stroke of allStrokes) {
      if (stroke.x.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke.x[0], stroke.y[0])
      for (let i = 1; i < stroke.x.length; i++) {
        ctx.lineTo(stroke.x[i], stroke.y[i])
      }
      ctx.stroke()
    }
  }, [])

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const { x, y } = getCanvasPoint(e)
    const t = Date.now() - startTimeRef.current

    currentStrokeRef.current = { x: [x], y: [y], t: [t] }
    setIsDrawing(true)
  }, [getCanvasPoint])

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !currentStrokeRef.current) return

    const { x, y } = getCanvasPoint(e)
    const t = Date.now() - startTimeRef.current

    currentStrokeRef.current.x.push(x)
    currentStrokeRef.current.y.push(y)
    currentStrokeRef.current.t.push(t)

    redrawCanvas(strokes, currentStrokeRef.current)
  }, [isDrawing, getCanvasPoint, strokes, redrawCanvas])

  const handleEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !currentStrokeRef.current) return

    const newStrokes = [...strokes, currentStrokeRef.current]
    setStrokes(newStrokes)
    onStrokesChange(newStrokes)
    currentStrokeRef.current = null
    setIsDrawing(false)
  }, [isDrawing, strokes, onStrokesChange])

  const handleClear = useCallback(() => {
    setStrokes([])
    onStrokesChange([])
    currentStrokeRef.current = null

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [onStrokesChange])

  const handleUndo = useCallback(() => {
    const newStrokes = strokes.slice(0, -1)
    setStrokes(newStrokes)
    onStrokesChange(newStrokes)
    redrawCanvas(newStrokes)
  }, [strokes, onStrokesChange, redrawCanvas])

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-600 text-center">
        Draw: <span className="font-semibold text-[#1A1A1A]">{prompt}</span>
      </p>

      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="border border-[#E5E5E5] rounded-lg bg-white cursor-crosshair touch-none w-full max-w-[400px]"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={strokes.length === 0}
          className="px-4 py-2 text-sm border border-[#E5E5E5] rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={strokes.length === 0}
          className="px-4 py-2 text-sm border border-[#E5E5E5] rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
