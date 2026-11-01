package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import pt.vamula.app.vault.VaultHttp;

/** Arranque único e gates. O serviço Android não é criado. */
public class DriverLocationHostTest {

    private final AtomicInteger starts = new AtomicInteger();
    private final AtomicInteger stops = new AtomicInteger();

    @Before
    public void reset() {
        DriverLocationHost.resetForTests();
        DriverLocationService.clearTrail();
        DriverLocationHost.setPermissionCheckForTests(context -> true);
        DriverLocationHost.setFamilyCheckForTests(() -> true);
        DriverLocationHost.setStarterForTests(new DriverLocationHost.Starter() {
            @Override
            public void start(android.content.Context context) {
                starts.incrementAndGet();
            }

            @Override
            public void stop(android.content.Context context) {
                stops.incrementAndGet();
            }
        });
        DriverLocationHost.attach(new android.content.ContextWrapper(null) {});
    }

    @After
    public void cleanup() {
        DriverLocationService.releaseForNewSession();
        DriverLocationHost.resetForTests();
    }

    @Test
    public void aHiddenAppDoesNotStartAndASecondSyncDoesNotStartAgain() {
        DriverLocationHost.setNeeded(true);
        assertFalse(DriverLocationService.launchRequested());
        DriverLocationHost.resumed();
        assertTrue(DriverLocationService.launchRequested());
        assertEquals(1, starts.get());
        assertTrue(DriverLocationService.shouldStayUp());
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        assertEquals(1, starts.get());
    }

    @Test
    public void droppingNeedClearsTheLaunch() {
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        assertTrue(DriverLocationService.launchRequested());
        DriverLocationHost.setNeeded(false);
        assertFalse(DriverLocationService.launchRequested());
        assertFalse(DriverLocationService.shouldStayUp());
        assertEquals(1, stops.get());
    }

    @Test
    public void emptyVaultDoesNotStart() {
        DriverLocationHost.setFamilyCheckForTests(() -> false);
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        assertEquals(0, starts.get());
        assertFalse(DriverLocationService.launchRequested());
        assertTrue(DriverLocationHost.needed());
    }

    @Test
    public void unreadableVaultDoesNotStart() {
        DriverLocationHost.setFamilyCheckForTests(() -> {
            throw new IllegalStateException("vault");
        });
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        assertEquals(0, starts.get());
        assertFalse(DriverLocationService.launchRequested());
    }

    @Test
    public void aValidFamilyKeepsTheExistingStart() {
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        assertEquals(1, starts.get());
        assertTrue(DriverLocationService.launchRequested());
    }

    @Test
    public void stoppingDoesNotReadTheVault() {
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        DriverLocationHost.setFamilyCheckForTests(() -> {
            throw new IllegalStateException("vault");
        });
        DriverLocationHost.setNeeded(false);
        assertFalse(DriverLocationHost.needed());
        assertEquals(1, stops.get());
        assertFalse(DriverLocationService.launchRequested());
    }

    @Test
    public void invalidVaultStopsCollectionAndDropsTheUpload() {
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        assertTrue(DriverLocationService.grantProduction(
            DriverLocationEndpoint.configured(),
            "family-a",
            new SilentHttp(),
            new FamilyAuth("family-a")
        ));
        assertTrue(DriverLocationService.uploadArmed());
        DriverLocationHost.setFamilyCheckForTests(() -> false);
        DriverLocationHost.resumed();
        assertEquals(1, starts.get());
        assertEquals(1, stops.get());
        assertFalse(DriverLocationService.launchRequested());
        assertFalse(DriverLocationService.uploadArmed());
    }

    @Test
    public void revokedPermissionBlocksAndReportsTheError() {
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        DriverLocationHost.setPermissionCheckForTests(context -> false);
        DriverLocationHost.setNeeded(true);
        assertEquals("permission", DriverLocationService.stopReason());
        assertFalse(DriverLocationService.shouldStayUp());
        assertFalse(DriverLocationService.launchRequested());
    }

    @Test
    public void concurrentNeedDoesNotRequestTwoLaunches() throws Exception {
        DriverLocationHost.resumed();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        Thread first = new Thread(() -> enter(ready, go));
        Thread second = new Thread(() -> enter(ready, go));
        first.start();
        second.start();
        assertTrue(ready.await(2, TimeUnit.SECONDS));
        go.countDown();
        first.join(2_000);
        second.join(2_000);
        assertEquals(1, starts.get());
    }

    @Test
    public void authorizationGapStopsWhilePausedAndDoesNotExtendPastFifteenSeconds() {
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        DriverLocationHost.paused();
        assertTrue(DriverLocationHost.needed());
        assertEquals(0, stops.get());
        AtomicReference<Runnable> posted = new AtomicReference<>();
        AtomicLong delay = new AtomicLong();
        DriverLocationHost.setGapSchedulerForTests(scheduler(posted, delay, new AtomicInteger()));
        DriverLocationHost.armAuthorizationGap(20_000L);
        assertEquals(15_000L, delay.get());
        assertTrue(DriverLocationHost.needed());
        posted.get().run();
        assertFalse(DriverLocationHost.needed());
        assertEquals(1, stops.get());
    }

    @Test
    public void clearingOrRearmingTheGapIgnoresThePreviousDeadline() {
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        AtomicReference<Runnable> posted = new AtomicReference<>();
        AtomicInteger cancels = new AtomicInteger();
        DriverLocationHost.setGapSchedulerForTests(scheduler(posted, new AtomicLong(), cancels));
        DriverLocationHost.armAuthorizationGap(15_000L);
        Runnable first = posted.get();
        DriverLocationHost.clearAuthorizationGap();
        assertEquals(1, cancels.get());
        first.run();
        assertTrue(DriverLocationHost.needed());
        assertEquals(0, stops.get());
        DriverLocationHost.armAuthorizationGap(5_000L);
        Runnable second = posted.get();
        DriverLocationHost.armAuthorizationGap(1_000L);
        second.run();
        assertTrue(DriverLocationHost.needed());
        posted.get().run();
        assertFalse(DriverLocationHost.needed());
        assertEquals(1, stops.get());
    }

    private static DriverLocationHost.GapScheduler scheduler(
        AtomicReference<Runnable> posted,
        AtomicLong delay,
        AtomicInteger cancels
    ) {
        return new DriverLocationHost.GapScheduler() {
            @Override
            public void schedule(Runnable task, long delayMs) {
                posted.set(task);
                delay.set(delayMs);
            }

            @Override
            public void cancel(Runnable task) {
                cancels.incrementAndGet();
            }
        };
    }

    private static final class SilentHttp implements VaultHttp {
        @Override
        public VaultHttp.Result post(String url, String json, Map<String, String> headers) {
            return new VaultHttp.Result(204, "");
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
        public DriverLocationAuth.Refresh refresh(String apiBase) {
            return DriverLocationAuth.Refresh.transientFailure();
        }
    }

    private static void enter(CountDownLatch ready, CountDownLatch go) {
        ready.countDown();
        try {
            assertTrue(go.await(2, TimeUnit.SECONDS));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return;
        }
        DriverLocationHost.setNeeded(true);
    }
}
