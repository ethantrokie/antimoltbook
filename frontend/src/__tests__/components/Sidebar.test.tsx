import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Sidebar from '@/components/Sidebar'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

// Mock auth context - not logged in
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}))

describe('Sidebar', () => {
  it('renders navigation links', () => {
    render(<Sidebar />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Explore')).toBeInTheDocument()
    expect(screen.getByText('Review Queue')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('renders AntiMoltbook logo', () => {
    render(<Sidebar />)
    expect(screen.getByText('AntiMoltbook')).toBeInTheDocument()
  })

  it('renders Post button', () => {
    render(<Sidebar />)
    expect(screen.getByText('Post')).toBeInTheDocument()
  })

  it('shows Log In when not authenticated', () => {
    render(<Sidebar />)
    expect(screen.getByText('Log In')).toBeInTheDocument()
  })
})
