import { useTranslation } from 'react-i18next'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { MapActionRow } from '../../components/layout/MapActionRow'
import { BTN_SECONDARY, BTN_SECONDARY_RADIUS } from '../../components/layout/infoBoxTemplate'
import { TRIP_CANCEL_SELECT_OTHER } from '../../constants/tripCancelReasons'
import { passengerCancelNoticeKey } from './passengerCancelCopy'

type Preset = { value: string; label: string }

type PassengerCancelPanelProps = {
  status: string | null | undefined
  presets: Preset[]
  preset: string
  other: string
  cancelling: boolean
  onPreset: (value: string) => void
  onOther: (value: string) => void
  onConfirm: () => void
  onBack: () => void
}

export function PassengerCancelPanel({
  status,
  presets,
  preset,
  other,
  cancelling,
  onPreset,
  onOther,
  onConfirm,
  onBack,
}: PassengerCancelPanelProps) {
  const { t } = useTranslation('passenger')
  const noticeKey = passengerCancelNoticeKey(status)
  return (
    <div className="space-y-3 pt-1" data-testid="passenger-cancel-panel">
      <p className="text-sm font-medium text-foreground">{t('cancelFlow.title')}</p>
      {noticeKey ? (
        <p className="text-sm text-foreground leading-snug" data-testid="passenger-cancel-notice">
          {t(noticeKey)}
        </p>
      ) : null}
      <label className="block text-xs text-muted-foreground" htmlFor="passenger-cancel-preset">
        {t('cancelFlow.quickPick')}
      </label>
      <select
        id="passenger-cancel-preset"
        data-testid="passenger-cancel-preset"
        className={`w-full min-h-11 ${BTN_SECONDARY_RADIUS} border border-border bg-card px-2 text-sm text-foreground touch-manipulation`}
        value={preset}
        onChange={(e) => onPreset(e.target.value)}
        disabled={cancelling}
      >
        {presets.map((o) => (
          <option key={o.value || 'none'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {preset === TRIP_CANCEL_SELECT_OTHER ? (
        <textarea
          data-testid="passenger-cancel-other"
          className={`w-full min-h-[72px] ${BTN_SECONDARY_RADIUS} border border-border bg-card px-2 py-2 text-sm text-foreground`}
          placeholder={t('cancelFlow.otherPlaceholder')}
          maxLength={280}
          value={other}
          onChange={(e) => onOther(e.target.value)}
          disabled={cancelling}
        />
      ) : null}
      <MapActionRow testId="passenger-cancel-actions">
        <PrimaryActionButton
          className="flex-1 min-w-0"
          size="compact"
          variant="danger"
          loading={cancelling}
          disabled={cancelling}
          onClick={onConfirm}
        >
          {t('cancelFlow.confirm')}
        </PrimaryActionButton>
        <button
          type="button"
          data-testid="passenger-cancel-back"
          className={`flex-1 min-w-0 ${BTN_SECONDARY}`}
          disabled={cancelling}
          onClick={onBack}
        >
          {t('common:back')}
        </button>
      </MapActionRow>
    </div>
  )
}
