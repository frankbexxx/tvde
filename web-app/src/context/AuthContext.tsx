import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { setTokenGetter } from '../api/client'
import { getDevTokens, type AuthTokens } from '../api/auth'
import { useActivityLog } from './ActivityLogContext'

export type Role = 'passenger' | 'driver' | 'admin'

interface AuthState {
  token: string | null
  role: Role
  userId: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  tokens: AuthTokens | null
  setRole: (role: Role) => void
  loadTokens: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { addLog, setStatus } = useActivityLog()
  const { pathname } = useLocation()
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const role = useMemo<Role>(() => {
    if (pathname.startsWith('/driver')) return 'driver'
    return 'passenger'
  }, [pathname])

  const token = useMemo(() => {
    if (!tokens) return null
    switch (role) {
      case 'passenger':
        return tokens.passenger
      case 'driver':
        return tokens.driver
      case 'admin':
        return tokens.admin
      default:
        return tokens.passenger
    }
  }, [tokens, role])

  const loadTokens = useCallback(async () => {
    setStatus('A carregar tokens...')
    try {
      const t = await getDevTokens()
      setTokens(t)
      setStatus('Pronto')
      addLog('Tokens carregados', 'success')
    } catch (err) {
      console.error('Failed to load dev tokens:', err)
      setTokens(null)
      setStatus('Erro: executar Seed primeiro')
      addLog('Falha ao carregar tokens — executar Seed', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addLog, setStatus])

  const setRole = useCallback((_r: Role) => {
    /* Role is derived from URL pathname */
  }, [])

  const logout = useCallback(() => {
    setTokens(null)
  }, [])

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  useEffect(() => {
    setTokenGetter(() => token)
  }, [token])

  useEffect(() => {
    const handle401 = () => {
      logout()
    }
    window.addEventListener('api:401', handle401)
    return () => window.removeEventListener('api:401', handle401)
  }, [logout])

  const value: AuthContextValue = useMemo(
    () => ({
      token,
      role,
      userId: null,
      isLoading,
      tokens,
      setRole,
      loadTokens,
      logout,
    }),
    [token, role, isLoading, tokens, setRole, loadTokens, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
