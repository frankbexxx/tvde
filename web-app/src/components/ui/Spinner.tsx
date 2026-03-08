interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-muted border-t-primary transition-opacity duration-200 ${SIZES[size]}`}
      role="status"
      aria-label="A carregar"
    />
  )
}
