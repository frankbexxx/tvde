import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  completePasswordRecovery,
  requestPasswordRecovery,
  verifyPasswordRecovery,
} from '../../api/auth'
import type { ApiError } from '../../api/client'
import { BTN_PRIMARY_RADIUS, BTN_SECONDARY_RADIUS } from '../../components/layout/infoBoxTemplate'

type Step = 'phone' | 'code' | 'password' | 'done'

function recoveryError(err: unknown, t: (key: string) => string): string {
  const detail = (err as ApiError | undefined)?.detail
  const code = typeof detail === 'string' ? detail : ''
  if (code === 'invalid_otp') return t('recoveryInvalidCode')
  if (code === 'rate_limit_otp_request' || code === 'rate_limit_otp_verify') return t('recoveryRateLimit')
  if (code === 'otp_auth_unavailable') return t('recoveryUnavailable')
  if (code === 'password_mismatch') return t('recoveryMismatch')
  if (code === 'reset_proof_invalid') return t('recoveryProofInvalid')
  if (code === 'reset_proof_used') return t('recoveryProofUsed')
  return t('recoveryUnavailable')
}

export function PasswordRecovery({
  initialPhone,
  onBack,
}: {
  initialPhone: string
  onBack: () => void
}) {
  const { t } = useTranslation('auth')
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState(initialPhone)
  const [code, setCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const send = async () => {
    setError(null)
    setLoading(true)
    try {
      await requestPasswordRecovery(phone.trim())
      setStep('code')
    } catch (err: unknown) {
      setError(recoveryError(err, t))
    } finally {
      setLoading(false)
    }
  }

  const verify = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await verifyPasswordRecovery(phone.trim(), code.trim())
      setResetToken(res.reset_token)
      setStep('password')
    } catch (err: unknown) {
      setError(recoveryError(err, t))
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (password !== confirm) {
      setError(t('recoveryMismatch'))
      return
    }
    if (password.length < 8) {
      setError(t('recoveryPasswordInvalid'))
      return
    }
    setError(null)
    setLoading(true)
    try {
      await completePasswordRecovery(resetToken, password, confirm)
      setStep('done')
    } catch (err: unknown) {
      setError(recoveryError(err, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4" data-testid="password-recovery">
      <h2 className="text-lg font-semibold text-foreground">{t('recoveryTitle')}</h2>
      {step === 'phone' && (
        <>
          <label htmlFor="recovery-phone" className="block text-sm font-medium text-foreground">
            {t('phone')}
          </label>
          <input
            id="recovery-phone"
            data-testid="recovery-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={`w-full min-h-11 px-3 py-2 border border-input ${BTN_SECONDARY_RADIUS} bg-background text-base`}
          />
          <button
            type="button"
            data-testid="recovery-send"
            disabled={loading || phone.trim().length < 9}
            onClick={() => void send()}
            className={`w-full min-h-11 py-2.5 bg-primary text-primary-foreground font-medium ${BTN_PRIMARY_RADIUS} disabled:opacity-50`}
          >
            {t('recoverySend')}
          </button>
        </>
      )}
      {step === 'code' && (
        <>
          <p className="text-sm text-foreground">{t('recoverySent')}</p>
          <label htmlFor="recovery-code" className="block text-sm font-medium text-foreground">
            {t('recoveryCode')}
          </label>
          <input
            id="recovery-code"
            data-testid="recovery-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={`w-full min-h-11 px-3 py-2 border border-input ${BTN_SECONDARY_RADIUS} bg-background text-base`}
          />
          <button
            type="button"
            data-testid="recovery-verify"
            disabled={loading || code.trim().length < 4}
            onClick={() => void verify()}
            className={`w-full min-h-11 py-2.5 bg-primary text-primary-foreground font-medium ${BTN_PRIMARY_RADIUS} disabled:opacity-50`}
          >
            {t('recoveryContinue')}
          </button>
        </>
      )}
      {step === 'password' && (
        <>
          <label htmlFor="recovery-password" className="block text-sm font-medium text-foreground">
            {t('recoveryNewPassword')}
          </label>
          <input
            id="recovery-password"
            data-testid="recovery-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`w-full min-h-11 px-3 py-2 border border-input ${BTN_SECONDARY_RADIUS} bg-background text-base`}
          />
          <label htmlFor="recovery-confirm" className="block text-sm font-medium text-foreground">
            {t('recoveryConfirmPassword')}
          </label>
          <input
            id="recovery-confirm"
            data-testid="recovery-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={`w-full min-h-11 px-3 py-2 border border-input ${BTN_SECONDARY_RADIUS} bg-background text-base`}
          />
          <button
            type="button"
            data-testid="recovery-save"
            disabled={loading}
            onClick={() => void save()}
            className={`w-full min-h-11 py-2.5 bg-primary text-primary-foreground font-medium ${BTN_PRIMARY_RADIUS} disabled:opacity-50`}
          >
            {t('recoverySave')}
          </button>
        </>
      )}
      {step === 'done' && (
        <p className="text-sm text-foreground" data-testid="recovery-success">
          {t('recoverySuccess')}
        </p>
      )}
      {error ? (
        <p className="text-sm text-destructive" data-testid="recovery-error">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="recovery-back"
        onClick={onBack}
        className={`w-full min-h-11 py-2.5 border border-input bg-background text-foreground font-medium ${BTN_SECONDARY_RADIUS}`}
      >
        {t('recoveryBack')}
      </button>
    </div>
  )
}
