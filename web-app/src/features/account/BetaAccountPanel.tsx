import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { changeMyPassword, getMeProfile, patchMeProfile, type MeProfileResponse } from '../../api/auth'
import type { ApiError } from '../../api/client'
import { toast } from 'sonner'

function errDetail(err: unknown): string {
  const e = err as ApiError
  const d = e?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => JSON.stringify(x)).join(' · ')
  if (err instanceof Error && err.message) return err.message
  return 'Erro'
}

/** M1: conta mínima no ecrã (BETA) — nome, telefone só leitura, alterar palavra-passe. */
export function BetaAccountPanel() {
  const { token, betaMode, refreshSessionProfile } = useAuth()
  const [profile, setProfile] = useState<MeProfileResponse | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwErr, setPwErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !betaMode) return
    setLoadErr(null)
    try {
      const me = await getMeProfile(token)
      setProfile(me)
      setNameDraft(me.name || me.phone)
    } catch (e) {
      setLoadErr(errDetail(e))
    }
  }, [token, betaMode])

  useEffect(() => {
    void load()
  }, [load])

  const saveName = async () => {
    if (!token || !betaMode) return
    const next = nameDraft.trim()
    if (next.length < 1) {
      toast.error('Indica um nome (1–120 caracteres).')
      return
    }
    setSavingName(true)
    try {
      const me = await patchMeProfile(token, next)
      setProfile(me)
      await refreshSessionProfile()
      toast.success('Nome actualizado.')
    } catch (e) {
      toast.error(errDetail(e))
    } finally {
      setSavingName(false)
    }
  }

  const savePassword = async () => {
    if (!token || !betaMode || !profile) return
    setPwErr(null)
    if (newPw.length < 8) {
      setPwErr('A nova palavra-passe precisa de pelo menos 8 caracteres.')
      return
    }
    if (newPw !== confirmPw) {
      setPwErr('A confirmação não coincide com a nova palavra-passe.')
      return
    }
    if (profile.has_custom_password && !currentPw.trim()) {
      setPwErr('Indica a palavra-passe actual.')
      return
    }
    setSavingPw(true)
    try {
      await changeMyPassword(token, {
        new_password: newPw,
        current_password: profile.has_custom_password ? currentPw : undefined,
      })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      await load()
      toast.success('Palavra-passe actualizada.')
    } catch (e) {
      const msg = errDetail(e)
      setPwErr(msg)
      toast.error(msg)
    } finally {
      setSavingPw(false)
    }
  }

  if (!betaMode || !token) return null

  return (
    <section className="pt-8 mt-8 border-t border-border">
      <h2 className="text-base font-medium text-foreground/75 mb-2">Conta (BETA)</h2>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        O <span className="font-medium">telemóvel</span> só pode ser alterado pelo administrador. Para repor a password
        por defeito, o admin pode usar <span className="font-medium">Limpar palavra-passe</span> no painel.
      </p>
      {loadErr ? (
        <p className="text-sm text-destructive mb-3">{loadErr}</p>
      ) : null}
      {profile ? (
        <div className="space-y-5 rounded-xl border border-border bg-card/60 p-4">
          <div>
            <label htmlFor="beta-acct-phone" className="block text-xs font-medium text-muted-foreground mb-1">
              Telemóvel
            </label>
            <p id="beta-acct-phone" className="text-sm font-mono text-foreground">
              {profile.phone}
            </p>
          </div>
          <div>
            <label htmlFor="beta-acct-name" className="block text-xs font-medium text-muted-foreground mb-1">
              Nome visível
            </label>
            <input
              id="beta-acct-name"
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-base"
            />
            <button
              type="button"
              disabled={savingName || nameDraft.trim() === (profile.name || '').trim()}
              onClick={() => void saveName()}
              className="mt-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg disabled:opacity-50"
            >
              {savingName ? 'A guardar…' : 'Guardar nome'}
            </button>
          </div>
          <div className="pt-2 border-t border-border/80">
            <p className="text-xs font-medium text-muted-foreground mb-2">Alterar palavra-passe</p>
            {profile.has_custom_password ? (
              <div className="mb-2">
                <label htmlFor="beta-acct-curpw" className="block text-xs text-muted-foreground mb-1">
                  Palavra-passe actual
                </label>
                <input
                  id="beta-acct-curpw"
                  type="password"
                  autoComplete="current-password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-base"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-2">
                Ainda usas a password por defeito do BETA — define uma nova abaixo (não precisas da actual).
              </p>
            )}
            <label htmlFor="beta-acct-newpw" className="block text-xs text-muted-foreground mb-1">
              Nova palavra-passe (mín. 8 caracteres)
            </label>
            <input
              id="beta-acct-newpw"
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-base mb-2"
            />
            <label htmlFor="beta-acct-confpw" className="block text-xs text-muted-foreground mb-1">
              Confirmar nova
            </label>
            <input
              id="beta-acct-confpw"
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-base mb-2"
            />
            {pwErr ? <p className="text-sm text-destructive mb-2">{pwErr}</p> : null}
            <button
              type="button"
              disabled={savingPw || newPw.length < 8}
              onClick={() => void savePassword()}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-lg disabled:opacity-50"
            >
              {savingPw ? 'A actualizar…' : 'Actualizar palavra-passe'}
            </button>
          </div>
        </div>
      ) : !loadErr ? (
        <p className="text-sm text-muted-foreground">A carregar dados da conta…</p>
      ) : null}
    </section>
  )
}
