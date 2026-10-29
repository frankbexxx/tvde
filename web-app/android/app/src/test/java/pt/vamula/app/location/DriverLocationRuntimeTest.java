package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.Test;

/** Estados, regras de API e manifesto. Não arranca o serviço. */
public class DriverLocationRuntimeTest {

    @Test
    public void startsStoppedAndReachesOperationalThenCleansUp() {
        DriverLocationRuntime runtime = new DriverLocationRuntime();
        assertEquals(DriverLocationPhase.STOPPED, runtime.phase());
        assertEquals(DriverLocationPhase.STARTING, runtime.beginStart());
        assertEquals(DriverLocationPhase.OPERATIONAL, runtime.markOperational());
        assertEquals(DriverLocationPhase.STOPPED, runtime.stop());
        assertEquals(DriverLocationPhase.STOPPED, runtime.stop());
        assertEquals(
            List.of(DriverLocationPhase.STARTING, DriverLocationPhase.OPERATIONAL, DriverLocationPhase.STOPPED),
            runtime.trail()
        );
    }

    @Test
    public void failureFromStartOrFromOperationalIsVisibleUntilCleanup() {
        DriverLocationRuntime starting = new DriverLocationRuntime();
        starting.beginStart();
        assertEquals(DriverLocationPhase.ERROR, starting.fail());
        assertEquals(DriverLocationPhase.STARTING, starting.beginStart());

        DriverLocationRuntime running = new DriverLocationRuntime();
        running.beginStart();
        running.markOperational();
        assertEquals(DriverLocationPhase.ERROR, running.fail());
        assertEquals(DriverLocationPhase.STOPPED, running.stop());
    }

    @Test
    public void rejectsSkippingTheStartAndASecondStartWhileOperational() {
        DriverLocationRuntime runtime = new DriverLocationRuntime();
        assertThrows(IllegalStateException.class, runtime::markOperational);
        assertThrows(IllegalStateException.class, runtime::fail);
        runtime.beginStart();
        assertThrows(IllegalStateException.class, runtime::beginStart);
        runtime.markOperational();
        assertThrows(IllegalStateException.class, runtime::beginStart);
        assertThrows(IllegalStateException.class, runtime::markOperational);
    }

    @Test
    public void stopIsIdempotentFromEveryPhase() {
        DriverLocationRuntime runtime = new DriverLocationRuntime();
        assertEquals(DriverLocationPhase.STOPPED, runtime.stop());
        runtime.beginStart();
        assertEquals(DriverLocationPhase.STOPPED, runtime.stop());
        runtime.beginStart();
        runtime.fail();
        assertEquals(DriverLocationPhase.STOPPED, runtime.stop());
    }

    @Test
    public void typedForegroundStartIsOptionalFromApi29AndMandatoryFromApi34() {
        assertFalse(DriverLocationPlatform.useTypedStartForeground(24));
        assertFalse(DriverLocationPlatform.useTypedStartForeground(28));
        assertTrue(DriverLocationPlatform.useTypedStartForeground(29));
        assertTrue(DriverLocationPlatform.useTypedStartForeground(33));
        assertTrue(DriverLocationPlatform.typedStartIsMandatory(34));
        assertTrue(DriverLocationPlatform.typedStartIsMandatory(36));
        assertFalse(DriverLocationPlatform.typedStartIsMandatory(33));
        assertTrue(DriverLocationPlatform.useTypedStartForeground(36));
    }

    @Test
    public void manifestDeclaresTheLocationServiceWithoutBackgroundStartOrBackgroundLocation() throws Exception {
        String manifest = read(moduleFile("src/main/AndroidManifest.xml"));
        assertTrue(manifest.contains("android.permission.FOREGROUND_SERVICE\""));
        assertTrue(manifest.contains("android.permission.FOREGROUND_SERVICE_LOCATION"));
        assertTrue(manifest.contains("android:name=\".location.DriverLocationService\""));
        assertTrue(manifest.contains("android:exported=\"false\""));
        assertTrue(manifest.contains("android:foregroundServiceType=\"location\""));
        assertFalse(manifest.contains("ACCESS_BACKGROUND_LOCATION"));
        assertFalse(manifest.contains("RECEIVE_BOOT_COMPLETED"));
        int serviceAt = manifest.indexOf(".location.DriverLocationService");
        int serviceEnd = manifest.indexOf("/>", serviceAt);
        assertTrue(serviceAt > 0 && serviceEnd > serviceAt);
        assertFalse(manifest.substring(serviceAt, serviceEnd).contains("intent-filter"));
        String activity = read(moduleFile("src/main/java/pt/vamula/app/MainActivity.java"));
        assertFalse(activity.contains("DriverLocationService"));
        assertFalse(activity.contains("startForegroundService"));
        assertTrue(activity.contains("vamulaGps"));
        assertTrue(activity.contains("DriverLocationHost"));
        String ownership = read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationOwnership.java"));
        assertFalse(ownership.contains("SharedPreferences"));
        assertFalse(ownership.contains("DataStore"));
        assertFalse(ownership.contains("HttpURLConnection"));
        assertTrue(ownership.contains("OPEN_SEND_BOUND_MILLIS"));
        assertFalse(manifest.contains("DriverLocationProofActivity"));
        String debugManifest = read(moduleFile("src/debug/AndroidManifest.xml"));
        assertTrue(debugManifest.contains("DriverLocationProofActivity"));
        String service = read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationService.java"));
        String collector = read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationCollector.java"));
        String upload = read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationUpload.java"));
        assertTrue(collector.contains("FusedLocationProviderClient"));
        assertTrue(collector.contains("removeLocationUpdates"));
        assertTrue(service.contains("collector.start"));
        assertTrue(upload.contains("X-Gps-Contract"));
        assertTrue(upload.contains("fix-v1"));
        assertFalse(service.contains("SessionVault"));
        assertFalse(service.contains("HttpURLConnection"));
        assertFalse(upload.contains("HttpURLConnection"));
        assertFalse(upload.contains("vault.clear"));
        assertFalse(collector.contains("HttpURLConnection"));
        assertFalse(collector.contains("/drivers/location"));
        assertFalse(collector.contains("SessionVault"));
        assertTrue(service.contains("START_NOT_STICKY"));
        String sources = service + collector + upload
            + read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationSession.java"))
            + read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationDecision.java"));
        assertFalse(sources.contains("38.6973"));
        assertFalse(sources.contains("-9.30836"));
        for (String line : sources.split("\n")) {
            if (line.contains("Log.")) {
                assertFalse(line, line.contains("getLatitude") || line.contains("getLongitude") || line.contains("latitude") || line.contains("longitude"));
            }
        }
    }

    private static String read(Path path) throws Exception {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }

    private static Path moduleFile(String relative) {
        Path direct = Path.of(relative);
        if (Files.exists(direct)) {
            return direct;
        }
        Path nested = Path.of("app").resolve(relative);
        if (Files.exists(nested)) {
            return nested;
        }
        throw new IllegalStateException("missing " + relative);
    }
}
