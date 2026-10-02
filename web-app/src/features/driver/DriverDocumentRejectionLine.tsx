import { useTranslation } from 'react-i18next'

export function DriverDocumentRejectionLine({
  status,
  publicReason,
  testId,
}: {
  status: string
  publicReason?: string | null
  testId: string
}) {
  const { t } = useTranslation('driver')
  if (status !== 'rejected') return null
  const reason = publicReason?.trim()
  return (
    <p className="mt-1 text-[11px] text-foreground/80 leading-snug" data-testid={testId}>
      {reason ? (
        <>
          <span className="font-medium text-foreground/90">{t('opsMenu.docs.rejectedTitle')}</span>
          {' '}
          {t('opsMenu.docs.rejectedReason', { reason })}
        </>
      ) : (
        t('opsMenu.docs.rejectedFallback')
      )}
    </p>
  )
}
