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
import { warn as logWarn } from '../utils/logger'
import { validateAccessToken } from '../api/session'
import {
  getConfig,
  getDevTokens,
  getMeProfile,
  login as loginApi,
  type AuthTokens,
  type TokenResponse,
} from '../api/auth'
import {
  clearAuthStorage,
  getRawStoredAppRouteRole,
  getStoredAccessToken,
  getStoredAppRouteRole,
  getStoredLastPhone,
  getStoredSessionDisplayName,
  LS_E2E_DEV_TOKENS_JSON,
  setStoredAccessToken,
  setStoredAppRouteRole,
  setStoredLastPhone,
  setStoredSessionDisplayName,
} from '../utils/authStorage'
import { isJwtExpired, parseJwtPayload } from '../utils/jwt'
import { useActivityLog } from './ActivityLogContext'

export type Role = 'passenger' | 'driver' | 'admin' | 'super_admin' | 'partner'

/** Conta de gestão: `super_admin` é o escalão máximo mas trata-se como admin em toda a shell. */
export function isBackofficeStaffRole(role: Role | string | undefined): boolean {
  return role === 'admin' || role === 'super_admin'
}

interface AuthState {
  token: string | null
  role: Role
  userId: string | null
  isLoading: boolean
  betaMode: boolean
  isAuthenticated: boolean
}

export type AppRouteRole = 'passenger' | 'driver' | 'partner'

interface AuthContextValue extends AuthState {
  tokens: AuthTokens | null
  isAdmin: boolean
  /** True se a sessão é utilizador partner (BETA: betaRole; dev: algum JWT em tokens). */
  isPartnerUser: boolean
  /** Papel do utilizador na BD (derivado do JWT), independente da rota atual. */
  sessionRole: Role
  /** Papel da shell passageiro/motorista/partner (persistido; não usar URL). */
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
  /** Telemóvel da sessão BETA (ou último gravado); sem API extra. */
  sessionPhone: string | null
  /** Nome vindo do login BETA (`display_name`); pode ser null em dev/E2E. */
  sessionDisplayName: string | null
  /** BETA: sincronizar nome/telemóvel a partir de `GET /auth/me` (ex.: após PATCH perfil). */
  refreshSessionProfile: () => Promise<void>
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
  const [appRouteRole, setAppRouteRoleState] = useState<AppRouteRole>(
    () => getStoredAppRouteRole() as AppRouteRole
  )
  const [sessionPhone, setSessionPhone] = useState<string | null>(() => getStoredLastPhone())
  const [sessionDisplayName, setSessionDisplayName] = useState<string | null>(() =>
    getStoredSessionDisplayName()
  )

  const syncAppRouteRole = useCallback((r: AppRouteRole) => {
    setStoredAppRouteRole(r)
    setAppRouteRoleState(r)
  }, [])

  /** Qual token usar: admin em /admin; partner em /partner; senão shell passageiro/motorista. */
  const tokenPickRole = useMemo<'passenger' | 'driver' | 'admin' | 'partner'>(() => {
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/partner')) return 'partner'
    if (pathname.startsWith('/passenger')) return 'passenger'
    if (pathname.startsWith('/driver')) return 'driver'
    return appRouteRole === 'driver' ? 'driver' : 'passenger'
  }, [pathname, appRouteRole])

  const uiRole = useMemo<Role>(() => {
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/partner')) return 'partner'
    if (pathname.startsWith('/passenger')) return 'passenger'
    if (pathname.startsWith('/driver')) return 'driver'
    return appRouteRole === 'driver' ? 'driver' : 'passenger'
  }, [pathname, appRouteRole])

  const token = useMemo(() => {
    if (!tokens) {
      return betaMode && betaToken ? betaToken : null
    }

    const pickForRoute = (): string | null => {
      switch (tokenPickRole) {
        case 'passenger':
          return tokens.passenger
        case 'driver':
          return tokens.driver
        case 'admin':
          return tokens.admin
        case 'partner':
          return tokens.partner ?? null
        default:
          return tokens.passenger
      }
    }

    const picked = pickForRoute()

    if (betaMode && betaToken) {
      const singleJwtAcrossRoles =
        tokens.passenger === tokens.driver &&
        (!tokens.admin || tokens.admin === tokens.passenger) &&
        (!tokens.partner || tokens.partner === tokens.passenger)
      if (singleJwtAcrossRoles) {
        return betaToken
      }
      return picked ?? betaToken
    }

    return picked
  }, [betaMode, betaToken, tokens, tokenPickRole])

  /** Papel real do utilizador — não derivar de `token` (varia com a rota / tokenPickRole). */
  const isPartnerUser = useMemo(() => {
    if (betaMode) {
      return betaRole === 'partner'
    }
    if (!tokens) return false
    const seen = new Set<string>()
    for (const raw of [tokens.partner, tokens.passenger, tokens.driver, tokens.admin]) {
      if (!raw || seen.has(raw)) continue
      seen.add(raw)
      if (parseJwtPayload(raw)?.role === 'partner') return true
    }
    return false
  }, [betaMode, betaRole, tokens])

  /** Papel persistido (JWT) — usado para UI “Conta” e consistência. */
  const sessionRole = useMemo<Role>(() => {
    if (betaMode) return betaRole
    // Em dev, pode haver múltiplos tokens; preferir role do token da rota, senão o primeiro disponível.
    const candidates = [
      token,
      tokens?.admin,
      tokens?.partner,
      tokens?.driver,
      tokens?.passenger,
    ].filter(Boolean) as string[]
    for (const t of candidates) {
      const r = parseJwtPayload(t)?.role
      if (
        r === 'admin' ||
        r === 'super_admin' ||
        r === 'partner' ||
        r === 'driver' ||
        r === 'passenger'
      ) {
        return r as Role
      }
    }
    return 'passenger'
  }, [betaMode, betaRole, token, tokens])

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
            setSessionPhone(null)
            setSessionDisplayName(null)
            addLog('Sessão expirada (token)', 'info')
          } else {
            const p = parseJwtPayload(tok)
            if (!p?.sub) {
              clearAuthStorage()
              setAppRouteRoleState('passenger')
              setSessionPhone(null)
              setSessionDisplayName(null)
            } else {
              const r = (p.role as Role) ?? 'passenger'
              setBetaToken(tok)
              setBetaRole(r)
              setBetaUserId(p.sub)
              {
                const savedShell = getRawStoredAppRouteRole()
                const fromJwt: AppRouteRole =
                  r === 'driver' ? 'driver' : r === 'partner' ? 'partner' : 'passenger'
                const shell: AppRouteRole = savedShell ?? fromJwt
                syncAppRouteRole(shell)
              }
              setTokens({
                passenger: tok,
                driver: tok,
                admin: tok,
                partner: r === 'partner' ? tok : undefined,
              })
              const ok = await validateAccessToken(tok)
              if (!ok) {
                clearAuthStorage()
                setBetaToken(null)
                setBetaUserId(null)
                setTokens(null)
                setAppRouteRoleState('passenger')
                setSessionPhone(null)
                setSessionDisplayName(null)
                addLog('Sessão inválida no servidor', 'info')
              } else {
                setSessionPhone(getStoredLastPhone())
                setSessionDisplayName(getStoredSessionDisplayName())
                addLog('Sessão restaurada', 'success')
              }
            }
          }
        }
        setStatus('Pronto')
        addLog('Modo BETA ativo', 'info')
      } else {
        let t: AuthTokens | null = null
        if (import.meta.env.VITE_E2E === 'true') {
          try {
            const raw = localStorage.getItem(LS_E2E_DEV_TOKENS_JSON)
            if (raw) {
              const parsed = JSON.parse(raw) as AuthTokens
              if (
                typeof parsed?.passenger === 'string' &&
                typeof parsed?.driver === 'string' &&
                typeof parsed?.admin === 'string'
              ) {
                t = parsed
              }
            }
          } catch {
            /* ignorar JSON inválido */
          }
        }
        if (!t) {
          t = await withColdStartRetries((timeoutMs) => getDevTokens(timeoutMs))
          addLog('Tokens carregados', 'success')
        } else {
          addLog('Tokens E2E (seed inject)', 'success')
        }
        setTokens({
          passenger: t.passenger,
          driver: t.driver,
          admin: t.admin,
          partner: t.partner,
        })
        setAppRouteRoleState(getStoredAppRouteRole())
        if (import.meta.env.VITE_E2E === 'true' && localStorage.getItem(LS_E2E_DEV_TOKENS_JSON)) {
          const shell = getStoredAppRouteRole()
          setStoredAccessToken(shell === 'driver' ? t.driver : t.passenger)
        }
        setSessionPhone(getStoredLastPhone())
        setSessionDisplayName(getStoredSessionDisplayName())
        setStatus('Pronto')
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.error('Failed to load:', err)
      }

      const apiErr = err as Partial<ApiError>
      const status = typeof apiErr.status === 'number' ? apiErr.status : undefined
      const rawDetail = apiErr.detail
      const detailStr =
        typeof rawDetail === 'string'
          ? rawDetail
          : rawDetail && typeof rawDetail === 'object' && 'detail' in rawDetail
            ? String((rawDetail as { detail?: unknown }).detail ?? '')
            : ''

      logWarn('[Auth/loadTokens]', { status, detail: detailStr || rawDetail })

      setTokens(null)
      setBetaMode(false)
      setBetaToken(null)
      setBetaUserId(null)
      setSessionPhone(null)
      setSessionDisplayName(null)

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
      setStoredAccessToken(token)
      setBetaToken(token)
      const serverRole = res.role as Role
      setBetaRole(serverRole)
      setBetaUserId(res.user_id)
      {
        let shell: AppRouteRole
        if (requestedRole === 'admin') shell = 'passenger'
        else if (requestedRole === 'driver') shell = 'driver'
        else if (requestedRole === 'passenger') shell = 'passenger'
        else if (requestedRole === 'partner' || serverRole === 'partner') shell = 'partner'
        else shell = serverRole === 'driver' ? 'driver' : 'passenger'
        syncAppRouteRole(shell)
      }
      setTokens({
        passenger: token,
        driver: token,
        admin: token,
        partner: res.role === 'partner' ? token : undefined,
      })
      setStatus('Pronto')
      setSessionPhone(phone.trim())
      {
        const dn = (res.display_name ?? '').trim()
        setSessionDisplayName(dn || null)
        setStoredSessionDisplayName(dn)
      }
      addLog('Sessão iniciada', 'success')
      return res
    },
    [addLog, setStatus, syncAppRouteRole]
  )

  const setRole = useCallback(
    (r: Role) => {
      if (r === 'passenger' || r === 'driver' || r === 'partner') syncAppRouteRole(r)
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
    setSessionPhone(null)
    setSessionDisplayName(null)
  }, [])

  const refreshSessionProfile = useCallback(async () => {
    if (!token || !betaMode) return
    try {
      const me = await getMeProfile(token)
      setSessionPhone(me.phone.trim())
      setStoredLastPhone(me.phone.trim())
      const dn = (me.name || '').trim()
      setSessionDisplayName(dn || null)
      setStoredSessionDisplayName(dn)
    } catch {
      /* silencioso: painel Conta mostra erro próprio ao carregar */
    }
  }, [betaMode, token])

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
  const isAdmin = betaMode ? isBackofficeStaffRole(betaRole) : !!tokens?.admin

  const value: AuthContextValue = useMemo(
    () => ({
      token,
      // role = “vista” (rota/shell). sessionRole = papel real persistido no token.
      role: uiRole,
      userId: betaMode ? betaUserId : null,
      isLoading,
      betaMode,
      isAuthenticated,
      tokens,
      isAdmin,
      isPartnerUser,
      sessionRole,
      appRouteRole,
      isLoadingAuth: isLoading,
      splashPrimary,
      loadError,
      setRole,
      setAppRouteRole,
      loadTokens,
      login,
      logout,
      sessionPhone,
      sessionDisplayName,
      refreshSessionProfile,
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
      isPartnerUser,
      sessionRole,
      appRouteRole,
      splashPrimary,
      loadError,
      setRole,
      setAppRouteRole,
      loadTokens,
      login,
      logout,
      sessionPhone,
      sessionDisplayName,
      refreshSessionProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
