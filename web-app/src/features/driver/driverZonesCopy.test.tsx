import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'

const FORBIDDEN = /v1|OSRM|fallback|\bcustom\b|ID manual|UUID|\bAPI\b|endpoint/i

function zoneValues(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node)
  else if (node && typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) zoneValues(value, out)
  }
  return out
}

describe('driver zones copy', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
  })

  it('não mostra termos técnicos nas frases das zonas', () => {
    const zones = i18n.getResourceBundle('pt', 'driver').opsMenu.zones
    for (const text of zoneValues(zones)) {
      expect(text).not.toMatch(FORBIDDEN)
    }
    expect(i18n.t('driver:opsMenu.zones.hubTitle')).toBe('Mudança de zona')
    expect(i18n.t('driver:opsMenu.zones.targetZoneLabel')).toMatch(/Zonas disponíveis/)
  })

  it('mantém as opções do catálogo e marca a zona guardada sem a palavra custom', () => {
    const catalog = [
      { id: 'lisboa-norte', label: 'Lisboa Norte' },
      { id: 'lisboa-sul', label: 'Lisboa Sul' },
    ]
    const savedId = 'oeiras-manual'
    render(
      <select data-testid="zones" defaultValue={catalog[0].id}>
        {catalog.map((z) => (
          <option key={z.id} value={z.id}>
            {z.label}
          </option>
        ))}
        <option value={savedId}>
          {savedId} {i18n.t('driver:opsMenu.zones.customSuffix')}
        </option>
      </select>,
    )
    const select = screen.getByTestId('zones') as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      'lisboa-norte',
      'lisboa-sul',
      'oeiras-manual',
    ])
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      'Lisboa Norte',
      'Lisboa Sul',
      'oeiras-manual (outra zona)',
    ])
    expect(select.textContent).not.toMatch(/custom|v1/i)
  })

  it('o campo de identificador continua a enviar o mesmo valor', () => {
    const onChange = vi.fn()
    const onSave = vi.fn()
    render(
      <div>
        <input
          aria-label={i18n.t('driver:opsMenu.zones.targetZoneLabel')}
          placeholder={i18n.t('driver:opsMenu.zones.zoneIdPlaceholder')}
          defaultValue="lisboa-norte"
          onChange={(e) => onChange(e.target.value.replace(/\s+/g, '').toLowerCase())}
        />
        <button type="button" onClick={onSave}>
          {i18n.t('driver:opsMenu.zones.saveCustom')}
        </button>
      </div>,
    )
    const input = screen.getByPlaceholderText('Identificador da zona (ex.: lisboa-norte)')
    expect(input).toHaveValue('lisboa-norte')
    fireEvent.change(input, { target: { value: 'Lisboa Norte' } })
    expect(onChange).toHaveBeenCalledWith('lisboanorte')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar outra zona' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('distingue rota calculada e estimativa em linha recta', () => {
    const route = i18n.t('driver:opsMenu.zones.etaHint.route', { minutes: 12 })
    const straight = i18n.t('driver:opsMenu.zones.etaHint.fallback', { minutes: 9, km: '4.2' })
    const server = i18n.t('driver:opsMenu.zones.etaHint.server', { minutes: 8, km: '3.1' })
    expect(route).toBe('Rota calculada: ~12 min.')
    expect(straight).toBe('Estimativa aproximada em linha recta: ~9 min (4.2 km).')
    expect(server).toMatch(/linha recta/)
    expect(`${route} ${straight} ${server}`).not.toMatch(/OSRM|fallback|Servidor/i)
  })

  it('Cheguei e os limites continuam iguais', () => {
    expect(i18n.t('driver:opsMenu.zones.arrivedBtn')).toBe('Cheguei à zona')
    expect(i18n.t('driver:opsMenu.zones.arrivedGateHint', { km: '1.5' })).toMatch(/1\.5 km/)
    expect(i18n.t('driver:opsMenu.zones.remaining', { count: 2 })).toBe('restantes 2')
    expect(i18n.t('driver:opsMenu.zones.extensionGranted', { minutes: 15 })).toMatch(/\+15 min/)
  })
})
