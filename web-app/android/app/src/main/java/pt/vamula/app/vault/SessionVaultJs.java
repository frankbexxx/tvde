package pt.vamula.app.vault;

import android.webkit.JavascriptInterface;

/**
 * Escrita da sessão fora do Capacitor. {@code Bridge.callPluginMethod} regista
 * {@code call.getData()} antes de invocar o plugin, por isso os segredos não passam por aí.
 */
public final class SessionVaultJs {

    public static final String BRIDGE = "VamulaSessionVault";

    private final SessionVault vault;

    public SessionVaultJs(SessionVault vault) {
        this.vault = vault;
    }

    @JavascriptInterface
    public String save(
        String accessToken,
        String refreshToken,
        String familyId,
        int generation,
        String absoluteExpiresAt,
        String idleExpiresAt
    ) {
        try {
            vault.save(
                new SessionRecord(
                    accessToken,
                    refreshToken,
                    familyId,
                    generation,
                    absoluteExpiresAt,
                    idleExpiresAt,
                    null,
                    false
                )
            );
            return "ok";
        } catch (RuntimeException | VaultKeyException exception) {
            return "vault_unavailable";
        }
    }
}
