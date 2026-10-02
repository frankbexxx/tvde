import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../../api/client'
import { useAdminUsersDirectory } from './useAdminUsersDirectory'

vi.mock('../../api/client', () => ({
  apiFetch: vi.fn(),
}))

const reason = 'motivo de teste'

describe('admin delete and password clear requests', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
    vi.mocked(apiFetch).mockResolvedValue([])
    vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('prompt')
    })
  })

  it('eliminar usa DELETE e só o motivo', async () => {
    const setError = vi.fn()
    const { result } = renderHook(() =>
      useAdminUsersDirectory({
        token: 'tok',
        tab: 'users',
        setError,
        setLoading: vi.fn(),
        invalidateUserAudit: vi.fn(),
      }),
    )
    const ok = await result.current.handleDelete('user-ana', `  ${reason}  `)
    expect(ok).toBe(true)
    expect(window.prompt).not.toHaveBeenCalled()
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/admin/users/user-ana', {
      method: 'DELETE',
      token: 'tok',
      body: JSON.stringify({ governance_reason: reason }),
    })
  })

  it('motivo curto não chama eliminar', async () => {
    const { result } = renderHook(() =>
      useAdminUsersDirectory({
        token: 'tok',
        tab: 'users',
        setError: vi.fn(),
        setLoading: vi.fn(),
        invalidateUserAudit: vi.fn(),
      }),
    )
    const ok = await result.current.handleDelete('user-ana', 'curto')
    expect(ok).toBe('O motivo precisa de pelo menos 10 caracteres.')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('retirar palavra-passe usa o mesmo corpo, sem palavra-passe nova', async () => {
    const { result } = renderHook(() =>
      useAdminUsersDirectory({
        token: 'tok',
        tab: 'users',
        setError: vi.fn(),
        setLoading: vi.fn(),
        invalidateUserAudit: vi.fn(),
      }),
    )
    const ok = await result.current.handleClearUserPassword('user-ana', reason)
    expect(ok).toBe(true)
    expect(window.prompt).not.toHaveBeenCalled()
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/admin/users/user-ana/password/clear', {
      method: 'POST',
      token: 'tok',
      body: JSON.stringify({ confirmation: 'LIMPAR_SENHA', governance_reason: reason }),
    })
  })

  it('erro de eliminar devolve a mensagem e não finge sucesso', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce({ detail: 'cannot_delete_user_with_trips' })
    const setError = vi.fn()
    const { result } = renderHook(() =>
      useAdminUsersDirectory({
        token: 'tok',
        tab: 'users',
        setError,
        setLoading: vi.fn(),
        invalidateUserAudit: vi.fn(),
      }),
    )
    const ok = await result.current.handleDelete('user-ana', reason)
    expect(ok).toBe('Não é possível eliminar: o utilizador tem viagens como passageiro.')
    expect(setError).toHaveBeenCalledWith(ok)
  })
})
