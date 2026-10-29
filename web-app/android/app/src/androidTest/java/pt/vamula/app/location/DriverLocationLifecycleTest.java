package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.app.UiAutomation;
import android.content.Context;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Arranque e paragem pela WebView. O upload não é armado e não há POST remoto. */
@RunWith(AndroidJUnit4.class)
public class DriverLocationLifecycleTest {

    private ActivityScenario<DriverLocationProofActivity> scenario;
    private UiAutomation automation;

    @Before
    public void open() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_FINE_LOCATION);
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_COARSE_LOCATION);
        DriverLocationHost.resetForTests();
        DriverLocationService.clearTrail();
        scenario = ActivityScenario.launch(DriverLocationProofActivity.class);
        scenario.onActivity(activity -> activity.install(new GpsOwnershipProofTest.ProofBridge()));
        DriverLocationProofActivity[] holder = new DriverLocationProofActivity[1];
        scenario.onActivity(activity -> holder[0] = activity);
        assertTrue(holder[0].awaitReady(8_000L));
    }

    @After
    public void close() {
        DriverLocationHost.setNeeded(false);
        if (scenario != null) {
            try {
                scenario.onActivity(activity -> activity.stopService(new android.content.Intent(activity, DriverLocationService.class)));
            } catch (RuntimeException ignored) {
                // A activity pode já ter fechado.
            }
            scenario.close();
        }
        DriverLocationHost.resetForTests();
        DriverLocationService.clearTrail();
    }

    @Test
    public void webViewNeedStartsAndStopsWithoutUploading() throws Exception {
        assertEquals("false", eval("String(vamulaGps.serviceSending())"));
        eval("vamulaGps.setServiceNeeded(true)");
        await(() -> DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL, 8_000L);
        assertEquals("true", eval("String(vamulaGps.serviceOperational())"));
        assertEquals("true", eval("String(vamulaGps.serviceNeeded())"));
        assertEquals("false", eval("String(vamulaGps.serviceSending())"));
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals(0, DriverLocationService.uploadedFixes());
        String notifications = shell("dumpsys notification --noredact");
        assertTrue(notifications.contains("vamula_location") && notifications.contains("VAMULÁ"));

        eval("vamulaGps.setServiceNeeded(true)");
        assertEquals(DriverLocationPhase.OPERATIONAL, DriverLocationService.phase());

        eval("vamulaGps.setServiceNeeded(false)");
        await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED, 8_000L);
        assertEquals("false", eval("String(vamulaGps.serviceOperational())"));
        assertEquals(0, DriverLocationService.uploadedFixes());

        eval("vamulaGps.setServiceNeeded(true)");
        await(() -> DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL, 8_000L);
        eval("vamulaGps.sessionChanged()");
        await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED && !DriverLocationHost.needed(), 8_000L);
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals(0, DriverLocationService.uploadedFixes());
        assertFalse(shell("logcat -d -s " + DriverLocationService.TAG + ":I").contains("onrender.com"));
    }

    @Test
    public void queuedNeedBeforeLogoutDoesNotRestart() throws Exception {
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            DriverLocationCommands.setNeeded(true);
            DriverLocationCommands.sessionChanged();
        });
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        assertFalse(DriverLocationHost.needed());
        assertEquals(DriverLocationPhase.STOPPED, DriverLocationService.phase());
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals(0, DriverLocationService.uploadedFixes());

        eval("vamulaGps.setServiceNeeded(true);vamulaGps.sessionChanged();");
        await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED && !DriverLocationHost.needed(), 8_000L);
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals(0, DriverLocationService.uploadedFixes());

        eval("vamulaGps.setServiceNeeded(true)");
        await(() -> DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL, 8_000L);
        eval("vamulaGps.sessionChanged()");
        await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED && !DriverLocationHost.needed(), 8_000L);
        assertEquals(0, DriverLocationService.uploadedFixes());
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

    private static void await(BooleanSupplier condition, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (condition.getAsBoolean()) {
                return;
            }
            Thread.sleep(40L);
        }
        throw new AssertionError("timeout phase=" + DriverLocationService.phase().wire() + " reason=" + DriverLocationService.stopReason());
    }

    private String shell(String command) throws IOException {
        android.os.ParcelFileDescriptor descriptor = automation.executeShellCommand(command);
        try (InputStream input = new FileInputStream(descriptor.getFileDescriptor())) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8);
        } finally {
            descriptor.close();
        }
    }
}
