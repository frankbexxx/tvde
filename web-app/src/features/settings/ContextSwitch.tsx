import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '../../context/AuthContext'
import { shellsForSessionRole, type AppRouteRole } from '../../context/authBootstrap'

const PATH: Record<AppRouteRole, string> = {
  passenger: '/passenger',
  driver: '/driver',
  partner: '/partner',
  admin: '/admin',
}

/** Selector de contexto. Não altera `User.role`. */
export function ContextSwitch({ onChosen }: { onChosen?: () => void }) {
  const { t } = useTranslation('common')
  const { appRouteRole, setAppRouteRole, sessionRole } = useAuth()
  const navigate = useNavigate()
  const shells = shellsForSessionRole(sessionRole)

  const label = (shell: AppRouteRole) => {
    if (shell === 'passenger') return t('rolePassenger')
    if (shell === 'driver') return t('roleDriver')
    if (shell === 'partner') return t('rolePartner')
    return sessionRole === 'super_admin' ? t('roleSuperAdmin') : t('roleAdmin')
  }

  const choose = (shell: AppRouteRole) => {
    setAppRouteRole(shell)
    navigate(PATH[shell], { replace: true })
    onChosen?.()
  }

  return (
    <div data-testid="app-route-mode-switch" className="flex flex-wrap gap-2">
      {shells.map((shell) => (
        <Button
          key={shell}
          type="button"
          data-testid={`context-${shell}`}
          variant={appRouteRole === shell ? 'default' : 'outline'}
          className="flex-1 min-w-[7rem] font-medium"
          onClick={() => choose(shell)}
        >
          {label(shell)}
        </Button>
      ))}
    </div>
  )
}
