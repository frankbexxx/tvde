import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoginMethodsSection } from '@/design-system/components/app/LoginMethodsSection'
import { isBackofficeStaffRole, useAuth } from '../../context/AuthContext'
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

function roleLabel(role: string, t: (key: string) => string): string {
  if (role === 'driver') return t('roleDriver')
  if (isBackofficeStaffRole(role)) return t('roleStaff')
  if (role === 'partner') return t('rolePartner')
  return t('rolePassenger')
}

/** Conta única: perfil, palavra-passe e métodos de início de sessão. */
export function AccountPanel() {
  const { t } = useTranslation('common')
  const { token, sessionRole, refreshSessionProfile, logout } = useAuth()
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
    if (!token || !profile?.has_custom_password) return
    setPwErr(null)
    if (newPw.length < 8) {
      setPwErr(t('betaAccount.passwordMinError'))
      return
    }
    if (newPw !== confirmPw) {
      setPwErr(t('betaAccount.passwordMismatch'))
      return
    }
    if (!currentPw.trim()) {
      setPwErr(t('betaAccount.currentRequired'))
      return
    }
    setSavingPw(true)
    try {
      await changeMyPassword(token, {
        new_password: newPw,
        current_password: currentPw,
      })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      // L-SEC-13: backend bumps token_version — this JWT is revoked; force re-login.
      toast.success(t('betaAccount.passwordUpdatedReLogin'))
      logout()
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
    <section className="space-y-4" data-testid="account-panel">
      <h2 className="text-base font-medium text-foreground">{t('profilePanel.accountTitle')}</h2>
      {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}
      {profile ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('profilePanel.profileHeading')}
            </p>
            <div>
              <label htmlFor="account-phone" className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('betaAccount.phone')}
              </label>
              <p id="account-phone" className="font-mono text-sm text-foreground">
                {profile.phone}
              </p>
            </div>
            <div>
              <label htmlFor="account-name" className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('betaAccount.visibleName')}
              </label>
              <input
                id="account-name"
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base"
              />
              <button
                type="button"
                disabled={savingName || nameDraft.trim() === (profile.name || '').trim()}
                onClick={() => void saveName()}
                className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {savingName ? t('betaAccount.saving') : t('betaAccount.saveName')}
              </button>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t('profilePanel.role')}</p>
              <p className="text-sm font-medium text-foreground">{roleLabel(sessionRole, t)}</p>
            </div>
          </div>
          {profile.has_custom_password ? (
            <div className="space-y-2 border-t border-border/80 pt-3">
              <p className="text-xs font-medium text-muted-foreground">{t('betaAccount.changePassword')}</p>
              <label htmlFor="account-curpw" className="block text-xs text-muted-foreground">
                {t('betaAccount.currentPassword')}
              </label>
              <input
                id="account-curpw"
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base"
              />
              <label htmlFor="account-newpw" className="block text-xs text-muted-foreground">
                {t('betaAccount.newPasswordMin')}
              </label>
              <input
                id="account-newpw"
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base"
              />
              <label htmlFor="account-confpw" className="block text-xs text-muted-foreground">
                {t('betaAccount.confirmNew')}
              </label>
              <input
                id="account-confpw"
                type="password"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base"
              />
              {pwErr ? <p className="text-sm text-destructive">{pwErr}</p> : null}
              <button
                type="button"
                disabled={savingPw || newPw.length < 8}
                onClick={() => void savePassword()}
                className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {savingPw ? t('betaAccount.updating') : t('betaAccount.updatePassword')}
              </button>
            </div>
          ) : null}
        </div>
      ) : !loadErr ? (
        <p className="text-sm text-muted-foreground">{t('betaAccount.loading')}</p>
      ) : null}
      <LoginMethodsSection token={token} onSessionEnded={logout} />
    </section>
  )
}
