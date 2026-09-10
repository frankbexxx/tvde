import { useTranslation } from 'react-i18next'
import {
  ATTENDABLE_REASON_CODES,
  MAX_ATTENDABLE_REASON_DETAIL,
  OTHER_ATTENDABLE_REASON,
  type AttendableReasonCode,
} from '../../constants/attendableReasons'
import { BTN_SECONDARY_RADIUS } from '../layout/infoBoxTemplate'

type Props = {
  code: string
  detail: string
  onCodeChange: (code: string) => void
  onDetailChange: (detail: string) => void
  disabled?: boolean
  selectTestId?: string
  detailTestId?: string
}

/** Closed taxonomy for pet / assistance dog reject & cancel (PET-5A.2). */
export function AttendableReasonFields({
  code,
  detail,
  onCodeChange,
  onDetailChange,
  disabled,
  selectTestId = 'attendable-reason-code',
  detailTestId = 'attendable-reason-detail',
}: Props) {
  const { t } = useTranslation('trip')
  return (
    <div className="space-y-2">
      <label className="block text-xs text-muted-foreground" htmlFor={selectTestId}>
        {t('attendableReasons.title')}
      </label>
      <select
        id={selectTestId}
        data-testid={selectTestId}
        className={`w-full min-h-[44px] ${BTN_SECONDARY_RADIUS} border border-border bg-background px-2 text-sm text-foreground`}
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{t('attendableReasons.none')}</option>
        {ATTENDABLE_REASON_CODES.map((c) => (
          <option key={c} value={c}>
            {t(`attendableReasons.${c}` as `attendableReasons.${AttendableReasonCode}`)}
          </option>
        ))}
      </select>
      {code === OTHER_ATTENDABLE_REASON ? (
        <textarea
          data-testid={detailTestId}
          className={`w-full min-h-[72px] ${BTN_SECONDARY_RADIUS} border border-border bg-background px-2 py-2 text-sm text-foreground`}
          placeholder={t('attendableReasons.detailPlaceholder')}
          maxLength={MAX_ATTENDABLE_REASON_DETAIL}
          value={detail}
          onChange={(e) => onDetailChange(e.target.value)}
          disabled={disabled}
        />
      ) : null}
    </div>
  )
}
