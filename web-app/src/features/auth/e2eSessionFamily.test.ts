import { afterEach, describe, expect, it } from 'vitest'
import {
  currentSessionFamily,
  noteSessionFamily,
  resetSessionFamilyForTests,
  sessionEpoch,
} from '../driver/driverSessionFamily'
import { noteE2eInjectedSession, sessionFamilyFromE2eInject } from './e2eSessionFamily'

const ACCESS = 'header.payload.signature'

describe('sessionFamilyFromE2eInject', () => {
  it('usa o session_id do login e ignora os access tokens', () => {
    expect(
      sessionFamilyFromE2eInject({
        passenger: 'passenger-token',
        driver: ACCESS,
        admin: 'admin-token',
        session_id: 'family-login',
      })
    ).toBe('family-login')
  })

  it('não trata um token, um JWT ou uma string vazia como família', () => {
    expect(sessionFamilyFromE2eInject({ driver: ACCESS, session_id: ACCESS })).toBeNull()
    expect(sessionFamilyFromE2eInject({ session_id: 'a.b.c' })).toBeNull()
    expect(sessionFamilyFromE2eInject({ session_id: '   ' })).toBeNull()
    expect(sessionFamilyFromE2eInject({ driver: ACCESS })).toBeNull()
    expect(sessionFamilyFromE2eInject(null)).toBeNull()
  })
})

describe('noteE2eInjectedSession', () => {
  afterEach(() => {
    resetSessionFamilyForTests()
  })

  it('regista a família do login e um segundo inject igual não muda o epoch', () => {
    resetSessionFamilyForTests()
    expect(noteE2eInjectedSession({ driver: ACCESS, session_id: 'family-login' })).toBe(true)
    expect(currentSessionFamily()).toBe('family-login')
    const epoch = sessionEpoch()
    expect(noteE2eInjectedSession({ driver: 'header.payload.other', session_id: 'family-login' })).toBe(true)
    expect(sessionEpoch()).toBe(epoch)
    expect(currentSessionFamily()).toBe('family-login')
  })

  it('sem família não regista sessão nem autoriza uma identidade sintética', () => {
    resetSessionFamilyForTests()
    expect(noteE2eInjectedSession({ driver: ACCESS })).toBe(false)
    expect(currentSessionFamily()).toBeNull()
    expect(sessionEpoch()).toBe(0)
  })

  it('logout depois do inject invalida a família', () => {
    resetSessionFamilyForTests()
    noteE2eInjectedSession({ session_id: 'family-login' })
    noteSessionFamily(null)
    expect(currentSessionFamily()).toBeNull()
    expect(sessionEpoch()).toBe(2)
  })
})
