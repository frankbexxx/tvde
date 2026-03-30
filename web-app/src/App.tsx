import { BrowserRouter } from 'react-router-dom'
import { ActivityLogProvider } from './context/ActivityLogContext'
import { AuthProvider } from './context/AuthContext'
import { ActiveTripProvider } from './context/ActiveTripContext'
import { DevToolsCallbackProvider } from './context/DevToolsCallbackContext'
import { AppLifecycleLogger } from './components/AppLifecycleLogger'
import { Toaster } from './components/ui/sonner'
import { AppRoutes } from './routes'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <ActivityLogProvider>
        <AuthProvider>
          <AppLifecycleLogger />
          <DevToolsCallbackProvider>
            <ActiveTripProvider>
              <AppRoutes />
            </ActiveTripProvider>
          </DevToolsCallbackProvider>
        </AuthProvider>
      </ActivityLogProvider>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
