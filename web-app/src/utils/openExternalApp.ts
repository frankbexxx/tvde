import { isCapacitorNative } from '../features/auth/capacitorPlatform'

/** Shell Capacitor (Android/iOS). No browser e no Vitest é falso. */
export function isNativePlatform(): boolean {
  return isCapacitorNative()
}

async function launcher() {
  const { AppLauncher } = await import('@capacitor/app-launcher')
  return AppLauncher
}

/** Android 11+ só responde se o scheme estiver em `<queries>` no manifest. */
export async function canOpenExternalUrl(url: string): Promise<boolean> {
  if (!isNativePlatform()) return false
  try {
    const AppLauncher = await launcher()
    const { value } = await AppLauncher.canOpenUrl({ url })
    return value
  } catch {
    return false
  }
}

/**
 * Web: separador novo. Capacitor: Intent fora do WebView (app instalada ou browser).
 * Não usa Chrome Custom Tabs, para a navegação não ficar dentro da VAMULÁ.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const AppLauncher = await launcher()
      const { completed } = await AppLauncher.openUrl({ url })
      return completed
    } catch {
      return false
    }
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  return opened != null
}
