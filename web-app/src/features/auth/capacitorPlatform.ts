import { Capacitor } from '@capacitor/core'

/** True inside the Capacitor Android/iOS shell. False in the browser and in Vitest. */
export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform()
}
