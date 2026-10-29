package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.app.UiAutomation;
import android.content.Context;
import android.os.Build;
import android.webkit.JavascriptInterface;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BooleanSupplier;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import pt.vamula.app.vault.VaultHttp;

/**
 * WebView real e serviço real no mesmo processo. O HTTP é simulado e conta
 * WebView e nativo à parte. Não abre STAGING nem PROD.
 */
@RunWith(AndroidJUnit4.class)
public class GpsOwnershipProofTest {

    private static final long SLOW_MILLIS = DriverLocationOwnership.OPEN_SEND_BOUND_MILLIS + 1_000L;

    private ActivityScenario<DriverLocationProofActivity> scenario;
    private ProofBridge bridge;
    private SlowHttp http;
    private UiAutomation automation;

    @Before
    public void openWebView() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_FINE_LOCATION);
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_COARSE_LOCATION);
        DriverLocationCollector.deliverFixes = false;
        DriverLocationOwnership.resetForProcessStart();
        DriverLocationService.clearTrail();
        bridge = new ProofBridge();
        http = new SlowHttp(bridge);
        scenario = ActivityScenario.launch(DriverLocationProofActivity.class);
        scenario.onActivity(activity -> activity.install(bridge));
        boolean ready = false;
        DriverLocationProofActivity[] holder = new DriverLocationProofActivity[1];
        scenario.onActivity(activity -> holder[0] = activity);
        if (holder[0] != null) {
            ready = holder[0].awaitReady(8_000L);
        }
        assertTrue(ready);
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
    }

    @After
    public void closeWebView() {
        if (scenario != null) {
            try {
                scenario.onActivity(activity -> activity.stopService(new android.content.Intent(activity, DriverLocationService.class)));
            } catch (RuntimeException ignored) {
                // A activity pode já ter fechado.
            }
            scenario.close();
        }
        if (bridge != null) {
            bridge.shutdown();
        }
        DriverLocationCollector.deliverFixes = true;
        DriverLocationOwnership.resetForProcessStart();
        DriverLocationService.clearTrail();
    }

    @Test
    public void webViewSendsUntilNativeIsStartedExplicitly() throws Exception {
        assertEquals("started", eval("sendFix(0)"));
        await(() -> bridge.webViewPosts.get() == 1 && bridge.active.get() == 0, 8_000L);
        assertEquals(0, bridge.nativePosts.get());
        assertEquals(1, bridge.max.get());
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
    }

    @Test
    public void explicitNativeStartBlocksNewWebViewPostsAndStopGivesTheWebViewBack() throws Exception {
        assertEquals("started", eval("sendFix(0)"));
        await(() -> bridge.webViewPosts.get() == 1 && bridge.active.get() == 0, 8_000L);
        armAndStart();
        offerFix(1);
        await(() -> bridge.nativePosts.get() == 1 && DriverLocationOwnership.nativeOwnsUpload(), 8_000L);
        assertEquals("blocked", eval("sendFix(0)"));
        assertEquals(1, bridge.webViewPosts.get());
        assertEquals(1, bridge.max.get());

        scenario.onActivity(activity -> activity.stopService(new android.content.Intent(activity, DriverLocationService.class)));
        await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED && !DriverLocationOwnership.nativeOwnsUpload(), 8_000L);
        assertEquals("started", eval("sendFix(0)"));
        await(() -> bridge.webViewPosts.get() == 2 && bridge.active.get() == 0, 8_000L);
        assertEquals(1, bridge.nativePosts.get());
        assertEquals(1, bridge.max.get());
    }

    @Test
    public void slowWebViewPastTheLeaseDoesNotRunBesideNative() throws Exception {
        assertEquals("started", eval("sendFix(" + SLOW_MILLIS + ")"));
        await(() -> bridge.webViewPosts.get() == 1, 8_000L);
        assertEquals("blocked", eval("sendFix(0)"));
        armAndStart();
        offerFix(2);
        await(() -> bridge.nativePosts.get() == 1 && bridge.active.get() == 0, SLOW_MILLIS + 20_000L);
        assertTrue(bridge.nativeEnteredAt >= bridge.webViewLeftAt);
        assertEquals(1, bridge.webViewPosts.get());
        assertEquals(1, bridge.nativePosts.get());
        assertEquals(1, bridge.max.get());
        assertFalse(http.sawRemote);
    }

    @Test
    public void slowNativePastTheLeaseDoesNotRunBesideTheWebView() throws Exception {
        http.holdMillis = SLOW_MILLIS;
        armAndStart();
        offerFix(3);
        await(() -> bridge.nativePosts.get() == 1, 8_000L);
        DriverLocationService.onCollectionEnded("permission_lost");
        CountDownLatch evalDone = new CountDownLatch(1);
        scenario.onActivity(activity -> activity.eval("sendFix(0)", value -> evalDone.countDown()));
        await(() -> bridge.webViewPosts.get() == 1 && bridge.active.get() == 0, SLOW_MILLIS + 20_000L);
        assertTrue(evalDone.await(5, TimeUnit.SECONDS));
        assertTrue(bridge.webViewEnteredAt >= bridge.nativeLeftAt);
        assertEquals(1, bridge.nativePosts.get());
        assertEquals(1, bridge.max.get());
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertFalse(http.sawRemote);
    }

    @Test
    public void sessionChangeAndStartFailureLeaveTheWebViewAbleToSend() throws Exception {
        armAndStart();
        offerFix(4);
        await(() -> bridge.nativePosts.get() == 1 && DriverLocationOwnership.nativeOwnsUpload(), 8_000L);
        assertEquals("changed", eval("changed()"));
        await(() -> !DriverLocationOwnership.nativeOwnsUpload() && !DriverLocationService.uploadArmed(), 8_000L);
        assertEquals("session", DriverLocationOwnership.lastRelease());
        assertEquals("started", eval("sendFix(0)"));
        await(() -> bridge.webViewPosts.get() == 1 && bridge.active.get() == 0, 8_000L);
        offerFix(5);
        Thread.sleep(400L);
        assertEquals(1, bridge.nativePosts.get());

        scenario.onActivity(activity -> activity.stopService(new android.content.Intent(activity, DriverLocationService.class)));
        await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED, 8_000L);
        DriverLocationOwnership.resetForProcessStart();
        bridge.resetCounts();
        assertEquals("started", eval("sendFix(1500)"));
        await(() -> bridge.webViewPosts.get() == 1, 8_000L);
        scenario.onActivity(activity -> {
            android.content.Intent start = new android.content.Intent(activity, DriverLocationService.class);
            start.putExtra(DriverLocationService.EXTRA_FAIL_START, true);
            activity.startService(start);
        });
        await(
            () -> DriverLocationService.trail().contains(DriverLocationPhase.ERROR) && DriverLocationService.phase() == DriverLocationPhase.STOPPED,
            8_000L
        );
        await(() -> bridge.webViewPosts.get() == 1 && bridge.active.get() == 0, 8_000L);
        assertEquals(0, bridge.nativePosts.get());
        assertEquals("started", eval("sendFix(0)"));
        await(() -> bridge.webViewPosts.get() == 2 && bridge.active.get() == 0, 8_000L);
        assertEquals(1, bridge.max.get());
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
    }

    private void armAndStart() throws InterruptedException {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue(DriverLocationService.armUpload(context, "http://127.0.0.1:9", http, new FixedAuth()));
        scenario.onActivity(activity -> {
            android.content.Intent start = new android.content.Intent(activity, DriverLocationService.class);
            if (Build.VERSION.SDK_INT >= 26) {
                activity.startForegroundService(start);
            } else {
                activity.startService(start);
            }
        });
        await(() -> DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL && DriverLocationService.listening(), 8_000L);
    }

    private void offerFix(int step) {
        long now = System.currentTimeMillis();
        DriverLocationService.onAcceptedFix(
            new DriverLocationSample(now - 500L, 0.1d + step, 0.1d, true, 5d, "fused", false),
            now
        );
    }

    private String eval(String script) throws InterruptedException {
        CountDownLatch done = new CountDownLatch(1);
        String[] value = new String[1];
        scenario.onActivity(activity -> activity.eval(script, result -> {
            value[0] = result;
            done.countDown();
        }));
        assertTrue(done.await(8, TimeUnit.SECONDS));
        if (value[0] == null) {
            return "";
        }
        String text = value[0];
        if (text.length() >= 2 && text.charAt(0) == '"' && text.charAt(text.length() - 1) == '"') {
            return text.substring(1, text.length() - 1);
        }
        return text;
    }

    private void await(BooleanSupplier condition, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (condition.getAsBoolean()) {
                return;
            }
            Thread.sleep(40L);
        }
        throw new AssertionError(
            "timeout webview=" + bridge.webViewPosts.get()
                + " native=" + bridge.nativePosts.get()
                + " active=" + bridge.active.get()
                + " max=" + bridge.max.get()
                + " owns=" + DriverLocationOwnership.nativeOwnsUpload()
                + " phase=" + DriverLocationService.phase().wire()
                + " listening=" + DriverLocationService.listening()
                + " armed=" + DriverLocationService.uploadArmed()
        );
    }

    public static final class ProofBridge {
        final AtomicInteger active = new AtomicInteger();
        final AtomicInteger max = new AtomicInteger();
        final AtomicInteger webViewPosts = new AtomicInteger();
        final AtomicInteger nativePosts = new AtomicInteger();
        volatile long webViewEnteredAt;
        volatile long webViewLeftAt;
        volatile long nativeEnteredAt;
        volatile long nativeLeftAt;
        private final java.util.concurrent.ExecutorService worker = java.util.concurrent.Executors.newCachedThreadPool(runnable -> {
            Thread thread = new Thread(runnable, "vamula-gps-proof");
            thread.setDaemon(true);
            return thread;
        });

        @JavascriptInterface
        public void startWebViewHttp(int delayMs) {
            int delay = Math.max(0, delayMs);
            worker.execute(() -> {
                enter("webview");
                try {
                    if (delay > 0) {
                        Thread.sleep(delay);
                    }
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                } finally {
                    leave("webview");
                    DriverLocationOwnership.webViewEndSend();
                }
            });
        }

        void enter(String side) {
            int now = active.incrementAndGet();
            max.accumulateAndGet(now, Math::max);
            long at = System.currentTimeMillis();
            if ("webview".equals(side)) {
                webViewPosts.incrementAndGet();
                webViewEnteredAt = at;
            } else {
                nativePosts.incrementAndGet();
                nativeEnteredAt = at;
            }
        }

        void leave(String side) {
            long at = System.currentTimeMillis();
            if ("webview".equals(side)) {
                webViewLeftAt = at;
            } else {
                nativeLeftAt = at;
            }
            active.decrementAndGet();
        }

        void shutdown() {
            worker.shutdownNow();
            try {
                worker.awaitTermination(2L, TimeUnit.SECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
        }

        void resetCounts() {
            webViewPosts.set(0);
            nativePosts.set(0);
            max.set(0);
            webViewEnteredAt = 0L;
            webViewLeftAt = 0L;
            nativeEnteredAt = 0L;
            nativeLeftAt = 0L;
        }
    }

    private static final class SlowHttp implements VaultHttp {
        private final ProofBridge bridge;
        private volatile long holdMillis;
        private volatile boolean sawRemote;

        private SlowHttp(ProofBridge bridge) {
            this.bridge = bridge;
        }

        @Override
        public Result post(String url, String json, Map<String, String> headers) {
            if (url.contains("onrender.com") || url.contains("tvde-api")) {
                sawRemote = true;
                throw new IllegalStateException("remote_refused");
            }
            bridge.enter("native");
            try {
                long hold = holdMillis;
                if (hold > 0L) {
                    Thread.sleep(hold);
                }
                return new Result(204, "");
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return new Result(0, "");
            } finally {
                bridge.leave("native");
            }
        }
    }

    private static final class FixedAuth implements DriverLocationAuth {
        @Override
        public String accessToken() {
            return "vault-test-access";
        }

        @Override
        public String sessionFamily() {
            return "debug-session";
        }

        @Override
        public Refresh refresh(String apiBase) {
            return Refresh.transientFailure();
        }
    }
}
