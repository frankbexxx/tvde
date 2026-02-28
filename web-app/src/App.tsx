import { BrowserRouter } from 'react-router-dom'
import { ActivityLogProvider } from './context/ActivityLogContext'
import { AuthProvider } from './context/AuthContext'
import { ActiveTripProvider } from './context/ActiveTripContext'
import { AppRoutes } from './routes'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <ActivityLogProvider>
        <AuthProvider>
          <ActiveTripProvider>
            <AppRoutes />
          </ActiveTripProvider>
        </AuthProvider>
      </ActivityLogProvider>
    </BrowserRouter>
  )
}

export default App
