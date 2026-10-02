import { describe, expect, it } from 'vitest'
import '@/i18n'
import { defaultDriverDocumentsState } from '../../services/driverDocuments'
import {
  blockingDocumentStatuses,
  driverAvailabilityBlockMessage,
} from './driverAvailabilityBlock'

describe('driverAvailabilityBlockMessage', () => {
  it('returns nothing when nothing blocks going available', () => {
    expect(
      driverAvailabilityBlockMessage({
        docsBlocked: false,
        statuses: [],
        hoursBlocked: false,
        restUntilLabel: null,
      }),
    ).toBeNull()
  })

  it('names each document status that is not approved', () => {
    const state = defaultDriverDocumentsState()
    state.docs.carta_tvde = 'missing'
    state.docs.certificado_motorista_tvde = 'pending_review'
    state.docs.seguro_responsabilidade_civil = 'rejected'
    state.docs.inspecao_viatura = 'expired'
    state.docs.cartao_cidadao = 'approved'
    state.docs.registo_criminal = 'approved'
    const message = driverAvailabilityBlockMessage({
      docsBlocked: true,
      statuses: blockingDocumentStatuses(state),
      hoursBlocked: false,
      restUntilLabel: null,
    })
    expect(message?.kind).toBe('documents')
    expect(message?.reason).toBe(
      'Não podes ficar disponível porque há documentos em falta, por rever, recusados e expirados.',
    )
    expect(message?.next).toBe('Vai a Documentos, no menu, para resolver o que falta.')
  })

  it('uses one phrase for a single document status', () => {
    const message = driverAvailabilityBlockMessage({
      docsBlocked: true,
      statuses: ['rejected'],
      hoursBlocked: false,
      restUntilLabel: null,
    })
    expect(message?.reason).toBe('Não podes ficar disponível porque há documentos recusados.')
  })

  it('explains a rest block and the known return time', () => {
    const message = driverAvailabilityBlockMessage({
      docsBlocked: false,
      statuses: [],
      hoursBlocked: true,
      restUntilLabel: '02/10/2026, 18:00:00',
    })
    expect(message?.kind).toBe('rest')
    expect(message?.reason).toBe('Não podes ficar disponível porque estás em período de repouso.')
    expect(message?.next).toBe('Aguarda o fim do repouso. Podes voltar a partir de 02/10/2026, 18:00:00.')
  })

  it('asks the driver to wait when the rest end is unknown', () => {
    const message = driverAvailabilityBlockMessage({
      docsBlocked: false,
      statuses: [],
      hoursBlocked: true,
      restUntilLabel: null,
    })
    expect(message?.next).toBe('Aguarda o fim do repouso.')
  })

  it('does not treat a reached limit as a block', () => {
    expect(
      driverAvailabilityBlockMessage({
        docsBlocked: false,
        statuses: [],
        hoursBlocked: false,
        restUntilLabel: null,
      }),
    ).toBeNull()
  })

  it('explains documents when documents and rest would both block', () => {
    const message = driverAvailabilityBlockMessage({
      docsBlocked: true,
      statuses: ['missing'],
      hoursBlocked: true,
      restUntilLabel: '02/10/2026, 18:00:00',
    })
    expect(message?.kind).toBe('documents')
    expect(message?.reason).toContain('em falta')
    expect(message?.reason).not.toContain('repouso')
  })
})
