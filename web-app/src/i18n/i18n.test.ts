import { describe, expect, it } from 'vitest'
import i18n from './index'
import { passengerTripStatusLabel } from '../constants/tripStatusLabels'

describe('i18n', () => {
  it('defaults to Portuguese trip status labels', async () => {
    await i18n.changeLanguage('pt')
    expect(passengerTripStatusLabel('completed')).toBe('Viagem concluída')
  })

  it('translates trip status to English', async () => {
    await i18n.changeLanguage('en')
    expect(passengerTripStatusLabel('completed')).toBe('Trip completed')
    await i18n.changeLanguage('pt')
  })
})
