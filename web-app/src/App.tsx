import { BrowserRouter } from 'react-router-dom'
import { ActivityLogProvider } from './context/ActivityLogContext'
import { AuthProvider } from './context/AuthContext'
import { ActiveTripProvider } from './context/ActiveTripContext'
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
          <ActiveTripProvider>
            <AppRoutes />
          </ActiveTripProvider>
        </AuthProvider>
      </ActivityLogProvider>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
