'use client'

import Link from 'next/link'

interface UserCardProps {
  user: {
    username: string
    display_name: string
    avatar_url: string | null
    bio: string | null
  }
  onFollow?: () => void
  onUnfollow?: () => void
  isFollowing?: boolean
}

export default function UserCard({ user, onFollow, onUnfollow, isFollowing }: UserCardProps) {
  const avatarLetter = user.display_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors rounded-xl">
      {/* Avatar */}
      <Link href={`/${user.username}`} className="shrink-0">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#FF8C42] flex items-center justify-center text-white font-bold">
            {avatarLetter}
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/${user.username}`} className="block">
          <p className="font-bold text-sm truncate hover:underline">{user.display_name}</p>
          <p className="text-gray-500 text-sm truncate">@{user.username}</p>
        </Link>
        {user.bio && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
        )}
      </div>

      {/* Follow/Unfollow button */}
      {(onFollow || onUnfollow) && (
        <div className="shrink-0">
          {isFollowing ? (
            <button
              onClick={onUnfollow}
              className="px-4 py-1.5 text-sm font-bold border border-[#E5E5E5] rounded-full hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              Following
            </button>
          ) : (
            <button
              onClick={onFollow}
              className="px-4 py-1.5 text-sm font-bold bg-[#FF8C42] text-white rounded-full hover:bg-[#e67d3a] transition-colors"
            >
              Follow
            </button>
          )}
        </div>
      )}
    </div>
  )
}
