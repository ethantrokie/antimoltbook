'use client'

import Sidebar from './Sidebar'
import RightSidebar from './RightSidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex justify-center">
      <div className="flex w-full max-w-[1200px]">
        {/* Left Sidebar */}
        <div className="hidden md:flex w-[250px] shrink-0 border-r border-[#E5E5E5] sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>

        {/* Center Content */}
        <main className="flex-1 max-w-[600px] border-r border-[#E5E5E5] min-h-screen">
          {children}
        </main>

        {/* Right Sidebar */}
        <div className="hidden lg:block w-[300px] shrink-0 sticky top-0 h-screen overflow-y-auto pl-4">
          <RightSidebar />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] z-50">
        <MobileNav />
      </div>
    </div>
  )
}

function MobileNav() {
  return (
    <nav className="flex items-center justify-around py-2">
      <a href="/" className="p-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </a>
      <a href="/explore" className="p-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </a>
      <a href="/review" className="p-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </a>
      <a href="/login" className="p-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </a>
    </nav>
  )
}
