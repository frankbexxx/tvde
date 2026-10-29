package pt.vamula.app.vault;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Map;

/**
 * Leitura e limpeza sem segredos. A escrita entra por {@link VaultChannel}, não por argumentos Capacitor.
 */
@CapacitorPlugin(name = "SessionVault")
public class SessionVaultPlugin extends Plugin {

    @PluginMethod
    public void read(PluginCall call) {
        try {
            SessionRecord record = vault().read().orElse(null);
            if (record == null) {
                JSObject empty = new JSObject();
                empty.put("empty", true);
                call.resolve(empty);
                return;
            }
            JSObject result = new JSObject();
            for (Map.Entry<String, Object> field : record.publicFields().entrySet()) {
                result.put(field.getKey(), field.getValue());
            }
            call.resolve(result);
        } catch (VaultKeyException exception) {
            call.reject("vault_unavailable");
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        vault().clear();
        call.resolve();
    }

    private SessionVault vault() {
        return SessionVaults.get(getContext());
    }
}
