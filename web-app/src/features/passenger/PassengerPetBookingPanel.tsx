/**
 * PET-2 — category + animal options for Passenger planner (confirming).
 */
import { useTranslation } from 'react-i18next'
import {
  type PassengerFareCategory,
  type PassengerPetBookingState,
  type PetSize,
  type PetTransport,
  PASSENGER_COUNT_OPTIONS,
  PET_SURCHARGE_EUR_DISCLOSURE,
  applyAssistance,
  applyPetSize,
  applyPetTransport,
  applyWithAnimal,
  validatePetBooking,
} from './petBooking'
import { BTN_SECONDARY_RADIUS, INFO_BOX_BODY_COMPACT } from '../../components/layout/infoBoxTemplate'

const FARE_OPTIONS: PassengerFareCategory[] = ['x', 'comfort', 'xl']
const SIZE_OPTIONS: PetSize[] = ['small', 'medium', 'large']
const TRANSPORT_OPTIONS: PetTransport[] = ['carrier', 'harness']

export type PassengerPetBookingPanelProps = {
  value: PassengerPetBookingState
  onChange: (next: PassengerPetBookingState) => void
  /** Show price disclosure for commercial pet (policy €1,50; final from API). */
  showPriceHints?: boolean
}

function Chip({
  selected,
  onClick,
  children,
  testId,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  testId: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 min-w-[4.5rem] flex-1 rounded-lg border px-3 py-2 text-base font-medium touch-manipulation transition-colors ${
        selected
          ? 'border-info bg-info/15 text-foreground'
          : 'border-border bg-muted/40 text-foreground/90 hover:bg-muted/60'
      }`}
    >
      {children}
    </button>
  )
}

export function PassengerPetBookingPanel({
  value,
  onChange,
  showPriceHints = true,
}: PassengerPetBookingPanelProps) {
  const { t } = useTranslation('passenger')
  const validation = validatePetBooking(value)

  return (
    <div className="space-y-3" data-testid="passenger-pet-booking">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
          {t('pet.categoryTitle')}
        </p>
        <div className="flex flex-wrap gap-2">
          {FARE_OPTIONS.map((cat) => (
            <Chip
              key={cat}
              testId={`passenger-fare-${cat}`}
              selected={value.fareCategory === cat}
              onClick={() => onChange({ ...value, fareCategory: cat })}
            >
              {t(
                cat === 'x'
                  ? 'pet.categoryGo'
                  : cat === 'comfort'
                    ? 'pet.categoryComfort'
                    : 'pet.categoryXl',
              )}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
          {t('pet.passengersTitle')}
        </p>
        <div className="flex flex-wrap gap-2">
          {PASSENGER_COUNT_OPTIONS.map((n) => (
            <Chip
              key={n}
              testId={`passenger-count-${n}`}
              selected={value.passengerCount === n}
              onClick={() => onChange({ ...value, passengerCount: n })}
            >
              {String(n)}
            </Chip>
          ))}
        </div>
      </div>

      <label className="flex min-h-11 items-center gap-3 touch-manipulation">
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-info"
          data-testid="passenger-with-animal"
          checked={value.withAnimal}
          onChange={(e) => onChange(applyWithAnimal(value, e.target.checked))}
        />
        <span className="text-base text-foreground">{t('pet.withAnimal')}</span>
      </label>

      <label className="flex min-h-11 items-center gap-3 touch-manipulation">
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-info"
          data-testid="passenger-assistance-animal"
          checked={value.isAssistanceAnimal}
          onChange={(e) => onChange(applyAssistance(value, e.target.checked))}
        />
        <span className="text-base text-foreground">{t('pet.assistance')}</span>
      </label>

      {value.isAssistanceAnimal ? (
        <div className="space-y-2">
          <p className={`${INFO_BOX_BODY_COMPACT} text-foreground/75`} data-testid="passenger-assistance-hint">
            {t('pet.assistanceHint')}
          </p>
          <label className="flex min-h-11 items-start gap-3 touch-manipulation">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-info"
              data-testid="passenger-assistance-occupies-seat"
              checked={value.petOccupiesSeat}
              onChange={(e) => onChange({ ...value, petOccupiesSeat: e.target.checked })}
            />
            <span className="text-base text-foreground leading-snug">{t('pet.occupiesSeat')}</span>
          </label>
          {value.petOccupiesSeat ? (
            <p className="text-xs text-foreground/70" data-testid="passenger-pet-seat-hint">
              {t('pet.seatExtraHint')}
            </p>
          ) : null}
        </div>
      ) : null}

      {value.withAnimal && !value.isAssistanceAnimal ? (
        <div className={`space-y-3 ${BTN_SECONDARY_RADIUS} border border-border bg-muted/30 p-2.5`}>
          <p className="text-xs text-foreground/70" data-testid="passenger-pet-max-one">
            {t('pet.maxOne')}
          </p>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground/70">{t('pet.sizeTitle')}</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((size) => (
                <Chip
                  key={size}
                  testId={`passenger-pet-size-${size}`}
                  selected={value.petSize === size}
                  onClick={() => onChange(applyPetSize(value, size))}
                >
                  {t(`pet.size.${size}`)}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground/70">{t('pet.transportTitle')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {(value.petSize === 'large' ? (['harness'] as PetTransport[]) : TRANSPORT_OPTIONS).map(
                (tr) => (
                  <Chip
                    key={tr}
                    testId={`passenger-pet-transport-${tr}`}
                    selected={value.petTransport === tr}
                    onClick={() => onChange(applyPetTransport(value, tr))}
                  >
                    {t(`pet.transport.${tr}`)}
                  </Chip>
                ),
              )}
            </div>
            {value.petSize === 'large' ? (
              <p className="text-xs text-foreground/70">{t('pet.largeHarnessOnly')}</p>
            ) : null}
          </div>

          <label className="flex min-h-11 items-start gap-3 touch-manipulation">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-info"
              data-testid="passenger-pet-occupies-seat"
              checked={value.petOccupiesSeat}
              onChange={(e) => onChange({ ...value, petOccupiesSeat: e.target.checked })}
            />
            <span className="text-base text-foreground leading-snug">{t('pet.occupiesSeat')}</span>
          </label>
          {value.petOccupiesSeat ? (
            <p className="text-xs text-foreground/70" data-testid="passenger-pet-seat-hint">
              {t('pet.seatExtraHint')}
            </p>
          ) : null}

          {showPriceHints ? (
            <p className="text-sm font-medium text-foreground" data-testid="passenger-pet-surcharge-hint">
              {t('pet.surchargeHint', { amount: PET_SURCHARGE_EUR_DISCLOSURE.toFixed(2) })}
            </p>
          ) : null}

          {!validation.ok ? (
            <p
              className="text-sm text-destructive leading-snug"
              role="alert"
              data-testid="passenger-pet-validation-error"
            >
              {t(validation.messageKey)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
