import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../context/AuthContext'
import { LS_LAST_PHONE } from '../../utils/authStorage'

interface LoginScreenProps {
  requestedRole: 'passenger' | 'driver' | 'partner'
}

export function LoginScreen({ requestedRole }: LoginScreenProps) {
  const { login } = useAuth()
  const navigate = useNavigate()
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
      if (r === 'admin') navigate('/admin', { replace: true })
      else if (r === 'partner' || requestedRole === 'partner')
        navigate('/partner', { replace: true })
      else if (requestedRole === 'driver') navigate('/driver', { replace: true })
      else navigate('/passenger', { replace: true })
    } catch (err: unknown) {
      const e = err as { detail?: string }
      const msg =
        e?.detail === 'pending_approval'
          ? 'Aguardar aprovação do administrador.'
          : e?.detail === 'BETA cheio'
            ? 'BETA cheio. Tente mais tarde.'
            : e?.detail === 'invalid_credentials'
              ? 'Password incorreta.'
              : typeof e?.detail === 'string'
                ? e.detail
                : 'Erro ao iniciar sessão.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-card p-6">
        <h1 className="text-xl font-bold text-foreground mb-4">TVDE BETA</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <Link
            to="/passenger"
            className={`flex-1 py-2 text-center text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              requestedRole === 'passenger'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Passageiro
          </Link>
          <Link
            to="/driver"
            className={`flex-1 py-2 text-center text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              requestedRole === 'driver'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Motorista
          </Link>
          <Link
            to="/partner"
            className={`flex-1 py-2 text-center text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              requestedRole === 'partner'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Frota
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
            <p className="text-xs text-muted-foreground mt-1">Pré-preenchida: 123456</p>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
