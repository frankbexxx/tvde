import { describe, expect, it } from 'vitest'
import { formatApiErrorDetail, formatApiErrorFromUnknown } from './apiErrorDetail'

describe('formatApiErrorDetail', () => {
  it('mantém string curta', () => {
    expect(formatApiErrorDetail('  no_drivers  ')).toBe('no_drivers')
  })

  it('lista de validação FastAPI → junta msgs', () => {
    const detail = [
      { loc: ['body', 'x'], msg: 'campo obrigatório', type: 'value_error' },
      { loc: ['body', 'y'], msg: 'inválido', type: 'type_error' },
    ]
    expect(formatApiErrorDetail(detail)).toBe('campo obrigatório · inválido')
  })

  it('objecto aninhado com detail', () => {
    expect(formatApiErrorDetail({ detail: 'nested' })).toBe('nested')
  })
})

describe('formatApiErrorFromUnknown', () => {
  it('ApiError com request_id acrescenta ref', () => {
    const s = formatApiErrorFromUnknown({
      status: 400,
      detail: 'bad',
      request_id: 'req-abc',
    })
    expect(s).toContain('bad')
    expect(s).toContain('req-abc')
  })
})
