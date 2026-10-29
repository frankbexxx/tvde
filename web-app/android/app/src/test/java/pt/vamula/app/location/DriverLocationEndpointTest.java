package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Map;
import org.junit.Test;
import pt.vamula.app.vault.VaultApiBase;
import pt.vamula.app.vault.VaultHttp;

/** Política do destino. Não abre ligação. */
public class DriverLocationEndpointTest {

    private static final String LOOPBACK = "http://10.0.2.2:8765";

    private static String hostOf(String base) {
        String withoutScheme = base.substring("https://".length());
        int slash = withoutScheme.indexOf('/');
        return slash < 0 ? withoutScheme : withoutScheme.substring(0, slash);
    }

    private static String withExplicitHttpsPort(String base) {
        return base + ":443";
    }

    @Test
    public void releaseAcceptsOnlyTheConfiguredHttpsEndpoint() {
        String configured = DriverLocationEndpoint.configured();
        String other = DriverLocationEndpoint.PRODUCTION.equals(configured)
            ? DriverLocationEndpoint.STAGING_PROOF
            : DriverLocationEndpoint.PRODUCTION;
        assertTrue(configured.startsWith("https://"));
        assertTrue(DriverLocationEndpoint.isReleaseDestination(configured));
        assertTrue(DriverLocationEndpoint.isReleaseDestination(withExplicitHttpsPort(configured)));
        assertTrue(DriverLocationEndpoint.sameAuthority(withExplicitHttpsPort(configured), configured));
        assertFalse(DriverLocationEndpoint.isReleaseDestination(other));
        assertFalse(DriverLocationEndpoint.isReleaseDestination(LOOPBACK));
        assertFalse(DriverLocationEndpoint.isReleaseDestination("http://127.0.0.1:9"));
        assertFalse(DriverLocationEndpoint.isReleaseDestination("http://" + hostOf(configured)));
        assertFalse(DriverLocationEndpoint.isReleaseDestination("https://evil.example"));
        assertFalse(DriverLocationEndpoint.isReleaseDestination(configured + "/redirect"));
        assertFalse(DriverLocationEndpoint.isReleaseDestination(configured + "?next=1"));
        assertFalse(DriverLocationEndpoint.isReleaseDestination("https://user@" + hostOf(configured)));
        assertFalse(DriverLocationEndpoint.isReleaseDestination(" " + configured));
        assertFalse(DriverLocationArmament.accepts(LOOPBACK, "family-a"));
        assertFalse(DriverLocationArmament.accepts(other, "family-a"));
        assertFalse(DriverLocationArmament.accepts(configured, " "));
        assertFalse(DriverLocationArmament.accepts("https://evil.example", "family-a"));
        assertTrue(DriverLocationArmament.accepts(configured, "family-a"));
        assertTrue(DriverLocationEndpoint.isDebugSupplied(DriverLocationEndpoint.STAGING_PROOF));
        assertTrue(DriverLocationEndpoint.isDebugSupplied("http://127.0.0.1:9"));
        assertTrue(DriverLocationEndpoint.isDebugSupplied(LOOPBACK));
        assertTrue(DriverLocationEndpoint.isDebugSupplied(DriverLocationEndpoint.PRODUCTION));
        assertFalse(DriverLocationEndpoint.isDebugSupplied("https://evil.example"));
        assertTrue(VaultApiBase.endpoint(DriverLocationEndpoint.STAGING_PROOF, DriverLocationUpload.PATH) != null);
    }

    @Test
    public void productionGrantRefusesAnythingExceptTheConfiguredFamilyAndEndpoint() {
        DriverLocationOwnership.resetForProcessStart();
        DriverLocationService.clearTrail();
        RecordingHttp http = new RecordingHttp();
        FamilyAuth auth = new FamilyAuth("family-a");
        try {
            String configured = DriverLocationEndpoint.configured();
            String other = DriverLocationEndpoint.PRODUCTION.equals(configured)
                ? DriverLocationEndpoint.STAGING_PROOF
                : DriverLocationEndpoint.PRODUCTION;
            assertFalse(DriverLocationService.grantProduction(other, "family-a", http, auth));
            assertFalse(DriverLocationService.grantProduction(LOOPBACK, "family-a", http, auth));
            assertFalse(DriverLocationService.grantProduction("https://evil.example", "family-a", http, auth));
            assertFalse(DriverLocationService.grantProduction("http://127.0.0.1:9", "family-a", http, auth));
            assertFalse(DriverLocationService.grantProduction(configured, "family-b", http, auth));
            assertFalse(DriverLocationService.grantProduction(configured, " ", http, auth));
            assertFalse(DriverLocationService.uploadArmed());
            assertTrue(DriverLocationService.grantProduction(configured, "family-a", http, auth));
            assertTrue(DriverLocationService.uploadArmed());
            assertEquals(0, http.posts);
            assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        } finally {
            DriverLocationService.releaseForNewSession();
            DriverLocationService.clearTrail();
            DriverLocationOwnership.resetForProcessStart();
        }
    }

    private static final class FamilyAuth implements DriverLocationAuth {
        private final String family;

        private FamilyAuth(String family) {
            this.family = family;
        }

        @Override
        public String accessToken() {
            return "access";
        }

        @Override
        public String sessionFamily() {
            return family;
        }

        @Override
        public Refresh refresh(String apiBase) {
            return Refresh.invalid();
        }
    }

    private static final class RecordingHttp implements VaultHttp {
        private int posts;

        @Override
        public Result post(String url, String json, Map<String, String> headers) {
            posts++;
            return new Result(204, "");
        }
    }
}
