import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type LogType = 'info' | 'success' | 'error' | 'action'

export interface LogEntry {
  id: string
  ts: number
  msg: string
  type: LogType
}

interface ActivityLogState {
  logs: LogEntry[]
  status: string
}

interface ActivityLogContextValue extends ActivityLogState {
  addLog: (msg: string, type?: LogType) => void
  setStatus: (msg: string) => void
  clearLogs: () => void
}

const MAX_LOGS = 200
const STORAGE_KEY = 'tvde_activity_log'

function loadLogsFromStorage(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LogEntry[]
    return Array.isArray(parsed) ? parsed.slice(-MAX_LOGS) : []
  } catch {
    return []
  }
}

function saveLogsToStorage(logs: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)))
  } catch {
    return
  }
}

const ActivityLogContext = createContext<ActivityLogContextValue | null>(null)

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>(loadLogsFromStorage)
  const [status, setStatusState] = useState<string>('Pronto')

  const addLog = useCallback((msg: string, type: LogType = 'info') => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ts: Date.now(),
      msg,
      type,
    }
    setLogs((prev) => {
      const next = [...prev, entry].slice(-MAX_LOGS)
      saveLogsToStorage(next)
      return next
    })
  }, [])

  const setStatus = useCallback((msg: string) => {
    setStatusState(msg)
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
    saveLogsToStorage([])
  }, [])

  const value = useMemo<ActivityLogContextValue>(
    () => ({ logs, status, addLog, setStatus, clearLogs }),
    [logs, status, addLog, setStatus, clearLogs]
  )

  return (
    <ActivityLogContext.Provider value={value}>
      {children}
    </ActivityLogContext.Provider>
  )
}

export function useActivityLog() {
  const ctx = useContext(ActivityLogContext)
  if (!ctx) throw new Error('useActivityLog must be used within ActivityLogProvider')
  return ctx
}
