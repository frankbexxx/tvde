package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.UiAutomation;
import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.ParcelFileDescriptor;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BooleanSupplier;
import pt.vamula.app.vault.VaultHttp;
import org.junit.After;
import org.junit.Before;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;

/** Manifesto real, recolha explícita e transporte de teste. Não abre ligação de rede. */
@RunWith(AndroidJUnit4.class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class DriverLocationServiceTest {

    private ActivityScenario<DriverLocationHarnessActivity> scenario;
    private static UiAutomation automation;

    @Before
    public void openHarness() {
        // API 34+ recusa o tipo location sem a permissão de localização, mesmo sem recolha GPS.
        grantLocation();
        scenario = ActivityScenario.launch(DriverLocationHarnessActivity.class);
        DriverLocationService.clearTrail();
    }

    @After
    public void closeHarness() {
        if (scenario == null) {
            return;
        }
        try {
            scenario.onActivity(DriverLocationHarnessActivity::stopLocationService);
        } catch (RuntimeException ignored) {
            // A activity pode já ter sido fechada pelo cenário.
        }
        scenario.close();
    }

    @Test
    public void manifestHasLocationForegroundPermissionsAndDoesNotExportTheService() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PackageManager packages = context.getPackageManager();
        assertTrue(granted(packages, context, "android.permission.FOREGROUND_SERVICE"));
        assertTrue(granted(packages, context, "android.permission.FOREGROUND_SERVICE_LOCATION"));
        assertFalse(declared(packages, context, "android.permission.ACCESS_BACKGROUND_LOCATION"));

        ServiceInfo info = packages.getServiceInfo(new ComponentName(context, DriverLocationService.class), PackageManager.GET_META_DATA);
        assertFalse(info.exported);
        assertTrue((info.flags & ServiceInfo.FLAG_STOP_WITH_TASK) != 0);
        assertTrue((info.getForegroundServiceType() & ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION) != 0);
        assertFalse(serviceMessage(), isForeground());
        assertEquals(DriverLocationPhase.STOPPED, DriverLocationService.phase());
    }

    @Test
    public void explicitStartBecomesOperationalAndStopCleansUp() throws Exception {
        assertFalse(serviceMessage(), isForeground());

        scenario.onActivity(activity -> activity.startLocationService(false));
        await(() -> DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL, 8_000);
        assertEquals(
            DriverLocationService.lastFailure() + " " + DriverLocationService.trail(),
            List.of(DriverLocationPhase.STARTING, DriverLocationPhase.OPERATIONAL),
            DriverLocationService.trail()
        );
        assertTrue(serviceMessage(), isForeground());
        String notifications = shell("dumpsys notification --noredact");
        assertTrue(notificationExcerpt(notifications), notifications.contains("vamula_location") && notifications.contains("VAMULÁ"));

        scenario.onActivity(DriverLocationHarnessActivity::stopLocationService);
        await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED && !isForeground(), 8_000);
        assertEquals(DriverLocationPhase.STOPPED, DriverLocationService.phase());
        assertTrue(DriverLocationService.trail().contains(DriverLocationPhase.STOPPED));
        assertFalse(serviceMessage(), isForeground());
    }

    @Test
    public void simulatedStartFailureIsRecordedAndThenCleaned() throws Exception {
        scenario.onActivity(activity -> activity.startLocationService(true));
        await(
            () ->
                DriverLocationService.trail().contains(DriverLocationPhase.ERROR) &&
                DriverLocationService.phase() == DriverLocationPhase.STOPPED,
            8_000
        );
        List<DriverLocationPhase> trail = DriverLocationService.trail();
        assertTrue(trail.toString(), trail.contains(DriverLocationPhase.STARTING));
        assertTrue(trail.toString(), trail.contains(DriverLocationPhase.ERROR));
        assertTrue(trail.toString(), trail.contains(DriverLocationPhase.STOPPED));
        assertFalse(trail.toString(), trail.contains(DriverLocationPhase.OPERATIONAL));
        assertFalse(serviceMessage(), isForeground());
    }

    @Test
    public void collectsSimulatedFixThenStops() throws Exception {
        shell("logcat -c");
        assertEquals(0, DriverLocationService.acceptedFixes());
        assertFalse(DriverLocationService.listening());

        scenario.onActivity(activity -> activity.startLocationService(false));
        await(() -> DriverLocationService.listening(), 8_000);
        assertTrue(observation(), DriverLocationService.listening());
        Log.i(DriverLocationService.TAG, "collect-test ready");

        await(() -> DriverLocationService.acceptedFixes() >= 1, 35_000);
        String running = shell("logcat -d -s " + DriverLocationService.TAG + ":I");
        assertTrue(running, DriverLocationService.acceptedFixes() >= 1);
        long fixTime = DriverLocationService.lastFixTimeMillis();
        long age = DriverLocationService.lastAgeMillis();
        assertTrue(fixTime > 0L);
        assertTrue(age >= 0L && age <= DriverLocationCadence.MAX_PAST_MILLIS);
        assertFalse(DriverLocationService.lastOrigin().isEmpty());
        assertTrue(DriverLocationService.lastAccuracyMeters() >= 0d);
        Log.i(
            DriverLocationService.TAG,
            "collect-test fixes=" + DriverLocationService.acceptedFixes()
                + " time=" + fixTime
                + " accuracy=" + DriverLocationService.lastAccuracyMeters()
                + " origin=" + DriverLocationService.lastOrigin()
                + " ageMs=" + age
        );
        String notifications = shell("dumpsys notification --noredact");
        assertTrue(notificationExcerpt(notifications), notifications.contains("vamula_location") && notifications.contains("VAMULÁ"));
        assertFalse(running.contains("/drivers/location"));
        assertFalse(running.contains("38.722252"));
        assertFalse(running.contains("9.139184"));
        assertFalse(running.contains("38.730252"));
        assertFalse(running.contains("9.150184"));

        int accepted = DriverLocationService.acceptedFixes();
        scenario.onActivity(DriverLocationHarnessActivity::stopLocationService);
        await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED && !DriverLocationService.listening(), 8_000);
        assertFalse(DriverLocationService.listening());
        Log.i(DriverLocationService.TAG, "collect-test stopped");
        Thread.sleep(5_000);
        assertEquals(accepted, DriverLocationService.acceptedFixes());
        assertEquals(0, DriverLocationService.uploadedFixes());
        assertFalse(shell("logcat -d -s " + DriverLocationService.TAG + ":I").contains("/drivers/location"));
        String afterStop = shell("logcat -d -s " + DriverLocationService.TAG + ":I");
        assertFalse(afterStop.contains("38.740252"));
        assertFalse(afterStop.contains("9.160184"));
    }

    @Test
    public void uploadsQueuedFixesThroughTheTestTransport() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        RecordingHttp http = new RecordingHttp();
        assertTrue(DriverLocationService.armUpload(context, "http://127.0.0.1:9", http, new FixedAuth()));
        shell("logcat -c");
        scenario.onActivity(activity -> activity.startLocationService(false));
        await(() -> DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL && DriverLocationService.listening(), 8_000);
        Log.i(DriverLocationService.TAG, "upload-test ready");
        await(() -> http.size() >= 2, 50_000);
        Thread.sleep(1_000);
        assertEquals(1, http.maxConcurrent());
        List<RecordingHttp.Call> calls = http.snapshot();
        assertTrue(calls.size() >= 2);
        String running = shell("logcat -d -s " + DriverLocationService.TAG + ":I");
        long previous = 0L;
        for (RecordingHttp.Call call : calls) {
            assertEquals("http://127.0.0.1:9/drivers/location", call.url);
            assertEquals("fix-v1", call.headers.get(DriverLocationUpload.CONTRACT_HEADER));
            assertTrue(call.headers.get("Authorization").startsWith("Bearer "));
            long fixTime = timestamp(call.body);
            assertTrue(fixTime > previous);
            previous = fixTime;
            assertTrue(running.contains("fix accepted time=" + fixTime));
            assertFalse(call.body.contains("38.6973"));
            assertFalse(call.body.contains("-9.30836"));
            assertFalse(call.url.contains("tvde-api"));
            assertFalse(call.url.contains("onrender.com"));
        }
        assertFalse(running.contains("/drivers/location"));
        assertFalse(running.contains("vault-test-access"));
        assertFalse(running.contains("38.748252"));
        assertFalse(running.contains("9.171184"));
        assertFalse(running.contains("38.756252"));
        assertFalse(running.contains("9.181184"));
        int posted = http.size();
        int sent = DriverLocationService.uploadedFixes();
        scenario.onActivity(DriverLocationHarnessActivity::stopLocationService);
        await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED && !DriverLocationService.listening(), 8_000);
        Thread.sleep(5_000);
        assertEquals(posted, http.size());
        assertEquals(sent, DriverLocationService.uploadedFixes());
        assertFalse(DriverLocationService.uploadArmed());
    }

    private static String observation() {
        return "phase=" + DriverLocationService.phase().wire()
            + " listening=" + DriverLocationService.listening()
            + " fixes=" + DriverLocationService.acceptedFixes()
            + " failure=" + DriverLocationService.lastFailure();
    }

    private static void grantLocation() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_FINE_LOCATION);
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    private static boolean granted(PackageManager packages, Context context, String permission) {
        return packages.checkPermission(permission, context.getPackageName()) == PackageManager.PERMISSION_GRANTED;
    }

    private static boolean declared(PackageManager packages, Context context, String permission) {
        try {
            String[] requested = packages.getPackageInfo(context.getPackageName(), PackageManager.GET_PERMISSIONS).requestedPermissions;
            if (requested == null) {
                return false;
            }
            for (String item : requested) {
                if (permission.equals(item)) {
                    return true;
                }
            }
            return false;
        } catch (PackageManager.NameNotFoundException exception) {
            return false;
        }
    }

    @SuppressWarnings("deprecation")
    private static boolean isForeground() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ActivityManager manager = context.getSystemService(ActivityManager.class);
        if (manager == null) {
            return false;
        }
        for (ActivityManager.RunningServiceInfo info : manager.getRunningServices(32)) {
            if (DriverLocationService.class.getName().equals(info.service.getClassName())) {
                return info.foreground;
            }
        }
        return false;
    }

    private static String serviceMessage() {
        return "phase=" + DriverLocationService.phase().wire() + " trail=" + DriverLocationService.trail();
    }

    private static String notificationExcerpt(String dump) {
        StringBuilder excerpt = new StringBuilder();
        for (String line : dump.split("\n")) {
            if (line.contains("vamula") || line.contains("VAMUL")) {
                excerpt.append(line.trim()).append('\n');
            }
        }
        if (excerpt.length() == 0) {
            return "dumpsys sem VAMULÁ; activas=" + activeNotificationSummary();
        }
        return excerpt.toString();
    }

    private static String activeNotificationSummary() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return "sem gestor";
        }
        StringBuilder summary = new StringBuilder();
        summary.append("enabled=").append(manager.areNotificationsEnabled());
        for (StatusBarNotification item : manager.getActiveNotifications()) {
            Notification notification = item.getNotification();
            summary.append(" [id=").append(item.getId());
            summary.append(" channel=").append(notification.getChannelId());
            summary.append(" title=").append(notification.extras.getCharSequence(Notification.EXTRA_TITLE));
            summary.append(']');
        }
        return summary.toString();
    }

    private static String shell(String command) throws IOException {
        ParcelFileDescriptor descriptor = automation.executeShellCommand(command);
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

    private static void await(BooleanSupplier condition, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (condition.getAsBoolean()) {
                return;
            }
            Thread.sleep(50);
        }
    }

    private static long timestamp(String body) {
        int marker = body.indexOf("\"timestamp\":");
        String tail = body.substring(marker + "\"timestamp\":".length());
        int end = 0;
        while (end < tail.length() && (Character.isDigit(tail.charAt(end)) || tail.charAt(end) == '-')) {
            end++;
        }
        return Long.parseLong(tail.substring(0, end));
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

    private static final class RecordingHttp implements VaultHttp {
        private final List<Call> calls = new ArrayList<>();
        private final AtomicInteger active = new AtomicInteger();
        private final AtomicInteger max = new AtomicInteger();

        @Override
        public VaultHttp.Result post(String url, String json, Map<String, String> headers) {
            if (url.contains("onrender.com") || url.contains("tvde-api")) {
                throw new IllegalStateException("remote_refused");
            }
            int current = active.incrementAndGet();
            max.accumulateAndGet(current, Math::max);
            try {
                synchronized (calls) {
                    calls.add(new Call(url, json, Map.copyOf(headers)));
                }
                return new VaultHttp.Result(204, "");
            } finally {
                active.decrementAndGet();
            }
        }

        private int size() {
            synchronized (calls) {
                return calls.size();
            }
        }

        private int maxConcurrent() {
            return max.get();
        }

        private List<Call> snapshot() {
            synchronized (calls) {
                return List.copyOf(calls);
            }
        }

        private static final class Call {
            private final String url;
            private final String body;
            private final Map<String, String> headers;

            private Call(String url, String body, Map<String, String> headers) {
                this.url = url;
                this.body = body;
                this.headers = headers;
            }
        }
    }
}
