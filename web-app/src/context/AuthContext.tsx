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
import {
  isTimeoutLikeError,
  setTokenGetter,
  withColdStartRetries,
  type ApiError,
} from '../api/client'
import { validateAccessToken } from '../api/session'
import {
  getConfig,
  getDevTokens,
  login as loginApi,
  type AuthTokens,
  type TokenResponse,
} from '../api/auth'
import {
  clearAuthStorage,
  getStoredAccessToken,
  getStoredAppRouteRole,
  setStoredAccessToken,
  setStoredAppRouteRole,
} from '../utils/authStorage'
import { isJwtExpired, parseJwtPayload } from '../utils/jwt'
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

export type AppRouteRole = 'passenger' | 'driver'

interface AuthContextValue extends AuthState {
  tokens: AuthTokens | null
  isAdmin: boolean
  /** Papel da shell passageiro/motorista (persistido; não usar URL). */
  appRouteRole: AppRouteRole
  /** A020: true durante boot + verificação de sessão */
  isLoadingAuth: boolean
  /** A020: copy do ecrã de arranque (boot vs sessão) */
  splashPrimary: string
  loadError: string | null
  setRole: (role: Role) => void
  setAppRouteRole: (role: AppRouteRole) => void
  loadTokens: () => Promise<void>
  login: (phone: string, password: string, requestedRole?: string) => Promise<TokenResponse>
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [splashPrimary, setSplashPrimary] = useState('A iniciar serviço…')
  const [appRouteRole, setAppRouteRoleState] = useState<AppRouteRole>(() => getStoredAppRouteRole())

  const syncAppRouteRole = useCallback((r: AppRouteRole) => {
    setStoredAppRouteRole(r)
    setAppRouteRoleState(r)
  }, [])

  /** Qual token usar: admin só em /admin; caso contrário passageiro vs motorista pela sessão. */
  const tokenPickRole = useMemo<'passenger' | 'driver' | 'admin'>(() => {
    if (pathname.startsWith('/admin')) return 'admin'
    return appRouteRole === 'driver' ? 'driver' : 'passenger'
  }, [pathname, appRouteRole])

  const uiRole = useMemo<Role>(() => {
    if (pathname.startsWith('/admin')) return 'admin'
    return appRouteRole === 'driver' ? 'driver' : 'passenger'
  }, [pathname, appRouteRole])

  const token = useMemo(() => {
    if (betaMode && betaToken) return betaToken
    if (!tokens) return null
    switch (tokenPickRole) {
      case 'passenger':
        return tokens.passenger
      case 'driver':
        return tokens.driver
      case 'admin':
        return tokens.admin
      default:
        return tokens.passenger
    }
  }, [betaMode, betaToken, tokens, tokenPickRole])

  const loadTokens = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setSplashPrimary('A iniciar serviço…')
    setStatus('A iniciar serviço...')
    try {
      const config = await withColdStartRetries((timeoutMs) => getConfig(timeoutMs))
      setBetaMode(config.beta_mode)
      if (config.beta_mode) {
        setTokens(null)
        setBetaToken(null)
        setBetaUserId(null)
        setSplashPrimary('A verificar sessão…')
        setStatus('A verificar sessão…')
        const tok = getStoredAccessToken()
        if (tok) {
          if (isJwtExpired(tok)) {
            clearAuthStorage()
            setAppRouteRoleState('passenger')
            addLog('Sessão expirada (token)', 'info')
          } else {
            const p = parseJwtPayload(tok)
            if (!p?.sub) {
              clearAuthStorage()
              setAppRouteRoleState('passenger')
            } else {
              const r = (p.role as Role) ?? 'passenger'
              setBetaToken(tok)
              setBetaRole(r)
              setBetaUserId(p.sub)
              syncAppRouteRole(r === 'driver' ? 'driver' : 'passenger')
              setTokens({
                passenger: tok,
                driver: tok,
                admin: tok,
              })
              const ok = await validateAccessToken(tok)
              if (!ok) {
                clearAuthStorage()
                setBetaToken(null)
                setBetaUserId(null)
                setTokens(null)
                setAppRouteRoleState('passenger')
                addLog('Sessão inválida no servidor', 'info')
              } else {
                addLog('Sessão restaurada', 'success')
              }
            }
          }
        }
        setStatus('Pronto')
        addLog('Modo BETA ativo', 'info')
      } else {
        const t = await withColdStartRetries((timeoutMs) => getDevTokens(timeoutMs))
        setTokens(t)
        setAppRouteRoleState(getStoredAppRouteRole())
        setStatus('Pronto')
        addLog('Tokens carregados', 'success')
      }
    } catch (err: unknown) {
      console.error('Failed to load:', err)

      const apiErr = err as Partial<ApiError>
      const status = typeof apiErr.status === 'number' ? apiErr.status : undefined
      const rawDetail = apiErr.detail
      const detailStr =
        typeof rawDetail === 'string'
          ? rawDetail
          : rawDetail && typeof rawDetail === 'object' && 'detail' in rawDetail
            ? String((rawDetail as { detail?: unknown }).detail ?? '')
            : ''

      console.log('[Auth/loadTokens] response', { status, detail: detailStr || rawDetail, err })

      setTokens(null)
      setBetaMode(false)
      setBetaToken(null)
      setBetaUserId(null)

      const FINAL_FAIL =
        'Não foi possível ligar ao servidor. Tenta novamente.'

      if (isTimeoutLikeError(err)) {
        setLoadError(FINAL_FAIL)
        setStatus(FINAL_FAIL)
        addLog('Falha após retries (timeout/rede)', 'error')
        return
      }

      let msg: string
      let logLine: string

      if (status === 401) {
        msg = 'Não autorizado. Inicia sessão (modo BETA) ou verifica o token.'
        logLine = '401 ao carregar tokens dev'
      } else if (status === 404) {
        msg =
          'Endpoint /dev/tokens indisponível (servidor não está em dev ou dev tools desativados). Usa login BETA ou ativa ENABLE_DEV_TOOLS.'
        logLine = '404 — dev endpoints não disponíveis'
      } else if (status === 500 && detailStr) {
        msg = detailStr
        logLine = `Erro servidor: ${detailStr.slice(0, 120)}`
      } else if (detailStr) {
        msg = `Erro ao carregar dados: ${detailStr}`
        logLine = msg
      } else {
        msg = 'Erro ao carregar dados. Verifica a API (VITE_API_URL) e a consola.'
        logLine = 'Falha ao carregar tokens (sem detalhe)'
      }

      setLoadError(msg)
      setStatus(msg)
      addLog(logLine, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addLog, setStatus, syncAppRouteRole])

  const login = useCallback(
    async (phone: string, password: string, requestedRole?: string) => {
      setStatus('A entrar...')
      const res = await loginApi(phone, password, requestedRole)
      const token = res.access_token
      console.log('LOGIN TOKEN:', token)
      setStoredAccessToken(token)
      setBetaToken(token)
      const serverRole = res.role as Role
      setBetaRole(serverRole)
      setBetaUserId(res.user_id)
      syncAppRouteRole(serverRole === 'driver' ? 'driver' : 'passenger')
      setTokens({
        passenger: token,
        driver: token,
        admin: token,
      })
      setStatus('Pronto')
      addLog('Sessão iniciada', 'success')
      return res
    },
    [addLog, setStatus, syncAppRouteRole]
  )

  const setRole = useCallback(
    (r: Role) => {
      if (r === 'passenger' || r === 'driver') syncAppRouteRole(r)
    },
    [syncAppRouteRole]
  )

  const setAppRouteRole = syncAppRouteRole

  const logout = useCallback(() => {
    clearAuthStorage()
    setTokens(null)
    setBetaToken(null)
    setBetaRole('passenger')
    setBetaUserId(null)
    setAppRouteRoleState('passenger')
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
      role: uiRole,
      userId: betaMode ? betaUserId : null,
      isLoading,
      betaMode,
      isAuthenticated,
      tokens,
      isAdmin,
      appRouteRole,
      isLoadingAuth: isLoading,
      splashPrimary,
      loadError,
      setRole,
      setAppRouteRole,
      loadTokens,
      login,
      logout,
    }),
    [
      token,
      uiRole,
      betaUserId,
      isLoading,
      betaMode,
      isAuthenticated,
      tokens,
      isAdmin,
      appRouteRole,
      splashPrimary,
      loadError,
      setRole,
      setAppRouteRole,
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
