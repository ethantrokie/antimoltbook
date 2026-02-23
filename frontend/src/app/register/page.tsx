'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, CaptchaChallenge } from '@/lib/api'
import CaptchaModal from '@/components/CaptchaModal'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // First, get a CAPTCHA challenge for signup
      const captchaChallenge = await api.getChallenge()
      setChallenge(captchaChallenge)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get challenge')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCaptchaComplete = async () => {
    setChallenge(null)
    setIsSubmitting(true)
    setError(null)

    try {
      await api.register({
        email,
        username,
        display_name: displayName,
        password,
      })
      router.push('/login?registered=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#FF8C42]">Join AntiMoltbook</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E5E5E5] p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                placeholder="cooluser"
              />
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                placeholder="Your Name"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#FF8C42] text-white font-bold rounded-full hover:bg-[#e67d3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? 'Creating account...' : 'Register'}
            </button>
          </div>
        </form>

        {/* Login link */}
        <p className="text-center mt-6 text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-[#FF8C42] font-semibold hover:underline">
            Log in
          </Link>
        </p>
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
