import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { DriverMapAvailabilityMicroToggle } from './DriverMapAvailabilityMicroToggle'

describe('DriverMapAvailabilityMicroToggle', () => {
  it('shows the unavailable state and a single go-available action', () => {
    const onGoOnline = vi.fn()
    render(
      <DriverMapAvailabilityMicroToggle offline onGoOnline={onGoOnline} onGoOffline={vi.fn()} />
    )
    expect(screen.getByTestId('driver-availability-state')).toHaveTextContent('Indisponível')
    const action = screen.getByRole('button', { name: 'Ficar disponível' })
    expect(action).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Ficar indisponível' })).not.toBeInTheDocument()
    fireEvent.click(action)
    expect(onGoOnline).toHaveBeenCalledTimes(1)
  })

  it('shows the available state and a single go-unavailable action', () => {
    const onGoOffline = vi.fn()
    render(
      <DriverMapAvailabilityMicroToggle
        offline={false}
        onGoOnline={vi.fn()}
        onGoOffline={onGoOffline}
      />
    )
    expect(screen.getByTestId('driver-availability-state')).toHaveTextContent('Disponível')
    fireEvent.click(screen.getByRole('button', { name: 'Ficar indisponível' }))
    expect(onGoOffline).toHaveBeenCalledTimes(1)
  })

  it('does not fire while the change is in progress', () => {
    const onGoOnline = vi.fn()
    render(
      <DriverMapAvailabilityMicroToggle
        offline
        syncing
        onGoOnline={onGoOnline}
        onGoOffline={vi.fn()}
      />
    )
    const action = screen.getByRole('button', { name: 'A actualizar…' })
    expect(action).toBeDisabled()
    expect(screen.getByTestId('driver-availability-state')).toHaveTextContent('Indisponível')
    fireEvent.click(action)
    expect(onGoOnline).not.toHaveBeenCalled()
  })

  it('does not offer going available when the existing block is on', () => {
    const onGoOnline = vi.fn()
    render(
      <DriverMapAvailabilityMicroToggle
        offline
        blocked
        onGoOnline={onGoOnline}
        onGoOffline={vi.fn()}
      />
    )
    const action = screen.getByRole('button', { name: 'Ficar disponível' })
    expect(action).toBeDisabled()
    fireEvent.click(action)
    expect(onGoOnline).not.toHaveBeenCalled()
    expect(screen.queryByTestId('driver-availability-block')).not.toBeInTheDocument()
  })

  it('shows the reason and next step when the block has an explanation', () => {
    render(
      <DriverMapAvailabilityMicroToggle
        offline
        blocked
        blockReason="Não podes ficar disponível porque há documentos recusados."
        blockNext="Vai a Documentos, no menu, para resolver o que falta."
        onGoOnline={vi.fn()}
        onGoOffline={vi.fn()}
      />
    )
    const action = screen.getByRole('button', { name: 'Ficar disponível' })
    expect(action).toBeDisabled()
    const note = screen.getByTestId('driver-availability-block')
    expect(note).toHaveTextContent('documentos recusados')
    expect(note).toHaveTextContent('Vai a Documentos, no menu')
    expect(action).toHaveAttribute('aria-describedby', note.id)
  })

  it('keeps the same action available when the state does not change', () => {
    const onGoOnline = vi.fn()
    render(
      <DriverMapAvailabilityMicroToggle offline onGoOnline={onGoOnline} onGoOffline={vi.fn()} />
    )
    const action = screen.getByRole('button', { name: 'Ficar disponível' })
    fireEvent.click(action)
    expect(screen.getByTestId('driver-availability-state')).toHaveTextContent('Indisponível')
    expect(action).toBeEnabled()
    fireEvent.click(action)
    expect(onGoOnline).toHaveBeenCalledTimes(2)
  })
})
