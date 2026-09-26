import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LEGAL_ACCEPT_REGISTER_KEY } from './legalLinks'
import { GOOGLE_OAUTH_STATE_KEY } from './googleOauthState'
import { GooglePassengerOnboarding } from './GooglePassengerOnboarding'
import {
  googleIdTokenProfile,
  readExistingAccountLink,
  readGoogleOnboarding,
  type GoogleOnboardingPrompt,
} from './googleOnboarding'
import { Spinner } from '../../components/ui/Spinner'
import type { ApiError } from '../../api/client'

function formatErr(err: unknown): string {
  if (err !== null && typeof err === 'object' && 'detail' in err) {
    const d = (err as ApiError).detail
    if (typeof d === 'string') {
      if (d === 'pending_approval') return 'Aguardar aprovação do administrador.'
      if (d === 'google_oauth_disabled') return 'Login Google não está configurado neste servidor.'
      if (d === 'legal_acceptance_required') {
        return 'Para criar conta, aceita os Termos e a Política de Privacidade e tenta outra vez.'
      }
      if (d === 'google_email_not_verified') return 'O Google não devolveu um email verificado.'
      if (d === 'google_only_passenger_role') return 'Esta conta não é passageiro; usa o login com telemóvel.'
      if (d === 'google_account_conflict') return 'Conflito de conta Google. Fala com o suporte.'
      return d
    }
  }
  return 'Não foi possível concluir o login com Google.'
}

type HeldOnboarding = GoogleOnboardingPrompt & { idToken: string; initialLinkRequired?: boolean }

export function GoogleOAuthCallback() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { loginGoogle, completeGoogleOnboarding, linkGoogleAccount } = useAuth()
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [held, setHeld] = useState<HeldOnboarding | null>(null)

  const oauthErr = search.get('error')
  const code = search.get('code')
  const state = search.get('state')
  const expectedState = sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY)
  const stateOk = !!state && state === expectedState

  useEffect(() => {
    if (oauthErr || !code || !stateOk || held) return
    let alive = true
    const redirectUri = `${window.location.origin}/auth/google/callback`
    void (async () => {
      try {
        const acceptLegal = sessionStorage.getItem(LEGAL_ACCEPT_REGISTER_KEY) === '1'
        await loginGoogle(code, redirectUri, acceptLegal)
        sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY)
        sessionStorage.removeItem(LEGAL_ACCEPT_REGISTER_KEY)
        if (alive) navigate('/passenger', { replace: true })
      } catch (e: unknown) {
        if (!alive) return
        const onboard = readGoogleOnboarding(e)
        const link = readExistingAccountLink(e)
        sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY)
        sessionStorage.removeItem(LEGAL_ACCEPT_REGISTER_KEY)
        window.history.replaceState({}, '', '/auth/google/callback')
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
          setFetchErr('google_onboarding_restart')
          return
        }
        setFetchErr(formatErr(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [oauthErr, code, stateOk, navigate, loginGoogle, held])

  if (held) {
    return (
      <GooglePassengerOnboarding
        email={held.email}
        suggestedName={held.name}
        idToken={held.idToken}
        onComplete={completeGoogleOnboarding}
        onLink={linkGoogleAccount}
        onDone={() => navigate('/passenger', { replace: true })}
        onRestart={() => navigate('/passenger', { replace: true })}
        initialLinkRequired={held.initialLinkRequired}
      />
    )
  }

  if (oauthErr) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive text-center text-sm max-w-sm">
          Login Google cancelado ou recusado.
        </p>
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-medium"
          onClick={() => navigate('/passenger', { replace: true })}
        >
          Voltar ao início de sessão
        </button>
      </div>
    )
  }

  if (!code || !stateOk) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive text-center text-sm max-w-sm">
          {fetchErr === 'google_onboarding_restart'
            ? 'A sessão Google expirou. Entra outra vez com Google para continuar o registo.'
            : code
              ? 'O pedido Google não corresponde a esta sessão.'
              : 'Código de autorização em falta.'}
        </p>
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-medium"
          onClick={() => navigate('/passenger', { replace: true })}
        >
          Voltar ao início de sessão
        </button>
      </div>
    )
  }

  if (fetchErr) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive text-center text-sm max-w-sm">{fetchErr}</p>
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-medium"
          onClick={() => navigate('/passenger', { replace: true })}
        >
          Voltar ao início de sessão
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-background px-4">
      <Spinner size="lg" />
      <p className="text-muted-foreground text-sm text-center">A concluir login com Google…</p>
    </div>
  )
}
