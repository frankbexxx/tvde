/**
 * Driver session audio: prefer short WAV for new offers (~2s); accept/complete use Web Audio beeps.
 * Skips when tab not visible; failures fall back silently (offer WAV → oscillator).
 */
export type DriverSessionSoundKind = 'offer' | 'accept' | 'complete'

let sharedAudioContext: AudioContext | null = null

const OFFER_WAV = '/sounds/offer.wav'

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedAudioContext) sharedAudioContext = new AudioContext()
    return sharedAudioContext
  } catch {
    return null
  }
}

function playOscillatorCue(kind: DriverSessionSoundKind): void {
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

function playOfferWavOrOscillator(): void {
  try {
    const a = new Audio(OFFER_WAV)
    a.volume = 0.88
    const fallback = () => playOscillatorCue('offer')
    a.addEventListener('error', fallback, { once: true })
    void a.play().catch(fallback)
  } catch {
    playOscillatorCue('offer')
  }
}

export function playDriverSessionSound(kind: DriverSessionSoundKind): void {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
  if (kind === 'offer') {
    playOfferWavOrOscillator()
    return
  }
  playOscillatorCue(kind)
}
