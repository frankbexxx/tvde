package pt.vamula.app.location;

import pt.vamula.app.vault.HttpUrlVaultHttp;
import pt.vamula.app.vault.VaultHttp;

/** Debug de desenvolvimento. O destino configurado continua a ser PROD. */
public final class DriverLocationTransportHook {

    private DriverLocationTransportHook() {}

    public static VaultHttp create() {
        return new HttpUrlVaultHttp();
    }
}
