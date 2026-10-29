package pt.vamula.app.location;

import pt.vamula.app.vault.HttpUrlVaultHttp;
import pt.vamula.app.vault.VaultHttp;

/**
 * Variante de prova. O destino continua a ser só o STAGING configurado.
 * O gancho troca o transporte, não o host, e não existe na release.
 */
public final class DriverLocationTransportHook {

    private static volatile VaultHttp installed;

    private DriverLocationTransportHook() {}

    public static void use(VaultHttp http) {
        installed = http;
    }

    public static VaultHttp create() {
        VaultHttp current = installed;
        if (current == null) {
            return new HttpUrlVaultHttp();
        }
        return current;
    }
}
