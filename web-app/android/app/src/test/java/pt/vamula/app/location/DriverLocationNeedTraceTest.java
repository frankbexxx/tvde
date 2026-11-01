package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import pt.vamula.app.BuildConfig;

/** O diagnóstico observa. Não é um comando do serviço. */
public class DriverLocationNeedTraceTest {

    private static final Pattern LINE = Pattern.compile(
        "^time=1000 code=(token-absent|gap-expired|gap-expired-native|family-changed|availability-offline|availability-online|hydration-cleared|dashboard-unmount|ui-detached|legal-blocked|logout|session-changed|host-stop|bridge-failed)( needed=(true|false))?( tokenPresent=(true|false))?( hydrated=(true|false))?( offline=(true|false))?( syncing=(true|false))?$"
    );

    private final List<String> lines = new ArrayList<>();
    private final AtomicInteger stops = new AtomicInteger();

    @Before
    public void reset() {
        lines.clear();
        stops.set(0);
        DriverLocationHost.resetForTests();
        DriverLocationHost.setPermissionCheckForTests(context -> true);
        DriverLocationHost.setFamilyCheckForTests(() -> true);
        DriverLocationHost.setStarterForTests(new DriverLocationHost.Starter() {
            @Override
            public void start(android.content.Context context) {}

            @Override
            public void stop(android.content.Context context) {
                stops.incrementAndGet();
            }
        });
        DriverLocationHost.attach(new android.content.ContextWrapper(null) {});
        DriverLocationNeedTrace.setClockForTests(() -> 1000L);
        DriverLocationNeedTrace.setSinkForTests((tag, line) -> {
            assertEquals(DriverLocationNeedTrace.TAG, tag);
            lines.add(line);
        });
    }

    @After
    public void cleanup() {
        DriverLocationHost.resetForTests();
    }

    @Test
    public void debugAndReleaseStaySilent() {
        assertFalse(BuildConfig.GPS_NEED_TRACE);
        DriverLocationNeedTrace.record("token-absent", true, false, true, false, false);
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        DriverLocationCommands.sessionChanged();
        assertTrue(lines.isEmpty());
        assertFalse(DriverLocationHost.needed());
        assertEquals(1, stops.get());
    }

    @Test
    public void stagingGateLogsAClosedTransitionOnce() {
        DriverLocationNeedTrace.setEnabledForTests(true);
        DriverLocationNeedTrace.record("token-absent", true, false, true, false, false);
        DriverLocationNeedTrace.record("token-absent", true, false, true, false, false);
        DriverLocationNeedTrace.record("gap-expired", false, false, false, false, false);
        assertEquals(2, lines.size());
        assertTrue(LINE.matcher(lines.get(0)).matches());
        assertTrue(lines.get(0).contains("code=token-absent"));
        assertTrue(lines.get(0).contains("needed=true"));
        assertTrue(lines.get(0).contains("tokenPresent=false"));
        assertTrue(LINE.matcher(lines.get(1)).matches());
    }

    @Test
    public void unknownCodesAreDroppedWithoutEcho() {
        DriverLocationNeedTrace.setEnabledForTests(true);
        String secret = "eyJhbGciOiJIUzI1NiJ9.payload";
        DriverLocationNeedTrace.record(secret, true, true, true, false, false);
        DriverLocationNeedTrace.record("family-c3d425bb");
        DriverLocationNeedTrace.record("+351911111111");
        assertTrue(lines.isEmpty());
    }

    @Test
    public void loggingDoesNotStartOrStopTheService() {
        DriverLocationNeedTrace.setEnabledForTests(true);
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        assertTrue(DriverLocationHost.needed());
        assertEquals(0, stops.get());
        new GpsOwnershipJs().logGpsNeed("logout", false, false, false, false, false, false);
        new GpsOwnershipJs().logGpsNeed("token-absent", true, true, false, true, false, false);
        assertTrue(DriverLocationHost.needed());
        assertEquals(0, stops.get());
        assertEquals(2, lines.size());
        assertTrue(lines.get(0).startsWith("time=1000 code=logout"));
        assertFalse(lines.get(0).contains("needed="));
        assertTrue(LINE.matcher(lines.get(1)).matches());
    }

    @Test
    public void nativeGapAndHostStopAreSeparateTransitions() {
        DriverLocationNeedTrace.setEnabledForTests(true);
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        DriverLocationHost.paused();
        java.util.concurrent.atomic.AtomicReference<Runnable> posted = new java.util.concurrent.atomic.AtomicReference<>();
        DriverLocationHost.setGapSchedulerForTests(new DriverLocationHost.GapScheduler() {
            @Override
            public void schedule(Runnable task, long delayMs) {
                posted.set(task);
            }

            @Override
            public void cancel(Runnable task) {}
        });
        DriverLocationHost.armAuthorizationGap(15_000L);
        posted.get().run();
        assertFalse(DriverLocationHost.needed());
        assertEquals(1, stops.get());
        assertEquals(
            java.util.Arrays.asList(
                "time=1000 code=gap-expired-native needed=false",
                "time=1000 code=host-stop needed=false"
            ),
            lines
        );
        posted.set(null);
        DriverLocationHost.setNeeded(false);
        assertEquals(2, lines.size());
    }

    @Test
    public void bridgeFaultStaysSilentOutsideStagingAndDoesNotStop() {
        new GpsOwnershipJs().logGpsNeedBridgeFault();
        assertTrue(lines.isEmpty());
        DriverLocationNeedTrace.setEnabledForTests(true);
        DriverLocationHost.resumed();
        DriverLocationHost.setNeeded(true);
        new GpsOwnershipJs().logGpsNeedBridgeFault();
        new GpsOwnershipJs().logGpsNeedBridgeFault();
        assertEquals(1, lines.size());
        assertEquals("time=1000 code=bridge-failed", lines.get(0));
        assertTrue(LINE.matcher(lines.get(0)).matches());
        assertTrue(DriverLocationHost.needed());
        assertEquals(0, stops.get());
    }
}
