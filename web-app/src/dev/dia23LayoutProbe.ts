/**
 * Dia 23 soft-debug — mede layout no browser e reporta violações vs plano.
 * Activar: ?dia23debug=1 na URL (passenger ou driver).
 * Não altera UI; só observa e envia logs.
 */

const DEBUG_ENDPOINT = 'http://127.0.0.1:7294/ingest/1907ec24-586b-424a-9a2d-a6eff9115334'
const SESSION_ID = 'a787ef'

/** Limites do plano (px ≈ dvh * innerHeight) */
export const DIA23_LIMITS = {
  sheetIdleMaxRatio: 0.38,
  sheetTripMaxRatio: 0.32,
  sheetWaitMaxRatio: 0.15,
  bannerStackMaxRatio: 0.12,
  mapMinVisibleRatio: 0.5,
  buttonCompactMaxPx: 40,
} as const

export type Dia23Violation = {
  code: string
  message: string
  hypothesisId: string
  data?: Record<string, unknown>
}

function sendLog(
  location: string,
  message: string,
  hypothesisId: string,
  data: Record<string, unknown>
) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION_ID },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      location,
      message,
      hypothesisId,
      data,
      timestamp: Date.now(),
      runId: 'soft-debug',
    }),
  }).catch(() => { })
  // #endregion
}

function ratio(h: number) {
  return Math.round((h / window.innerHeight) * 1000) / 1000
}

function rect(el: Element | null) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, height: r.height, bottom: r.bottom, width: r.width }
}

export function isDia23DebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('dia23debug') === '1'
}

export function probeDia23Layout(surface: 'passenger' | 'driver'): Dia23Violation[] {
  const vh = window.innerHeight
  const violations: Dia23Violation[] = []

  const mapStage =
    document.querySelector('[data-testid="passenger-map-stage"]') ??
    document.querySelector('[data-testid="driver-map-stage"]')
  const mapView = mapStage?.querySelector('.maplibregl-map') ?? mapStage
  const sheet = document.querySelector('[data-testid="map-bottom-sheet"]')
  const bannerStack = mapStage?.querySelector('[class*="max-h-"]') // fallback
  const estatuto = document.querySelector('[data-testid="driver-shell-top-chips"]')
  const tripActions = document.querySelector('[data-testid="passenger-trip-action-stack"]')
  const driverTripActions = document.querySelector('[data-testid="driver-trip-action-stack"]')

  const mapR = rect(mapView)
  const sheetR = rect(sheet)
  const bannerR = rect(bannerStack ?? null)

  // H-A: sheet demasiado alta
  if (sheetR && sheetR.height / vh > DIA23_LIMITS.sheetTripMaxRatio + 0.02) {
    violations.push({
      code: 'SHEET_TOO_TALL',
      message: `MapBottomSheet ${Math.round(sheetR.height)}px > ${Math.round(DIA23_LIMITS.sheetTripMaxRatio * vh)}px`,
      hypothesisId: 'A',
      data: { surface, sheetHeight: sheetR.height, vh, ratio: ratio(sheetR.height) },
    })
  }

  // H-B: acções fora da sheet
  if (tripActions && sheet && !sheet.contains(tripActions)) {
    violations.push({
      code: 'PASS_ACTION_OUTSIDE_SHEET',
      message: 'passenger-trip-action-stack fora do map-bottom-sheet',
      hypothesisId: 'B',
      data: { surface },
    })
  }
  if (driverTripActions && sheet && !sheet.contains(driverTripActions)) {
    violations.push({
      code: 'DRV_ACTION_OUTSIDE_SHEET',
      message: 'driver-trip-action-stack fora do map-bottom-sheet',
      hypothesisId: 'B',
      data: { surface },
    })
  }

  // H-C: Estatuto visível no mapa
  if (estatuto && estatuto.checkVisibility?.() !== false) {
    const er = rect(estatuto)
    if (er && er.height > 0) {
      violations.push({
        code: 'ESTATUTO_VISIBLE',
        message: 'DriverShellTopChips visível no ecrã mapa',
        hypothesisId: 'C',
        data: { surface, rect: er },
      })
    }
  }

  // H-D: mapa com pouco espaço útil
  if (mapR && sheetR) {
    const mapVisibleAboveSheet = sheetR.top - (mapR.top > 0 ? mapR.top : 0)
    const visibleRatio = mapVisibleAboveSheet / vh
    if (visibleRatio < DIA23_LIMITS.mapMinVisibleRatio) {
      violations.push({
        code: 'MAP_CROPPED',
        message: `Área mapa acima da sheet ${Math.round(visibleRatio * 100)}% < 50%`,
        hypothesisId: 'D',
        data: { surface, visibleRatio, mapR, sheetR, bannerR },
      })
    }
  }

  // H-E: botões grandes dentro da sheet
  if (sheet) {
    const buttons = sheet.querySelectorAll('button')
    buttons.forEach((btn, i) => {
      const br = btn.getBoundingClientRect()
      if (br.height > DIA23_LIMITS.buttonCompactMaxPx + 4) {
        violations.push({
          code: 'BUTTON_TOO_TALL',
          message: `Botão #${i} na sheet: ${Math.round(br.height)}px`,
          hypothesisId: 'E',
          data: { surface, height: br.height, testId: btn.getAttribute('data-testid') },
        })
      }
    })
  }

  const payload = {
    surface,
    vh,
    vw: window.innerWidth,
    path: window.location.pathname,
    violations: violations.map((x) => x.code),
    mapR,
    sheetR,
    bannerR,
    hasSheet: Boolean(sheet),
    hasEstatuto: Boolean(estatuto),
  }

  sendLog('dia23LayoutProbe.ts:probe', 'dia23 layout probe', 'SUMMARY', payload)

  violations.forEach((v) => {
    sendLog('dia23LayoutProbe.ts:violation', v.message, v.hypothesisId, v.data ?? {})
  })

  if (import.meta.env.DEV) {
    console.info('[dia23-probe]', payload, violations)
  }

  return violations
}

/** Agenda probe após paint (ResizeObserver + rAF). */
export function installDia23LayoutProbe(surface: 'passenger' | 'driver'): () => void {
  if (!isDia23DebugEnabled()) return () => { }

  let raf = 0
  const run = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      probeDia23Layout(surface)
    })
  }

  run()
  window.addEventListener('resize', run)
  const obs = new MutationObserver(run)
  obs.observe(document.body, { childList: true, subtree: true, attributes: true })

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', run)
    obs.disconnect()
  }
}
