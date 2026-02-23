import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import PostCard from '@/components/PostCard'
import { Post } from '@/lib/api'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockPost: Post = {
  id: '1',
  user_id: '1',
  content: 'Hello world!',
  media_url: null,
  media_type: null,
  parent_id: null,
  repost_of_id: null,
  created_at: new Date().toISOString(),
  author: {
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
  },
  like_count: 5,
  reply_count: 2,
  repost_count: 1,
  liked_by_me: false,
  reposted_by_me: false,
}

describe('PostCard', () => {
  it('renders post content and author', () => {
    render(<PostCard post={mockPost} onLike={vi.fn()} onRepost={vi.fn()} onReply={vi.fn()} />)
    expect(screen.getByText('Hello world!')).toBeInTheDocument()
    expect(screen.getByText('@testuser')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('shows like, reply, repost counts', () => {
    render(<PostCard post={mockPost} onLike={vi.fn()} onRepost={vi.fn()} onReply={vi.fn()} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows avatar letter when no avatar_url', () => {
    render(<PostCard post={mockPost} onLike={vi.fn()} onRepost={vi.fn()} onReply={vi.fn()} />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('calls onLike when like button clicked', async () => {
    const onLike = vi.fn()
    render(<PostCard post={mockPost} onLike={onLike} onRepost={vi.fn()} onReply={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Like'))
    expect(onLike).toHaveBeenCalledWith('1')
  })

  it('calls onReply when reply button clicked', async () => {
    const onReply = vi.fn()
    render(<PostCard post={mockPost} onLike={vi.fn()} onRepost={vi.fn()} onReply={onReply} />)
    await userEvent.click(screen.getByLabelText('Reply'))
    expect(onReply).toHaveBeenCalledWith('1')
  })

  it('calls onRepost when repost button clicked', async () => {
    const onRepost = vi.fn()
    render(<PostCard post={mockPost} onLike={vi.fn()} onRepost={onRepost} onReply={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Repost'))
    expect(onRepost).toHaveBeenCalledWith('1')
  })

  it('renders media image when present', () => {
    const postWithMedia = { ...mockPost, media_url: '/media/test.jpg', media_type: 'image' }
    render(<PostCard post={postWithMedia} onLike={vi.fn()} onRepost={vi.fn()} onReply={vi.fn()} />)
    expect(screen.getByAltText('Post media')).toBeInTheDocument()
  })
})
