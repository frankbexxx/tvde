package pt.vamula.app.location;

import pt.vamula.app.vault.HttpUrlVaultHttp;
import pt.vamula.app.vault.VaultHttp;

/** Prova TLS. O cliente é o HTTP real e não há gancho para o substituir. */
public final class DriverLocationTransportHook {

    private DriverLocationTransportHook() {}

    public static VaultHttp create() {
        return new HttpUrlVaultHttp();
    }
}
