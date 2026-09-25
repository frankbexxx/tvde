import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LegalAcceptanceCheckbox } from './LegalAcceptanceCheckbox'
import { LegalAcceptanceBoundary, LegalAcceptanceGate } from './LegalAcceptanceGate'
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from './legalLinks'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

const getLegalAcceptance = vi.fn()
const postLegalAcceptance = vi.fn()
vi.mock('../../api/auth', () => ({
  getLegalAcceptance: () => getLegalAcceptance(),
  postLegalAcceptance: () => postLegalAcceptance(),
}))

let authState = {
  authBootstrapMode: 'login_session' as const,
  isAuthenticated: true,
  token: 'jwt',
}
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}))

describe('legal acceptance UX', () => {
  beforeEach(() => {
    getLegalAcceptance.mockReset()
    postLegalAcceptance.mockReset()
    authState = { authBootstrapMode: 'login_session', isAuthenticated: true, token: 'jwt' }
  })

  it('requires the checkbox and links public legal pages', () => {
    render(<LegalAcceptanceCheckbox checked={false} onChange={() => undefined} />)
    const box = screen.getByTestId('legal-accept-checkbox')
    expect(box).not.toBeChecked()
    expect(screen.getByTestId('legal-terms-link')).toHaveAttribute('href', LEGAL_TERMS_URL)
    expect(screen.getByTestId('legal-privacy-link')).toHaveAttribute('href', LEGAL_PRIVACY_URL)
  })

  it('keeps continue disabled until the checkbox is checked', () => {
    const onAccepted = vi.fn()
    render(
      <LegalAcceptanceGate
        token="jwt"
        termsUrl={LEGAL_TERMS_URL}
        privacyUrl={LEGAL_PRIVACY_URL}
        onAccepted={onAccepted}
      />,
    )
    const submit = screen.getByTestId('legal-accept-submit')
    expect(submit).toBeDisabled()
    fireEvent.click(screen.getByTestId('legal-accept-checkbox'))
    expect(submit).not.toBeDisabled()
  })

  it('restored session shows the gate when acceptance is required', async () => {
    getLegalAcceptance.mockResolvedValue({
      required: true,
      terms_version: '2026-09-16',
      privacy_version: '2026-09-16',
      terms_url: LEGAL_TERMS_URL,
      privacy_url: LEGAL_PRIVACY_URL,
    })
    render(
      <LegalAcceptanceBoundary>
        <p>shell</p>
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByTestId('legal-acceptance-gate')).toBeInTheDocument()
    expect(screen.queryByText('shell')).not.toBeInTheDocument()
  })

  it('current acceptance does not ask again', async () => {
    getLegalAcceptance.mockResolvedValue({
      required: false,
      terms_version: '2026-09-16',
      privacy_version: '2026-09-16',
      terms_url: LEGAL_TERMS_URL,
      privacy_url: LEGAL_PRIVACY_URL,
    })
    render(
      <LegalAcceptanceBoundary>
        <p>shell</p>
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByText('shell')).toBeInTheDocument()
    expect(screen.queryByTestId('legal-acceptance-gate')).not.toBeInTheDocument()
  })

  it('reaccept records login_reaccept and then shows the shell', async () => {
    getLegalAcceptance.mockResolvedValue({
      required: true,
      terms_version: '2026-09-16',
      privacy_version: '2026-09-16',
      terms_url: LEGAL_TERMS_URL,
      privacy_url: LEGAL_PRIVACY_URL,
    })
    postLegalAcceptance.mockResolvedValue({
      required: false,
      terms_version: '2026-09-16',
      privacy_version: '2026-09-16',
      terms_url: LEGAL_TERMS_URL,
      privacy_url: LEGAL_PRIVACY_URL,
    })
    render(
      <LegalAcceptanceBoundary>
        <p>shell</p>
      </LegalAcceptanceBoundary>,
    )
    fireEvent.click(await screen.findByTestId('legal-accept-checkbox'))
    fireEvent.click(screen.getByTestId('legal-accept-submit'))
    await waitFor(() => expect(postLegalAcceptance).toHaveBeenCalled())
    expect(await screen.findByText('shell')).toBeInTheDocument()
  })
})
