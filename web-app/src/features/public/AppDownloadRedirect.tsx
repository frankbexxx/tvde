import { Navigate } from 'react-router-dom'

/**
 * Stable URL for printed QR codes. Set `VITE_APP_DOWNLOAD_URL` to your store / landing page.
 */
export function AppDownloadRedirect() {
  const url = import.meta.env.VITE_APP_DOWNLOAD_URL
  if (typeof url === 'string' && url.trim().length > 0) {
    window.location.replace(url.trim())
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-sm text-muted-foreground">
        A abrir a página de download…
      </div>
    )
  }
  return <Navigate to="/passenger" replace />
}
