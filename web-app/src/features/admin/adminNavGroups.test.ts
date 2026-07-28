import { describe, expect, it } from 'vitest'
import { defaultTabForGroup, groupForTab, tabsForGroup } from './adminNavGroups'

describe('adminNavGroups', () => {
  it('maps people tabs to people', () => {
    expect(groupForTab('pending')).toBe('people')
    expect(groupForTab('users')).toBe('people')
    expect(groupForTab('docs')).toBe('people')
  })

  it('maps system tabs to system', () => {
    expect(groupForTab('health')).toBe('system')
    expect(groupForTab('ops')).toBe('system')
    expect(groupForTab('metrics')).toBe('system')
    expect(groupForTab('dados')).toBe('system')
  })

  it('maps singleton groups', () => {
    expect(groupForTab('agora')).toBe('agora')
    expect(groupForTab('trips')).toBe('trips')
    expect(groupForTab('frota')).toBe('fleet')
  })

  it('falls back to agora for unknown tab ids', () => {
    expect(groupForTab('')).toBe('agora')
    expect(groupForTab('nope')).toBe('agora')
  })

  it('exposes defaults and ordered tabs per group', () => {
    expect(defaultTabForGroup('people')).toBe('pending')
    expect(defaultTabForGroup('system')).toBe('health')
    expect(tabsForGroup('people')).toEqual(['pending', 'users', 'docs'])
    expect(tabsForGroup('system')).toEqual(['health', 'ops', 'metrics', 'dados'])
  })
})
