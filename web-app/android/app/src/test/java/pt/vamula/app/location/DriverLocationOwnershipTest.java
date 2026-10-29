package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Before;
import org.junit.Test;

/** Propriedade em memória. O HTTP destes testes não existe. */
public class DriverLocationOwnershipTest {

    @Before
    public void isolatedProcess() {
        DriverLocationOwnership.resetForProcessStart();
    }

    @Test
    public void webViewSendsUntilNativeIsOperationalAndAuthorized() {
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        DriverLocationOwnership.webViewEndSend();
        assertEquals(DriverLocationOwnership.WEBVIEW, DriverLocationOwnership.reconcile(false, true, true, "family-a"));
        assertEquals(DriverLocationOwnership.WEBVIEW, DriverLocationOwnership.reconcile(true, false, true, "family-a"));
        assertEquals(DriverLocationOwnership.WEBVIEW, DriverLocationOwnership.reconcile(true, true, false, "family-a"));
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        DriverLocationOwnership.webViewEndSend();
    }

    @Test
    public void nativeClaimBlocksNewWebViewSendsAndKeepsTheOneAlreadyStarted() throws Exception {
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        CountDownLatch claimed = new CountDownLatch(1);
        Thread handoff = new Thread(() -> {
            assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-a"));
            claimed.countDown();
            assertTrue(DriverLocationOwnership.awaitWebViewIdle(2_000L));
        });
        handoff.start();
        assertTrue(claimed.await(2, TimeUnit.SECONDS));
        assertFalse(DriverLocationOwnership.webViewBeginSend());
        assertFalse(DriverLocationOwnership.awaitWebViewIdle(40L));
        DriverLocationOwnership.webViewEndSend();
        handoff.join(2_000L);
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());
        assertTrue(DriverLocationOwnership.beginNativePost());
        DriverLocationOwnership.endNativePost();
        assertFalse(DriverLocationOwnership.webViewBeginSend());
    }

    @Test
    public void releasingNativeLetsWebViewSendAfterTheNativePostFinishes() throws Exception {
        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-a"));
        assertTrue(DriverLocationOwnership.beginNativePost());
        DriverLocationOwnership.release("permission");
        AtomicBoolean started = new AtomicBoolean(false);
        Thread webView = new Thread(() -> started.set(DriverLocationOwnership.webViewBeginSend()));
        webView.start();
        Thread.sleep(80L);
        assertFalse(started.get());
        DriverLocationOwnership.endNativePost();
        webView.join(2_000L);
        assertTrue(started.get());
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        DriverLocationOwnership.webViewEndSend();
        assertEquals("permission", DriverLocationOwnership.lastRelease());
    }

    @Test
    public void sessionChangeAndProcessDeathDropTheNativeLease() {
        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-a"));
        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-a"));
        assertEquals(DriverLocationOwnership.SESSION_CHANGED, DriverLocationOwnership.reconcile(true, true, true, "family-b"));
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        DriverLocationOwnership.webViewEndSend();

        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-b"));
        assertEquals(DriverLocationOwnership.SESSION_CHANGED, DriverLocationOwnership.reconcile(true, true, true, ""));
        assertEquals("session", DriverLocationOwnership.lastRelease());

        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-b"));
        DriverLocationOwnership.resetForProcessStart();
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        DriverLocationOwnership.webViewEndSend();
    }

    @Test
    public void ineligibleNativeReturnsTheLeaseWithoutAPermanentBlock() {
        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-a"));
        assertEquals(DriverLocationOwnership.WEBVIEW, DriverLocationOwnership.reconcile(true, true, false, "family-a"));
        assertEquals("ineligible", DriverLocationOwnership.lastRelease());
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        DriverLocationOwnership.webViewEndSend();
        DriverLocationOwnership.release("start_failed");
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        DriverLocationOwnership.webViewEndSend();
    }

    @Test
    public void openSendPastTheLeaseDoesNotAuthorizeTheOtherSide() throws Exception {
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        assertFalse(DriverLocationOwnership.webViewBeginSend());
        assertEquals(DriverLocationOwnership.NATIVE, DriverLocationOwnership.reconcile(true, true, true, "family-a"));
        Thread.sleep(DriverLocationOwnership.OPEN_SEND_BOUND_MILLIS + 250L);
        assertFalse(DriverLocationOwnership.beginNativePost());
        assertFalse(DriverLocationOwnership.awaitWebViewIdle(200L));
        DriverLocationOwnership.webViewEndSend();
        assertTrue(DriverLocationOwnership.awaitWebViewIdle(1_000L));
        assertTrue(DriverLocationOwnership.beginNativePost());

        DriverLocationOwnership.release("permission");
        CountDownLatch returned = new CountDownLatch(1);
        AtomicBoolean allowed = new AtomicBoolean(false);
        Thread webView = new Thread(() -> {
            allowed.set(DriverLocationOwnership.webViewBeginSend());
            returned.countDown();
        });
        webView.start();
        assertFalse(returned.await(400L, TimeUnit.MILLISECONDS));
        Thread.sleep(DriverLocationOwnership.OPEN_SEND_BOUND_MILLIS + 250L);
        assertFalse(returned.await(400L, TimeUnit.MILLISECONDS));
        DriverLocationOwnership.endNativePost();
        assertTrue(returned.await(2L, TimeUnit.SECONDS));
        assertTrue(allowed.get());
        DriverLocationOwnership.webViewEndSend();
        webView.join(1_000L);
    }
}
