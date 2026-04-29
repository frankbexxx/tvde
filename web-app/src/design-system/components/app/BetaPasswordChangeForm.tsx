import { useState } from 'react'
import { changeMyPassword } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Alteração de palavra-passe em modo BETA — pertence ao painel Conta, não a preferências da app. */
export function BetaPasswordChangeForm({ token }: { token: string }) {
  const [current, setCurrent] = useState('')
  const [new1, setNew1] = useState('')
  const [new2, setNew2] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    setMsg(null)
    if (new1.length < 8) {
      setMsg('Nova palavra-passe: mínimo 8 caracteres.')
      return
    }
    if (new1 !== new2) {
      setMsg('As duas novas não coincidem.')
      return
    }
    setLoading(true)
    try {
      await changeMyPassword(token, {
        current_password: current.trim() || null,
        new_password: new1,
      })
      setMsg('Palavra-passe actualizada. Na próxima entrada usa a nova.')
      setCurrent('')
      setNew1('')
      setNew2('')
    } catch (e: unknown) {
      const d = (e as { detail?: string })?.detail
      setMsg(
        d === 'invalid_current_password'
          ? 'Palavra-passe actual incorrecta (se ainda não definiste uma, usa 123456).'
          : typeof d === 'string'
            ? d
            : 'Não foi possível alterar.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-2 border-t border-border/60">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Palavra-passe (BETA)</p>
      <p className="text-xs text-foreground/80 mb-2">
        Primeira vez: em «Actual» usa a password BETA por defeito (normalmente{' '}
        <span className="font-mono">123456</span>). Depois de definires uma personalizada, passa a ser
        obrigatória a «Actual».
      </p>
      <div className="space-y-2">
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Palavra-passe actual"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="text-sm"
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="Nova (mín. 8)"
          value={new1}
          onChange={(e) => setNew1(e.target.value)}
          className="text-sm"
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="Repetir nova"
          value={new2}
          onChange={(e) => setNew2(e.target.value)}
          className="text-sm"
        />
        <Button type="button" className="w-full" disabled={loading || !new1.trim()} onClick={() => void onSubmit()}>
          {loading ? 'A guardar…' : 'Guardar nova palavra-passe'}
        </Button>
        {msg ? (
          <p className={`text-xs ${msg.includes('actualizada') ? 'text-success' : 'text-destructive'}`}>{msg}</p>
        ) : null}
      </div>
    </div>
  )
}
