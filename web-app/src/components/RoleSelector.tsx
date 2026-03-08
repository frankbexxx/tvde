import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RoleSelector() {
  const { pathname } = useLocation()
  const { isAdmin } = useAuth()
  const isPassenger = pathname.startsWith('/passenger')
  const isDriver = pathname.startsWith('/driver')
  const isAdminPath = pathname.startsWith('/admin')

  return (
    <nav className="flex gap-1">
      <Link
        to="/passenger"
        className={`min-h-[36px] px-4 rounded-xl text-sm font-medium flex items-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
          isPassenger
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        Passageiro
      </Link>
      <Link
        to="/driver"
        className={`min-h-[36px] px-4 rounded-xl text-sm font-medium flex items-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
          isDriver
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        Motorista
      </Link>
      {isAdmin && (
        <Link
          to="/admin"
          className={`min-h-[36px] px-4 rounded-xl text-sm font-medium flex items-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
            isAdminPath
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          Admin
        </Link>
      )}
    </nav>
  )
}
