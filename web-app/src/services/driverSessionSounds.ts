/**
 * Short Web Audio cues for driver session (request visible, accept, trip complete).
 * Skips when tab not visible; failures are silent.
 */
export type DriverSessionSoundKind = 'offer' | 'accept' | 'complete'

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedAudioContext) sharedAudioContext = new AudioContext()
    return sharedAudioContext
  } catch {
    return null
  }
}

export function playDriverSessionSound(kind: DriverSessionSoundKind): void {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
  const c = getAudioContext()
  if (!c) return

  const freq =
    kind === 'offer' ? 880 : kind === 'accept' ? 700 : 420
  const duration = kind === 'complete' ? 0.35 : 0.22

  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(c.destination)

  const t0 = c.currentTime
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

  if (kind === 'offer') {
    osc.frequency.exponentialRampToValueAtTime(660, t0 + duration * 0.6)
  }

  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}
