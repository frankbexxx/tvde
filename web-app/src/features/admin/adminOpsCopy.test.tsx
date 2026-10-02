import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminCronRunResponse } from '../../api/admin'
import { AdminTabOps } from './tabs/AdminTabOps'
import { adminCronResultPrimary, adminCronResultTechnical } from './adminOpsCopy'

const baseRun: AdminCronRunResponse = {
  status: 'ok',
  duration_ms: 120,
  error_count: 0,
  errors: {},
  timeouts: {
    assigned_to_requested: 0,
    accepted_to_cancelled: 0,
    ongoing_to_failed: 0,
  },
  offers: { expired_count: 0, redispatch_created: 0 },
  cleanup: { audit_events_deleted: 0 },
  system_health_status: 'ok',
  request_id: 'req-1',
}

function renderOps(cronRun: AdminCronRunResponse | null, onRun = vi.fn()) {
  render(
    <AdminTabOps
      cronRun={cronRun}
      envReveal={false}
      envText=""
      envValidate={null}
      fetchHealth={vi.fn()}
      handleExportLogs={vi.fn()}
      handleFetchPhase0={vi.fn()}
      handleReconcileCloseNoPi={vi.fn()}
      handleReconcilePreview={vi.fn()}
      handleReconcileStripeSync={vi.fn()}
      handleRecoverDriver={vi.fn()}
      handleDrivingRestSet={vi.fn()}
      handleDrivingRestClear={vi.fn()}
      drivingRestDriverId=""
      drivingRestUntilLocal=""
      setDrivingRestDriverId={vi.fn()}
      setDrivingRestUntilLocal={vi.fn()}
      handleRunCronNow={onRun}
      handleRunOfferExpiry={vi.fn()}
      handleRunTimeouts={vi.fn()}
      handleValidateEnv={vi.fn()}
      health={null}
      isSuperAdminSession
      opsLoading={null}
      opsStuckPaymentsPage={0}
      opsStuckPaymentsPageData={{ slice: [], total: 0, maxPage: 0, from: 0, to: 0 }}
      phase0={null}
      reconcilePreview={null}
      reconcileRun={null}
      recoverDriverId=""
      runRecoverDriver={vi.fn()}
      setEnvReveal={vi.fn()}
      setEnvText={vi.fn()}
      setOpsStuckPaymentsPage={vi.fn()}
      setRecoverDriverId={vi.fn()}
      syncAdminUrl={vi.fn()}
    />,
  )
  return onRun
}

describe('admin cron result copy', () => {
  it('sucesso com contagem e detalhe técnico', () => {
    const run: AdminCronRunResponse = {
      ...baseRun,
      timeouts: { assigned_to_requested: 1, accepted_to_cancelled: 0, ongoing_to_failed: 2 },
      offers: { expired_count: 4, redispatch_created: 0 },
    }
    expect(adminCronResultPrimary(run)).toContain('Operação concluída.')
    expect(adminCronResultPrimary(run)).toContain('1 viagem voltou à espera')
    expect(adminCronResultPrimary(run)).toContain('2 viagens em curso falharam por tempo')
    expect(adminCronResultPrimary(run)).toContain('4 ofertas expiraram')
    expect(adminCronResultPrimary(run)).not.toContain('0 viagens')
    expect(adminCronResultPrimary(run)).toContain('Verificação de saúde: Operacional (ok).')
    expect(adminCronResultTechnical(run)).toBe(
      'status=ok · duration_ms=120 · error_count=0 · request_id=req-1',
    )

    const onRun = renderOps(run)
    expect(screen.getByTestId('admin-cron-result')).toHaveTextContent('Operação concluída.')
    expect(screen.getByTestId('admin-cron-technical')).toHaveTextContent('duration_ms=120')
    fireEvent.click(screen.getByRole('button', { name: 'Correr cron agora' }))
    expect(onRun).toHaveBeenCalledTimes(1)
  })

  it('erro mantém o JSON no detalhe', () => {
    const run: AdminCronRunResponse = {
      ...baseRun,
      status: 'partial_error',
      error_count: 1,
      errors: { cleanup: 'boom' },
      system_health_status: 'error',
    }
    renderOps(run)
    const result = screen.getByTestId('admin-cron-result')
    expect(result).toHaveTextContent('A operação terminou com problemas.')
    expect(result).toHaveTextContent('Verificação de saúde: Indisponível (error).')
    expect(result).toHaveTextContent('1 falha.')
    expect(screen.getByTestId('admin-cron-technical')).toHaveTextContent('status=partial_error')
    expect(result).toHaveTextContent('"cleanup": "boom"')
  })

  it('estado desconhecido não inventa sucesso', () => {
    const run: AdminCronRunResponse = { ...baseRun, status: 'mystery', system_health_status: 'mystery' }
    expect(adminCronResultPrimary(run)).toContain('Resultado desconhecido.')
    expect(adminCronResultPrimary(run)).toContain('Nada mudou nas viagens, nas ofertas nem nos registos.')
    expect(adminCronResultPrimary(run)).toContain('Verificação de saúde: Desconhecido (mystery).')
  })
})
