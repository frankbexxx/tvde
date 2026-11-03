import { createRoot } from 'react-dom/client'
import '@/index.css'
import '@/i18n'
import { EmergencySosPanel } from '@/features/emergency/EmergencySosPanel'
import type { EmergencySnapshot } from '@/features/emergency/emergencyShare'

const params = new URLSearchParams(window.location.search)
const androidInsets = params.get('insets') === 'android'
const longContent = params.get('content') === 'long'

if (androidInsets) {
  document.documentElement.style.setProperty('--safe-area-inset-top', '47px')
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '48px')
}

const longName = Array.from({ length: 40 }, () => 'detalhe').join(' ')

const snap: EmergencySnapshot = {
  trip_ref: longContent ? 'VM-FIXTURE-LONGO' : 'VM-FIXTURE',
  status: 'ongoing',
  origin_lat: 0,
  origin_lng: 0,
  destination_lat: 0,
  destination_lng: 0,
  vehicle_plate: longContent ? 'AA-00-AA' : null,
  driver_display_name: longContent ? longName : null,
  location: null,
  role_view: 'passenger',
}

window.fetch = async (input: RequestInfo | URL) => {
  const url = String(input)
  if (!url.includes('/emergency/trips/')) {
    throw new Error(`pedido externo bloqueado: ${url}`)
  }
  if (url.includes('/events')) {
    return new Response(JSON.stringify({ ok: true, recorded: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (url.includes('/snapshot')) {
    return new Response(JSON.stringify(snap), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  throw new Error(`pedido de emergência inesperado: ${url}`)
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <EmergencySosPanel tripId="fixture-trip" token="fixture-token" open onClose={() => undefined} />,
  )
}
