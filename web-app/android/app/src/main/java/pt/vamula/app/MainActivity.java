package pt.vamula.app;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.android.R;
import pt.vamula.app.vault.SessionVaultPlugin;
import pt.vamula.app.vault.SessionVaults;
import pt.vamula.app.vault.VaultChannel;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SessionVaultPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void load() {
        WebView webView = findViewById(R.id.webview);
        VaultChannel.install(webView, SessionVaults.get(this));
        if (webView != null) {
            // O laboratório local é HTTP. A origem da WebView é HTTPS, por isso só a build
            // depurável aceita esse conteúdo. O release não entra neste ramo.
            if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
                webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }
            pt.vamula.app.location.GpsOwnershipJs.install(webView);
        }
        super.load();
        WebView loaded = findViewById(R.id.webview);
        if (loaded != null) {
            if (loaded != webView) {
                pt.vamula.app.location.GpsOwnershipJs.install(loaded);
            }
            pt.vamula.app.location.GpsOwnershipJs.watchDocuments(loaded);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        pt.vamula.app.location.DriverLocationHost.attach(this);
        pt.vamula.app.location.DriverLocationHost.resumed();
    }

    @Override
    public void onPause() {
        pt.vamula.app.location.DriverLocationHost.paused();
        super.onPause();
    }
}
