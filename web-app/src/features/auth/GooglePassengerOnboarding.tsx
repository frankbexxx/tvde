import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BTN_PRIMARY_RADIUS, SURFACE_RADIUS } from '../../components/layout/infoBoxTemplate'
import { BrandStripe } from '../../design-system/components/brand/BrandStripe'
import { LegalAcceptanceCheckbox } from './LegalAcceptanceCheckbox'
import { apiDetailCode, normalizePtPhone } from './googleOnboarding'

export type GoogleOnboardingSubmit = {
  idToken: string
  nonce?: string
  name: string
  phone: string
  acceptLegal: boolean
}

export type GoogleLinkSubmit = {
  idToken: string
  nonce?: string
  phone: string
  password: string
  acceptLegal: boolean
}

type GooglePassengerOnboardingProps = {
  email: string
  suggestedName: string
  idToken: string
  nonce?: string
  onComplete: (body: GoogleOnboardingSubmit) => Promise<unknown>
  onLink: (body: GoogleLinkSubmit) => Promise<unknown>
  onDone: () => void
  onRestart: () => void
  initialLinkRequired?: boolean
}

export function GooglePassengerOnboarding({
  email,
  suggestedName,
  idToken,
  nonce,
  onComplete,
  onLink,
  onDone,
  onRestart,
  initialLinkRequired = false,
}: GooglePassengerOnboardingProps) {
  const { t } = useTranslation('auth')
  const [name, setName] = useState(suggestedName)
  const [phone, setPhone] = useState('+351')
  const [password, setPassword] = useState('')
  const [linkRequired, setLinkRequired] = useState(initialLinkRequired)
  const [acceptLegal, setAcceptLegal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!idToken) {
    return (
      <div className="box-border flex min-h-dvh flex-col bg-background px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className={`m-auto w-full max-w-sm bg-card ${SURFACE_RADIUS} shadow-card overflow-hidden p-6`}>
          <p className="text-sm text-foreground" data-testid="google-onboarding-restart">
            {t('googleOnboardingRestart')}
          </p>
          <button
            type="button"
            className={`mt-4 w-full min-h-[44px] ${BTN_PRIMARY_RADIUS} bg-primary text-primary-foreground font-medium`}
            onClick={onRestart}
          >
            {t('googleOnboardingRestartAction')}
          </button>
        </div>
      </div>
    )
  }

  const submit = async () => {
    const cleanedName = name.trim()
    if (cleanedName.length < 1 || cleanedName.length > 120) {
      setError(t('googleOnboardingNameInvalid'))
      return
    }
    const normalizedPhone = normalizePtPhone(phone)
    if (!normalizedPhone) {
      setError(t('googleOnboardingPhoneInvalid'))
      return
    }
    if (!acceptLegal) {
      setError(t('legalAcceptNewAccount'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (linkRequired) {
        await onLink({
          idToken,
          nonce,
          phone: normalizedPhone,
          password,
          acceptLegal: true,
        })
      } else {
        await onComplete({
          idToken,
          nonce,
          name: cleanedName,
          phone: normalizedPhone,
          acceptLegal: true,
        })
      }
      onDone()
    } catch (err: unknown) {
      const code = apiDetailCode(err)
      if (code === 'existing_account_link_required') {
        setLinkRequired(true)
        setError(null)
      } else if (code === 'invalid_credentials') setError(t('googleOnboardingLinkPasswordInvalid'))
      else if (code === 'existing_account_link_conflict') setError(t('googleOnboardingLinkFailed'))
      else if (code === 'phone_already_used') setError(t('googleOnboardingPhoneTaken'))
      else if (code === 'invalid_phone_format') setError(t('googleOnboardingPhoneInvalid'))
      else if (code === 'invalid_name') setError(t('googleOnboardingNameInvalid'))
      else if (code === 'legal_acceptance_required') setError(t('legalAcceptNewAccount'))
      else setError(t('googleCapacitorFailed'))
    } finally {
      setLoading(false)
    }
  }

  const nameOk = name.trim().length >= 1 && name.trim().length <= 120
  const phoneOk = normalizePtPhone(phone) !== null
  const passwordOk = !linkRequired || password.trim().length > 0
  const canSubmit = nameOk && phoneOk && passwordOk && acceptLegal && !loading

  return (
    <div
      className="box-border flex min-h-dvh flex-col overflow-y-auto bg-background px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      data-testid="google-onboarding"
    >
      <div className={`m-auto w-full max-w-sm bg-card ${SURFACE_RADIUS} shadow-card overflow-hidden`}>
        <BrandStripe />
        <form
          className="p-6 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <h1 className="text-lg font-semibold text-foreground">{t('googleOnboardingTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('googleOnboardingBody')}</p>
          <div>
            <label htmlFor="google-onboarding-email" className="block text-sm font-medium text-foreground mb-1">
              {t('googleOnboardingEmail')}
            </label>
            <input
              id="google-onboarding-email"
              data-testid="google-onboarding-email"
              type="email"
              readOnly
              value={email}
              className="w-full px-3 py-2 border border-input rounded-lg bg-muted text-base text-foreground"
            />
          </div>
          <div>
            <label htmlFor="google-onboarding-name" className="block text-sm font-medium text-foreground mb-1">
              {t('googleOnboardingName')}
            </label>
            <input
              id="google-onboarding-name"
              data-testid="google-onboarding-name"
              type="text"
              required
              minLength={1}
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-base text-foreground"
            />
          </div>
          <div>
            <label htmlFor="google-onboarding-phone" className="block text-sm font-medium text-foreground mb-1">
              {t('googleOnboardingPhone')}
            </label>
            <input
              id="google-onboarding-phone"
              data-testid="google-onboarding-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="+351912345678"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-base text-foreground"
            />
          </div>
          {linkRequired ? (
            <div>
              <p className="text-sm text-foreground mb-2">{t('googleOnboardingLinkBody')}</p>
              <label htmlFor="google-onboarding-password" className="block text-sm font-medium text-foreground mb-1">
                {t('googleOnboardingLinkPassword')}
              </label>
              <input
                id="google-onboarding-password"
                data-testid="google-onboarding-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-base text-foreground"
              />
            </div>
          ) : null}
          <LegalAcceptanceCheckbox checked={acceptLegal} onChange={setAcceptLegal} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button
            type="submit"
            data-testid="google-onboarding-submit"
            disabled={!canSubmit}
            className={`w-full min-h-[44px] ${BTN_PRIMARY_RADIUS} bg-primary text-primary-foreground font-medium disabled:opacity-50`}
          >
            {linkRequired ? t('googleOnboardingLinkSubmit') : t('googleOnboardingSubmit')}
          </button>
        </form>
      </div>
    </div>
  )
}
