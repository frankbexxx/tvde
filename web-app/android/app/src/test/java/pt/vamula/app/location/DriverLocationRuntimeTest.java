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
        assertFalse(activity.contains("addJavascriptInterface"));
        assertTrue(activity.contains("GpsOwnershipJs.install"));
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

    @Test
    public void releaseSourcesKeepTheLabAndTheDebugGateApart() throws Exception {
        String activity = read(moduleFile("src/main/java/pt/vamula/app/MainActivity.java"));
        int flag = activity.indexOf("FLAG_DEBUGGABLE");
        int mixed = activity.indexOf("MIXED_CONTENT_ALWAYS_ALLOW");
        assertTrue(flag >= 0 && mixed > flag);
        assertTrue(activity.contains("GpsOwnershipJs.watchDocuments"));
        assertFalse(activity.contains("addJavascriptInterface"));
        assertFalse(activity.contains("DriverLocationService"));

        String service = read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationService.java"));
        int arm = service.indexOf("boolean armUpload");
        int grant = service.indexOf("boolean grantProduction");
        assertTrue(arm > 0 && grant > arm);
        assertTrue(service.substring(arm, grant).contains("FLAG_DEBUGGABLE"));
        assertTrue(service.substring(arm, grant).contains("isDebugSupplied"));
        String grantBody = service.substring(grant, service.indexOf("releaseForNewSession"));
        assertTrue(grantBody.contains("isReleaseDestination"));
        assertFalse(grantBody.contains("FLAG_DEBUGGABLE"));
        int failedStart = service.indexOf("simulated_start_failure");
        int destroy = service.indexOf("void onDestroy");
        assertTrue(failedStart > 0 && destroy > failedStart);
        assertFalse(service.substring(failedStart, destroy).contains("UPLOAD.stop()"));
        assertTrue(service.substring(destroy, service.indexOf("IBinder onBind")).contains("parkSender()"));
        assertTrue(service.contains("DriverLocationHost.needed()"));
        assertTrue(service.contains("FLAG_DEBUGGABLE"));
        assertFalse(service.contains("SessionVault"));

        String manifest = read(moduleFile("src/main/AndroidManifest.xml"));
        assertFalse(manifest.contains("networkSecurityConfig"));
        assertFalse(manifest.contains("usesCleartextTraffic"));
        assertFalse(manifest.contains("DriverLocationProofActivity"));
        assertFalse(manifest.contains("DriverLocationHarnessActivity"));
        assertFalse(manifest.contains("DashboardGpsProofTest"));
        assertFalse(manifest.contains("StagingGpsProofTest"));
        String debugManifest = read(moduleFile("src/debug/AndroidManifest.xml"));
        assertTrue(debugManifest.contains("DriverLocationProofActivity"));
        assertTrue(debugManifest.contains("DriverLocationHarnessActivity"));
        assertTrue(debugManifest.contains("debug_network_security"));

        String cleartext = read(moduleFile("src/debug/res/xml/debug_network_security.xml"));
        assertTrue(cleartext.contains("10.0.2.2"));
        assertTrue(cleartext.contains("cleartextTrafficPermitted=\"true\""));
        assertFalse(Files.exists(Path.of("app/src/main/res/xml/debug_network_security.xml")));
        assertFalse(Files.exists(Path.of("src/main/res/xml/debug_network_security.xml")));

        assertTrue(Files.exists(moduleFile("src/androidTest/java/pt/vamula/app/location/DashboardGpsProofTest.java")));
        assertTrue(Files.exists(moduleFile("src/androidTestDebug/java/pt/vamula/app/location/StagingGpsProofTest.java")));
        assertFalse(Files.exists(Path.of("src/androidTest/java/pt/vamula/app/location/StagingGpsProofTest.java")));
        assertFalse(Files.exists(Path.of("app/src/androidTest/java/pt/vamula/app/location/StagingGpsProofTest.java")));
        assertFalse(Files.exists(Path.of("src/main/java/pt/vamula/app/location/DashboardGpsProofTest.java")));
        assertFalse(Files.exists(Path.of("app/src/main/java/pt/vamula/app/location/DashboardGpsProofTest.java")));
        assertFalse(Files.exists(Path.of("src/main/java/pt/vamula/app/location/StagingGpsProofTest.java")));
        assertFalse(Files.exists(Path.of("app/src/main/java/pt/vamula/app/location/StagingGpsProofTest.java")));

        String gradle = read(appGradle());
        int types = gradle.indexOf("buildTypes");
        assertTrue(types > 0);
        String release = block(gradle.substring(types), "release");
        String proof = block(gradle.substring(types), "stagingProof");
        assertTrue(release.contains("tvde-api-fd2z.onrender.com"));
        assertFalse(release.contains("tvde-staging-api.onrender.com"));
        assertFalse(release.contains("debuggable"));
        assertTrue(proof.contains("tvde-staging-api.onrender.com"));
        assertFalse(proof.contains("tvde-api-fd2z.onrender.com"));
        assertTrue(proof.contains("debuggable true"));
        String proofManifest = read(moduleFile("src/stagingProof/AndroidManifest.xml"));
        assertFalse(proofManifest.contains("DriverLocationProofActivity"));
        assertFalse(proofManifest.contains("DriverLocationHarnessActivity"));
        assertTrue(proofManifest.contains("staging_proof_network_security"));
        String armament = read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationArmament.java"));
        assertTrue(armament.contains("DriverLocationTransport.create()"));
        assertFalse(armament.contains("new HttpUrlVaultHttp"));
        assertFalse(armament.contains("FLAG_DEBUGGABLE"));
        String releaseHook = read(moduleFile("src/release/java/pt/vamula/app/location/DriverLocationTransportHook.java"));
        assertFalse(releaseHook.contains("void use"));
        String proofHook = read(moduleFile("src/stagingProof/java/pt/vamula/app/location/DriverLocationTransportHook.java"));
        assertTrue(proofHook.contains("void use"));

        String ownership = read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationOwnership.java"));
        assertTrue(ownership.contains("abandonDocument"));
        assertTrue(ownership.contains("onWebViewGone"));
        assertFalse(ownership.contains("OPEN_SEND_BOUND_MILLIS -"));
        String upload = read(moduleFile("src/main/java/pt/vamula/app/location/DriverLocationUpload.java"));
        assertTrue(upload.contains("grantedFamily"));
        assertFalse(upload.contains("setInstanceFollowRedirects"));
        String http = read(moduleFile("src/main/java/pt/vamula/app/vault/HttpUrlVaultHttp.java"));
        assertTrue(http.contains("setInstanceFollowRedirects(false)"));
        String channel = read(moduleFile("src/main/java/pt/vamula/app/vault/VaultChannel.java"));
        int refresh = channel.indexOf("\"refresh\".equals(op)");
        int logout = channel.indexOf("\"logout\".equals(op)");
        assertTrue(refresh > 0 && logout > refresh);
        assertFalse(channel.substring(refresh, logout).contains("DriverLocationArmament"));
        assertTrue(channel.contains("onSessionCommitted"));
        assertTrue(channel.contains("onSessionRestored"));
        assertTrue(channel.contains("onSessionEnded"));
        String reporter = read(webFile("src/services/locationService.ts"));
        assertTrue(reporter.contains("finally"));
        assertTrue(reporter.contains("endWebViewLocationSend()"));
        assertFalse(reporter.contains("setTimeout"));
    }

    private static String block(String source, String name) {
        int start = source.indexOf(name + " {");
        if (start < 0) {
            throw new IllegalStateException("missing " + name);
        }
        int depth = 0;
        for (int index = start; index < source.length(); index++) {
            char symbol = source.charAt(index);
            if (symbol == '{') {
                depth++;
            } else if (symbol == '}') {
                depth--;
                if (depth == 0) {
                    return source.substring(start, index + 1);
                }
            }
        }
        throw new IllegalStateException("unclosed " + name);
    }

    private static Path appGradle() {
        if (Files.exists(Path.of("src/main/AndroidManifest.xml")) && Files.exists(Path.of("build.gradle"))) {
            return Path.of("build.gradle");
        }
        if (Files.exists(Path.of("app/build.gradle"))) {
            return Path.of("app/build.gradle");
        }
        return Path.of("android/app/build.gradle");
    }

    private static Path webFile(String relative) {
        Path fromAndroid = Path.of("..").resolve(relative);
        if (Files.exists(fromAndroid)) {
            return fromAndroid;
        }
        Path fromApp = Path.of("../..").resolve(relative);
        if (Files.exists(fromApp)) {
            return fromApp;
        }
        throw new IllegalStateException("missing " + relative);
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
