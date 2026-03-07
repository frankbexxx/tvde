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
import {
  getConfig,
  getDevTokens,
  login as loginApi,
  type AuthTokens,
} from '../api/auth'
import { useActivityLog } from './ActivityLogContext'

export type Role = 'passenger' | 'driver' | 'admin'

interface AuthState {
  token: string | null
  role: Role
  userId: string | null
  isLoading: boolean
  betaMode: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  tokens: AuthTokens | null
  isAdmin: boolean
  setRole: (role: Role) => void
  loadTokens: () => Promise<void>
  login: (phone: string, password: string, requestedRole?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { addLog, setStatus } = useActivityLog()
  const { pathname } = useLocation()
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [betaToken, setBetaToken] = useState<string | null>(null)
  const [betaRole, setBetaRole] = useState<Role>('passenger')
  const [betaUserId, setBetaUserId] = useState<string | null>(null)
  const [betaMode, setBetaMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const role = useMemo<Role>(() => {
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/driver')) return 'driver'
    return 'passenger'
  }, [pathname])

  const effectiveRole = betaMode && betaToken ? betaRole : role
  const token = useMemo(() => {
    if (betaMode && betaToken) return betaToken
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
  }, [betaMode, betaToken, tokens, role])

  const loadTokens = useCallback(async () => {
    setStatus('A carregar...')
    try {
      const config = await getConfig()
      setBetaMode(config.beta_mode)
      if (config.beta_mode) {
        setTokens(null)
        setStatus('Pronto')
        addLog('Modo BETA ativo', 'info')
      } else {
        const t = await getDevTokens()
        setTokens(t)
        setStatus('Pronto')
        addLog('Tokens carregados', 'success')
      }
    } catch (err) {
      console.error('Failed to load:', err)
      setTokens(null)
      setBetaMode(false)
      setStatus('Erro: executar Seed primeiro')
      addLog('Falha ao carregar — executar Seed', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addLog, setStatus])

  const login = useCallback(
    async (phone: string, password: string, requestedRole?: string) => {
      setStatus('A entrar...')
      try {
        const res = await loginApi(phone, password, requestedRole)
        setBetaToken(res.access_token)
        setBetaRole(res.role as Role)
        setBetaUserId(res.user_id)
        setTokens({
          passenger: res.access_token,
          driver: res.access_token,
          admin: res.access_token,
        })
        setStatus('Pronto')
        addLog('Sessão iniciada', 'success')
      } catch (err) {
        throw err
      }
    },
    [addLog, setStatus]
  )

  const setRole = useCallback((_r: Role) => {
    /* Role is derived from URL pathname */
  }, [])

  const logout = useCallback(() => {
    setTokens(null)
    setBetaToken(null)
    setBetaUserId(null)
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

  const isAuthenticated = !!(betaMode ? betaToken : tokens)
  const isAdmin = betaMode ? betaRole === 'admin' : !!tokens?.admin

  const value: AuthContextValue = useMemo(
    () => ({
      token,
      role: effectiveRole,
      userId: betaMode ? betaUserId : null,
      isLoading,
      betaMode,
      isAuthenticated,
      tokens,
      isAdmin,
      setRole,
      loadTokens,
      login,
      logout,
    }),
    [
      token,
      effectiveRole,
      betaUserId,
      isLoading,
      betaMode,
      isAuthenticated,
      tokens,
      isAdmin,
      setRole,
      loadTokens,
      login,
      logout,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
