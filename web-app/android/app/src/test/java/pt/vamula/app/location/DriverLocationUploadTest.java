package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.junit.Test;
import pt.vamula.app.vault.AesGcmCipher;
import pt.vamula.app.vault.AndroidRefreshCoordinator;
import pt.vamula.app.vault.SessionVault;
import pt.vamula.app.vault.VaultApiBase;
import pt.vamula.app.vault.VaultHttp;
import pt.vamula.app.vault.VaultStore;

/** HTTP simulado. Não abre ligação e não usa o endpoint de produção. */
public class DriverLocationUploadTest {

    private static final long NOW = 1_700_000_000_000L;
    private static final String LOOPBACK = "http://127.0.0.1:9";
    private static final String STAGING = "https://tvde-staging-api.onrender.com";
    private static final double LATITUDE = 12.3456789;
    private static final double LONGITUDE = -8.7654321;

    @Test
    public void sendsTheOriginalTimestampInFixV1OrderWithoutDuplicates() {
        ScriptedHttp http = new ScriptedHttp(204);
        DriverLocationUpload upload = armed(http, new ScriptAuth());
        assertTrue(upload.offer(sample(NOW - 3_000L, "fused"), NOW));
        assertFalse(upload.offer(sample(NOW - 3_000L, "fused"), NOW));
        assertTrue(upload.offer(sample(NOW - 1_000L, "gps"), NOW));
        assertTrue(upload.offer(sample(NOW - 2_000L, "network"), NOW));

        upload.drain(NOW);
        upload.drain(NOW);
        upload.drain(NOW);

        assertEquals(3, http.calls.size());
        assertEquals(3, upload.sent());
        assertEquals(0, upload.queued());
        assertEquals(NOW - 3_000L, timestamp(http.calls.get(0)));
        assertEquals(NOW - 2_000L, timestamp(http.calls.get(1)));
        assertEquals(NOW - 1_000L, timestamp(http.calls.get(2)));
        for (RecordedCall call : http.calls) {
            assertEquals(LOOPBACK + "/drivers/location", call.url);
            assertEquals("fix-v1", call.headers.get("X-Gps-Contract"));
            assertEquals("application/json", call.headers.get("Content-Type"));
            assertTrue(call.headers.get("Authorization").startsWith("Bearer "));
            assertFalse(call.body.contains("\"timestamp\":" + NOW));
            assertFalse(DriverLocationUpload.diagnostic(204, timestamp(call)).contains("12.3456789"));
            assertFalse(DriverLocationUpload.diagnostic(204, timestamp(call)).contains("-8.7654321"));
        }
        assertEquals("time=" + (NOW - 3_000L), new DriverLocationUpload.QueuedFix(NOW - 3_000L, LATITUDE, LONGITUDE).toString());

        ScriptedHttp limitedHttp = new ScriptedHttp(204);
        DriverLocationUpload limited = armed(limitedHttp, new ScriptAuth());
        for (int index = 0; index < 6; index++) {
            assertTrue(limited.offer(sample(NOW - 6_000L + index * 1_000L, "fused"), NOW));
        }
        assertEquals(DriverLocationUpload.CAPACITY, limited.queued());
        limited.drain(NOW);
        assertEquals(NOW - 4_000L, timestamp(limitedHttp.calls.get(0)));
    }

    @Test
    public void dropsStaleFixesInsteadOfRewritingTheirTimestamp() {
        ScriptedHttp http = new ScriptedHttp(204);
        DriverLocationUpload upload = armed(http, new ScriptAuth());
        long fresh = NOW - DriverLocationCadence.MATCHING_MAX_AGE_MILLIS;
        assertFalse(upload.offer(sample(NOW - DriverLocationCadence.MATCHING_MAX_AGE_MILLIS - 1L, "fused"), NOW));
        assertFalse(upload.offer(sample(NOW + DriverLocationCadence.FUTURE_SKEW_MILLIS + 1L, "fused"), NOW));
        assertTrue(upload.offer(sample(fresh, "fused"), NOW));
        upload.drain(NOW + DriverLocationCadence.MATCHING_MAX_AGE_MILLIS + 1L);
        assertEquals(0, http.calls.size());
        assertEquals(0, upload.queued());

        assertTrue(upload.offer(sample(fresh, "fused"), fresh + 1_000L));
        upload.drain(fresh + 1_000L);
        assertEquals(1, http.calls.size());
        assertEquals(fresh, timestamp(http.calls.get(0)));
    }

    @Test
    public void refusesFallbackOriginsAndAForeignEndpoint() {
        ScriptedHttp http = new ScriptedHttp(204);
        DriverLocationUpload upload = new DriverLocationUpload();
        assertFalse(upload.arm("https://evil.example", http, new ScriptAuth()));
        assertFalse(upload.arm(null, http, new ScriptAuth()));
        assertTrue(upload.arm(STAGING, http, new ScriptAuth()));
        DriverLocationOwnership.resetForProcessStart();
        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-test"));
        assertFalse(upload.offer(sample(NOW - 1_000L, "presentation_fallback"), NOW));
        assertFalse(upload.offer(sample(NOW - 1_000L, "demo"), NOW));
        assertFalse(upload.offer(sample(NOW - 1_000L, "mock"), NOW));
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        upload.drain(NOW);
        assertEquals(1, http.calls.size());
        assertEquals(STAGING + "/drivers/location", http.calls.get(0).url);
        assertEquals(STAGING + "/drivers/location", VaultApiBase.endpoint(STAGING, DriverLocationUpload.PATH));
        assertNull(VaultApiBase.endpoint("https://evil.example", DriverLocationUpload.PATH));
    }

    @Test
    public void retriesOnceAfterASuccessfulRefreshAndKeepsTheFixOnServerError() {
        ScriptedHttp http = new ScriptedHttp(401, 204);
        ScriptAuth auth = new ScriptAuth();
        DriverLocationUpload upload = armed(http, auth);
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        upload.drain(NOW);
        assertEquals(2, http.calls.size());
        assertEquals(1, upload.refreshAttempts());
        assertEquals(1, upload.sent());
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());
        assertEquals(timestamp(http.calls.get(0)), timestamp(http.calls.get(1)));
        assertTrue(http.calls.get(1).headers.get("Authorization").endsWith("access-new"));
        assertFalse(http.calls.get(0).body.contains("access-old"));
        assertFalse(http.calls.get(1).body.contains("access-new"));

        ScriptedHttp failing = new ScriptedHttp(500);
        DriverLocationUpload retained = armed(failing, new ScriptAuth());
        assertTrue(retained.offer(sample(NOW - 1_000L, "fused"), NOW));
        retained.drain(NOW);
        assertEquals(1, failing.calls.size());
        assertEquals(0, retained.sent());
        assertEquals(1, retained.queued());
        assertEquals(0, retained.refreshAttempts());
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());

        ScriptedHttp offline = new ScriptedHttp(0);
        DriverLocationUpload disconnected = armed(offline, new ScriptAuth());
        assertTrue(disconnected.offer(sample(NOW - 1_000L, "fused"), NOW));
        disconnected.drain(NOW);
        assertEquals(0, disconnected.sent());
        assertEquals(1, disconnected.queued());
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());

        ScriptedHttp rejected = new ScriptedHttp(400);
        DriverLocationUpload dropped = armed(rejected, new ScriptAuth());
        assertTrue(dropped.offer(sample(NOW - 1_000L, "fused"), NOW));
        dropped.drain(NOW);
        assertEquals(0, dropped.sent());
        assertEquals(0, dropped.queued());
        assertEquals(0, dropped.refreshAttempts());
    }

    @Test
    public void redirectIsNotSuccessAndDoesNotReplaceTheEndpoint() {
        ScriptedHttp http = new ScriptedHttp(302);
        DriverLocationUpload upload = armed(http, new ScriptAuth());
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        upload.drain(NOW);
        assertEquals(1, http.calls.size());
        assertEquals(LOOPBACK + "/drivers/location", http.calls.get(0).url);
        assertEquals(0, upload.sent());
        assertEquals(1, upload.queued());
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());
        assertTrue(upload.armed());
    }

    @Test
    public void familyChangeDropsTheQueueAndANewGrantDoesNotReuseIt() {
        ScriptAuth auth = new ScriptAuth();
        ScriptedHttp http = new ScriptedHttp(204);
        DriverLocationUpload upload = armed(http, auth);
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        auth.family = "other-family";
        upload.drain(NOW);
        assertEquals(0, http.calls.size());
        assertEquals(0, upload.queued());
        assertFalse(upload.armed());
        assertEquals("", upload.grantedFamily());

        ScriptAuth again = new ScriptAuth();
        assertTrue(upload.arm(LOOPBACK, http, again));
        assertTrue(upload.offer(sample(NOW - 2_000L, "gps"), NOW));
        assertEquals(1, upload.queued());
        assertTrue(upload.arm(LOOPBACK, http, again));
        assertEquals(0, upload.queued());
        assertEquals("family-test", upload.grantedFamily());
        upload.drain(NOW);
        assertEquals(0, http.calls.size());
    }

    @Test
    public void refreshThatChangesFamilyDoesNotRetry() {
        ScriptedHttp http = new ScriptedHttp(401, 204);
        ScriptAuth auth = new ScriptAuth();
        auth.changeFamilyOnRefresh = true;
        DriverLocationUpload upload = armed(http, auth);
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        upload.drain(NOW);
        assertEquals(1, http.calls.size());
        assertEquals(0, upload.sent());
        assertEquals(0, upload.queued());
        assertFalse(upload.armed());
        assertEquals("session", DriverLocationOwnership.lastRelease());
    }

    @Test
    public void lateCompletionAfterStopIsIgnored() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        ScriptedHttp http = new ScriptedHttp(204);
        http.gate = () -> {
            entered.countDown();
            release.await();
        };
        DriverLocationUpload upload = armed(http, new ScriptAuth());
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        Thread worker = new Thread(() -> upload.drain(NOW));
        worker.start();
        assertTrue(entered.await(2, TimeUnit.SECONDS));
        upload.stop();
        release.countDown();
        worker.join(2_000L);
        assertEquals(1, http.calls.size());
        assertEquals(0, upload.sent());
        assertFalse(upload.armed());
        assertEquals(0, upload.queued());
    }

    @Test
    public void emptyFamilyCannotArm() {
        ScriptAuth auth = new ScriptAuth();
        auth.family = " ";
        DriverLocationUpload upload = new DriverLocationUpload();
        assertFalse(upload.arm(LOOPBACK, new ScriptedHttp(204), auth));
        assertFalse(upload.armed());
    }

    @Test
    public void invalidRefreshDoesNotPostAgainAndStopDropsTheQueue() throws Exception {
        ScriptedHttp http = new ScriptedHttp(401);
        ScriptAuth auth = new ScriptAuth();
        auth.refreshKind = DriverLocationAuth.Refresh.Kind.INVALID;
        DriverLocationUpload upload = armed(http, auth);
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        upload.drain(NOW);
        upload.drain(NOW);
        assertEquals(1, http.calls.size());
        assertEquals(1, upload.refreshAttempts());
        assertEquals(0, upload.sent());
        assertEquals(1, upload.queued());
        assertTrue(upload.armed());
        assertFalse(upload.functional());
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertEquals("auth", DriverLocationOwnership.lastRelease());

        DriverLocationUpload stopping = armed(new ScriptedHttp(204), new ScriptAuth());
        assertTrue(stopping.offer(sample(NOW - 1_000L, "fused"), NOW));
        stopping.stop();
        stopping.drain(NOW);
        assertEquals(0, stopping.sent());
        assertFalse(stopping.armed());

        ScriptAuth missing = new ScriptAuth();
        missing.token = " ";
        ScriptedHttp silent = new ScriptedHttp(204);
        DriverLocationUpload held = armed(silent, missing);
        assertTrue(held.offer(sample(NOW - 1_000L, "fused"), NOW));
        held.drain(NOW);
        assertEquals(0, silent.calls.size());
        assertEquals(1, held.queued());

        assertTrue(vaultKeepsTheSessionWhenRefreshFails());
    }

    @Test
    public void onlyOnePostRunsAtATime() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger active = new AtomicInteger();
        AtomicInteger max = new AtomicInteger();
        ScriptedHttp http = new ScriptedHttp(204);
        http.gate = () -> {
            int current = active.incrementAndGet();
            max.accumulateAndGet(current, Math::max);
            entered.countDown();
            if (!release.await(2, TimeUnit.SECONDS)) {
                throw new IllegalStateException("release_timeout");
            }
            active.decrementAndGet();
        };
        DriverLocationUpload upload = armed(http, new ScriptAuth());
        assertTrue(upload.offer(sample(NOW - 2_000L, "fused"), NOW));
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        Thread first = new Thread(() -> upload.drain(NOW));
        first.start();
        assertTrue(entered.await(2, TimeUnit.SECONDS));
        upload.drain(NOW);
        assertEquals(1, http.calls.size());
        release.countDown();
        first.join(2_000);
        assertEquals(1, max.get());
        upload.drain(NOW);
        assertEquals(2, http.calls.size());
    }

    @Test
    public void suspendDropsTheOpenPostAndKeepsTheFamilyGrant() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        ScriptedHttp http = new ScriptedHttp(204);
        http.gate = () -> {
            entered.countDown();
            release.await();
        };
        DriverLocationUpload upload = armed(http, new ScriptAuth());
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        Thread worker = new Thread(() -> upload.drain(NOW));
        worker.start();
        assertTrue(entered.await(2, TimeUnit.SECONDS));
        upload.suspend();
        DriverLocationOwnership.release("stopped");
        release.countDown();
        worker.join(2_000L);
        assertEquals(1, http.calls.size());
        assertEquals(0, upload.sent());
        assertEquals(0, upload.queued());
        assertTrue(upload.armed());
        assertEquals("family-test", upload.grantedFamily());
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        DriverLocationOwnership.webViewEndSend();
        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-test"));
        assertFalse(DriverLocationOwnership.webViewBeginSend());
        assertTrue(upload.offer(sample(NOW - 500L, "gps"), NOW));
        upload.drain(NOW);
        assertEquals(2, http.calls.size());
        assertEquals(1, upload.sent());
        assertFalse(http.calls.get(1).body.contains(String.valueOf(NOW - 1_000L)));
    }

    @Test
    public void failedOrInterruptedUploadReleasesTheInFlightLease() {
        VaultHttp http = (url, json, headers) -> {
            if (url.contains("tvde-api-fd2z.onrender.com")) {
                throw new IllegalStateException("prod_refused");
            }
            Thread.currentThread().interrupt();
            throw new IllegalStateException("cancelled");
        };
        DriverLocationOwnership.resetForProcessStart();
        DriverLocationUpload upload = new DriverLocationUpload();
        assertTrue(upload.arm(LOOPBACK, http, new ScriptAuth()));
        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-test"));
        assertTrue(upload.offer(sample(NOW - 1_000L, "fused"), NOW));
        upload.drain(NOW);
        Thread.interrupted();
        assertTrue(DriverLocationOwnership.beginNativePost());
        DriverLocationOwnership.endNativePost();
        assertFalse(DriverLocationOwnership.webViewBeginSend());
    }

    private static boolean vaultKeepsTheSessionWhenRefreshFails() throws Exception {
        MemoryStore store = new MemoryStore();
        SessionVault vault = new SessionVault(cipher(), store);
        ScriptedHttp http = new ScriptedHttp(500);
        AndroidRefreshCoordinator coordinator = new AndroidRefreshCoordinator(vault, http);
        coordinator.commit(STAGING, "access-native", "refresh-native", "family-native", null);
        VaultDriverLocationAuth auth = new VaultDriverLocationAuth(vault, coordinator);
        assertEquals("access-native", auth.accessToken());
        DriverLocationAuth.Refresh refresh = auth.refresh(STAGING);
        assertEquals(DriverLocationAuth.Refresh.Kind.TRANSIENT, refresh.kind);
        assertEquals("family-native", vault.read().orElseThrow().familyId());
        assertTrue(http.calls.get(0).url.endsWith("/auth/refresh"));
        assertFalse(http.calls.get(0).url.contains("tvde-api-fd2z.onrender.com"));
        return true;
    }

        private static DriverLocationUpload armed(ScriptedHttp http, DriverLocationAuth auth) {
        DriverLocationOwnership.resetForProcessStart();
        DriverLocationUpload upload = new DriverLocationUpload();
        assertTrue(upload.arm(LOOPBACK, http, auth));
        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-test"));
        return upload;
    }

    private static DriverLocationSample sample(long fixTimeMillis, String origin) {
        return new DriverLocationSample(fixTimeMillis, LATITUDE, LONGITUDE, true, 5d, origin, false);
    }

    private static long timestamp(RecordedCall call) {
        int marker = call.body.indexOf("\"timestamp\":");
        String tail = call.body.substring(marker + "\"timestamp\":".length());
        int end = 0;
        while (end < tail.length() && (Character.isDigit(tail.charAt(end)) || tail.charAt(end) == '-')) {
            end++;
        }
        return Long.parseLong(tail.substring(0, end));
    }

    private static AesGcmCipher cipher() throws GeneralSecurityException {
        KeyGenerator generator = KeyGenerator.getInstance("AES");
        generator.init(256);
        return new AesGcmCipher(new FixedKey(generator.generateKey()));
    }

    private static final class ScriptAuth implements DriverLocationAuth {
        private String token = "access-old";
        private String family = "family-test";
        private boolean changeFamilyOnRefresh;
        private DriverLocationAuth.Refresh.Kind refreshKind = DriverLocationAuth.Refresh.Kind.SUCCESS;

        @Override
        public String accessToken() {
            return token;
        }

        @Override
        public String sessionFamily() {
            return family;
        }

        @Override
        public Refresh refresh(String apiBase) {
            if (changeFamilyOnRefresh) {
                family = "other-family";
            }
            if (refreshKind == Refresh.Kind.SUCCESS) {
                token = "access-new";
                return Refresh.success(token);
            }
            if (refreshKind == Refresh.Kind.INVALID) {
                return Refresh.invalid();
            }
            return Refresh.transientFailure();
        }
    }

    private static final class ScriptedHttp implements VaultHttp {
        private final int[] statuses;
        private int index;
        private Gate gate;
        private final List<RecordedCall> calls = new ArrayList<>();

        private ScriptedHttp(int... statuses) {
            this.statuses = statuses;
        }

        @Override
        public Result post(String url, String json, Map<String, String> headers) {
            if (url.contains("tvde-api-fd2z.onrender.com")) {
                throw new IllegalStateException("prod_refused");
            }
            int status = statuses[Math.min(index, statuses.length - 1)];
            index++;
            calls.add(new RecordedCall(url, json, Map.copyOf(headers)));
            if (gate != null) {
                try {
                    gate.enter();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    return new Result(0, "");
                }
            }
            return new Result(status, "");
        }
    }

    private interface Gate {
        void enter() throws InterruptedException;
    }

    private static final class RecordedCall {
        private final String url;
        private final String body;
        private final Map<String, String> headers;

        private RecordedCall(String url, String body, Map<String, String> headers) {
            this.url = url;
            this.body = body;
            this.headers = headers;
        }
    }

    private static final class MemoryStore implements VaultStore {
        private byte[] blob;

        @Override
        public byte[] read() {
            return blob;
        }

        @Override
        public void write(byte[] blob) {
            this.blob = blob;
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
