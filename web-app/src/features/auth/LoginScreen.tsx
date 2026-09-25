import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isBackofficeStaffRole, type Role, useAuth } from '../../context/AuthContext'
import { getConfig, requestOtp, verifyOtp } from '../../api/auth'
import { GooglePassengerOnboarding } from './GooglePassengerOnboarding'
import { readGoogleOnboarding } from './googleOnboarding'
import { LegalAcceptanceCheckbox } from './LegalAcceptanceCheckbox'
import { LEGAL_ACCEPT_REGISTER_KEY } from './legalLinks'
import { isCapacitorNative } from './capacitorPlatform'
import { createOauthNonce, GOOGLE_OAUTH_STATE_KEY, nativeGoogleNonce } from './googleOauthState'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { LS_LAST_PHONE, setStoredAccessToken } from '../../utils/authStorage'
import { BrandStripe } from '../../design-system/components/brand/BrandStripe'
import { appBuildDisplayLine } from '../../lib/appBuildMeta'
import { BTN_PRIMARY_RADIUS, BTN_SECONDARY_RADIUS, SURFACE_RADIUS } from '../../components/layout/infoBoxTemplate'
import { useTranslation } from 'react-i18next'
import { formatLoginError } from '../../i18n/apiErrors'
import { LanguageSelector } from '../settings/LanguageSelector'
import { LegalLocaleNotice } from '../../components/legal/LegalLocaleNotice'
import { LegalConsumerRights } from '../../components/legal/LegalConsumerRights'

interface LoginScreenProps {
  /** BETA: `admin` = fluxo dedicado ao painel (URL `/admin` ou `/admin/login`). */
  requestedRole: 'passenger' | 'driver' | 'partner' | 'admin'
}

export function LoginScreen({ requestedRole }: LoginScreenProps) {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { login, loginGoogleIdToken, completeGoogleOnboarding } = useAuth()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [phone, setPhone] = useState(() => {
    const last = localStorage.getItem(LS_LAST_PHONE)
    return last || '+351'
  })
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleClientId, setGoogleClientId] = useState<string | null>(null)
  const [acceptLegal, setAcceptLegal] = useState(false)
  const [otpEnabled, setOtpEnabled] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [googleDraft, setGoogleDraft] = useState<{
    idToken: string
    nonce: string
    name: string
    email: string
  } | null>(null)

  useEffect(() => {
    void getConfig()
      .then((c) => {
        if (c.google_oauth_enabled && c.google_oauth_client_id?.trim()) {
          setGoogleClientId(c.google_oauth_client_id.trim())
        }
        setOtpEnabled(c.otp_signup_enabled === true)
      })
      .catch(() => setGoogleClientId(null))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await login(phone.trim(), password, requestedRole)
      localStorage.setItem(LS_LAST_PHONE, phone.trim())
      const r = res.role as Role
      if (requestedRole === 'partner' && r !== 'partner') {
        setError(t('noPartnerAccess'))
        return
      }
      if (requestedRole === 'admin' && !isBackofficeStaffRole(r)) {
        setError(t('notAdmin'))
        return
      }
      if (isBackofficeStaffRole(r))
        navigate(pathname.startsWith('/admin') ? `/admin${search}` : '/admin', { replace: true })
      else if (r === 'partner' || requestedRole === 'partner')
        navigate('/partner', { replace: true })
      else if (requestedRole === 'driver') navigate('/driver', { replace: true })
      else navigate('/passenger', { replace: true })
    } catch (err: unknown) {
      setError(formatLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  const sendOtp = async () => {
    setError(null)
    setLoading(true)
    try {
      await requestOtp(phone.trim(), requestedRole === 'driver' ? 'driver' : 'passenger')
      setOtpSent(true)
    } catch (err: unknown) {
      setError(formatLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  const confirmOtp = async () => {
    if (!acceptLegal) return
    setError(null)
    setLoading(true)
    try {
      const res = await verifyOtp(
        phone.trim(),
        otpCode.trim(),
        true,
        requestedRole === 'driver' ? 'driver' : 'passenger',
      )
      setStoredAccessToken(res.access_token)
      localStorage.setItem(LS_LAST_PHONE, phone.trim())
      window.location.assign(requestedRole === 'driver' ? '/driver' : '/passenger')
    } catch (err: unknown) {
      setError(formatLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  const googleOnCapacitor = isCapacitorNative()

  const startGoogleLogin = () => {
    if (!googleClientId) return
    sessionStorage.setItem(LEGAL_ACCEPT_REGISTER_KEY, acceptLegal ? '1' : '0')
    if (googleOnCapacitor) {
      void startNativeGoogle(googleClientId)
      return
    }
    const state = createOauthNonce()
    sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state)
    const redirectUri = `${window.location.origin}/auth/google/callback`
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    u.searchParams.set('client_id', googleClientId)
    u.searchParams.set('redirect_uri', redirectUri)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('scope', 'openid email profile')
    u.searchParams.set('access_type', 'online')
    u.searchParams.set('prompt', 'select_account')
    u.searchParams.set('state', state)
    window.location.assign(u.toString())
  }

  const startNativeGoogle = async (clientId: string) => {
    setError(null)
    setLoading(true)
    try {
      const { pluginNonce, backendNonce } = await nativeGoogleNonce()
      await GoogleSignIn.initialize({ clientId })
      const result = await GoogleSignIn.signIn({ nonce: pluginNonce })
      if (!result.idToken) {
        setError(t('googleCapacitorFailed'))
        return
      }
      const idToken = result.idToken
      try {
        await loginGoogleIdToken(idToken, backendNonce, acceptLegal)
      } catch (err: unknown) {
        const onboard = readGoogleOnboarding(err)
        if (onboard) {
          setGoogleDraft({
            idToken,
            nonce: backendNonce,
            name: onboard.name,
            email: onboard.email,
          })
          return
        }
        setError(t('googleCapacitorFailed'))
        return
      }
      window.location.assign('/passenger')
    } catch {
      setError(t('googleCapacitorFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (googleDraft) {
    return (
      <GooglePassengerOnboarding
        email={googleDraft.email}
        suggestedName={googleDraft.name}
        idToken={googleDraft.idToken}
        nonce={googleDraft.nonce}
        onComplete={completeGoogleOnboarding}
        onDone={() => window.location.assign('/passenger')}
        onRestart={() => setGoogleDraft(null)}
      />
    )
  }

  return (
    <div className="box-border flex min-h-dvh flex-col overflow-y-auto bg-background px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className={`m-auto w-full max-w-sm bg-card ${SURFACE_RADIUS} shadow-card overflow-hidden`}>
        <BrandStripe />
        <div className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-4" data-testid="login-brand">
            <div className="flex flex-wrap items-end gap-2 min-w-0">
              <img
                src="/brand/vamula-wordmark.png"
                alt="V@mulá"
                className="h-8 w-auto rounded-sm object-contain"
              />
              <span className="text-sm font-normal text-muted-foreground pb-0.5">{t('betaMode')}</span>
            </div>
            <LanguageSelector variant="compact" />
          </div>
          <div role="tablist" aria-label={t('userTypeTabs')} className="grid grid-cols-2 gap-2 mb-4">
            <Link
              to="/passenger"
              role="tab"
              aria-selected={requestedRole === 'passenger'}
              className={`min-h-[44px] py-3 text-center text-sm font-medium ${BTN_SECONDARY_RADIUS} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${requestedRole === 'passenger'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
                }`}
            >
              {tc('rolePassenger')}
            </Link>
            <Link
              to="/driver"
              role="tab"
              aria-selected={requestedRole === 'driver'}
              className={`min-h-[44px] py-3 text-center text-sm font-medium ${BTN_SECONDARY_RADIUS} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${requestedRole === 'driver'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
                }`}
            >
              {tc('roleDriver')}
            </Link>
            <Link
              to="/partner"
              role="tab"
              aria-selected={requestedRole === 'partner'}
              className={`min-h-[44px] py-3 text-center text-sm font-medium ${BTN_SECONDARY_RADIUS} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${requestedRole === 'partner'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
                }`}
            >
              {tc('rolePartner')}
            </Link>
            <Link
              to="/admin/login"
              role="tab"
              aria-selected={requestedRole === 'admin'}
              className={`min-h-[44px] py-3 text-center text-sm font-medium ${BTN_SECONDARY_RADIUS} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${requestedRole === 'admin'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
                }`}
            >
              {t('administrator')}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t('phoneHint')}</p>
          <div className="mb-4 flex flex-col gap-2">
            <LegalAcceptanceCheckbox checked={acceptLegal} onChange={setAcceptLegal} />
            <p className="text-xs text-muted-foreground">{t('legalAcceptNewAccount')}</p>
          </div>
          {otpEnabled && (
            <div className="mb-4 flex flex-col gap-2" data-testid="otp-signup">
              <button
                type="button"
                disabled={loading}
                onClick={() => void sendOtp()}
                className={`w-full min-h-[44px] py-2.5 ${BTN_SECONDARY_RADIUS} border border-input bg-background text-foreground font-medium`}
              >
                {t('otpRequest')}
              </button>
              {otpSent && (
                <>
                  <label htmlFor="otp-code" className="text-sm font-medium text-foreground">
                    {t('otpCode')}
                  </label>
                  <input
                    id="otp-code"
                    data-testid="otp-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className={`w-full px-3 py-2 border border-input ${BTN_SECONDARY_RADIUS} bg-background`}
                  />
                  <button
                    type="button"
                    data-testid="otp-verify"
                    disabled={loading || !acceptLegal || otpCode.trim().length < 4}
                    onClick={() => void confirmOtp()}
                    className={`w-full min-h-[44px] py-2.5 ${BTN_PRIMARY_RADIUS} bg-primary text-primary-foreground font-medium disabled:opacity-50`}
                  >
                    {t('otpVerify')}
                  </button>
                </>
              )}
            </div>
          )}
          {requestedRole === 'passenger' && googleClientId && (
            <div className="mb-4">
              <button
                type="button"
                data-testid="google-sign-in"
                onClick={startGoogleLogin}
                disabled={loading}
                className={`w-full min-h-[44px] py-2.5 ${BTN_SECONDARY_RADIUS} border border-input bg-background text-foreground font-medium hover:bg-muted/80 transition-colors disabled:opacity-50`}
              >
                {t('continueGoogle')}
              </button>
              <p className="text-xs text-muted-foreground mt-2 text-center">{t('passengerGoogleOnly')}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                {t('phone')}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center' })}
                placeholder="+351912345678"
                className={`w-full scroll-mb-24 px-3 py-2 border border-input ${BTN_SECONDARY_RADIUS} bg-background text-base focus:ring-2 focus:ring-ring focus:border-transparent`}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center' })}
                className={`w-full scroll-mb-24 px-3 py-2 border border-input ${BTN_SECONDARY_RADIUS} bg-background text-base focus:ring-2 focus:ring-ring focus:border-transparent`}
                required
              />
            </div>
            {error && (
              <p className={`text-sm text-destructive bg-destructive/10 border-l-4 border-destructive px-3 py-2 ${BTN_SECONDARY_RADIUS}`}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`w-full min-h-[44px] py-2.5 bg-primary text-primary-foreground font-medium ${BTN_PRIMARY_RADIUS} hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100`}
            >
              {loading ? t('loggingIn') : t('login')}
            </button>
          </form>
          <footer
            className="mt-6 pt-5 border-t border-border/70"
            aria-label="Informação da versão da aplicação"
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
              {t('appVersionLabel')}
            </p>
            <p
              className="mt-1.5 font-mono text-xs text-muted-foreground tabular-nums tracking-tight select-all"
              data-testid="app-build-label"
              translate="no"
            >
              {appBuildDisplayLine}
            </p>
            <p className="mt-1.5 text-[0.7rem] text-muted-foreground/75 leading-snug">{t('appVersionSupport')}</p>
            <LegalConsumerRights compact surface="public" className="mt-3" />
            <LegalLocaleNotice className="mt-3 text-[0.7rem] text-muted-foreground/80 leading-snug" />
          </footer>
        </div>
      </div>
    </div>
  )
}
