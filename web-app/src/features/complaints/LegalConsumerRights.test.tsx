import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LegalConsumerRights, LRE_URL, CACCL_URL, CNIACC_URL } from '../../components/legal/LegalConsumerRights'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'pt' },
  }),
}))

describe('LegalConsumerRights L-25', () => {
  it('renders LRE and RAL links for passenger surface', () => {
    render(<LegalConsumerRights surface="passenger" />)
    const lre = screen.getByTestId('lre-link-passenger')
    expect(lre).toHaveAttribute('href', LRE_URL)
    expect(lre).toHaveAttribute('rel', 'noopener noreferrer')
    expect(lre).toHaveAttribute('target', '_blank')
    expect(screen.getByTestId('ral-section-passenger')).toBeInTheDocument()
    expect(screen.getByTestId('ral-caccl-link-passenger')).toHaveAttribute('href', CACCL_URL)
    expect(screen.getByTestId('ral-cniacc-link-passenger')).toHaveAttribute('href', CNIACC_URL)
  })

  it('renders LRE and RAL links for driver surface', () => {
    render(<LegalConsumerRights surface="driver" />)
    expect(screen.getByTestId('lre-link-driver')).toHaveAttribute('href', LRE_URL)
    expect(screen.getByTestId('ral-section-driver')).toBeInTheDocument()
  })

  it('keeps internal complaint wording distinct from LRE', () => {
    render(<LegalConsumerRights surface="passenger" />)
    expect(screen.getByText(/Fazer reclamação/i)).toBeInTheDocument()
    expect(screen.getByTestId('lre-link-passenger')).toHaveTextContent(/Livro de Reclamações/i)
  })

  it('shows compact LRE/RAL links for public surface', () => {
    render(<LegalConsumerRights compact surface="public" />)
    expect(screen.getByTestId('lre-link-public')).toHaveAttribute('href', LRE_URL)
    expect(screen.getByTestId('ral-caccl-link-public')).toHaveAttribute('href', CACCL_URL)
  })
})
