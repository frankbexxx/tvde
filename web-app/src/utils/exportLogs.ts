/**
 * Device ID e sequência de run para export de logs.
 * Permite identificar cada dispositivo e ordenar exports para fusão sequencial.
 */

const DEVICE_ID_KEY = 'tvde_device_id'
const RUN_KEY = 'tvde_log_run'

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

export function getDeviceId(): string {
  return getOrCreateDeviceId()
}

export function getNextRun(): number {
  try {
    const current = parseInt(localStorage.getItem(RUN_KEY) ?? '0', 10)
    const next = current + 1
    localStorage.setItem(RUN_KEY, String(next))
    return next
  } catch {
    return 1
  }
}

export function getCurrentRun(): number {
  try {
    return parseInt(localStorage.getItem(RUN_KEY) ?? '0', 10)
  } catch {
    return 0
  }
}

export function resetRun(): void {
  try {
    localStorage.setItem(RUN_KEY, '0')
  } catch {
    /* ignore */
  }
}

export function getExportFilename(): string {
  const deviceId = getDeviceId()
  const run = getNextRun()
  const date = new Date().toISOString().slice(0, 10)
  return `interaction_logs_${deviceId}_run${run}_${date}.csv`
}
