package pt.vamula.app.location;

import pt.vamula.app.vault.HttpUrlVaultHttp;
import pt.vamula.app.vault.VaultHttp;

/** Release de produção. Não há gancho para trocar o cliente nem o host. */
public final class DriverLocationTransportHook {

    private DriverLocationTransportHook() {}

    public static VaultHttp create() {
        return new HttpUrlVaultHttp();
    }
}
