package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

/** Um true já enfileirado não volta a arrancar depois da mudança de sessão. */
public class DriverLocationCommandsTest {

    private final List<Runnable> queued = new ArrayList<>();
    private final AtomicInteger starts = new AtomicInteger();

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
                // A paragem é o resultado esperado. O contador de arranques é que não pode subir.
            }
        });
        DriverLocationHost.attach(new android.content.ContextWrapper(null) {});
        DriverLocationHost.resumed();
        DriverLocationCommands.setPosterForTests(queued::add);
    }

    @After
    public void cleanup() {
        DriverLocationHost.resetForTests();
    }

    @Test
    public void queuedTrueBeforeSessionChangeDoesNotStart() {
        DriverLocationCommands.setNeeded(true);
        assertEquals(1, queued.size());
        assertFalse(DriverLocationHost.needed());
        assertEquals(0, starts.get());

        DriverLocationCommands.sessionChanged();
        assertFalse(DriverLocationHost.needed());

        for (Runnable command : queued) {
            command.run();
        }
        assertFalse(DriverLocationHost.needed());
        assertEquals(0, starts.get());
        assertFalse(DriverLocationService.launchRequested());

        queued.clear();
        DriverLocationCommands.setNeeded(true);
        assertEquals(1, queued.size());
        queued.get(0).run();
        assertTrue(DriverLocationHost.needed());
        assertEquals(1, starts.get());

        queued.clear();
        DriverLocationCommands.setNeeded(true);
        DriverLocationCommands.sessionChanged();
        queued.get(0).run();
        assertFalse(DriverLocationHost.needed());
        assertEquals(1, starts.get());
    }

    @Test
    public void aFreshTrueWithoutAFamilyDoesNotStart() {
        DriverLocationHost.setFamilyCheckForTests(() -> false);
        DriverLocationCommands.setNeeded(true);
        queued.get(0).run();
        assertTrue(DriverLocationHost.needed());
        assertEquals(0, starts.get());
        assertFalse(DriverLocationService.launchRequested());
    }
}
