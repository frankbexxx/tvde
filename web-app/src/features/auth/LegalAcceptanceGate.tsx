import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getLegalAcceptance, postLegalAcceptance } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { currentSessionFamily, subscribeSessionFamily } from '../driver/driverSessionFamily'
import { BTN_PRIMARY_RADIUS, SURFACE_RADIUS } from '../../components/layout/infoBoxTemplate'
import { Spinner } from '../../components/ui/Spinner'
import { LegalAcceptanceCheckbox } from './LegalAcceptanceCheckbox'
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from './legalLinks'

type LegalDecision = {
  token: string
  family: string | null
  userId: string | null
  required: boolean
  termsVersion: string
  privacyVersion: string
  termsUrl: string
  privacyUrl: string
}

/** Aceitação já confirmada desta família e deste utilizador. O access token não entra. */
function confirmedForSession(
  decision: LegalDecision | null,
  family: string | null,
  userId: string | null,
): decision is LegalDecision {
  return Boolean(
    decision &&
    !decision.required &&
    family &&
    userId &&
    decision.family === family &&
    decision.userId === userId,
  )
}

function belongsToIdentity(
  decision: LegalDecision | null,
  family: string | null,
  userId: string | null,
): decision is LegalDecision {
  if (!decision) return false
  if (!family && !userId) return decision.family == null && decision.userId == null
  return decision.family === family && decision.userId === userId
}

export function LegalAcceptanceBoundary({ children }: { children: ReactNode }) {
  const { token, authBootstrapMode, isAuthenticated, userId } = useAuth()
  const [family, setFamily] = useState(currentSessionFamily)
  const shouldCheck = authBootstrapMode === 'login_session' && isAuthenticated && !!token
  const [decision, setDecision] = useState<LegalDecision | null>(null)

  useEffect(() => subscribeSessionFamily((next) => setFamily(next)), [])

  useEffect(() => {
    if (!shouldCheck || !token) return
    let alive = true
    const requestFamily = family
    const requestUser = userId
    void getLegalAcceptance(token)
      .then((status) => {
        if (!alive) return
        setDecision({
          token,
          family: requestFamily,
          userId: requestUser,
          required: status.required,
          termsVersion: status.terms_version,
          privacyVersion: status.privacy_version,
          termsUrl: status.terms_url || LEGAL_TERMS_URL,
          privacyUrl: status.privacy_url || LEGAL_PRIVACY_URL,
        })
      })
      .catch(() => {
        if (!alive) return
        setDecision((current) => {
          if (confirmedForSession(current, requestFamily, requestUser)) return current
          return {
            token,
            family: requestFamily,
            userId: requestUser,
            required: true,
            termsVersion: '',
            privacyVersion: '',
            termsUrl: LEGAL_TERMS_URL,
            privacyUrl: LEGAL_PRIVACY_URL,
          }
        })
      })
    return () => {
      alive = false
    }
  }, [shouldCheck, token, family, userId])

  if (!shouldCheck || !token) return <>{children}</>

  const identity = userId
  const current = belongsToIdentity(decision, family, identity) ? decision : null
  const openForToken = current?.token === token && current.required === false
  const blockedForToken = current?.token === token && current.required === true
  const keepDuringRotation = current?.token !== token && confirmedForSession(current, family, identity)

  if (openForToken || keepDuringRotation) return <>{children}</>
  if (!current || current.token !== token) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }
  if (blockedForToken) {
    return (
      <LegalAcceptanceGate
        token={token}
        termsUrl={current.termsUrl}
        privacyUrl={current.privacyUrl}
        onAccepted={() =>
          setDecision({
            ...current,
            token,
            required: false,
          })
        }
      />
    )
  }
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <Spinner size="lg" />
    </div>
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
