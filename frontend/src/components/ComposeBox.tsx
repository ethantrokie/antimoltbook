'use client'

import { useState, useRef, useCallback } from 'react'
import { api, CaptchaChallenge } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import CaptchaModal from './CaptchaModal'

interface ComposeBoxProps {
  onPostCreated: () => void
  replyTo?: string
  placeholder?: string
}

export default function ComposeBox({ onPostCreated, replyTo, placeholder }: ComposeBoxProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxChars = 280
  const charsLeft = maxChars - content.length
  const canPost = (content.trim().length > 0 || mediaFile) && charsLeft >= 0

  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMediaFile(file)
    const previewUrl = URL.createObjectURL(file)
    setMediaPreview(previewUrl)
  }, [])

  const removeMedia = useCallback(() => {
    setMediaFile(null)
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview)
    }
    setMediaPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [mediaPreview])

  const handleSubmit = async () => {
    if (!canPost || !user) return
    setError(null)

    try {
      // Get a CAPTCHA challenge first
      const captchaChallenge = await api.getChallenge()
      setChallenge(captchaChallenge)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get challenge')
    }
  }

  const handleCaptchaComplete = async (captchaToken: string) => {
    setChallenge(null)
    setIsPosting(true)
    setError(null)

    try {
      let mediaUrl: string | undefined
      let mediaType: string | undefined

      // Upload media if present
      if (mediaFile) {
        const uploadResult = await api.uploadMedia(mediaFile)
        mediaUrl = uploadResult.url
        mediaType = uploadResult.media_type
      }

      // Create post or reply
      if (replyTo) {
        await api.reply(replyTo, {
          content: content.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
          captcha_token: captchaToken,
        })
      } else {
        await api.createPost({
          content: content.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
          captcha_token: captchaToken,
        })
      }

      // Reset form
      setContent('')
      removeMedia()
      onPostCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post')
    } finally {
      setIsPosting(false)
    }
  }

  if (!user) return null

  const avatarLetter = user.display_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()

  return (
    <div className="bg-white border-b border-[#E5E5E5] p-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#FF8C42] flex items-center justify-center text-white font-bold text-lg">
              {avatarLetter}
            </div>
          )}
        </div>

        <div className="flex-1">
          {/* Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder || "What's happening?"}
            rows={3}
            className="w-full resize-none border-none outline-none text-lg placeholder-gray-400 bg-transparent"
          />

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-[#E5E5E5]">
              {mediaFile?.type.startsWith('video/') ? (
                <video src={mediaPreview} controls className="w-full max-h-[300px] object-contain" />
              ) : (
                <img src={mediaPreview} alt="Preview" className="w-full max-h-[300px] object-contain" />
              )}
              <button
                onClick={removeMedia}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-2 p-2 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Bottom Bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E5E5E5]">
            <div className="flex items-center gap-2">
              {/* Media upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-[#FF8C42] hover:bg-[#FFF0E0] rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/gif,image/png,image/jpeg,video/mp4,video/webm"
                onChange={handleMediaSelect}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Character counter */}
              <span className={`text-sm ${
                charsLeft < 0 ? 'text-red-500 font-bold' :
                charsLeft < 20 ? 'text-yellow-500' :
                'text-gray-400'
              }`}>
                {charsLeft}
              </span>

              {/* Post button */}
              <button
                onClick={handleSubmit}
                disabled={!canPost || isPosting}
                className="px-6 py-2 bg-[#FF8C42] text-white font-bold rounded-full hover:bg-[#e67d3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPosting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Posting...
                  </span>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CAPTCHA Modal */}
      {challenge && (
        <CaptchaModal
          challenge={challenge}
          onComplete={handleCaptchaComplete}
          onClose={() => setChallenge(null)}
        />
      )}
    </div>
  )
}
