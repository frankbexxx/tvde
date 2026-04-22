import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isBackofficeStaffRole, type Role, useAuth } from '../../context/AuthContext'
import type { ApiError } from '../../api/client'
import { LS_LAST_PHONE } from '../../utils/authStorage'
import { BrandStripe } from '../../design-system/components/brand/BrandStripe'

function formatLoginError(err: unknown): string {
  if (err !== null && typeof err === 'object' && 'status' in err) {
    const e = err as ApiError
    const st = e.status ?? 0
    const d = e.detail
    if (typeof d === 'string') {
      const s = d.trim()
      if (s === 'pending_approval') return 'Aguardar aprovação do administrador.'
      if (s === 'BETA cheio' || s.includes('cheio')) return 'BETA cheio. Tenta mais tarde.'
      if (s === 'invalid_credentials') return 'Password incorrecta.'
      if (s === 'blocked') return 'Conta bloqueada.'
      if (s.toLowerCase() === 'not available')
        return 'Login BETA indisponível neste servidor (modo BETA desligado).'
      if (st >= 500) {
        if (/password_hash|column|undefinedcolumn|relation/i.test(s)) {
          return 'Servidor e base de dados desalinhados (falta coluna ou tabela). No host da API corre: alembic upgrade head.'
        }
        return `Erro no servidor (${st}). Após deploy recente, confirma migrações (Alembic) e logs da API. Detalhe: ${s.slice(0, 180)}`
      }
      return s.length > 280 ? `${s.slice(0, 280)}…` : s
    }
    if (Array.isArray(d)) {
      const parts = d.map((x) =>
        typeof x === 'object' && x !== null && 'msg' in x ? String((x as { msg?: unknown }).msg) : JSON.stringify(x)
      )
      return parts.join(' · ') || 'Pedido inválido.'
    }
    if (st >= 500) {
      return `Erro no servidor (${st}). Após deploy recente, confirma migrações na base de dados (Alembic) e dependências.`
    }
  }
  if (err instanceof Error && err.message) {
    return `Falha de ligação: ${err.message}`
  }
  return 'Erro ao iniciar sessão.'
}

interface LoginScreenProps {
  /** BETA: `admin` = fluxo dedicado ao painel (URL `/admin` ou `/admin/login`). */
  requestedRole: 'passenger' | 'driver' | 'partner' | 'admin'
}

export function LoginScreen({ requestedRole }: LoginScreenProps) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [phone, setPhone] = useState(() => {
    const last = localStorage.getItem(LS_LAST_PHONE)
    return last || '+351'
  })
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await login(phone.trim(), password, requestedRole)
      localStorage.setItem(LS_LAST_PHONE, phone.trim())
      const r = res.role as Role
      if (requestedRole === 'partner' && r !== 'partner') {
        setError('Esta conta não tem acesso Frota (partner).')
        return
      }
      if (requestedRole === 'admin' && !isBackofficeStaffRole(r)) {
        setError('Esta conta não é administrador.')
        return
      }
      if (isBackofficeStaffRole(r))
        navigate(pathname.startsWith('/admin') ? `/admin${search}` : '/admin', { replace: true })
      else if (r === 'partner' || requestedRole === 'partner')
        navigate('/partner', { replace: true })
      else if (requestedRole === 'driver') navigate('/driver', { replace: true })
      else navigate('/passenger', { replace: true })
    } catch (err: unknown) {
      setError(formatLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-card overflow-hidden">
        <BrandStripe />
        <div className="p-6">
        <h1 className="text-xl font-bold text-foreground mb-4">TVDE BETA</h1>
        <div role="tablist" aria-label="Tipo de utilizador" className="grid grid-cols-2 gap-2 mb-4">
          <Link
            to="/passenger"
            role="tab"
            aria-selected={requestedRole === 'passenger'}
            className={`py-2.5 text-center text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              requestedRole === 'passenger'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Passageiro
          </Link>
          <Link
            to="/driver"
            role="tab"
            aria-selected={requestedRole === 'driver'}
            className={`py-2.5 text-center text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              requestedRole === 'driver'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Motorista
          </Link>
          <Link
            to="/partner"
            role="tab"
            aria-selected={requestedRole === 'partner'}
            className={`py-2.5 text-center text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              requestedRole === 'partner'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Frota
          </Link>
          <Link
            to="/admin/login"
            role="tab"
            aria-selected={requestedRole === 'admin'}
            className={`py-2.5 text-center text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              requestedRole === 'admin'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Administrador
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Entra com o teu telemóvel (+351...)
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
              Telemóvel
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351912345678"
              className="w-full px-3 py-2 border border-input rounded-xl bg-background text-base focus:ring-2 focus:ring-ring focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-xl bg-background text-base focus:ring-2 focus:ring-ring focus:border-transparent"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pré-preenchida com a password BETA por defeito (ex.: 123456). Se não entrares, o administrador pode
              repor a palavra-passe por defeito no painel → Utilizadores → <span className="font-medium">Limpar palavra-passe</span>.
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border-l-4 border-destructive px-3 py-2 rounded-xl">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
          >
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}
