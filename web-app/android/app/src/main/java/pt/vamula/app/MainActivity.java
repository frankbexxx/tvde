package pt.vamula.app;

import android.os.Bundle;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import pt.vamula.app.vault.SessionVaultJs;
import pt.vamula.app.vault.SessionVaultPlugin;
import pt.vamula.app.vault.SessionVaults;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SessionVaultPlugin.class);
        super.onCreate(savedInstanceState);
        Bridge bridge = getBridge();
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new SessionVaultJs(SessionVaults.get(this)), SessionVaultJs.BRIDGE);
        }
    }
}
