import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isBackofficeStaffRole, type Role, useAuth } from '../../context/AuthContext'
import { getConfig } from '../../api/auth'
import { LS_LAST_PHONE } from '../../utils/authStorage'
import { BrandStripe } from '../../design-system/components/brand/BrandStripe'
import { appBuildDisplayLine } from '../../lib/appBuildMeta'
import { BTN_PRIMARY_RADIUS, BTN_SECONDARY_RADIUS, SURFACE_RADIUS } from '../../components/layout/infoBoxTemplate'
import { useTranslation } from 'react-i18next'
import { formatLoginError } from '../../i18n/apiErrors'
import { LanguageSelector } from '../settings/LanguageSelector'
import { LegalLocaleNotice } from '../../components/legal/LegalLocaleNotice'

interface LoginScreenProps {
  /** BETA: `admin` = fluxo dedicado ao painel (URL `/admin` ou `/admin/login`). */
  requestedRole: 'passenger' | 'driver' | 'partner' | 'admin'
}

export function LoginScreen({ requestedRole }: LoginScreenProps) {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { login } = useAuth()
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

  useEffect(() => {
    void getConfig()
      .then((c) => {
        if (c.google_oauth_enabled && c.google_oauth_client_id?.trim()) {
          setGoogleClientId(c.google_oauth_client_id.trim())
        }
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

  const startGoogleLogin = () => {
    if (!googleClientId) return
    const redirectUri = `${window.location.origin}/auth/google/callback`
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    u.searchParams.set('client_id', googleClientId)
    u.searchParams.set('redirect_uri', redirectUri)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('scope', 'openid email profile')
    u.searchParams.set('access_type', 'online')
    u.searchParams.set('prompt', 'select_account')
    window.location.assign(u.toString())
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-background">
      <div className={`w-full max-w-sm bg-card ${SURFACE_RADIUS} shadow-card overflow-hidden`}>
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
          {requestedRole === 'passenger' && googleClientId && (
            <div className="mb-4">
              <button
                type="button"
                onClick={startGoogleLogin}
                className={`w-full min-h-[44px] py-2.5 ${BTN_SECONDARY_RADIUS} border border-input bg-background text-foreground font-medium hover:bg-muted/80 transition-colors`}
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
                placeholder="+351912345678"
                className={`w-full px-3 py-2 border border-input ${BTN_SECONDARY_RADIUS} bg-background text-base focus:ring-2 focus:ring-ring focus:border-transparent`}
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
                className={`w-full px-3 py-2 border border-input ${BTN_SECONDARY_RADIUS} bg-background text-base focus:ring-2 focus:ring-ring focus:border-transparent`}
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
            <LegalLocaleNotice className="mt-3 text-[0.7rem] text-muted-foreground/80 leading-snug" />
          </footer>
        </div>
      </div>
    </div>
  )
}
