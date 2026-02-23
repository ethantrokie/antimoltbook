'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { api, User, Post } from '@/lib/api'
import PostCard from '@/components/PostCard'

interface ProfileData extends User {
  posts: Post[]
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const isOwnProfile = currentUser?.username === username

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.getUser(username)
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    }
  }, [username])

  useEffect(() => {
    setLoading(true)
    fetchProfile().finally(() => setLoading(false))
  }, [fetchProfile])

  // Check follow status
  useEffect(() => {
    if (!currentUser || isOwnProfile || !profile) return

    const checkFollowStatus = async () => {
      try {
        const following = await api.getFollowing(currentUser.username)
        setIsFollowing(following.some((u) => u.username === username))
      } catch {
        // fail silently
      }
    }
    checkFollowStatus()
  }, [currentUser, isOwnProfile, profile, username])

  const handleFollow = async () => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    try {
      await api.follow(username)
      setIsFollowing(true)
      setProfile((prev) =>
        prev ? { ...prev, follower_count: prev.follower_count + 1 } : prev
      )
    } catch {
      // fail silently
    }
  }

  const handleUnfollow = async () => {
    try {
      await api.unfollow(username)
      setIsFollowing(false)
      setProfile((prev) =>
        prev ? { ...prev, follower_count: prev.follower_count - 1 } : prev
      )
    } catch {
      // fail silently
    }
  }

  const handleLike = async (id: string) => {
    if (!currentUser) {
      router.push('/login')
      return
    }
    if (!profile) return

    const post = profile.posts.find((p) => p.id === id)
    if (!post) return

    try {
      if (post.liked_by_me) {
        await api.unlikePost(id)
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                posts: prev.posts.map((p) =>
                  p.id === id ? { ...p, liked_by_me: false, like_count: p.like_count - 1 } : p
                ),
              }
            : prev
        )
      } else {
        await api.likePost(id)
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                posts: prev.posts.map((p) =>
                  p.id === id ? { ...p, liked_by_me: true, like_count: p.like_count + 1 } : p
                ),
              }
            : prev
        )
      }
    } catch {
      // fail silently
    }
  }

  const handleRepost = (id: string) => {
    router.push(`/post/${id}`)
  }

  const handleReply = (id: string) => {
    router.push(`/post/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-lg">{error || 'User not found'}</p>
      </div>
    )
  }

  const avatarLetter = profile.display_name?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase()

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
          <div>
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            <p className="text-sm text-gray-500">{profile.posts.length} posts</p>
          </div>
        </div>
      </div>

      {/* Profile Banner & Avatar */}
      <div className="bg-[#FFF0E0] h-32" />
      <div className="px-4 pb-4 relative">
        <div className="-mt-16 mb-3 flex items-end justify-between">
          {/* Avatar */}
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-32 h-32 rounded-full border-4 border-white object-cover"
            />
          ) : (
            <div className="w-32 h-32 rounded-full border-4 border-white bg-[#FF8C42] flex items-center justify-center text-white font-bold text-4xl">
              {avatarLetter}
            </div>
          )}

          {/* Action buttons */}
          <div className="mb-2">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 font-bold border border-[#E5E5E5] rounded-full hover:bg-gray-50 transition-colors"
              >
                Edit profile
              </button>
            ) : currentUser ? (
              isFollowing ? (
                <button
                  onClick={handleUnfollow}
                  className="px-4 py-2 font-bold border border-[#E5E5E5] rounded-full hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  Following
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  className="px-4 py-2 font-bold bg-[#FF8C42] text-white rounded-full hover:bg-[#e67d3a] transition-colors"
                >
                  Follow
                </button>
              )
            ) : null}
          </div>
        </div>

        {/* User info */}
        <div className="mb-4">
          <h2 className="text-xl font-bold">{profile.display_name}</h2>
          <p className="text-gray-500">@{profile.username}</p>
          {profile.bio && <p className="mt-2">{profile.bio}</p>}

          {/* Stats */}
          <div className="flex gap-4 mt-3">
            <span className="text-sm">
              <span className="font-bold">{profile.following_count}</span>{' '}
              <span className="text-gray-500">Following</span>
            </span>
            <span className="text-sm">
              <span className="font-bold">{profile.follower_count}</span>{' '}
              <span className="text-gray-500">Followers</span>
            </span>
          </div>
        </div>
      </div>

      {/* Posts tab */}
      <div className="border-b border-[#E5E5E5]">
        <div className="flex">
          <div className="flex-1 text-center py-3 font-bold border-b-2 border-[#FF8C42] text-[#FF8C42]">
            Posts
          </div>
        </div>
      </div>

      {/* Posts */}
      {profile.posts.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">No posts yet</p>
        </div>
      ) : (
        <div className="divide-y divide-[#E5E5E5]">
          {profile.posts.map((post) => (
            <div key={post.id}>
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

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            fetchProfile()
          }}
        />
      )}
    </div>
  )
}

function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: ProfileData
  onClose: () => void
  onSaved: () => void
}) {
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await api.updateProfile({ display_name: displayName, bio })
      // Update localStorage user data
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        parsedUser.display_name = displayName
        parsedUser.bio = bio
        localStorage.setItem('user', JSON.stringify(parsedUser))
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label htmlFor="editDisplayName" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              id="editDisplayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="editBio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="editBio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent resize-none"
              placeholder="Tell us about yourself"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#FF8C42] text-white font-bold rounded-full hover:bg-[#e67d3a] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}
