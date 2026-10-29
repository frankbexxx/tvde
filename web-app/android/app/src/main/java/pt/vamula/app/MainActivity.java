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
        super.load();
    }
}
