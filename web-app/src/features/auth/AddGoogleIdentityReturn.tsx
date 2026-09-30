import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { addGoogleIdentity } from '@/api/auth'
import type { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getStoredAccessToken } from '@/utils/authStorage'
import {
  GOOGLE_OAUTH_INTENT_KEY,
  GOOGLE_OAUTH_RETURN_KEY,
  GOOGLE_OAUTH_STATE_KEY,
} from './googleOauthState'

function clearAddIntent() {
  sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY)
  sessionStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY)
  sessionStorage.removeItem(GOOGLE_OAUTH_RETURN_KEY)
}

/** Confirma a password depois do redirect Google. Não chama o login nem o onboarding. */
export function AddGoogleIdentityReturn({
  code,
  redirectUri,
}: {
  code: string
  redirectUri: string
}) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const token = getStoredAccessToken()

  const back = () => {
    const target = sessionStorage.getItem(GOOGLE_OAUTH_RETURN_KEY) || '/passenger'
    clearAddIntent()
    navigate(target, { replace: true })
  }

  const submit = async () => {
    if (!token) {
      setMessage(t('profilePanel.loginMethods.errors.generic'))
      return
    }
    if (!password.trim()) {
      setMessage(t('profilePanel.loginMethods.errors.strong_auth_required'))
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await addGoogleIdentity(token, { password, code, redirectUri })
      back()
    } catch (err: unknown) {
      const detail = (err as ApiError).detail
      const codeName = typeof detail === 'string' ? detail : detail?.code
      const key = `profilePanel.loginMethods.errors.${codeName ?? 'generic'}`
      const translated = t(key)
      setMessage(translated === key ? t('profilePanel.loginMethods.errors.generic') : translated)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
      <p className="text-sm text-center max-w-sm">{t('profilePanel.loginMethods.addGoogle')}</p>
      <Input
        type="password"
        autoComplete="current-password"
        className="max-w-sm"
        placeholder={t('profilePanel.loginMethods.confirmLabel')}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {message ? <p className="text-destructive text-center text-sm max-w-sm">{message}</p> : null}
      <Button type="button" disabled={busy} onClick={() => void submit()}>
        {t('profilePanel.loginMethods.addGoogle')}
      </Button>
      <Button type="button" variant="ghost" onClick={back}>
        {t('profilePanel.loginMethods.cancel')}
      </Button>
    </div>
  )
}
