import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { homePathForSessionRole } from '../../context/authBootstrap'
import { useAuth } from '../../context/AuthContext'
import { getStoredAccessToken } from '../../utils/authStorage'
import { LEGAL_ACCEPT_REGISTER_KEY } from './legalLinks'
import { AddGoogleIdentityReturn } from './AddGoogleIdentityReturn'
import {
  clearGoogleOAuthPending,
  GOOGLE_OAUTH_RETURN_KEY,
  peekGoogleOAuthPending,
  resolveGoogleOAuthPending,
} from './googleOauthState'
import {
  formatGoogleOAuthCallbackError,
  GOOGLE_CALLBACK_INTERNAL,
  oauthRecoveryTarget,
  resolveGoogleCallbackMessage,
  safeOAuthReturnPath,
} from './googleOAuthErrors'
import { GooglePassengerOnboarding } from './GooglePassengerOnboarding'
import {
  googleIdTokenProfile,
  readExistingAccountLink,
  readGoogleAccountChoice,
  readGoogleOnboarding,
  type GoogleOnboardingPrompt,
} from './googleOnboarding'
import { Spinner } from '../../components/ui/Spinner'

type HeldOnboarding = GoogleOnboardingPrompt & {
  idToken: string
  initialLinkRequired?: boolean
  initialMode?: 'choice' | 'create' | 'link'
}

function OAuthErrorScreen({
  message,
  flow,
  hasSession,
  returnPath,
  onBack,
}: {
  message: string
  flow: 'login' | 'add_identity'
  hasSession: boolean
  returnPath?: string | null
  onBack: (path: string) => void
}) {
  const { path, backLabel } = oauthRecoveryTarget({ flow, hasSession, returnPath })
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
      <p className="text-destructive text-center text-sm max-w-sm">{message}</p>
      <button
        type="button"
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-medium"
        onClick={() => onBack(path)}
      >
        {backLabel}
      </button>
    </div>
  )
}

export function GoogleOAuthCallback() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const { loginGoogle, completeGoogleOnboarding, linkGoogleAccount } = useAuth()
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [held, setHeld] = useState<HeldOnboarding | null>(null)

  const oauthErr = search.get('error')
  const code = search.get('code')
  const state = search.get('state')
  const pending = useMemo(() => resolveGoogleOAuthPending(state), [state])
  const peekPending = peekGoogleOAuthPending()
  const flowContext = pending ?? peekPending
  const stateOk = pending !== null
  const addingIdentity = pending?.flow === 'add_identity'
  const hasExistingSession = !!getStoredAccessToken()
  const returnPath =
    flowContext?.returnPath ??
    sessionStorage.getItem(GOOGLE_OAUTH_RETURN_KEY) ??
    undefined
  const blockedLoggedInLogin =
    Boolean(code && stateOk && pending?.flow === 'login' && hasExistingSession && !oauthErr && !held)
  const resolvedFetchErr =
    fetchErr ?? (blockedLoggedInLogin ? GOOGLE_CALLBACK_INTERNAL.addIdentitySessionLost : null)

  const goBack = (path: string) => {
    clearGoogleOAuthPending()
    navigate(safeOAuthReturnPath(path), { replace: true })
  }

  useEffect(() => {
    if (addingIdentity || oauthErr || !code || !stateOk || held) return
    if (pending?.flow !== 'login') return
    if (hasExistingSession) return
    let alive = true
    const redirectUri = `${window.location.origin}/auth/google/callback`
    void (async () => {
      try {
        const acceptLegal = sessionStorage.getItem(LEGAL_ACCEPT_REGISTER_KEY) === '1'
        const session = await loginGoogle(code, redirectUri, acceptLegal)
        clearGoogleOAuthPending()
        sessionStorage.removeItem(LEGAL_ACCEPT_REGISTER_KEY)
        if (alive) navigate(homePathForSessionRole(session.role), { replace: true })
      } catch (e: unknown) {
        if (!alive) return
        const choice = readGoogleAccountChoice(e)
        const onboard = readGoogleOnboarding(e)
        const link = readExistingAccountLink(e)
        clearGoogleOAuthPending()
        sessionStorage.removeItem(LEGAL_ACCEPT_REGISTER_KEY)
        window.history.replaceState({}, '', '/auth/google/callback')
        if (choice?.idToken) {
          setHeld({ ...choice, idToken: choice.idToken, initialMode: 'choice' })
          return
        }
        if (onboard?.idToken) {
          setHeld({ ...onboard, idToken: onboard.idToken })
          return
        }
        if (link?.idToken) {
          const profile = googleIdTokenProfile(link.idToken)
          setHeld({
            idToken: link.idToken,
            name: profile?.name ?? '',
            email: profile?.email ?? '',
            initialLinkRequired: true,
          })
          return
        }
        if (onboard) {
          setFetchErr(GOOGLE_CALLBACK_INTERNAL.onboardingRestart)
          return
        }
        setFetchErr(formatGoogleOAuthCallbackError(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [
    addingIdentity,
    oauthErr,
    code,
    stateOk,
    navigate,
    loginGoogle,
    held,
    pending?.flow,
    hasExistingSession,
  ])

  if (addingIdentity && code && stateOk) {
    return (
      <AddGoogleIdentityReturn
        code={code}
        redirectUri={`${window.location.origin}/auth/google/callback`}
        returnPath={safeOAuthReturnPath(
          pending?.returnPath ?? sessionStorage.getItem(GOOGLE_OAUTH_RETURN_KEY),
        )}
      />
    )
  }

  if (held) {
    return (
      <GooglePassengerOnboarding
        email={held.email}
        suggestedName={held.name}
        idToken={held.idToken}
        onComplete={completeGoogleOnboarding}
        onLink={linkGoogleAccount}
        onDone={(role) => navigate(homePathForSessionRole(role), { replace: true })}
        onRestart={() => navigate('/passenger', { replace: true })}
        initialLinkRequired={held.initialLinkRequired}
        initialMode={held.initialMode}
      />
    )
  }

  if (oauthErr) {
    const cancelFlow = flowContext?.flow ?? 'login'
    const message =
      cancelFlow === 'add_identity'
        ? t('googleOAuthCancelAddIdentity')
        : t('googleOAuthCancelLogin')
    return (
      <OAuthErrorScreen
        message={message}
        flow={cancelFlow}
        hasSession={hasExistingSession}
        returnPath={returnPath}
        onBack={goBack}
      />
    )
  }

  if (resolvedFetchErr) {
    return (
      <OAuthErrorScreen
        message={resolveGoogleCallbackMessage(resolvedFetchErr)}
        flow={flowContext?.flow ?? (hasExistingSession ? 'add_identity' : 'login')}
        hasSession={hasExistingSession}
        returnPath={returnPath}
        onBack={goBack}
      />
    )
  }

  if (!code || !stateOk) {
    const message = code ? t('googleOAuthStateMismatch') : t('googleOAuthMissingCode')
    return (
      <OAuthErrorScreen
        message={message}
        flow={flowContext?.flow ?? (hasExistingSession ? 'add_identity' : 'login')}
        hasSession={hasExistingSession}
        returnPath={returnPath}
        onBack={goBack}
      />
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-background px-4">
      <Spinner size="lg" />
      <p className="text-muted-foreground text-sm text-center">A concluir login com Google…</p>
    </div>
  )
}
