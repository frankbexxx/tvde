import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PartnerAlertsPanel } from './PartnerAlertsPanel'
import { buildPartnerAlerts } from './partnerAlerts'
import { usePartnerShell } from './partnerShellContext'
import { PartnerHomeDashboard } from './screens/PartnerHomeDashboard'
import { usePartnerWorkspace } from './partnerWorkspace'

export function PartnerHome() {
  const { t } = useTranslation('partner')
  const { menuOpen } = usePartnerShell()
  const { metrics, loading, error, load, operationalAlertsSource } = usePartnerWorkspace()

  const operationalAlerts = useMemo(
    () => buildPartnerAlerts(operationalAlertsSource.drivers, operationalAlertsSource.trips),
    [operationalAlertsSource]
  )

  return (
    <div className="flex min-h-full flex-col max-w-lg mx-auto w-full">
      <div className="flex-1 space-y-6 p-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">{t('home.title')}</h2>
        </div>

        {loading && <p className="text-sm text-muted-foreground">{t('common:loading')}</p>}
        {error && !menuOpen ? <p className="text-sm text-destructive">{error}</p> : null}

        <PartnerHomeDashboard metrics={metrics} onRefresh={() => void load()} />
      </div>

      <div className="sticky bottom-[52px] z-10 border-t border-amber-500/35 bg-amber-500/10 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-medium text-foreground">{t('home.alertsTitle')}</h3>
        <p className="text-[11px] text-foreground/75 mt-0.5">
          {t('home.alertsHint')}
        </p>
        <div className="mt-2 max-h-[min(28dvh,200px)] overflow-y-auto">
          <PartnerAlertsPanel alerts={operationalAlerts} />
        </div>
      </div>
    </div>
  )
}
