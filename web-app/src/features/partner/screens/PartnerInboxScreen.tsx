import { PartnerMessagesSection } from '../PartnerMessagesSection'

type PartnerInboxScreenProps = {
  onUnreadChange: (count: number) => void
}

export function PartnerInboxScreen({ onUnreadChange }: PartnerInboxScreenProps) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-card">
      <PartnerMessagesSection fullWidth onUnreadChange={onUnreadChange} />
    </div>
  )
}
