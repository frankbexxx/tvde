import { useEffect } from 'react'
import { installDia23LayoutProbe, isDia23DebugEnabled } from '../dev/dia23LayoutProbe'

/** Hook soft-debug dia 23 — só activo com ?dia23debug=1 */
export function useDia23LayoutProbe(surface: 'passenger' | 'driver') {
  useEffect(() => {
    if (!isDia23DebugEnabled()) return
    return installDia23LayoutProbe(surface)
  }, [surface])
}
