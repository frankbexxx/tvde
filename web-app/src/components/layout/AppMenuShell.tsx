import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../ui/sheet'
import { MENU_BTN_SM, MENU_ROW_BTN, MENU_SECTION_TITLE, MENU_SURFACE } from './infoBoxTemplate'

export function AppSideMenuSheet({
  open,
  onOpenChange,
  testId,
  ariaLabel,
  srTitle,
  srDescription,
  closeOnDismiss,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  testId: string
  ariaLabel?: string
  srTitle: string
  srDescription: string
  closeOnDismiss: () => void
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : closeOnDismiss())}>
      <SheetContent
        data-testid={testId}
        side="left"
        className="p-0 w-[85vw] max-w-[26rem] bg-background"
        hideCloseButton
        aria-label={ariaLabel}
      >
        <SheetTitle className="sr-only">{srTitle}</SheetTitle>
        <SheetDescription className="sr-only">{srDescription}</SheetDescription>
        <div className="h-dvh flex flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

export function AppMenuHeader({
  title,
  onBack,
  onClose,
  closeTestId,
}: {
  title: string
  onBack?: () => void
  onClose: () => void
  closeTestId: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} className={`${MENU_BTN_SM} px-3 text-sm font-semibold`}>
            Voltar
          </button>
        ) : null}
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        data-testid={closeTestId}
        className={`${MENU_BTN_SM} px-3 text-sm font-semibold`}
      >
        Fechar
      </button>
    </div>
  )
}

export function AppMenuIdentity({
  initial,
  name,
  phone,
  roleBadge,
  testId,
  flagAccent,
  trailing,
}: {
  initial: string
  name: string
  phone: string
  roleBadge?: ReactNode
  testId?: string
  flagAccent?: boolean
  trailing?: ReactNode
}) {
  return (
    <div className={MENU_SURFACE} data-testid={testId}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-foreground/10 text-base font-semibold text-foreground/70">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{phone}</p>
          {roleBadge ? (
            <div
              className={cn(
                'mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary',
                flagAccent && 'border-b-2 border-[hsl(var(--color-flag-red))]',
              )}
            >
              {roleBadge}
            </div>
          ) : null}
        </div>
        {trailing}
      </div>
    </div>
  )
}

export function AppMenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <p className={MENU_SECTION_TITLE}>{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export function AppMenuRow({
  label,
  icon,
  onClick,
  testId,
  badge,
  active,
  rowId,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  testId?: string
  badge?: number | null
  active?: boolean
  rowId?: string
}) {
  return (
    <button
      type="button"
      id={rowId}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        MENU_ROW_BTN,
        'justify-between scroll-mt-16',
        active && 'ring-1 ring-primary/30 bg-[hsl(var(--color-chrome-menu-row-active))]',
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-foreground/80">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      {badge != null && badge > 0 ? (
        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  )
}

export function AppMenuLogoutRow({ onClick, testId }: { onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(MENU_ROW_BTN, 'w-full bg-background')}
    >
      <LogOut className="h-4 w-4 text-foreground/80" />
      Sair
    </button>
  )
}

export function AppMenuBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 p-4">{children}</div>
}
