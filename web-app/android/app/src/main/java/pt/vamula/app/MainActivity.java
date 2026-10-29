package pt.vamula.app;

import android.os.Bundle;
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
            webView.addJavascriptInterface(new pt.vamula.app.location.GpsOwnershipJs(), "vamulaGps");
        }
        super.load();
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
