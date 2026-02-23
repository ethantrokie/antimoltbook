'use client'

import Link from 'next/link'
import { Post } from '@/lib/api'
import { timeAgo } from '@/lib/utils'

interface PostCardProps {
  post: Post
  onLike: (id: string) => void
  onRepost: (id: string) => void
  onReply: (id: string) => void
}

export default function PostCard({ post, onLike, onRepost, onReply }: PostCardProps) {
  const avatarLetter = post.author.display_name?.charAt(0).toUpperCase() || post.author.username.charAt(0).toUpperCase()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] p-4 hover:bg-gray-50 transition-colors">
      {/* Repost indicator */}
      {post.repost_of_id && post.repost_of && (
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-2 ml-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{post.author.display_name} reposted</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/${post.author.username}`} className="shrink-0">
          {post.author.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt={post.author.display_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#FF8C42] flex items-center justify-center text-white font-bold text-lg">
              {avatarLetter}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1 text-sm">
            <Link href={`/${post.author.username}`} className="font-bold hover:underline truncate">
              {post.author.display_name}
            </Link>
            <Link href={`/${post.author.username}`} className="text-gray-500 truncate">
              @{post.author.username}
            </Link>
            <span className="text-gray-400 mx-1">·</span>
            <span className="text-gray-500 shrink-0">{timeAgo(post.created_at)}</span>
          </div>

          {/* Content */}
          <Link href={`/post/${post.id}`} className="block mt-1">
            <p className="text-[#1A1A1A] whitespace-pre-wrap break-words">{post.content}</p>
          </Link>

          {/* Media */}
          {post.media_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-[#E5E5E5]">
              {post.media_type === 'video' ? (
                <video
                  src={post.media_url}
                  controls
                  className="w-full max-h-[400px] object-contain bg-black"
                />
              ) : (
                <img
                  src={post.media_url}
                  alt="Post media"
                  className="w-full max-h-[400px] object-contain"
                />
              )}
            </div>
          )}

          {/* Repost content */}
          {post.repost_of && (
            <div className="mt-2 border border-[#E5E5E5] rounded-xl p-3">
              <div className="flex items-center gap-1 text-sm mb-1">
                <span className="font-bold">{post.repost_of.author.display_name}</span>
                <span className="text-gray-500">@{post.repost_of.author.username}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{post.repost_of.content}</p>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center gap-6 mt-3 -ml-2">
            {/* Reply */}
            <button
              aria-label="Reply"
              onClick={(e) => {
                e.preventDefault()
                onReply(post.id)
              }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-[#FF8C42] transition-colors group"
            >
              <div className="p-2 rounded-full group-hover:bg-[#FFF0E0] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-sm">{post.reply_count || ''}</span>
            </button>

            {/* Repost */}
            <button
              aria-label="Repost"
              onClick={(e) => {
                e.preventDefault()
                onRepost(post.id)
              }}
              className={`flex items-center gap-1.5 transition-colors group ${
                post.reposted_by_me ? 'text-green-500' : 'text-gray-500 hover:text-green-500'
              }`}
            >
              <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span className="text-sm">{post.repost_count || ''}</span>
            </button>

            {/* Like */}
            <button
              aria-label="Like"
              onClick={(e) => {
                e.preventDefault()
                onLike(post.id)
              }}
              className={`flex items-center gap-1.5 transition-colors group ${
                post.liked_by_me ? 'text-[#FF8C42]' : 'text-gray-500 hover:text-[#FF8C42]'
              }`}
            >
              <div className="p-2 rounded-full group-hover:bg-[#FFF0E0] transition-colors">
                <svg
                  className="w-5 h-5"
                  fill={post.liked_by_me ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-sm">{post.like_count || ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
