package pt.vamula.app.location;

import pt.vamula.app.vault.AndroidRefreshCoordinator;
import pt.vamula.app.vault.SessionRecord;
import pt.vamula.app.vault.SessionVault;
import pt.vamula.app.vault.VaultKeyException;

/**
 * Concede o envio nativo depois de um commit ou restore válido.
 * O URL observado na WebView só serve para conferir o destino já configurado.
 * Logout, cofre vazio ou família nova desarmam e largam a fila anterior.
 */
public final class DriverLocationArmament {

    private DriverLocationArmament() {}

    public static boolean accepts(String observedBase, String family) {
        if (family == null || family.trim().isEmpty()) {
            return false;
        }
        return DriverLocationEndpoint.sameAuthority(observedBase, DriverLocationEndpoint.configured());
    }

    public static void onSessionCommitted(
        SessionVault vault,
        AndroidRefreshCoordinator coordinator,
        String observedBase,
        String committedFamily
    ) {
        try {
            DriverLocationService.releaseForNewSession();
            if (vault == null || coordinator == null || !accepts(observedBase, committedFamily)) {
                return;
            }
            String live = familyOf(vault);
            if (!committedFamily.equals(live)) {
                return;
            }
            DriverLocationService.grantProduction(
                DriverLocationEndpoint.configured(),
                live,
                DriverLocationTransport.create(),
                new VaultDriverLocationAuth(vault, coordinator)
            );
        } catch (RuntimeException exception) {
            DriverLocationService.releaseForNewSession();
        }
    }

    public static void onSessionRestored(
        SessionVault vault,
        AndroidRefreshCoordinator coordinator,
        String observedBase,
        String kind
    ) {
        if (!"ready".equals(kind) && !"refreshed".equals(kind)) {
            return;
        }
        try {
            DriverLocationService.releaseForNewSession();
            if (vault == null || coordinator == null) {
                return;
            }
            String live = familyOf(vault);
            if (!accepts(observedBase, live)) {
                return;
            }
            DriverLocationService.grantProduction(
                DriverLocationEndpoint.configured(),
                live,
                DriverLocationTransport.create(),
                new VaultDriverLocationAuth(vault, coordinator)
            );
        } catch (RuntimeException exception) {
            DriverLocationService.releaseForNewSession();
        }
    }

    public static void onSessionEnded() {
        try {
            DriverLocationService.releaseForNewSession();
        } catch (RuntimeException exception) {
            // O logout não fica à espera do envio.
        }
    }

    private static String familyOf(SessionVault vault) {
        try {
            return vault.read().map(SessionRecord::familyId).orElse("");
        } catch (VaultKeyException exception) {
            return "";
        }
    }
}
