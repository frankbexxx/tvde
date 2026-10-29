package pt.vamula.app.vault;

import android.net.Uri;

/** Só o documento principal servido em https://localhost pode falar com o cofre. */
public final class VaultOrigin {

    public static final String APP_ORIGIN = "https://localhost";

    private VaultOrigin() {}

    public static boolean accepts(boolean mainFrame, String origin) {
        return mainFrame && APP_ORIGIN.equals(origin);
    }

    public static boolean accepts(boolean mainFrame, Uri origin) {
        if (!mainFrame || origin == null || origin.getPort() != -1) {
            return false;
        }
        return "https".equals(origin.getScheme()) && "localhost".equals(origin.getHost());
    }
}
