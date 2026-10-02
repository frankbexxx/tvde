import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { PassengerSideMenu, type PassengerMenuScreen } from './PassengerSideMenu'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    sessionDisplayName: 'QA',
    sessionPhone: '+351900000683',
    logout: vi.fn(),
  }),
}))

function MenuHarness() {
  const [screenName, setScreenName] = useState<PassengerMenuScreen>('root')
  return (
    <PassengerSideMenu
      open
      onOpenChange={() => undefined}
      screen={screenName}
      onScreenChange={setScreenName}
      history={[]}
      historyLoading={false}
      historyPollFault={false}
      historyDetail={null}
      historyDetailLoading={false}
      historyDetailError={null}
      onHistoryTripSelect={() => undefined}
    />
  )
}

describe('passenger complaint navigation', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })
  })

  it('keeps Histórico as the trip screen and does not offer a complaints list', () => {
    render(<MenuHarness />)
    expect(screen.queryByRole('button', { name: /reclama/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Histórico' }))
    expect(screen.getByText('Ainda não há viagens nesta conta.')).toBeInTheDocument()
    expect(screen.queryByText(/reclama/i)).not.toBeInTheDocument()
  })
})
