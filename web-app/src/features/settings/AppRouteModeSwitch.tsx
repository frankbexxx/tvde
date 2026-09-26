import { useTranslation } from 'react-i18next'
import { ContextSwitch } from './ContextSwitch'
import { shellsForSessionRole } from '../../context/authBootstrap'
import { useAuth } from '../../context/AuthContext'

/** Troca de contexto quando o header Settings está oculto. */
export function AppRouteModeSwitch() {
  const { t } = useTranslation('settings')
  const { sessionRole } = useAuth()
  if (shellsForSessionRole(sessionRole).length < 2) return null

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{t('appMode')}</p>
      <ContextSwitch />
    </div>
  )
}
