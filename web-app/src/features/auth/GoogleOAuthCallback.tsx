import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui/Spinner'
import type { ApiError } from '../../api/client'

function formatErr(err: unknown): string {
  if (err !== null && typeof err === 'object' && 'detail' in err) {
    const d = (err as ApiError).detail
    if (typeof d === 'string') {
      if (d === 'pending_approval') return 'Aguardar aprovação do administrador.'
      if (d === 'google_oauth_disabled') return 'Login Google não está configurado neste servidor.'
      if (d === 'google_email_not_verified') return 'O Google não devolveu um email verificado.'
      if (d === 'google_only_passenger_role') return 'Esta conta não é passageiro; usa o login com telemóvel.'
      if (d === 'google_account_conflict') return 'Conflito de conta Google. Fala com o suporte.'
      return d
    }
  }
  return 'Não foi possível concluir o login com Google.'
}

export function GoogleOAuthCallback() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { loginGoogle } = useAuth()
  const [fetchErr, setFetchErr] = useState<string | null>(null)

  const oauthErr = search.get('error')
  const code = search.get('code')

  useEffect(() => {
    if (oauthErr || !code) return
    let alive = true
    const redirectUri = `${window.location.origin}/auth/google/callback`
    void (async () => {
      try {
        await loginGoogle(code, redirectUri)
        if (alive) navigate('/passenger', { replace: true })
      } catch (e: unknown) {
        if (alive) setFetchErr(formatErr(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [oauthErr, code, navigate, loginGoogle])

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

  if (!code) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive text-center text-sm max-w-sm">
          Código de autorização em falta.
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
