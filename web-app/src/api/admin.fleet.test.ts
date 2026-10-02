import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './client'
import { createPartner, createPartnerOrgAdmin } from './admin'

vi.mock('./client', () => ({
  apiFetch: vi.fn(),
}))

const fetchMock = vi.mocked(apiFetch)

describe('criação de frota e gestor', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('cria a frota com o mesmo corpo de sempre', async () => {
    fetchMock.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Frota Lisboa Norte',
      created_at: '2026-10-02T10:00:00.000Z',
    })
    const created = await createPartner('  Frota Lisboa Norte  ', 'token-1', '  motivo de auditoria  ')
    expect(created.id).toBe('22222222-2222-2222-2222-222222222222')
    expect(fetchMock).toHaveBeenCalledWith('/admin/partners', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Frota Lisboa Norte',
        governance_reason: 'motivo de auditoria',
      }),
      token: 'token-1',
    })
  })

  it('cria o gestor no mesmo endpoint e com o mesmo corpo', async () => {
    fetchMock.mockResolvedValue({
      user_id: 'user-1',
      role: 'partner',
      partner_id: '22222222-2222-2222-2222-222222222222',
      phone: '+351900000000',
      name: 'Ana Gestor',
    })
    await createPartnerOrgAdmin(
      '22222222-2222-2222-2222-222222222222',
      { name: ' Ana Gestor ', phone: ' +351900000000 ' },
      'token-1',
      ' motivo de auditoria ',
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/partners/22222222-2222-2222-2222-222222222222/create-admin',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Ana Gestor',
          phone: '+351900000000',
          governance_reason: 'motivo de auditoria',
        }),
        token: 'token-1',
      },
    )
  })

  it('se criar a frota falha, a função rejeita e não devolve um id', async () => {
    fetchMock.mockRejectedValue(new Error('falhou'))
    await expect(createPartner('Frota Lisboa Norte', 'token-1', 'motivo de auditoria')).rejects.toThrow('falhou')
  })
})
