import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { PassengerPetBookingPanel } from './PassengerPetBookingPanel'
import { DEFAULT_PET_BOOKING, type PassengerPetBookingState } from './petBooking'
import { useState } from 'react'

function Harness({
  initial = DEFAULT_PET_BOOKING,
}: {
  initial?: PassengerPetBookingState
}) {
  const [value, setValue] = useState(initial)
  return (
    <I18nextProvider i18n={i18n}>
      <PassengerPetBookingPanel value={value} onChange={setValue} />
    </I18nextProvider>
  )
}

describe('PassengerPetBookingPanel', () => {
  it('mostra GO/Comfort/XL e default GO', () => {
    render(<Harness />)
    expect(screen.getByTestId('passenger-fare-x')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('passenger-fare-comfort')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-fare-xl')).toBeInTheDocument()
  })

  it('Viajo com animal revela configuração; máximo 1', () => {
    render(<Harness />)
    fireEvent.click(screen.getByTestId('passenger-with-animal'))
    expect(screen.getByTestId('passenger-pet-max-one')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-pet-size-small')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-pet-surcharge-hint')).toBeInTheDocument()
  })

  it('assistance esconde pet comercial e mostra hint sem suplemento', () => {
    render(<Harness />)
    fireEvent.click(screen.getByTestId('passenger-assistance-animal'))
    expect(screen.getByTestId('passenger-assistance-hint')).toBeInTheDocument()
    expect(screen.queryByTestId('passenger-pet-size-small')).not.toBeInTheDocument()
  })

  it('large permite carrier e harness (PET-5A.1)', () => {
    render(<Harness />)
    fireEvent.click(screen.getByTestId('passenger-with-animal'))
    fireEvent.click(screen.getByTestId('passenger-pet-size-large'))
    expect(screen.getByTestId('passenger-pet-transport-harness')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-pet-transport-carrier')).toBeInTheDocument()
  })

  it('onChange recebe comfort', () => {
    const onChange = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <PassengerPetBookingPanel value={DEFAULT_PET_BOOKING} onChange={onChange} />
      </I18nextProvider>,
    )
    fireEvent.click(screen.getByTestId('passenger-fare-comfort'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fareCategory: 'comfort' }),
    )
  })
})
