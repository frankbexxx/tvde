import { useActivityLog } from '../context/ActivityLogContext'
import { useAuth } from '../context/AuthContext'
import type { LogEntry, LogType } from '../context/ActivityLogContext'

const LOG_COLORS: Record<LogType, string> = {
  info: 'text-slate-600',
  success: 'text-green-700',
  error: 'text-red-700',
  action: 'text-blue-700 font-medium',
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div className="flex gap-2 text-xs py-0.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-400 shrink-0">{formatTime(entry.ts)}</span>
      <span className={LOG_COLORS[entry.type]}>{entry.msg}</span>
    </div>
  )
}

function CopyLogButton({ logs }: { logs: LogEntry[] }) {
  const copy = () => {
    const text = logs
      .map((e) => `[${formatTime(e.ts)}] ${e.msg}`)
      .reverse()
      .join('\n')
    navigator.clipboard.writeText(text || 'Nenhum evento')
  }
  return (
    <button
      onClick={copy}
      className="text-xs text-slate-500 hover:text-slate-700"
      title="Copiar log"
    >
      Copiar
    </button>
  )
}

export function ActivityPanel() {
  const { logs, status, clearLogs } = useActivityLog()
  const { role } = useAuth()

  return (
    <aside
      id="activity-log-panel"
      className="w-full md:w-80 shrink-0 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col min-h-[200px] md:min-h-0 md:h-[calc(100vh-4rem)]"
    >
      {/* Vista + Live */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Vista</div>
          <div className="font-medium text-slate-700 capitalize">{role}</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Ao vivo
        </div>
      </div>

      {/* Status */}
      <div className="p-3 bg-amber-50 border-b border-amber-200">
        <div className="text-xs text-amber-700 uppercase tracking-wide mb-1">Estado</div>
        <div className="font-medium text-slate-800">{status}</div>
      </div>

      {/* Log */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200">
          <span className="text-slate-600 text-sm font-medium">Registo</span>
          <div className="flex gap-2">
            <CopyLogButton logs={logs} />
            <button
              onClick={clearLogs}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Limpar
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-slate-400 italic">Nenhum evento registado</p>
          ) : (
            [...logs].reverse().map((e) => <LogLine key={e.id} entry={e} />)
          )}
        </div>
      </div>
    </aside>
  )
}
