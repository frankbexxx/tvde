import { BrowserRouter } from 'react-router-dom'
import { LocaleProvider } from './i18n/LocaleProvider'
import { ActivityLogProvider } from './context/ActivityLogContext'
import { AuthProvider } from './context/AuthContext'
import { ActiveTripProvider } from './context/ActiveTripContext'
import { DriverLocationProvider } from './features/driver/DriverLocationProvider'
import { DriverGpsManager } from './features/driver/DriverGpsManager'
import { DevToolsCallbackProvider } from './context/DevToolsCallbackContext'
import { AppLifecycleLogger } from './components/AppLifecycleLogger'
import { Toaster } from './components/ui/sonner'
import { AppRoutes } from './routes'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <ActivityLogProvider>
          <AuthProvider>
            <AppLifecycleLogger />
            <DevToolsCallbackProvider>
              <ActiveTripProvider>
                <DriverLocationProvider>
                  <DriverGpsManager />
                  <AppRoutes />
                </DriverLocationProvider>
              </ActiveTripProvider>
            </DevToolsCallbackProvider>
          </AuthProvider>
        </ActivityLogProvider>
        <Toaster />
      </LocaleProvider>
    </BrowserRouter>
  )
}

export default App
