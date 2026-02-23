'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function Sidebar() {
  const { user } = useAuth()
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Explore',
      href: '/explore',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      label: 'Review Queue',
      href: '/review',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Profile',
      href: user ? `/${user.username}` : '/login',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="flex flex-col h-full py-4 px-3">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-3 py-2 mb-4">
        <span className="text-xl font-bold text-[#FF8C42]">AntiMoltbook</span>
      </Link>

      {/* Nav Links */}
      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-full text-lg transition-colors hover:bg-[#FFF0E0] ${
                isActive ? 'font-bold' : 'font-normal'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Post Button */}
      <Link
        href={user ? '/' : '/login'}
        className="mt-6 flex items-center justify-center w-full py-3 bg-[#FF8C42] text-white font-bold text-lg rounded-full hover:bg-[#e67d3a] transition-colors"
      >
        Post
      </Link>

      {/* User info / Login */}
      <div className="mt-auto pt-4">
        {user ? (
          <div className="flex items-center gap-3 px-3 py-3 rounded-full hover:bg-[#FFF0E0] transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#FF8C42] flex items-center justify-center text-white font-bold">
              {user.display_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">{user.display_name}</span>
              <span className="text-sm text-gray-500">@{user.username}</span>
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-3 rounded-full hover:bg-[#FFF0E0] transition-colors text-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Log In</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
