import { useEffect } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useNativeLocationServiceLifecycle } from '../../hooks/useNativeLocationServiceLifecycle'
import { noteSessionFamily, resetSessionFamilyForTests } from '../driver/driverSessionFamily'
import { LegalAcceptanceCheckbox } from './LegalAcceptanceCheckbox'
import { LegalAcceptanceBoundary, LegalAcceptanceGate } from './LegalAcceptanceGate'
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from './legalLinks'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}))

const getLegalAcceptance = vi.fn()
const postLegalAcceptance = vi.fn()
vi.mock('../../api/auth', () => ({
  getLegalAcceptance: (token: string) => getLegalAcceptance(token),
  postLegalAcceptance: (token: string) => postLegalAcceptance(token),
}))

let authState = {
  authBootstrapMode: 'login_session' as const,
  isAuthenticated: true,
  token: 'jwt' as string | null,
  userId: null as string | null,
}
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}))

const bridgeCalls: boolean[] = []
let dashboardMounts = 0

function accepted(version = '2026-09-16', required = false) {
  return {
    required,
    terms_version: version,
    privacy_version: version,
    terms_url: LEGAL_TERMS_URL,
    privacy_url: LEGAL_PRIVACY_URL,
  }
}

function installBridge() {
  window.vamulaGps = {
    nativeOwnsUpload: () => false,
    beginWebViewSend: () => true,
    endWebViewSend: () => undefined,
    sessionChanged: () => undefined,
    setServiceNeeded: (needed: boolean) => {
      bridgeCalls.push(needed)
    },
  }
}

function DashboardProbe() {
  const token = authState.token
  useNativeLocationServiceLifecycle({
    token,
    offline: false,
    hydrated: true,
    syncing: false,
  })
  useEffect(() => {
    dashboardMounts += 1
    return () => {
      dashboardMounts -= 1
    }
  }, [])
  return <p>shell {token}</p>
}

function SessionFrame() {
  if (!authState.isAuthenticated) return <p>login</p>
  return (
    <LegalAcceptanceBoundary>
      <DashboardProbe />
    </LegalAcceptanceBoundary>
  )
}

describe('legal acceptance UX', () => {
  beforeEach(() => {
    getLegalAcceptance.mockReset()
    postLegalAcceptance.mockReset()
    resetSessionFamilyForTests()
    bridgeCalls.length = 0
    dashboardMounts = 0
    installBridge()
    authState = { authBootstrapMode: 'login_session', isAuthenticated: true, token: 'jwt', userId: null }
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

  it('refresh da mesma família mantém o dashboard e não pede needed=false', async () => {
    noteSessionFamily('family-a')
    authState = { ...authState, token: 'jwt-1', userId: 'user-1' }
    getLegalAcceptance.mockResolvedValue(accepted())
    const view = render(
      <LegalAcceptanceBoundary>
        <DashboardProbe />
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByText('shell jwt-1')).toBeInTheDocument()
    expect(dashboardMounts).toBe(1)
    expect(bridgeCalls).toEqual([true])
    getLegalAcceptance.mockResolvedValue(accepted())
    authState = { ...authState, token: 'jwt-2' }
    view.rerender(
      <LegalAcceptanceBoundary>
        <DashboardProbe />
      </LegalAcceptanceBoundary>,
    )
    expect(screen.getByText('shell jwt-2')).toBeInTheDocument()
    expect(dashboardMounts).toBe(1)
    await waitFor(() => expect(getLegalAcceptance).toHaveBeenCalledWith('jwt-2'))
    expect(screen.getByText('shell jwt-2')).toBeInTheDocument()
    expect(dashboardMounts).toBe(1)
    expect(bridgeCalls).toEqual([true])
  })

  it('logout bloqueia o acesso e pára o GPS', async () => {
    noteSessionFamily('family-a')
    authState = { ...authState, token: 'jwt-1', userId: 'user-1' }
    getLegalAcceptance.mockResolvedValue(accepted())
    const view = render(<SessionFrame />)
    expect(await screen.findByText('shell jwt-1')).toBeInTheDocument()
    expect(bridgeCalls).toEqual([true])
    noteSessionFamily(null)
    authState = { ...authState, isAuthenticated: false, token: null, userId: null }
    view.rerender(<SessionFrame />)
    expect(screen.getByText('login')).toBeInTheDocument()
    expect(screen.queryByText('shell jwt-1')).not.toBeInTheDocument()
    expect(bridgeCalls).toEqual([true, false])
  })

  it('troca de família exige nova verificação legal', async () => {
    noteSessionFamily('family-a')
    authState = { ...authState, token: 'jwt-1', userId: 'user-1' }
    getLegalAcceptance.mockResolvedValueOnce(accepted())
    let resolveNext: (value: ReturnType<typeof accepted>) => void = () => undefined
    getLegalAcceptance.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNext = resolve
        }),
    )
    render(
      <LegalAcceptanceBoundary>
        <DashboardProbe />
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByText('shell jwt-1')).toBeInTheDocument()
    noteSessionFamily('family-b')
    await waitFor(() => expect(screen.queryByText('shell jwt-1')).not.toBeInTheDocument())
    expect(getLegalAcceptance).toHaveBeenCalledTimes(2)
    resolveNext(accepted())
    expect(await screen.findByText('shell jwt-1')).toBeInTheDocument()
  })

  it('troca de utilizador não herda a aceitação', async () => {
    noteSessionFamily('family-a')
    authState = { ...authState, token: 'jwt-1', userId: 'user-1' }
    getLegalAcceptance.mockResolvedValueOnce(accepted())
    getLegalAcceptance.mockRejectedValueOnce(new Error('legal_unavailable'))
    const view = render(
      <LegalAcceptanceBoundary>
        <DashboardProbe />
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByText('shell jwt-1')).toBeInTheDocument()
    authState = { ...authState, userId: 'user-2' }
    view.rerender(
      <LegalAcceptanceBoundary>
        <DashboardProbe />
      </LegalAcceptanceBoundary>,
    )
    expect(screen.queryByText('shell jwt-1')).not.toBeInTheDocument()
    expect(await screen.findByTestId('legal-acceptance-gate')).toBeInTheDocument()
    expect(screen.queryByText(/shell/)).not.toBeInTheDocument()
  })

  it('alteração das versões legais exige nova verificação', async () => {
    noteSessionFamily('family-a')
    authState = { ...authState, token: 'jwt-1', userId: 'user-1' }
    getLegalAcceptance.mockResolvedValueOnce(accepted('2026-09-16'))
    getLegalAcceptance.mockResolvedValueOnce(accepted('2026-10-31', true))
    const view = render(
      <LegalAcceptanceBoundary>
        <DashboardProbe />
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByText('shell jwt-1')).toBeInTheDocument()
    authState = { ...authState, token: 'jwt-2' }
    view.rerender(
      <LegalAcceptanceBoundary>
        <DashboardProbe />
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByTestId('legal-acceptance-gate')).toBeInTheDocument()
    expect(screen.queryByText(/shell/)).not.toBeInTheDocument()
    expect(getLegalAcceptance).toHaveBeenCalledWith('jwt-2')
  })

  it('falha inicial de verificação não desbloqueia o dashboard', async () => {
    noteSessionFamily('family-a')
    authState = { ...authState, token: 'jwt-1', userId: 'user-1' }
    getLegalAcceptance.mockRejectedValue(new Error('legal_unavailable'))
    render(
      <LegalAcceptanceBoundary>
        <p>shell</p>
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByTestId('legal-acceptance-gate')).toBeInTheDocument()
    expect(screen.queryByText('shell')).not.toBeInTheDocument()
  })

  it('aceitação ausente ou revogada bloqueia o acesso', async () => {
    noteSessionFamily('family-a')
    authState = { ...authState, token: 'jwt-1', userId: 'user-1' }
    getLegalAcceptance.mockResolvedValueOnce(accepted())
    getLegalAcceptance.mockResolvedValueOnce(accepted('2026-09-16', true))
    const view = render(
      <LegalAcceptanceBoundary>
        <p>shell</p>
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByText('shell')).toBeInTheDocument()
    authState = { ...authState, token: 'jwt-2' }
    view.rerender(
      <LegalAcceptanceBoundary>
        <p>shell</p>
      </LegalAcceptanceBoundary>,
    )
    expect(await screen.findByTestId('legal-acceptance-gate')).toBeInTheDocument()
    expect(screen.queryByText('shell')).not.toBeInTheDocument()
  })
})
