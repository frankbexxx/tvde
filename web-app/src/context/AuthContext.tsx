import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import i18n from '../i18n'
import { validateAccessToken } from '../api/session'
import {
  completeGoogleOnboarding as completeGoogleOnboardingApi,
  linkGoogleAccount as linkGoogleAccountApi,
  exchangeGoogleCode,
  exchangeGoogleIdToken,
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
import { AUTH_LOGOUT_EVENT } from '../constants/events'
import { writePassengerActiveTripIdToStorage } from '../features/passenger/passengerActiveTripRecovery'
import { useActivityLog } from './ActivityLogContext'
import {
  isAdminFromSessionRole,
  resolveAppRouteRoleFromSession,
  resolveAuthBootstrapMode,
  shellsForSessionRole,
  type AppRouteRole,
  type AuthBootstrapMode,
} from './authBootstrap'
import { type Role } from './authRoles'

export type { Role } from './authRoles'
export type { AppRouteRole } from './authBootstrap'
export { isBackofficeStaffRole } from './authRoles'

interface AuthState {
  token: string | null
  role: Role
  userId: string | null
  isLoading: boolean
  /** Espelho de `GET /config` → `beta_mode` (UI /auth/me, etc.). */
  betaMode: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  tokens: AuthTokens | null
  isAdmin: boolean
  /** True se a sessão é utilizador partner (login: sessionRole; multi-token: JWT partner). */
  isPartnerUser: boolean
  /** Papel do utilizador na BD (derivado do JWT), independente da rota atual. */
  sessionRole: Role
  /** Papel da shell passageiro/motorista/partner (persistido; não usar URL). */
  appRouteRole: AppRouteRole
  /**
   * `login_session` = JWT único + LoginScreen (deployed e/ou BETA).
   * `dev_tokens` = multi-token local/E2E (`/dev/tokens` ou inject).
   */
  authBootstrapMode: AuthBootstrapMode
  /** A020: true durante boot + verificação de sessão */
  isLoadingAuth: boolean
  /** A020: copy do ecrã de arranque (boot vs sessão) */
  splashPrimary: string
  loadError: string | null
  setRole: (role: Role) => void
  setAppRouteRole: (role: AppRouteRole) => void
  loadTokens: () => Promise<void>
  login: (phone: string, password: string, requestedRole?: string) => Promise<TokenResponse>
  /** BETA + Google OAuth: troca `code` do redirect e preenche sessão (passageiro). */
  loginGoogle: (code: string, redirectUri: string, acceptLegal?: boolean) => Promise<TokenResponse>
  /** Android: id_token verificado no servidor. O JWT da app não vai na URL. */
  loginGoogleIdToken: (idToken: string, nonce: string, acceptLegal?: boolean) => Promise<TokenResponse>
  completeGoogleOnboarding: (body: {
    idToken: string
    nonce?: string
    name: string
    phone: string
    acceptLegal: boolean
  }) => Promise<TokenResponse>
  linkGoogleAccount: (body: {
    idToken: string
    nonce?: string
    phone: string
    password: string
    acceptLegal: boolean
  }) => Promise<TokenResponse>
  logout: () => void
  /** Telemóvel da sessão (ou último gravado); sem API extra. */
  sessionPhone: string | null
  /** Nome vindo do login (`display_name`); pode ser null em dev/E2E. */
  sessionDisplayName: string | null
  /** BETA: sincronizar nome/telemóvel a partir de `GET /auth/me` (ex.: após PATCH perfil). */
  refreshSessionProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readE2eInjectTokens(): AuthTokens | null {
  if (import.meta.env.VITE_E2E !== 'true') return null
  try {
    const raw = localStorage.getItem(LS_E2E_DEV_TOKENS_JSON)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthTokens
    if (
      typeof parsed?.passenger === 'string' &&
      typeof parsed?.driver === 'string' &&
      typeof parsed?.admin === 'string'
    ) {
      return parsed
    }
  } catch {
    /* ignorar JSON inválido */
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { addLog, setStatus } = useActivityLog()
  const { pathname } = useLocation()
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [sessionAccessToken, setSessionAccessToken] = useState<string | null>(null)
  const [sessionUserRole, setSessionUserRole] = useState<Role>('passenger')
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [betaMode, setBetaMode] = useState(false)
  const [authBootstrapMode, setAuthBootstrapMode] = useState<AuthBootstrapMode>('login_session')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [splashPrimary, setSplashPrimary] = useState(() => i18n.t('auth:splashStarting'))
  const [appRouteRole, setAppRouteRoleState] = useState<AppRouteRole>(
    () => getStoredAppRouteRole() as AppRouteRole
  )
  const [sessionPhone, setSessionPhone] = useState<string | null>(() => getStoredLastPhone())
  const [sessionDisplayName, setSessionDisplayName] = useState<string | null>(() =>
    getStoredSessionDisplayName()
  )

  const loginSessionActive = authBootstrapMode === 'login_session'

  const sessionUserRoleRef = useRef(sessionUserRole)
  sessionUserRoleRef.current = sessionUserRole

  const syncAppRouteRole = useCallback((r: AppRouteRole, forRole?: Role) => {
    const allowed = shellsForSessionRole(forRole ?? sessionUserRoleRef.current)
    if (!allowed.includes(r)) return
    setStoredAppRouteRole(r)
    setAppRouteRoleState(r)
  }, [])

  /** Qual token usar: admin em /admin; partner em /partner; senão shell passageiro/motorista. */
  const tokenPickRole = useMemo<'passenger' | 'driver' | 'admin' | 'partner'>(() => {
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/partner')) return 'partner'
    if (pathname.startsWith('/passenger')) return 'passenger'
    if (pathname.startsWith('/driver')) return 'driver'
    if (appRouteRole === 'admin') return 'admin'
    if (appRouteRole === 'partner') return 'partner'
    return appRouteRole === 'driver' ? 'driver' : 'passenger'
  }, [pathname, appRouteRole])

  const uiRole = useMemo<Role>(() => {
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/partner')) return 'partner'
    if (pathname.startsWith('/passenger')) return 'passenger'
    if (pathname.startsWith('/driver')) return 'driver'
    if (appRouteRole === 'admin') return 'admin'
    if (appRouteRole === 'partner') return 'partner'
    return appRouteRole === 'driver' ? 'driver' : 'passenger'
  }, [pathname, appRouteRole])

  const token = useMemo(() => {
    if (!tokens) {
      return loginSessionActive && sessionAccessToken ? sessionAccessToken : null
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

    if (loginSessionActive && sessionAccessToken) {
      const singleJwtAcrossRoles =
        tokens.passenger === tokens.driver &&
        (!tokens.admin || tokens.admin === tokens.passenger) &&
        (!tokens.partner || tokens.partner === tokens.passenger)
      if (singleJwtAcrossRoles) {
        return sessionAccessToken
      }
      return picked ?? sessionAccessToken
    }

    return picked
  }, [loginSessionActive, sessionAccessToken, tokens, tokenPickRole])

  /** Papel real do utilizador — não derivar de `token` (varia com a rota / tokenPickRole). */
  const isPartnerUser = useMemo(() => {
    if (loginSessionActive) {
      return sessionUserRole === 'partner'
    }
    if (!tokens) return false
    const seen = new Set<string>()
    for (const raw of [tokens.partner, tokens.passenger, tokens.driver, tokens.admin]) {
      if (!raw || seen.has(raw)) continue
      seen.add(raw)
      if (parseJwtPayload(raw)?.role === 'partner') return true
    }
    return false
  }, [loginSessionActive, sessionUserRole, tokens])

  /** Papel persistido (JWT) — usado para UI “Conta” e consistência. */
  const sessionRole = useMemo<Role>(() => {
    if (loginSessionActive) return sessionUserRole
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
  }, [loginSessionActive, sessionUserRole, token, tokens])

  const applyLoginSessionFromJwt = useCallback(
    (tok: string, role: Role, userId: string) => {
      setSessionAccessToken(tok)
      setSessionUserRole(role)
      setSessionUserId(userId)
      const shell = resolveAppRouteRoleFromSession(role, getRawStoredAppRouteRole())
      syncAppRouteRole(shell)
      setTokens({
        passenger: tok,
        driver: tok,
        admin: tok,
        partner: role === 'partner' ? tok : undefined,
      })
    },
    [syncAppRouteRole]
  )

  const clearLoginSessionState = useCallback(() => {
    setSessionAccessToken(null)
    setSessionUserId(null)
    setSessionUserRole('passenger')
    setTokens(null)
    setAppRouteRoleState('passenger')
    setSessionPhone(null)
    setSessionDisplayName(null)
  }, [])

  const loadTokens = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setSplashPrimary(i18n.t('auth:splashStarting'))
    setStatus(i18n.t('auth:splashStarting'))
    try {
      const config = await withColdStartRetries((timeoutMs) => getConfig(timeoutMs))
      const e2eInject = readE2eInjectTokens()
      const e2eInjectValid = e2eInject != null

      const mode = resolveAuthBootstrapMode({
        serverBetaMode: Boolean(config.beta_mode),
        isViteDev: import.meta.env.DEV,
        isE2E: import.meta.env.VITE_E2E === 'true',
        e2eInjectValid,
      })

      setBetaMode(Boolean(config.beta_mode))
      setAuthBootstrapMode(mode)

      if (mode === 'login_session') {
        setTokens(null)
        setSessionAccessToken(null)
        setSessionUserId(null)
        setSplashPrimary('A verificar sessão…')
        setStatus('A verificar sessão…')
        const tok = getStoredAccessToken()
        if (tok) {
          if (isJwtExpired(tok)) {
            clearAuthStorage()
            clearLoginSessionState()
            addLog('Sessão expirada (token)', 'info')
          } else {
            const p = parseJwtPayload(tok)
            if (!p?.sub) {
              clearAuthStorage()
              clearLoginSessionState()
            } else {
              const r = (p.role as Role) ?? 'passenger'
              applyLoginSessionFromJwt(tok, r, p.sub)
              const ok = await validateAccessToken(tok)
              if (!ok) {
                clearAuthStorage()
                clearLoginSessionState()
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
        if (config.beta_mode) {
          addLog('Modo BETA ativo', 'info')
        } else {
          addLog('Sessão por login (BETA off)', 'info')
        }
      } else {
        let t: AuthTokens | null = e2eInject
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
          const access =
            shell === 'driver'
              ? t.driver
              : shell === 'partner' && typeof t.partner === 'string'
                ? t.partner
                : t.passenger
          setStoredAccessToken(access)
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
      setAuthBootstrapMode('login_session')
      setSessionAccessToken(null)
      setSessionUserId(null)
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
        msg = 'Não autorizado. Inicia sessão ou verifica o token.'
        logLine = '401 ao carregar tokens'
      } else if (status === 404) {
        msg =
          'Endpoint /dev/tokens indisponível. Em ambientes deployed usa o ecrã de login; em local activa ENABLE_DEV_TOOLS ou BETA_MODE.'
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
  }, [addLog, applyLoginSessionFromJwt, clearLoginSessionState, setStatus])

  const login = useCallback(
    async (phone: string, password: string, requestedRole?: string) => {
      setStatus('A entrar...')
      const res = await loginApi(phone, password, requestedRole)
      const token = res.access_token
      setStoredAccessToken(token)
      const serverRole = res.role as Role
      setSessionAccessToken(token)
      setSessionUserRole(serverRole)
      setSessionUserId(res.user_id)
      {
        const allowed = shellsForSessionRole(serverRole)
        const requested = requestedRole as AppRouteRole
        const shell = allowed.includes(requested)
          ? requested
          : resolveAppRouteRoleFromSession(serverRole, null)
        syncAppRouteRole(shell, serverRole)
      }
      setTokens({
        passenger: token,
        driver: token,
        admin: token,
        partner: res.role === 'partner' ? token : undefined,
      })
      setAuthBootstrapMode('login_session')
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

  const applyGoogleSession = useCallback(
    (res: TokenResponse) => {
      const token = res.access_token
      setStoredAccessToken(token)
      const serverRole = res.role as Role
      setSessionAccessToken(token)
      setSessionUserRole(serverRole)
      setSessionUserId(res.user_id)
      syncAppRouteRole('passenger', serverRole)
      setTokens({
        passenger: token,
        driver: token,
        admin: token,
        partner: res.role === 'partner' ? token : undefined,
      })
      setAuthBootstrapMode('login_session')
      setStatus('Pronto')
      const p = (res.phone ?? '').trim()
      if (p) {
        setSessionPhone(p)
        setStoredLastPhone(p)
      } else {
        setSessionPhone(null)
      }
      const dn = (res.display_name ?? '').trim()
      setSessionDisplayName(dn || null)
      setStoredSessionDisplayName(dn)
      addLog('Sessão iniciada (Google)', 'success')
    },
    [addLog, setStatus, syncAppRouteRole]
  )

  const loginGoogle = useCallback(
    async (code: string, redirectUri: string, acceptLegal = false) => {
      setStatus('A entrar com Google...')
      const res = await exchangeGoogleCode(code, redirectUri, 'passenger', acceptLegal)
      applyGoogleSession(res)
      setStatus('Pronto')
      return res
    },
    [applyGoogleSession, setStatus]
  )

  const loginGoogleIdToken = useCallback(
    async (idToken: string, nonce: string, acceptLegal = false) => {
      setStatus('A entrar com Google...')
      const res = await exchangeGoogleIdToken(idToken, nonce, acceptLegal)
      applyGoogleSession(res)
      setStatus('Pronto')
      return res
    },
    [applyGoogleSession, setStatus]
  )

  const completeGoogleOnboarding = useCallback(
    async (body: {
      idToken: string
      nonce?: string
      name: string
      phone: string
      acceptLegal: boolean
    }) => {
      setStatus('A concluir registo...')
      const res = await completeGoogleOnboardingApi(body)
      applyGoogleSession(res)
      setStatus('Pronto')
      return res
    },
    [applyGoogleSession, setStatus]
  )

  const linkGoogleAccount = useCallback(
    async (body: {
      idToken: string
      nonce?: string
      phone: string
      password: string
      acceptLegal: boolean
    }) => {
      setStatus('A ligar a conta Google...')
      const res = await linkGoogleAccountApi(body)
      applyGoogleSession(res)
      setStatus('Pronto')
      return res
    },
    [applyGoogleSession, setStatus]
  )

  const setRole = useCallback(
    (r: Role) => {
      if (r === 'passenger' || r === 'driver' || r === 'partner' || r === 'admin' || r === 'super_admin') {
        syncAppRouteRole(r === 'super_admin' ? 'admin' : r)
      }
    },
    [syncAppRouteRole]
  )

  const setAppRouteRole = syncAppRouteRole

  const logout = useCallback(() => {
    // L-FE-02: drop passenger active-trip sessionStorage before auth wipe
    writePassengerActiveTripIdToStorage(null)
    clearAuthStorage()
    setTokens(null)
    setSessionAccessToken(null)
    setSessionUserRole('passenger')
    setSessionUserId(null)
    setAppRouteRoleState('passenger')
    setSessionPhone(null)
    setSessionDisplayName(null)
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT))
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

  const isAuthenticated = !!(loginSessionActive ? sessionAccessToken : tokens)
  const isAdmin = isAdminFromSessionRole(sessionRole)

  const value: AuthContextValue = useMemo(
    () => ({
      token,
      // role = “vista” (rota/shell). sessionRole = papel real persistido no token.
      role: uiRole,
      userId: loginSessionActive ? sessionUserId : null,
      isLoading,
      betaMode,
      isAuthenticated,
      tokens,
      isAdmin,
      isPartnerUser,
      sessionRole,
      appRouteRole,
      authBootstrapMode,
      isLoadingAuth: isLoading,
      splashPrimary,
      loadError,
      setRole,
      setAppRouteRole,
      loadTokens,
      login,
      loginGoogle,
      loginGoogleIdToken,
      completeGoogleOnboarding,
      linkGoogleAccount,
      logout,
      sessionPhone,
      sessionDisplayName,
      refreshSessionProfile,
    }),
    [
      token,
      uiRole,
      sessionUserId,
      loginSessionActive,
      isLoading,
      betaMode,
      isAuthenticated,
      tokens,
      isAdmin,
      isPartnerUser,
      sessionRole,
      appRouteRole,
      authBootstrapMode,
      splashPrimary,
      loadError,
      setRole,
      setAppRouteRole,
      loadTokens,
      login,
      loginGoogle,
      loginGoogleIdToken,
      completeGoogleOnboarding,
      linkGoogleAccount,
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
