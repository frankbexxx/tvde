import { beforeEach, describe, expect, it } from 'vitest'
import i18n from './index'
import { formatLoginError } from './apiErrors'

describe('formatLoginError', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
  })

  it('não mostra Alembic nem o detalhe cru num erro 500', () => {
    const message = formatLoginError({
      status: 500,
      detail: 'alembic upgrade head failed on column password_hash',
    })
    expect(message).toBe(
      'Não foi possível entrar. Tenta de novo dentro de momentos. Se continuar, contacta o suporte.',
    )
    expect(message).not.toMatch(/alembic|Alembic|VITE_|token|API|BETA/i)
  })

  it('não mostra o nome do erro de rede', () => {
    const message = formatLoginError(new Error('Failed to fetch VITE_API_URL'))
    expect(message).toBe('Não foi possível ligar. Verifica a rede e tenta de novo.')
    expect(message).not.toMatch(/VITE_|Failed to fetch|API/i)
  })

  it('traduz credenciais e capacidade sem linguagem de laboratório', () => {
    expect(formatLoginError({ status: 401, detail: 'invalid_credentials' })).toBe(
      'Telemóvel ou palavra-passe incorrectos.',
    )
    expect(formatLoginError({ status: 403, detail: 'BETA cheio' })).toBe(
      'Neste momento não há lugar para novas contas. Tenta mais tarde.',
    )
    expect(formatLoginError({ status: 403, detail: 'not available' })).toBe(
      'Não é possível entrar neste momento. Tenta mais tarde.',
    )
  })
})
