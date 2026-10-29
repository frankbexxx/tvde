package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.junit.After;
import org.junit.Test;
import pt.vamula.app.vault.AesGcmCipher;
import pt.vamula.app.vault.AndroidRefreshCoordinator;
import pt.vamula.app.vault.SessionVault;
import pt.vamula.app.vault.VaultChannel;
import pt.vamula.app.vault.VaultHttp;
import pt.vamula.app.vault.VaultOrigin;
import pt.vamula.app.vault.VaultStore;

/** Autorização da família e emissor temporário. O HTTP fica em memória. */
public class DriverLocationReactivationTest {

    private static final long NOW = 1_700_000_000_000L;

    @After
    public void clean() {
        DriverLocationService.releaseForNewSession();
        DriverLocationService.clearTrail();
        DriverLocationOwnership.resetForProcessStart();
    }

    @Test
    public void parkedServiceKeepsTheGrantUntilTheSessionEnds() {
        DriverLocationOwnership.resetForProcessStart();
        DriverLocationService.clearTrail();
        QuietHttp http = new QuietHttp(204);
        assertTrue(DriverLocationService.grantProduction(DriverLocationEndpoint.configured(), "family-a", http, new FamilyAuth("family-a")));
        DriverLocationService.onAcceptedFix(sample(NOW - 1_000L), NOW);
        assertEquals(1, DriverLocationService.queuedFixes());
        DriverLocationService.parkSender();
        assertTrue(DriverLocationService.uploadArmed());
        assertEquals("family-a", DriverLocationService.grantedFamily());
        assertEquals(0, DriverLocationService.queuedFixes());
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertEquals("stopped", DriverLocationOwnership.lastRelease());
        assertEquals(0, http.urls.size());
        DriverLocationService.releaseForNewSession();
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals("", DriverLocationService.grantedFamily());
    }

    @Test
    public void sameFamilyRefreshDoesNotRearmOrDropTheQueue() throws Exception {
        SessionHarness harness = harness(200);
        commit(harness, "family-a");
        assertTrue(DriverLocationService.uploadArmed());
        DriverLocationService.onAcceptedFix(sample(NOW - 1_000L), NOW);
        assertEquals(1, DriverLocationService.queuedFixes());
        int grants = harness.http.urls.size();
        String reply = VaultChannel.reply(harness.vault, harness.coordinator, true, VaultOrigin.APP_ORIGIN, refresh("family-a"));
        assertTrue(reply.contains("\"kind\":\"refreshed\""));
        assertTrue(DriverLocationService.uploadArmed());
        assertEquals("family-a", DriverLocationService.grantedFamily());
        assertEquals(1, DriverLocationService.queuedFixes());
        assertTrue(harness.http.urls.get(grants).endsWith("/auth/refresh"));
        assertFalse(harness.http.urls.get(grants).contains("10.0.2.2"));
    }

    @Test
    public void refreshFailureKeepsTheGrantAndTheVault() throws Exception {
        SessionHarness harness = harness(500);
        commit(harness, "family-a");
        String reply = VaultChannel.reply(harness.vault, harness.coordinator, true, VaultOrigin.APP_ORIGIN, refresh("family-a"));
        assertTrue(reply.contains("\"kind\":\"transient\""));
        assertTrue(DriverLocationService.uploadArmed());
        assertEquals("family-a", harness.vault.read().orElseThrow().familyId());
        assertEquals("family-a", DriverLocationService.grantedFamily());
    }

    @Test
    public void logoutFamilyChangeAndEmptyVaultRevokeTheGrant() throws Exception {
        SessionHarness harness = harness(204);
        commit(harness, "family-a");
        DriverLocationService.onAcceptedFix(sample(NOW - 1_000L), NOW);
        commit(harness, "family-b");
        assertTrue(DriverLocationService.uploadArmed());
        assertEquals("family-b", DriverLocationService.grantedFamily());
        assertEquals(0, DriverLocationService.queuedFixes());

        String loggedOut = VaultChannel.reply(harness.vault, harness.coordinator, true, VaultOrigin.APP_ORIGIN, op("logout"));
        assertTrue(loggedOut.contains("\"ok\":true"));
        assertFalse(DriverLocationService.uploadArmed());
        assertTrue(harness.vault.read().isEmpty());

        String empty = VaultChannel.reply(harness.vault, harness.coordinator, true, VaultOrigin.APP_ORIGIN, op("restore"));
        assertTrue(empty.contains("\"kind\":\"empty\""));
        assertFalse(DriverLocationService.uploadArmed());
    }

    @Test
    public void processRestartRearmsOnlyFromALegitimateRestore() throws Exception {
        SessionHarness harness = harness(204);
        commit(harness, "family-a");
        DriverLocationService.onAcceptedFix(sample(NOW - 1_000L), NOW);
        assertEquals(1, DriverLocationService.queuedFixes());
        DriverLocationService.clearTrail();
        DriverLocationOwnership.resetForProcessStart();
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals(0, DriverLocationService.queuedFixes());

        String refused = VaultChannel.reply(
            harness.vault,
            harness.coordinator,
            true,
            VaultOrigin.APP_ORIGIN,
            restore("http://10.0.2.2:8765")
        );
        assertTrue(refused.contains("\"kind\":\"ready\""));
        assertFalse(DriverLocationService.uploadArmed());

        String restored = VaultChannel.reply(
            harness.vault,
            harness.coordinator,
            true,
            VaultOrigin.APP_ORIGIN,
            restore(DriverLocationEndpoint.configured())
        );
        assertTrue(restored.contains("\"kind\":\"ready\""));
        assertTrue(DriverLocationService.uploadArmed());
        assertEquals("family-a", DriverLocationService.grantedFamily());
        assertEquals(0, DriverLocationService.queuedFixes());
        assertEquals(0, DriverLocationService.uploadedFixes());
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
    }

    @Test
    public void foreignCommitClearsAPreviousGrant() throws Exception {
        SessionHarness harness = harness(204);
        commit(harness, "family-a");
        assertTrue(DriverLocationService.uploadArmed());
        String reply = VaultChannel.reply(
            harness.vault,
            harness.coordinator,
            true,
            VaultOrigin.APP_ORIGIN,
            commitJson("http://10.0.2.2:8765", "family-a")
        );
        assertTrue(reply.contains("\"ok\":true"));
        assertFalse(DriverLocationService.uploadArmed());
    }

    private static void commit(SessionHarness harness, String family) {
        String reply = VaultChannel.reply(
            harness.vault,
            harness.coordinator,
            true,
            VaultOrigin.APP_ORIGIN,
            commitJson(DriverLocationEndpoint.configured(), family)
        );
        assertTrue(reply.contains("\"ok\":true"));
    }

    private static String commitJson(String base, String family) {
        return "{\"id\":\"c\",\"op\":\"commit\",\"api_base\":\"" + base + "\",\"access_token\":\"" + jwt()
            + "\",\"refresh_token\":\"refresh-" + family + "\",\"session_id\":\"" + family + "\",\"absolute_expires_at\":\"\"}";
    }

    private static String refresh(String family) {
        return "{\"id\":\"r\",\"op\":\"refresh\",\"api_base\":\"" + DriverLocationEndpoint.configured() + "\",\"session_id\":\"" + family + "\"}";
    }

    private static String restore(String base) {
        return "{\"id\":\"s\",\"op\":\"restore\",\"api_base\":\"" + base + "\"}";
    }

    private static String op(String name) {
        return "{\"id\":\"x\",\"op\":\"" + name + "\",\"api_base\":\"" + DriverLocationEndpoint.configured() + "\"}";
    }

    private static String jwt() {
        long exp = System.currentTimeMillis() / 1000L + 3600L;
        String payload = "{\"sub\":\"user-1\",\"role\":\"driver\",\"exp\":" + exp + "}";
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return "eyJhbGciOiJub25lIn0." + encoded + ".sig";
    }

    private static DriverLocationSample sample(long fixTime) {
        return new DriverLocationSample(fixTime, 38.7, -9.1, true, 10d, "gps", false);
    }

    private static SessionHarness harness(int refreshStatus) throws GeneralSecurityException {
        MemoryStore store = new MemoryStore();
        SessionVault vault = new SessionVault(cipher(), store);
        QuietHttp http = new QuietHttp(refreshStatus);
        return new SessionHarness(vault, http, new AndroidRefreshCoordinator(vault, http));
    }

    private static AesGcmCipher cipher() throws GeneralSecurityException {
        KeyGenerator generator = KeyGenerator.getInstance("AES");
        generator.init(256);
        return new AesGcmCipher(new FixedKey(generator.generateKey()));
    }

    private static final class SessionHarness {
        private final SessionVault vault;
        private final QuietHttp http;
        private final AndroidRefreshCoordinator coordinator;

        private SessionHarness(SessionVault vault, QuietHttp http, AndroidRefreshCoordinator coordinator) {
            this.vault = vault;
            this.http = http;
            this.coordinator = coordinator;
        }
    }

    private static final class QuietHttp implements VaultHttp {
        private final int refreshStatus;
        private final List<String> urls = new ArrayList<>();

        private QuietHttp(int refreshStatus) {
            this.refreshStatus = refreshStatus;
        }

        @Override
        public Result post(String url, String json, Map<String, String> headers) {
            urls.add(url);
            if (url.endsWith("/auth/refresh")) {
                if (refreshStatus != 200) {
                    return new Result(refreshStatus, "");
                }
                return new Result(200, "{\"access_token\":\"" + jwt() + "\",\"refresh_token\":\"refresh-family-a\",\"session_id\":\"family-a\",\"user_id\":\"user-1\",\"role\":\"driver\"}");
            }
            return new Result(204, "");
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
            return Refresh.transientFailure();
        }
    }

    private static final class MemoryStore implements VaultStore {
        private byte[] blob;

        @Override
        public byte[] read() {
            return blob == null ? null : blob.clone();
        }

        @Override
        public void write(byte[] value) {
            blob = value.clone();
        }

        @Override
        public void delete() {
            blob = null;
        }
    }

    private static final class FixedKey implements AesGcmCipher.KeySource {
        private final SecretKey key;

        private FixedKey(SecretKey key) {
            this.key = key;
        }

        @Override
        public SecretKey getOrCreate() {
            return key;
        }

        @Override
        public void destroy() {}
    }
}
