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

  it('GO mostra passageiros 1..4', () => {
    render(<Harness />)
    expect(screen.getByTestId('passenger-count-1')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-count-4')).toBeInTheDocument()
    expect(screen.queryByTestId('passenger-count-5')).not.toBeInTheDocument()
  })

  it('Comfort mostra 1..4; XL mostra 1..8', () => {
    render(<Harness />)
    fireEvent.click(screen.getByTestId('passenger-fare-comfort'))
    expect(screen.queryByTestId('passenger-count-5')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('passenger-fare-xl'))
    expect(screen.getByTestId('passenger-count-5')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-count-8')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-xl-capacity-hint')).toBeInTheDocument()
  })

  it('escolher 5 auto-selecciona XL e desactiva GO/Comfort', () => {
    render(<Harness initial={{ ...DEFAULT_PET_BOOKING, fareCategory: 'xl' }} />)
    fireEvent.click(screen.getByTestId('passenger-count-5'))
    expect(screen.getByTestId('passenger-fare-xl')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('passenger-fare-x')).toBeDisabled()
    expect(screen.getByTestId('passenger-fare-comfort')).toBeDisabled()
  })

  it('XL 6 → reduzir a 4 → GO disponível e selecciona com count 4', () => {
    render(
      <Harness
        initial={{ ...DEFAULT_PET_BOOKING, fareCategory: 'xl', passengerCount: 6 }}
      />,
    )
    fireEvent.click(screen.getByTestId('passenger-count-4'))
    expect(screen.getByTestId('passenger-fare-x')).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('passenger-fare-x'))
    expect(screen.getByTestId('passenger-fare-x')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('passenger-count-4')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('passenger-count-5')).not.toBeInTheDocument()
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

  it('GO + 4 + pet seat auto-sobe para XL', () => {
    render(
      <Harness
        initial={{
          ...DEFAULT_PET_BOOKING,
          passengerCount: 4,
          withAnimal: true,
          petSize: 'small',
          petTransport: 'carrier',
          petOccupiesSeat: false,
        }}
      />,
    )
    fireEvent.click(screen.getByTestId('passenger-pet-occupies-seat'))
    expect(screen.getByTestId('passenger-fare-xl')).toHaveAttribute('aria-pressed', 'true')
  })
})
