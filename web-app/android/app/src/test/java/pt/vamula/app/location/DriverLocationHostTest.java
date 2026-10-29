package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

/** Arranque único e gates. O serviço Android não é criado. */
public class DriverLocationHostTest {

    private final AtomicInteger starts = new AtomicInteger();
    private final AtomicInteger stops = new AtomicInteger();

    @Before
    public void reset() {
        DriverLocationHost.resetForTests();
        DriverLocationService.clearTrail();
        DriverLocationHost.setPermissionCheckForTests(context -> true);
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
