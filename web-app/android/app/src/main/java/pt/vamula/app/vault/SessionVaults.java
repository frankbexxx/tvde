package pt.vamula.app.vault;

import android.content.Context;

/** Instância única para a bridge e para o futuro serviço no mesmo processo. */
public final class SessionVaults {

    private static volatile SessionVault instance;

    private SessionVaults() {}

    public static SessionVault get(Context context) {
        SessionVault current = instance;
        if (current != null) {
            return current;
        }
        synchronized (SessionVaults.class) {
            if (instance == null) {
                instance = new SessionVault(
                    new AesGcmCipher(new AndroidKeystoreKeys()),
                    new DataStoreVaultStore(context.getApplicationContext())
                );
            }
            return instance;
        }
    }
}
