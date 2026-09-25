import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getLegalAcceptance, postLegalAcceptance } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { BTN_PRIMARY_RADIUS, SURFACE_RADIUS } from '../../components/layout/infoBoxTemplate'
import { Spinner } from '../../components/ui/Spinner'
import { LegalAcceptanceCheckbox } from './LegalAcceptanceCheckbox'
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from './legalLinks'

export function LegalAcceptanceBoundary({ children }: { children: ReactNode }) {
  const { token, authBootstrapMode, isAuthenticated } = useAuth()
  const shouldCheck = authBootstrapMode === 'login_session' && isAuthenticated && !!token
  const [snapshot, setSnapshot] = useState<{
    token: string
    required: boolean
    termsUrl: string
    privacyUrl: string
  } | null>(null)

  useEffect(() => {
    if (!shouldCheck || !token) return
    let alive = true
    void getLegalAcceptance(token)
      .then((status) => {
        if (!alive) return
        setSnapshot({
          token,
          required: status.required,
          termsUrl: status.terms_url || LEGAL_TERMS_URL,
          privacyUrl: status.privacy_url || LEGAL_PRIVACY_URL,
        })
      })
      .catch(() => {
        if (!alive) return
        setSnapshot({
          token,
          required: true,
          termsUrl: LEGAL_TERMS_URL,
          privacyUrl: LEGAL_PRIVACY_URL,
        })
      })
    return () => {
      alive = false
    }
  }, [shouldCheck, token])

  if (!shouldCheck || !token) return <>{children}</>
  const current = snapshot?.token === token ? snapshot : null
  if (!current) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }
  if (!current.required) return <>{children}</>

  return (
    <LegalAcceptanceGate
      token={token}
      termsUrl={current.termsUrl}
      privacyUrl={current.privacyUrl}
      onAccepted={() =>
        setSnapshot({
          token,
          required: false,
          termsUrl: current.termsUrl,
          privacyUrl: current.privacyUrl,
        })
      }
    />
  )
}

export function LegalAcceptanceGate({
  token,
  termsUrl,
  privacyUrl,
  onAccepted,
}: {
  token: string
  termsUrl: string
  privacyUrl: string
  onAccepted: () => void
}) {
  const { t } = useTranslation('auth')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!checked) return
    setLoading(true)
    setError(null)
    try {
      const status = await postLegalAcceptance(token)
      if (!status.required) onAccepted()
    } catch {
      setError(t('legalAcceptError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4" data-testid="legal-acceptance-gate">
      <div className={`w-full max-w-sm bg-card ${SURFACE_RADIUS} shadow-card p-6 flex flex-col gap-4`}>
        <h1 className="text-lg font-semibold text-foreground">{t('legalAcceptTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('legalAcceptBody')}</p>
        <LegalAcceptanceCheckbox
          checked={checked}
          onChange={setChecked}
          termsUrl={termsUrl}
          privacyUrl={privacyUrl}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="button"
          data-testid="legal-accept-submit"
          disabled={!checked || loading}
          onClick={() => void submit()}
          className={`min-h-[44px] ${BTN_PRIMARY_RADIUS} bg-primary text-primary-foreground font-medium disabled:opacity-50`}
        >
          {t('legalAcceptContinue')}
        </button>
      </div>
    </div>
  )
}
