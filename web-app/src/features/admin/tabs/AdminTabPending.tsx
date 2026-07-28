import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../../components/feedback/EmptyState'

interface PendingUserRow {
  phone: string
  requested_role: string
}

export type AdminTabPendingProps = {
  handleApprove: (phone: string) => void | Promise<void>
  pending: PendingUserRow[]
}

export function AdminTabPending(props: AdminTabPendingProps) {
  const { t } = useTranslation('admin')
  const {
    handleApprove,
    pending,
  } = props

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
                className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3 shadow-card"
              >
                <div>
                  <p className="font-medium text-foreground">{u.phone}</p>
                  <p className="text-sm text-foreground/75">{u.requested_role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleApprove(u.phone)}
                  className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-success text-success-foreground text-sm font-medium rounded-lg hover:opacity-90"
                >
                  Aprovar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
