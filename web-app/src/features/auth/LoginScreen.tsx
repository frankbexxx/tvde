import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface LoginScreenProps {
  requestedRole: 'passenger' | 'driver'
}

export function LoginScreen({ requestedRole }: LoginScreenProps) {
  const { login } = useAuth()
  const [phone, setPhone] = useState(() => {
    const last = localStorage.getItem('tvde_last_phone')
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
      await login(phone.trim(), password, requestedRole)
      localStorage.setItem('tvde_last_phone', phone.trim())
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-4">TVDE BETA</h1>
        <div className="flex gap-2 mb-4">
          <Link
            to="/passenger"
            className={`flex-1 py-2 text-center text-sm font-medium rounded-lg ${
              requestedRole === 'passenger'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            Passageiro
          </Link>
          <Link
            to="/driver"
            className={`flex-1 py-2 text-center text-sm font-medium rounded-lg ${
              requestedRole === 'driver'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            Motorista
          </Link>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Entra com o teu telemóvel (+351...)
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              Telemóvel
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351912345678"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Pré-preenchida: 123456</p>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
