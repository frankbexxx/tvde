import { useActivityLog } from '../context/ActivityLogContext'
import { useAuth } from '../context/AuthContext'
import type { LogEntry, LogType } from '../context/ActivityLogContext'

const LOG_COLORS: Record<LogType, string> = {
  info: 'text-muted-foreground',
  success: 'text-green-600',
  error: 'text-destructive',
  action: 'text-primary font-medium',
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
    <div className="flex gap-2 py-0.5 border-b border-border/40 last:border-0 text-[10px] leading-tight">
      <span className="text-muted-foreground shrink-0">{formatTime(entry.ts)}</span>
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
      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
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
      className="w-full md:w-80 shrink-0 bg-card/90 backdrop-blur-sm border-t md:border-t-0 md:border-l border-border/40 flex flex-col min-h-[200px] md:min-h-0 md:h-[calc(100dvh-4rem)]"
    >
      {/* Vista + Live */}
      <div className="p-2.5 bg-muted/20 border-b border-border/40 flex justify-between items-center">
        <div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">Vista</div>
          <div className="text-xs font-medium text-muted-foreground capitalize">{role}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-success/80 animate-pulse" />
          Ao vivo
        </div>
      </div>

      {/* Status */}
      <div className="p-2.5 bg-muted/15 border-b border-border/40">
        <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">Estado</div>
        <div className="text-xs font-medium text-muted-foreground">{status}</div>
      </div>

      {/* Log */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center px-2.5 py-1.5 border-b border-border/40">
          <span className="text-muted-foreground text-[10px] font-medium">Registo</span>
          <div className="flex gap-2">
            <CopyLogButton logs={logs} />
            <button
              onClick={clearLogs}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] text-muted-foreground">
          {logs.length === 0 ? (
            <p className="italic">Nenhum evento registado</p>
          ) : (
            [...logs].reverse().map((e) => <LogLine key={e.id} entry={e} />)
          )}
        </div>
      </div>
    </aside>
  )
}
