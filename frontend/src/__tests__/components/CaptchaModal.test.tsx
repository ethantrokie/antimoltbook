import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CaptchaModal from '@/components/CaptchaModal'

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    submitChallenge: vi.fn(),
  },
}))

describe('CaptchaModal', () => {
  it('renders the modal with title', () => {
    render(
      <CaptchaModal
        challenge={{
          challenge_id: '1',
          type: 'type_backwards',
          data: JSON.stringify({ word: 'elephant' }),
        }}
        onComplete={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText("Prove you're human!")).toBeInTheDocument()
  })

  it('shows 2:00 countdown timer', () => {
    render(
      <CaptchaModal
        challenge={{
          challenge_id: '1',
          type: 'type_backwards',
          data: JSON.stringify({ word: 'elephant' }),
        }}
        onComplete={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('2:00')).toBeInTheDocument()
  })

  it('shows Submit and Cancel buttons', () => {
    render(
      <CaptchaModal
        challenge={{
          challenge_id: '1',
          type: 'type_backwards',
          data: JSON.stringify({ word: 'elephant' }),
        }}
        onComplete={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Submit')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows typing challenge subtitle for type_backwards', () => {
    render(
      <CaptchaModal
        challenge={{
          challenge_id: '1',
          type: 'type_backwards',
          data: JSON.stringify({ word: 'elephant' }),
        }}
        onComplete={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Can you think in reverse?')).toBeInTheDocument()
  })

  it('shows drawing subtitle for draw_shape', () => {
    render(
      <CaptchaModal
        challenge={{
          challenge_id: '2',
          type: 'draw_shape',
          data: JSON.stringify({ prompt: 'Draw a moon', shape: 'moon' }),
        }}
        onComplete={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Show us your artistic side!')).toBeInTheDocument()
  })
})
