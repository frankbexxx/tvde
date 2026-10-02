import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../../components/feedback/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'

interface PendingUserRow {
  phone: string
  requested_role: string
}

export type AdminTabPendingProps = {
  handleApprove: (phone: string) => void | Promise<void | boolean>
  pending: PendingUserRow[]
}

const KNOWN_ROLES = new Set(['passenger', 'driver', 'partner', 'admin'])

function pendingRoleLabel(role: string, t: (key: string) => string): string {
  if (KNOWN_ROLES.has(role)) return t(`pendingApprove.roles.${role}`)
  return role
}

export function AdminTabPending(props: AdminTabPendingProps) {
  const { t } = useTranslation('admin')
  const { handleApprove, pending } = props
  const [confirm, setConfirm] = useState<PendingUserRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmError, setConfirmError] = useState(false)
  const busyRef = useRef(false)

  const closeConfirm = () => {
    if (busyRef.current) return
    setConfirm(null)
    setConfirmError(false)
  }

  const submitApprove = async () => {
    if (!confirm || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setConfirmError(false)
    try {
      const ok = await handleApprove(confirm.phone)
      if (ok === false) {
        setConfirmError(true)
        return
      }
      setConfirm(null)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <>
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('headings.pending')}</h2>
        {pending.length === 0 ? (
          <EmptyState title="Nenhum utilizador pendente." />
        ) : (
          <ul className="space-y-3">
            {pending.map((u) => (
              <li
                key={u.phone}
                className="flex items-center justify-between gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-card"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground break-all">{u.phone}</p>
                  <p className="text-sm text-foreground/75">{u.requested_role}</p>
                </div>
                <button
                  type="button"
                  data-testid={`admin-pending-approve-${u.phone}`}
                  onClick={() => {
                    setConfirmError(false)
                    setConfirm(u)
                  }}
                  className="inline-flex shrink-0 items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-success text-success-foreground text-sm font-medium rounded-lg hover:opacity-90"
                >
                  Aprovar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) closeConfirm() }}>
        <DialogContent
          data-testid="admin-pending-approve-dialog"
          className="max-w-[min(100vw-1.5rem,28rem)]"
          onEscapeKeyDown={(event) => {
            if (busyRef.current) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (busyRef.current) event.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('pendingApprove.title')}</DialogTitle>
            <DialogDescription className="text-foreground break-words">
              {confirm
                ? t('pendingApprove.body', {
                    phone: confirm.phone,
                    role: pendingRoleLabel(confirm.requested_role, t),
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          {confirmError ? (
            <p className="text-sm text-destructive" role="alert" data-testid="admin-pending-approve-error">
              {t('pendingApprove.error')}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              data-testid="admin-pending-approve-cancel"
              disabled={busy}
              onClick={closeConfirm}
              className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted/40 disabled:opacity-60"
            >
              {t('pendingApprove.cancel')}
            </button>
            <button
              type="button"
              data-testid="admin-pending-approve-confirm"
              disabled={busy}
              aria-busy={busy}
              onClick={() => { void submitApprove() }}
              className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-success text-success-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
            >
              {busy ? t('pendingApprove.confirming') : t('pendingApprove.confirm')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
