package pt.vamula.app.location;

import pt.vamula.app.vault.VaultHttp;

/** O cliente do POST nativo. A variante de prova pode substituí-lo; release e debug não. */
public final class DriverLocationTransport {

    private DriverLocationTransport() {}

    public static VaultHttp create() {
        return DriverLocationTransportHook.create();
    }
}
