import { useCallback, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addGoogleIdentity,
  changeMyPassword,
  getConfig,
  getMeProfile,
  listMyIdentities,
  makeIdentityPrimary,
  revokeIdentity,
  type IdentityListResponse,
  type LoginIdentity,
} from '@/api/auth'
import type { ApiError } from '@/api/client'
import { isCapacitorNative } from '@/features/auth/capacitorPlatform'
import {
  ADD_IDENTITY_INTENT,
  createOauthNonce,
  GOOGLE_OAUTH_INTENT_KEY,
  GOOGLE_OAUTH_RETURN_KEY,
  GOOGLE_OAUTH_STATE_KEY,
  nativeGoogleNonce,
} from '@/features/auth/googleOauthState'

function errorCode(err: unknown): string {
  if (err !== null && typeof err === 'object' && 'detail' in err) {
    const detail = (err as ApiError).detail
    if (typeof detail === 'string') return detail
    if (detail && typeof detail.code === 'string') return detail.code
  }
  return 'generic'
}

function providerLabel(provider: string, t: (key: string) => string): string {
  if (provider === 'google') return t('profilePanel.loginMethods.providerGoogle')
  if (provider === 'email') return t('profilePanel.loginMethods.providerEmail')
  return provider
}

export function LoginMethodsSection({
  token,
  onSessionEnded,
}: {
  token: string
  onSessionEnded: () => void
}) {
  const { t } = useTranslation('common')
  const confirmPasswordId = useId()
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [identities, setIdentities] = useState<LoginIdentity[]>([])
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const applyList = (body: IdentityListResponse) => {
    setIdentities(body.identities)
  }

  const load = useCallback(async () => {
    const [me, list] = await Promise.all([getMeProfile(token), listMyIdentities(token)])
    setHasPassword(me.has_custom_password)
    applyList(list)
  }, [token])

  useEffect(() => {
    let alive = true
    void load()
      .catch(() => {
        if (alive) setMessage(t('profilePanel.loginMethods.errors.generic'))
      })
    return () => {
      alive = false
    }
  }, [load, t])

  const showError = (err: unknown) => {
    const code = errorCode(err)
    const key = `profilePanel.loginMethods.errors.${code}`
    const translated = t(key)
    setMessage(translated === key ? t('profilePanel.loginMethods.errors.generic') : translated)
  }

  const savePassword = async () => {
    setMessage(null)
    if (newPassword.length < 8) {
      setMessage(t('profilePanel.loginMethods.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage(t('profilePanel.loginMethods.passwordMismatch'))
      return
    }
    setBusy(true)
    try {
      await changeMyPassword(token, { new_password: newPassword, current_password: null })
      setPasswordSaved(true)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  const runChange = async (action: () => Promise<IdentityListResponse>) => {
    setMessage(null)
    if (!password.trim()) {
      setMessage(t('profilePanel.loginMethods.errors.strong_auth_required'))
      return
    }
    setBusy(true)
    try {
      applyList(await action())
      setPassword('')
      setPendingRevoke(null)
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  const startWebGoogle = async () => {
    const config = await getConfig()
    const clientId = config.google_oauth_client_id?.trim()
    if (!config.google_oauth_enabled || !clientId) {
      setMessage(t('profilePanel.loginMethods.errors.google_oauth_disabled'))
      return
    }
    const state = createOauthNonce()
    sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state)
    sessionStorage.setItem(GOOGLE_OAUTH_INTENT_KEY, ADD_IDENTITY_INTENT)
    sessionStorage.setItem(GOOGLE_OAUTH_RETURN_KEY, window.location.pathname)
    const redirectUri = `${window.location.origin}/auth/google/callback`
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('access_type', 'online')
    url.searchParams.set('prompt', 'select_account')
    url.searchParams.set('state', state)
    window.location.assign(url.toString())
  }

  const startNativeGoogle = async () => {
    const config = await getConfig()
    const clientId = config.google_oauth_client_id?.trim()
    if (!config.google_oauth_enabled || !clientId) {
      setMessage(t('profilePanel.loginMethods.errors.google_oauth_disabled'))
      return
    }
    const { pluginNonce, backendNonce } = await nativeGoogleNonce()
    await GoogleSignIn.initialize({ clientId })
    const result = await GoogleSignIn.signIn({ nonce: pluginNonce })
    if (!result.idToken) {
      setMessage(t('profilePanel.loginMethods.errors.google_token_invalid'))
      return
    }
    await runChange(() =>
      addGoogleIdentity(token, {
        password,
        idToken: result.idToken,
        nonce: backendNonce,
      })
    )
  }

  const addGoogle = async () => {
    setMessage(null)
    if (!password.trim()) {
      setMessage(t('profilePanel.loginMethods.errors.strong_auth_required'))
      return
    }
    setBusy(true)
    try {
      if (isCapacitorNative()) await startNativeGoogle()
      else await startWebGoogle()
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  if (hasPassword === null && !message) {
    return <p className="text-xs text-muted-foreground">{t('profilePanel.loginMethods.loading')}</p>
  }

  return (
    <div className="pt-2 border-t border-border/60 space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('profilePanel.loginMethods.title')}
      </p>
      {hasPassword === false && !passwordSaved ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('profilePanel.loginMethods.setPassword')}</p>
          <p className="text-xs text-foreground/80">{t('profilePanel.loginMethods.setPasswordHelp')}</p>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profilePanel.loginMethods.newPassword')}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profilePanel.loginMethods.confirmPassword')}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button type="button" className="w-full" disabled={busy} onClick={() => void savePassword()}>
            {t('profilePanel.loginMethods.savePassword')}
          </Button>
        </div>
      ) : null}
      {passwordSaved ? (
        <div className="space-y-2">
          <p className="text-xs text-foreground/80">{t('profilePanel.loginMethods.passwordSaved')}</p>
          <Button type="button" className="w-full" onClick={onSessionEnded}>
            {t('profilePanel.loginMethods.continueLogin')}
          </Button>
        </div>
      ) : null}
      {hasPassword ? (
        <div className="space-y-3">
          {identities.length === 0 ? (
            <p className="text-xs text-foreground/80">{t('profilePanel.loginMethods.empty')}</p>
          ) : (
            <ul className="space-y-2">
              {identities.map((identity) => {
                const soleActive = identities.length <= 1
                const canRevoke = !identity.is_primary && !soleActive
                return (
                  <li key={identity.id} className="rounded-lg border border-border/70 p-2 space-y-2">
                  <p className="text-sm font-medium">
                    {providerLabel(identity.provider, t)}
                    {identity.email ? ` · ${identity.email}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {identity.is_primary ? t('profilePanel.loginMethods.primary') : '—'}
                    {' · '}
                    {identity.is_verified
                      ? t('profilePanel.loginMethods.verified')
                      : t('profilePanel.loginMethods.unverified')}
                  </p>
                  <div className="flex gap-2">
                    {identity.is_primary ? null : (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={busy}
                        onClick={() =>
                          void runChange(() => makeIdentityPrimary(token, identity.id, password))
                        }
                      >
                        {t('profilePanel.loginMethods.makePrimary')}
                      </Button>
                    )}
                    {canRevoke && pendingRevoke === identity.id ? (
                      <>
                        <Button
                          type="button"
                          variant="destructive"
                          className="flex-1"
                          disabled={busy}
                          onClick={() =>
                            void runChange(() => revokeIdentity(token, identity.id, password))
                          }
                        >
                          {t('profilePanel.loginMethods.confirmRevoke')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setPendingRevoke(null)}
                        >
                          {t('profilePanel.loginMethods.cancel')}
                        </Button>
                      </>
                    ) : null}
                    {canRevoke && pendingRevoke !== identity.id ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1"
                        disabled={busy}
                        onClick={() => setPendingRevoke(identity.id)}
                      >
                        {t('profilePanel.loginMethods.revoke')}
                      </Button>
                    ) : null}
                  </div>
                  {canRevoke ? null : (
                    <p className="text-xs text-muted-foreground">
                      {soleActive
                        ? t('profilePanel.loginMethods.revokeOnly')
                        : `${t('profilePanel.loginMethods.revokePrimary')} ${t('profilePanel.loginMethods.revokePrimaryNext')}`}
                    </p>
                  )}
                  </li>
                )
              })}
            </ul>
          )}
          <div className="grid gap-1">
            <label htmlFor={confirmPasswordId} className="block text-xs text-muted-foreground">
              {t('profilePanel.loginMethods.confirmLabel')}
            </label>
            <Input
              id={confirmPasswordId}
              type="password"
              autoComplete="current-password"
              placeholder={t('profilePanel.loginMethods.confirmLabel')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="button" className="w-full" disabled={busy} onClick={() => void addGoogle()}>
            {t('profilePanel.loginMethods.addGoogle')}
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-xs text-destructive">{message}</p> : null}
    </div>
  )
}
