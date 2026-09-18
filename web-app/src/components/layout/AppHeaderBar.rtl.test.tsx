import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppHeaderBar } from './AppHeaderBar'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    sessionDisplayName: null,
    sessionPhone: '+351912345678',
    sessionRole: 'passenger',
    token: null,
  }),
  isBackofficeStaffRole: () => false,
}))

vi.mock('@/api/rotacional', () => ({
  fetchRotacionalMessages: async () => [],
}))

describe('AppHeaderBar hint strip (mobile UX)', () => {
  it('renders rotating hint with wrap classes (no nowrap/ellipsis/marquee)', () => {
    render(<AppHeaderBar variant="userCompact" />)
    const hint = screen.getByTestId('app-header-hint-text')
    expect(hint).toBeInTheDocument()
    expect(hint.className).toMatch(/break-words/)
    expect(hint.className).toMatch(/leading-snug/)
    expect(hint.className).not.toMatch(/whitespace-nowrap/)
    expect(hint.className).not.toMatch(/truncate/)
    expect(document.querySelector('.app-header-marquee')).toBeNull()
  })

  it('shows full tripEstimate copy without requiring marquee', () => {
    render(<AppHeaderBar variant="userCompact" />)
    const hint = screen.getByTestId('app-header-hint-text')
    expect(hint.textContent?.length ?? 0).toBeGreaterThan(40)
  })
})
