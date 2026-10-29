package pt.vamula.app.location;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * WebView de depuração com a mesma ponte {@code vamulaGps} da aplicação.
 * Não arranca o serviço e não entra na APK de distribuição.
 */
public final class DriverLocationProofActivity extends Activity {

    private static final String PAGE = "<!DOCTYPE html><html><body><script>"
        + "function sendFix(delayMs){"
        + "if(!window.vamulaGps||vamulaGps.beginWebViewSend()!==true){return 'blocked';}"
        + "vamulaGpsProof.startWebViewHttp(delayMs);"
        + "return 'started';"
        + "}"
        + "function changed(){vamulaGps.sessionChanged();return 'changed';}"
        + "</script></body></html>";

    private WebView webView;
    private final CountDownLatch ready = new CountDownLatch(1);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);
    }

    @Override
    protected void onResume() {
        super.onResume();
        DriverLocationHost.attach(this);
        DriverLocationHost.resumed();
    }

    @Override
    protected void onPause() {
        DriverLocationHost.paused();
        super.onPause();
    }

    public void install(Object proof) {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.addJavascriptInterface(new GpsOwnershipJs(), "vamulaGps");
        webView.addJavascriptInterface(proof, "vamulaGpsProof");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                ready.countDown();
            }
        });
        webView.loadDataWithBaseURL("https://vamula.invalid/", PAGE, "text/html", "utf-8", null);
    }

    public boolean awaitReady(long timeoutMs) throws InterruptedException {
        return ready.await(timeoutMs, TimeUnit.MILLISECONDS);
    }

    public void eval(String script, ValueCallback<String> callback) {
        webView.evaluateJavascript(script, callback);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
