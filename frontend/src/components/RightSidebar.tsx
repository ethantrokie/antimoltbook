'use client'

export default function RightSidebar() {
  return (
    <aside className="flex flex-col gap-4 py-4">
      {/* Who to follow */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
        <h2 className="text-xl font-bold mb-3">Who to follow</h2>
        <p className="text-gray-500 text-sm">Suggestions coming soon</p>
      </div>

      {/* Trending */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
        <h2 className="text-xl font-bold mb-3">Trending</h2>
        <p className="text-gray-500 text-sm">Trending topics coming soon</p>
      </div>

      {/* Footer */}
      <div className="px-4 text-xs text-gray-400">
        <p>&copy; 2026 AntiMoltbook</p>
      </div>
    </aside>
  )
}
