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
        className={`min-h-[36px] px-4 rounded-lg text-sm font-medium flex items-center ${
          isPassenger
            ? 'bg-blue-600 text-white'
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        }`}
      >
        Passageiro
      </Link>
      <Link
        to="/driver"
        className={`min-h-[36px] px-4 rounded-lg text-sm font-medium flex items-center ${
          isDriver
            ? 'bg-blue-600 text-white'
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        }`}
      >
        Motorista
      </Link>
      {isAdmin && (
        <Link
          to="/admin"
          className={`min-h-[36px] px-4 rounded-lg text-sm font-medium flex items-center ${
            isAdminPath
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Admin
        </Link>
      )}
    </nav>
  )
}
