import { useCallback, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { changeMyPassword, getMeProfile, patchMeProfile, type MeProfileResponse } from '../../api/auth'
import { withColdStartRetries } from '../../api/client'
import type { ApiError } from '../../api/client'
import { toast } from 'sonner'

function errDetail(err: unknown, fallback: string): string {
  const e = err as ApiError
  const d = e?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => JSON.stringify(x)).join(' · ')
  if (err instanceof Error && err.message) return err.message
  return fallback
}

/** M1: conta mínima no ecrã (BETA) — nome, telefone só leitura, alterar palavra-passe. */
export function BetaAccountPanel() {
  const { t } = useTranslation('common')
  const { token, refreshSessionProfile } = useAuth()
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
    if (!token) return
    setLoadErr(null)
    try {
      const me = await withColdStartRetries((timeoutMs) => getMeProfile(token, timeoutMs))
      setProfile(me)
      setNameDraft(me.name || me.phone)
    } catch (e) {
      setLoadErr(errDetail(e, t('error')))
    }
  }, [token, t])

  useEffect(() => {
    void load()
  }, [load])

  const saveName = async () => {
    if (!token) return
    const next = nameDraft.trim()
    if (next.length < 1) {
      toast.error(t('betaAccount.nameValidation'))
      return
    }
    setSavingName(true)
    try {
      const me = await patchMeProfile(token, next)
      setProfile(me)
      await refreshSessionProfile()
      toast.success(t('betaAccount.nameUpdated'))
    } catch (e) {
      toast.error(errDetail(e, t('error')))
    } finally {
      setSavingName(false)
    }
  }

  const savePassword = async () => {
    if (!token || !profile) return
    setPwErr(null)
    if (newPw.length < 8) {
      setPwErr(t('betaAccount.passwordMinError'))
      return
    }
    if (newPw !== confirmPw) {
      setPwErr(t('betaAccount.passwordMismatch'))
      return
    }
    if (profile.has_custom_password && !currentPw.trim()) {
      setPwErr(t('betaAccount.currentRequired'))
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
      toast.success(t('betaAccount.passwordUpdated'))
    } catch (e) {
      const msg = errDetail(e, t('error'))
      setPwErr(msg)
      toast.error(msg)
    } finally {
      setSavingPw(false)
    }
  }

  if (!token) return null

  return (
    <section className="pt-8 mt-8 border-t border-border" data-testid="beta-account-panel">
      <h2 className="text-base font-medium text-foreground/75 mb-2">{t('betaAccount.title')}</h2>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        <Trans
          i18nKey="betaAccount.intro"
          ns="common"
          components={{
            phone: <span className="font-medium" />,
            clear: <span className="font-medium" />,
          }}
        />
      </p>
      {loadErr ? (
        <p className="text-sm text-destructive mb-3">{loadErr}</p>
      ) : null}
      {profile ? (
        <div className="space-y-5 rounded-xl border border-border bg-card/60 p-4">
          <div>
            <label htmlFor="beta-acct-phone" className="block text-xs font-medium text-muted-foreground mb-1">
              {t('betaAccount.phone')}
            </label>
            <p id="beta-acct-phone" className="text-sm font-mono text-foreground">
              {profile.phone}
            </p>
          </div>
          <div>
            <label htmlFor="beta-acct-name" className="block text-xs font-medium text-muted-foreground mb-1">
              {t('betaAccount.visibleName')}
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
              className="mt-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              {savingName ? t('betaAccount.saving') : t('betaAccount.saveName')}
            </button>
          </div>
          <div className="pt-2 border-t border-border/80">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('betaAccount.changePassword')}</p>
            {profile.has_custom_password ? (
              <div className="mb-2">
                <label htmlFor="beta-acct-curpw" className="block text-xs text-muted-foreground mb-1">
                  {t('betaAccount.currentPassword')}
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
                {t('betaAccount.defaultPasswordHint')}
              </p>
            )}
            <label htmlFor="beta-acct-newpw" className="block text-xs text-muted-foreground mb-1">
              {t('betaAccount.newPasswordMin')}
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
              {t('betaAccount.confirmNew')}
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
              className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              {savingPw ? t('betaAccount.updating') : t('betaAccount.updatePassword')}
            </button>
          </div>
        </div>
      ) : !loadErr ? (
        <p className="text-sm text-muted-foreground">{t('betaAccount.loading')}</p>
      ) : null}
    </section>
  )
}
