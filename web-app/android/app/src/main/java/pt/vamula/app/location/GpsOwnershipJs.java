package pt.vamula.app.location;

import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;

/** Ponte síncrona. Não devolve tokens nem coordenadas e não arranca o serviço. */
public final class GpsOwnershipJs {

    /** O nome da ponte fica aqui. A activity não chama addJavascriptInterface. */
    public static void install(WebView webView) {
        if (webView == null) {
            return;
        }
        webView.addJavascriptInterface(new GpsOwnershipJs(), "vamulaGps");
    }

    /** Depois do load do Capacitor. Não substitui o WebViewClient. */
    public static void watchDocuments(WebView webView) {
        if (webView == null) {
            return;
        }
        webView.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener() {
            @Override
            public void onViewAttachedToWindow(View view) {}

            @Override
            public void onViewDetachedFromWindow(View view) {
                DriverLocationOwnership.onWebViewGone();
            }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(
                webView,
                "try{vamulaGps.documentReplaced();}catch(e){}",
                Collections.singleton("https://localhost")
            );
        }
    }

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
    public void documentReplaced() {
        DriverLocationOwnership.replaceDocument();
    }

    @JavascriptInterface
    public void sessionChanged() {
        DriverLocationCommands.sessionChanged();
    }

    @JavascriptInterface
    public void setServiceNeeded(boolean needed) {
        DriverLocationCommands.setNeeded(needed);
    }

    /** O looper principal não pausa com a WebView. O atraso já vem limitado pela página. */
    @JavascriptInterface
    public void armAuthorizationGap(int delayMs) {
        DriverLocationHost.armAuthorizationGap(delayMs);
    }

    @JavascriptInterface
    public void clearAuthorizationGap() {
        DriverLocationHost.clearAuthorizationGap();
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
