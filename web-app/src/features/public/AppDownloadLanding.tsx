import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * Ponto de entrada para QR / materiais impressos: mesmo domínio que a app,
 * sem necessidade de `VITE_APP_DOWNLOAD_URL`. Rotas curtas partilháveis:
 * `/dl`, `/app` redireccionam via `AppDownloadRedirect` (env opcional, senão cai aqui).
 */
export function AppDownloadLanding() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-background px-6 py-10 text-center">
      <div className="max-w-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {tc('appName')}
        </p>
        <h1 className="text-xl font-bold text-foreground leading-snug">{t('landingTitle')}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t('landingBody')}</p>
      </div>
      <Link
        to="/passenger"
        className="inline-flex min-h-[52px] min-w-[12rem] items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent px-8 text-lg font-bold text-primary-foreground shadow-floating hover:from-primary/95 hover:to-accent/95 transition-all"
      >
        {t('login')}
      </Link>
      <p className="text-xs text-muted-foreground max-w-xs">{t('landingStoreHint')}</p>
    </div>
  )
}
