package pt.vamula.app.location;

import android.webkit.JavascriptInterface;

/** Ponte síncrona. Não devolve tokens nem coordenadas e não arranca o serviço. */
public final class GpsOwnershipJs {

    @JavascriptInterface
    public boolean nativeOwnsUpload() {
        return DriverLocationOwnership.nativeOwnsUpload();
    }

    @JavascriptInterface
    public boolean beginWebViewSend() {
        return DriverLocationOwnership.webViewBeginSend();
    }

    @JavascriptInterface
    public void endWebViewSend() {
        DriverLocationOwnership.webViewEndSend();
    }

    @JavascriptInterface
    public void sessionChanged() {
        DriverLocationCommands.sessionChanged();
    }

    @JavascriptInterface
    public void setServiceNeeded(boolean needed) {
        DriverLocationCommands.setNeeded(needed);
    }

    @JavascriptInterface
    public boolean serviceNeeded() {
        return DriverLocationHost.needed();
    }

    @JavascriptInterface
    public boolean serviceOperational() {
        return DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL;
    }

    @JavascriptInterface
    public boolean serviceCollecting() {
        return DriverLocationService.listening();
    }

    @JavascriptInterface
    public boolean serviceSending() {
        return DriverLocationService.sending();
    }

    @JavascriptInterface
    public String serviceStopReason() {
        return DriverLocationService.stopReason();
    }
}
