import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Android WebView origin is exactly `https://localhost`
 * (`androidScheme` + `hostname`). BrowserRouter stays on that origin.
 * CORS on the API must allow this origin and nothing broader.
 */
const config: CapacitorConfig = {
  appId: 'pt.vamula.app',
  appName: 'VAMULÁ',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
  },
}

export default config
