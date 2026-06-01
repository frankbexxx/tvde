import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '../../context/AuthContext'

/** NAV-X-03: troca de modo quando o header Settings está oculto (shell compacto). */
export function AppRouteModeSwitch() {
  const { appRouteRole, setAppRouteRole, isAdmin, sessionRole } = useAuth()
  const navigate = useNavigate()

  const showDriver = sessionRole === 'driver'
  const showAdmin = isAdmin
  if (!showDriver && !showAdmin) return null

  return (
    <div data-testid="app-route-mode-switch">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Modo da app</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={appRouteRole === 'passenger' ? 'default' : 'outline'}
          className="flex-1 min-w-[7rem] font-medium"
          onClick={() => {
            setAppRouteRole('passenger')
            navigate('/passenger', { replace: true })
          }}
        >
          Passageiro
        </Button>
        {showDriver ? (
          <Button
            type="button"
            variant={appRouteRole === 'driver' ? 'default' : 'outline'}
            className="flex-1 min-w-[7rem] font-medium"
            onClick={() => {
              setAppRouteRole('driver')
              navigate('/driver', { replace: true })
            }}
          >
            Motorista
          </Button>
        ) : null}
        {showAdmin ? (
          <Button type="button" variant="outline" className="flex-1 min-w-[7rem] font-medium" asChild>
            <Link to="/admin">Admin</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
