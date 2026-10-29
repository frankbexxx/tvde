package pt.vamula.app.vault;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.junit.Test;

/** Cifra de software e HTTP simulado. Não usa o Android Keystore. */
public class AndroidRefreshCoordinatorTest {

    private static final String API = "https://tvde-staging-api.onrender.com";

    @Test
    public void failedSaveDoesNotReplaceThePreviousSession() throws Exception {
        Harness harness = harness();
        harness.coordinator.commit(API, "access-old", "refresh-old", "family-old", null);
        harness.http.calls.clear();
        harness.store.fail = true;
        AndroidRefreshCoordinator.Outcome outcome = harness.coordinator.commit(API, "access-new", "refresh-new", "family-new", null);
        assertEquals("vault_unavailable", outcome.kind);
        SessionRecord read = harness.vault.read().orElseThrow();
        assertEquals("family-old", read.familyId());
        assertEquals("refresh-old", read.refreshToken());
        assertEquals(1, harness.http.calls.size());
        assertTrue(harness.http.calls.get(0).body.contains("refresh-new"));
        assertFalse(harness.http.calls.get(0).body.contains("refresh-old"));
    }

    @Test
    public void failedSaveOnEmptyVaultLeavesNoSession() throws Exception {
        Harness harness = harness();
        harness.store.fail = true;
        AndroidRefreshCoordinator.Outcome outcome = harness.coordinator.commit(API, "access-new", "refresh-new", "family-new", null);
        assertEquals("vault_unavailable", outcome.kind);
        assertTrue(harness.vault.read().isEmpty());
        assertEquals(1, harness.http.calls.size());
        assertTrue(harness.http.calls.get(0).body.contains("refresh-new"));
    }

    @Test
    public void accountSwitchRevokesOnlyThePreviousRefresh() throws Exception {
        Harness harness = harness();
        harness.coordinator.commit(API, "access-old", "refresh-old", "family-old", null);
        harness.http.calls.clear();
        AndroidRefreshCoordinator.Outcome outcome = harness.coordinator.commit(API, "access-new", "refresh-new", "family-new", null);
        assertEquals("committed", outcome.kind);
        SessionRecord read = harness.vault.read().orElseThrow();
        assertEquals("family-new", read.familyId());
        assertEquals("refresh-new", read.refreshToken());
        assertEquals(1, read.generation());
        assertEquals(1, harness.http.calls.size());
        assertTrue(harness.http.calls.get(0).url.endsWith("/auth/logout"));
        assertTrue(harness.http.calls.get(0).body.contains("refresh-old"));
        assertFalse(harness.http.calls.get(0).body.contains("refresh-new"));
        assertFalse(outcome.toString().contains("refresh-new"));
    }

    @Test
    public void foreignApiDoesNotReceiveTheRefreshToken() throws Exception {
        Harness harness = harness();
        harness.coordinator.commit(API, "access-old", "refresh-old", "family-old", null);
        harness.http.calls.clear();
        AndroidRefreshCoordinator.Outcome outcome = harness.coordinator.commit(
            "https://user:secret@evil.example",
            "access-new",
            "refresh-new",
            "family-new",
            null
        );
        assertEquals("api_rejected", outcome.kind);
        assertTrue(harness.http.calls.isEmpty());
        assertEquals("refresh-old", harness.vault.read().orElseThrow().refreshToken());
        AndroidRefreshCoordinator.Outcome refresh = harness.coordinator.refresh("https://evil.example/api");
        assertEquals("transient", refresh.kind);
        assertTrue(harness.http.calls.isEmpty());
        assertFalse(harness.vault.read().orElseThrow().refreshPending());
    }

    @Test
    public void refreshRotatesWithoutDroppingTheSession() throws Exception {
        Harness harness = harness();
        harness.coordinator.commit(API, jwt(9_000_000_000L), "refresh-1", "family-1", null);
        harness.http.queue(200, rotated("family-1", "access-2", "refresh-2"));
        AndroidRefreshCoordinator.Outcome outcome = harness.coordinator.refresh(API);
        assertEquals("refreshed", outcome.kind);
        assertEquals("access-2", outcome.accessToken);
        assertFalse(outcome.toString().contains("refresh-2"));
        SessionRecord read = harness.vault.read().orElseThrow();
        assertEquals("refresh-2", read.refreshToken());
        assertEquals("family-1", read.familyId());
        assertEquals(2, read.generation());
        assertFalse(read.refreshPending());
        Call call = harness.http.calls.get(harness.http.calls.size() - 1);
        assertTrue(call.url.endsWith("/auth/refresh"));
        assertEquals("android", call.headers.get("X-Auth-Client"));
        assertEquals("refresh-v1", call.headers.get("X-Auth-Contract"));
        assertFalse(call.headers.containsKey("Cookie"));
        assertTrue(call.body.contains("refresh-1"));
    }

    @Test
    public void concurrentRefreshUsesOneIdempotencyKey() throws Exception {
        Harness harness = harness();
        harness.coordinator.commit(API, jwt(9_000_000_000L), "refresh-1", "family-1", null);
        CountDownLatch both = new CountDownLatch(2);
        harness.http.gate = both;
        harness.http.queue(200, rotated("family-1", "access-a", "refresh-a"));
        harness.http.queue(200, rotated("family-1", "access-b", "refresh-b"));
        var pool = Executors.newFixedThreadPool(2);
        try {
            Future<AndroidRefreshCoordinator.Outcome> first = pool.submit(() -> harness.coordinator.refresh(API));
            Future<AndroidRefreshCoordinator.Outcome> second = pool.submit(() -> harness.coordinator.refresh(API));
            assertTrue(both.await(5, TimeUnit.SECONDS));
            AndroidRefreshCoordinator.Outcome left = first.get(5, TimeUnit.SECONDS);
            AndroidRefreshCoordinator.Outcome right = second.get(5, TimeUnit.SECONDS);
            String keys = harness.http.calls.get(0).body + harness.http.calls.get(1).body;
            String key = FlatJson.parse(harness.http.calls.get(0).body).text("idempotency_key");
            assertTrue(keys.contains(key));
            assertEquals(key, FlatJson.parse(harness.http.calls.get(1).body).text("idempotency_key"));
            int refreshed = ("refreshed".equals(left.kind) ? 1 : 0) + ("refreshed".equals(right.kind) ? 1 : 0);
            int stale = ("stale".equals(left.kind) ? 1 : 0) + ("stale".equals(right.kind) ? 1 : 0);
            assertEquals(1, refreshed);
            assertEquals(1, stale);
        } finally {
            pool.shutdownNow();
        }
        SessionRecord read = harness.vault.read().orElseThrow();
        assertEquals("family-1", read.familyId());
        assertEquals(2, read.generation());
        assertFalse(read.refreshPending());
    }

    @Test
    public void lateSuccessDoesNotRestoreAClearedSession() throws Exception {
        Harness harness = harness();
        harness.coordinator.commit(API, jwt(9_000_000_000L), "refresh-1", "family-1", null);
        harness.http.before = () -> harness.vault.clear();
        harness.http.queue(200, rotated("family-1", "access-late", "refresh-late"));
        AndroidRefreshCoordinator.Outcome outcome = harness.coordinator.refresh(API);
        assertEquals("invalid", outcome.kind);
        assertNull(outcome.accessToken);
        assertTrue(harness.vault.read().isEmpty());
        assertFalse(outcome.toString().contains("refresh-late"));
    }

    @Test
    public void serverErrorAndTimeoutKeepThePendingKey() throws Exception {
        Harness harness = harness();
        harness.coordinator.commit(API, jwt(1L), "refresh-1", "family-1", null);
        harness.http.queue(503, "");
        assertEquals("transient", harness.coordinator.refresh(API).kind);
        harness.http.queue(0, "");
        assertEquals("transient", harness.coordinator.refresh(API).kind);
        assertTrue(harness.vault.read().orElseThrow().refreshPending());
        String first = FlatJson.parse(harness.http.calls.get(0).body).text("idempotency_key");
        String second = FlatJson.parse(harness.http.calls.get(1).body).text("idempotency_key");
        assertEquals(first, second);
        assertEquals("refresh-1", harness.vault.read().orElseThrow().refreshToken());
    }

    @Test
    public void restartAfterTheGraceWindowClearsOnInvalidGrantAndDoesNotMintAnotherKey() throws Exception {
        MemoryStore store = new MemoryStore();
        AesGcmCipher cipher = cipher();
        ScriptedHttp http = new ScriptedHttp();
        AndroidRefreshCoordinator first = new AndroidRefreshCoordinator(new SessionVault(cipher, store), http);
        first.commit(API, jwt(1L), "refresh-1", "family-1", null);
        http.queue(0, "");
        assertEquals("transient", first.refresh(API).kind);
        AndroidRefreshCoordinator restarted = new AndroidRefreshCoordinator(new SessionVault(cipher, store), http);
        http.queue(401, "{\"detail\":\"invalid_grant\"}");
        assertEquals("invalid", restarted.refresh(API).kind);
        assertTrue(new SessionVault(cipher, store).read().isEmpty());
        int calls = http.calls.size();
        assertEquals("invalid", restarted.refresh(API).kind);
        assertEquals(calls, http.calls.size());
        assertEquals(
            FlatJson.parse(http.calls.get(0).body).text("idempotency_key"),
            FlatJson.parse(http.calls.get(1).body).text("idempotency_key")
        );
    }

    @Test
    public void restoreUsesTheVaultAndDistinguishesNetworkFromRevocation() throws Exception {
        Harness harness = harness();
        long future = (System.currentTimeMillis() / 1000L) + 3600L;
        harness.coordinator.commit(API, jwt(future), "refresh-1", "family-1", null);
        AndroidRefreshCoordinator.Outcome ready = harness.coordinator.restore(API);
        assertEquals("ready", ready.kind);
        assertEquals("user-1", ready.userId);
        assertEquals("driver", ready.role);
        assertTrue(harness.http.calls.isEmpty());

        Harness expired = harness();
        expired.coordinator.commit(API, jwt(1L), "refresh-1", "family-1", null);
        expired.http.queue(0, "");
        assertEquals("offline", expired.coordinator.restore(API).kind);
        assertTrue(expired.vault.read().isPresent());

        expired.http.queue(401, "{\"detail\":\"invalid_grant\"}");
        assertEquals("revoked", expired.coordinator.restore(API).kind);
        assertTrue(expired.vault.read().isEmpty());
    }

    @Test
    public void logoutClearsTheVaultWhenTheNetworkFailsAndRejectsTheLateRefresh() throws Exception {
        Harness harness = harness();
        harness.coordinator.commit(API, jwt(9_000_000_000L), "refresh-1", "family-1", null);
        RefreshLease lease = harness.vault.beginRefresh();
        harness.http.queue(0, "");
        AndroidRefreshCoordinator.Outcome outcome = harness.coordinator.logout(API);
        assertEquals("logged_out", outcome.kind);
        assertFalse(outcome.revoked);
        assertTrue(harness.vault.read().isEmpty());
        assertThrows(StaleRefreshException.class, () -> harness.vault.completeRefresh(
            lease,
            new SessionRecord("access-late", "refresh-late", "family-1", 2, null, null, null, false)
        ));
    }

    @Test
    public void allowlistAcceptsTheApisAndLoopbackOnly() {
        assertTrue(VaultApiBase.endpoint(API, "/auth/refresh").endsWith("/auth/refresh"));
        assertTrue(VaultApiBase.endpoint("https://tvde-api-fd2z.onrender.com/", "/auth/logout").startsWith("https://tvde-api-fd2z.onrender.com/auth/logout"));
        assertEquals("http://10.0.2.2:8000/auth/refresh", VaultApiBase.endpoint("http://10.0.2.2:8000", "/auth/refresh"));
        assertEquals("http://127.0.0.1:8000/auth/refresh", VaultApiBase.endpoint("http://127.0.0.1:8000/", "/auth/refresh"));
        assertNull(VaultApiBase.endpoint("https://evil.example", "/auth/refresh"));
        assertNull(VaultApiBase.endpoint("https://user:pass@tvde-staging-api.onrender.com", "/auth/refresh"));
        assertNull(VaultApiBase.endpoint("http://tvde-staging-api.onrender.com", "/auth/refresh"));
        assertNull(VaultApiBase.endpoint(API + "/api", "/auth/refresh"));
        assertNull(VaultApiBase.endpoint(API + "?x=1", "/auth/refresh"));
    }

    @Test
    public void originGateRejectsFramesAndOtherOriginsWithoutEchoingTheToken() throws Exception {
        Harness harness = harness();
        String planted = "{\"id\":\"1\",\"op\":\"commit\",\"refresh_token\":\"refresh-planted\",\"access_token\":\"access-planted\",\"session_id\":\"family-1\",\"api_base\":\"" + API + "\"}";
        String iframe = VaultChannel.reply(harness.coordinator, false, "https://localhost", planted);
        String foreign = VaultChannel.reply(harness.coordinator, true, "https://evil.example", planted);
        assertTrue(iframe.contains("origin_rejected"));
        assertTrue(foreign.contains("origin_rejected"));
        assertFalse(iframe.contains("refresh-planted"));
        assertFalse(foreign.contains("refresh-planted"));
        assertFalse(VaultOrigin.accepts(false, "https://localhost"));
        assertFalse(VaultOrigin.accepts(true, "https://localhost:443"));
        assertTrue(harness.vault.read().isEmpty());
        String contract = VaultChannel.reply(harness.coordinator, true, "https://localhost", "{\"id\":\"2\",\"op\":\"contract\",\"refresh_token\":\"refresh-planted\"}");
        assertTrue(contract.contains("android-refresh-v1"));
        assertFalse(contract.contains("refresh-planted"));
    }

    @Test
    public void unreachableLoopbackIsANetworkFailure() {
        VaultHttp.Result result = new HttpUrlVaultHttp(300).post("http://127.0.0.1:9/auth/refresh", "{}", Map.of("X-Auth-Client", "android"));
        assertEquals(0, result.status);
        assertEquals("", result.body);
    }

    private static String jwt(long expSeconds) {
        String payload = "{\"sub\":\"user-1\",\"role\":\"driver\",\"exp\":" + expSeconds + "}";
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return "eyJhbGciOiJub25lIn0." + encoded + ".sig";
    }

    private static String rotated(String family, String access, String refresh) {
        return "{\"access_token\":\"" + access + "\",\"refresh_token\":\"" + refresh + "\",\"session_id\":\"" + family + "\",\"user_id\":\"user-1\",\"role\":\"driver\",\"phone\":\"+351900000000\",\"display_name\":\"Demo\"}";
    }

    private static Harness harness() throws GeneralSecurityException {
        MemoryStore store = new MemoryStore();
        SessionVault vault = new SessionVault(cipher(), store);
        ScriptedHttp http = new ScriptedHttp();
        return new Harness(vault, store, http, new AndroidRefreshCoordinator(vault, http));
    }

    private static AesGcmCipher cipher() throws GeneralSecurityException {
        KeyGenerator generator = KeyGenerator.getInstance("AES");
        generator.init(256);
        return new AesGcmCipher(new FixedKey(generator.generateKey()));
    }

    private static final class Harness {
        private final SessionVault vault;
        private final MemoryStore store;
        private final ScriptedHttp http;
        private final AndroidRefreshCoordinator coordinator;

        private Harness(SessionVault vault, MemoryStore store, ScriptedHttp http, AndroidRefreshCoordinator coordinator) {
            this.vault = vault;
            this.store = store;
            this.http = http;
            this.coordinator = coordinator;
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

    private static final class MemoryStore implements VaultStore {
        private byte[] blob;
        private boolean fail;

        @Override
        public synchronized byte[] read() {
            return blob == null ? null : blob.clone();
        }

        @Override
        public synchronized void write(byte[] value) {
            if (fail) {
                throw new IllegalStateException("write_failed");
            }
            blob = value.clone();
        }

        @Override
        public synchronized void delete() {
            blob = null;
        }
    }

    private static final class Call {
        private final String url;
        private final String body;
        private final Map<String, String> headers;

        private Call(String url, String body, Map<String, String> headers) {
            this.url = url;
            this.body = body;
            this.headers = headers;
        }
    }

    private static final class ScriptedHttp implements VaultHttp {
        private final List<Call> calls = new ArrayList<>();
        private final List<VaultHttp.Result> queued = new ArrayList<>();
        private Runnable before;
        private CountDownLatch gate;

        private void queue(int status, String body) {
            queued.add(new Result(status, body));
        }

        @Override
        public Result post(String url, String json, Map<String, String> headers) {
            Result result;
            CountDownLatch open;
            synchronized (this) {
                calls.add(new Call(url, json, Map.copyOf(headers)));
                if (before != null) {
                    before.run();
                }
                result = queued.isEmpty() ? new Result(0, "") : queued.remove(0);
                open = gate;
            }
            if (open != null) {
                open.countDown();
                try {
                    open.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
            }
            return result;
        }
    }
}
