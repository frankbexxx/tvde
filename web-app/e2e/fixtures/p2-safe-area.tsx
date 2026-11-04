import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { toast } from 'sonner'
import '@/index.css'
import '@/i18n'
import { AuthProvider } from '@/context/AuthContext'
import { ActivityLogProvider } from '@/context/ActivityLogContext'
import { ActiveTripProvider } from '@/context/ActiveTripContext'
import { DevToolsCallbackProvider } from '@/context/DevToolsCallbackContext'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import { Toaster } from '@/components/ui/sonner'

const params = new URLSearchParams(window.location.search)
const scene = params.get('scene') ?? 'profile'

if (params.get('insets') === 'android') {
  document.documentElement.style.setProperty('--safe-area-inset-top', '47px')
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '48px')
}

localStorage.clear()
sessionStorage.clear()

const fetches: string[] = []
window.fetch = async (input: RequestInfo | URL) => {
  const url = String(input)
  fetches.push(url)
  if (/^https?:\/\//i.test(url) && !url.includes('127.0.0.1') && !url.includes('localhost')) {
    throw new Error(`pedido externo bloqueado: ${url}`)
  }
  const body = url.includes('/config')
    ? { google_oauth_enabled: false, otp_signup_enabled: false }
    : {}
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
  ; (window as Window & { __p2Fetches?: string[] }).__p2Fetches = fetches

function showToast() {
  toast('Aviso fictício')
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <ActivityLogProvider>
          <DevToolsCallbackProvider>
            <ActiveTripProvider>
              <AuthProvider>
                {children}
                <Toaster />
              </AuthProvider>
            </ActiveTripProvider>
          </DevToolsCallbackProvider>
        </ActivityLogProvider>
      </LocaleProvider>
    </BrowserRouter>
  )
}

async function sceneElement() {
  const toastButton = (
    <button type="button" className="m-4 min-h-11 rounded-md border px-3" data-testid="show-toast" onClick={showToast}>
      Mostrar aviso
    </button>
  )
  if (scene === 'login-toast') {
    return <Frame>{toastButton}</Frame>
  }
  if (scene === 'driver-toast') {
    const { DriverBottomNav } = await import('@/features/driver/DriverBottomNav')
    return (
      <Frame>
        {toastButton}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
          <div className="w-full">
            <DriverBottomNav active="home" onSelect={() => undefined} />
          </div>
        </div>
      </Frame>
    )
  }
  const [{ ProfileButton }, { SettingsButton }] = await Promise.all([
    import('@/design-system/components/app/ProfileButton'),
    import('@/design-system/components/app/SettingsButton'),
  ])
  return (
    <Frame>
      <div className="flex gap-2 p-4">
        <ProfileButton />
        <SettingsButton />
      </div>
    </Frame>
  )
}

void sceneElement().then((element) => {
  createRoot(document.getElementById('root')!).render(element)
})
