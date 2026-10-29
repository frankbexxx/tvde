package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.app.UiAutomation;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.os.ParcelFileDescriptor;
import android.util.Base64;
import android.util.Log;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;
import pt.vamula.app.vault.AndroidRefreshCoordinator;
import pt.vamula.app.vault.HttpUrlVaultHttp;
import pt.vamula.app.vault.SessionRecord;
import pt.vamula.app.vault.SessionVault;
import pt.vamula.app.vault.SessionVaults;
import pt.vamula.app.vault.VaultApiBase;
import pt.vamula.app.vault.VaultHttp;

/**
 * Prova controlada contra STAGING. Não arranca a MainActivity e não regista segredos nem coordenadas.
 * O modo vem do argumento {@code mode}: probe ou send.
 */
@RunWith(AndroidJUnit4.class)
public class StagingGpsProofTest {

    private static final String TAG = "VAMULA_GPS_PROOF";
    private static final String API = "https://tvde-staging-api.onrender.com";
    private static final String LOCATION = API + "/drivers/location";
    private static final String SESSION_FILE = "/data/local/tmp/gps10c1-session.json";

    private ActivityScenario<DriverLocationHarnessActivity> scenario;
    private UiAutomation automation;
    private ProofHttp http;

    @After
    public void stopService() {
        if (scenario == null) {
            return;
        }
        try {
            scenario.onActivity(DriverLocationHarnessActivity::stopLocationService);
        } catch (RuntimeException ignored) {
            // A activity pode já ter sido fechada.
        }
        scenario.close();
    }

    @Test
    public void runRequestedMode() throws Exception {
        String mode = InstrumentationRegistry.getArguments().getString("mode", "probe");
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        boolean debuggable = (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        Log.i(TAG, "DEBUGGABLE=" + debuggable);
        Log.i(TAG, "ALLOWLIST=" + LOCATION.equals(VaultApiBase.endpoint(API, DriverLocationUpload.PATH)));
        assertEquals(LOCATION, VaultApiBase.endpoint(API, DriverLocationUpload.PATH));
        assertNull(VaultApiBase.endpoint("https://evil.example", DriverLocationUpload.PATH));
        automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        ExecutorService worker = Executors.newSingleThreadExecutor();
        try {
            Prepared prepared = worker.submit(() -> prepare(context, mode)).get(90, TimeUnit.SECONDS);
            Log.i(TAG, "EMPTY=" + prepared.empty);
            Log.i(TAG, "ROLE_OK=" + prepared.roleOk);
            Log.i(TAG, "TRIP_NONE=" + prepared.tripNone);
            Log.i(TAG, "IS_AVAILABLE=" + prepared.available);
            Log.i(TAG, "SESSION_PRESENT=" + prepared.sessionPresent);
            Log.i(TAG, "REFRESHED_BEFORE=" + prepared.refreshed);
            if (!"send".equals(mode)) {
                return;
            }
            if (!debuggable || !prepared.roleOk || !prepared.tripNone || !prepared.sessionPresent) {
                throw new IllegalStateException("precondition_failed");
            }
            automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_FINE_LOCATION);
            automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_COARSE_LOCATION);
            DriverLocationService.clearTrail();
            scenario = ActivityScenario.launch(DriverLocationHarnessActivity.class);
            scenario.onActivity(activity -> activity.startLocationService(false));
            await(() -> DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL && DriverLocationService.listening(), 8_000);
            assertFalse(DriverLocationService.uploadArmed());
            String activities = shell("dumpsys activity activities");
            boolean webViewResumed = false;
            for (String line : activities.split("\n")) {
                if (line.contains("mResumedActivity") && line.contains("MainActivity")) {
                    webViewResumed = true;
                }
            }
            Log.i(TAG, "WEBVIEW_RESUMED=" + webViewResumed);
            if (webViewResumed) {
                throw new IllegalStateException("precondition_webview");
            }
            http = new ProofHttp();
            assertFalse(DriverLocationService.armUpload(context, "https://evil.example", http, prepared.auth));
            assertEquals(0, http.calls.size());
            assertTrue(DriverLocationService.armUpload(context, API, http, prepared.auth));
            Log.i(TAG, "proof-ready");
            await(http::hasThree, 70_000);
            Thread.sleep(2_000);
            List<ProofHttp.Call> calls = http.snapshot();
            assertEquals(3, calls.size());
            assertEquals(1, http.max.get());
            long previous = 0L;
            String locationLog = shell("logcat -d -s " + DriverLocationService.TAG + ":I");
            for (ProofHttp.Call call : calls) {
                assertEquals(204, call.status);
                assertEquals(DriverLocationUpload.CONTRACT, call.contract);
                assertTrue(call.fixTime > previous);
                assertTrue(locationLog.contains("fix accepted time=" + call.fixTime));
                previous = call.fixTime;
                Log.i(TAG, DriverLocationUpload.diagnostic(call.status, call.fixTime));
            }
            assertEquals(3, DriverLocationService.uploadedFixes());
            int posted = calls.size();
            scenario.onActivity(DriverLocationHarnessActivity::stopLocationService);
            await(() -> DriverLocationService.phase() == DriverLocationPhase.STOPPED && !DriverLocationService.listening(), 8_000);
            Thread.sleep(8_000);
            assertEquals(posted, http.size());
            assertFalse(DriverLocationService.uploadArmed());
            assertFalse(DriverLocationService.listening());
            Prepared after = worker.submit(() -> inspect(prepared.auth, prepared.familyId, prepared.refreshToken)).get(45, TimeUnit.SECONDS);
            Log.i(TAG, "AFTER_TRIP_NONE=" + after.tripNone);
            Log.i(TAG, "AFTER_IS_AVAILABLE=" + after.available);
            Log.i(TAG, "AVAILABILITY_SAME=" + (prepared.available == after.available));
            Log.i(TAG, "SESSION_PRESENT=" + after.sessionPresent);
            Log.i(TAG, "FAMILY_SAME=" + after.familySame);
            Log.i(TAG, "REFRESH_ROTATED=" + after.refreshRotated);
            assertTrue(after.tripNone);
            assertEquals(prepared.available, after.available);
            assertTrue(after.sessionPresent);
            assertTrue(after.familySame);
            assertFalse(after.refreshRotated);
            Log.i(TAG, "PROOF_STOPPED=true");
        } finally {
            worker.shutdownNow();
        }
    }

    private Prepared prepare(Context context, String mode) throws Exception {
        SessionVault vault = SessionVaults.get(context);
        boolean empty = vault.read().isEmpty();
        if (empty && "send".equals(mode)) {
            commitSeed(vault);
            empty = false;
        }
        Prepared prepared = new Prepared();
        prepared.empty = empty;
        if (empty) {
            return prepared;
        }
        SessionRecord record = vault.read().orElseThrow();
        prepared.sessionPresent = true;
        prepared.familyId = record.familyId();
        prepared.refreshToken = record.refreshToken();
        prepared.auth = new VaultDriverLocationAuth(vault, new AndroidRefreshCoordinator(vault, new HttpUrlVaultHttp()));
        prepared.roleOk = "driver".equals(roleOf(prepared.auth.accessToken()));
        if (!prepared.roleOk && "send".equals(mode)) {
            return prepared;
        }
        fillState(prepared, prepared.auth.accessToken());
        if (prepared.unauthorized) {
            DriverLocationAuth.Refresh refresh = prepared.auth.refresh(API);
            prepared.refreshed = refresh.kind == DriverLocationAuth.Refresh.Kind.SUCCESS;
            if (!prepared.refreshed) {
                prepared.sessionPresent = vault.read().isPresent();
                prepared.roleOk = false;
                return prepared;
            }
            prepared.roleOk = "driver".equals(roleOf(prepared.auth.accessToken()));
            fillState(prepared, prepared.auth.accessToken());
            SessionRecord rotated = vault.read().orElseThrow();
            prepared.familySame = record.familyId().equals(rotated.familyId());
            prepared.refreshRotated = !record.refreshToken().equals(rotated.refreshToken());
            prepared.familyId = rotated.familyId();
            prepared.refreshToken = rotated.refreshToken();
        }
        return prepared;
    }

    private Prepared inspect(DriverLocationAuth auth, String familyId, String refreshToken) throws Exception {
        Prepared prepared = new Prepared();
        SessionVault vault = SessionVaults.get(InstrumentationRegistry.getInstrumentation().getTargetContext());
        SessionRecord record = vault.read().orElse(null);
        prepared.sessionPresent = record != null;
        if (record != null) {
            prepared.familySame = familyId.equals(record.familyId());
            prepared.refreshRotated = !refreshToken.equals(record.refreshToken());
        }
        fillState(prepared, auth.accessToken());
        return prepared;
    }

    private void commitSeed(SessionVault vault) throws Exception {
        String raw = shell("cat " + SESSION_FILE);
        shell("rm -f " + SESSION_FILE);
        JSONObject json;
        try {
            json = new JSONObject(raw.trim());
        } catch (Exception exception) {
            throw new IllegalStateException("precondition_no_session");
        }
        String access = json.optString("access_token", "");
        String refresh = json.optString("refresh_token", "");
        String family = json.optString("session_id", "");
        if (access.isEmpty() || refresh.isEmpty() || family.isEmpty()) {
            throw new IllegalStateException("precondition_no_session");
        }
        AndroidRefreshCoordinator.Outcome outcome = new AndroidRefreshCoordinator(vault, new HttpUrlVaultHttp()).commit(API, access, refresh, family, null);
        Log.i(TAG, "COMMIT=" + outcome.kind);
        if (!"committed".equals(outcome.kind)) {
            throw new IllegalStateException("precondition_no_session");
        }
    }

    private static void fillState(Prepared prepared, String access) throws Exception {
        HttpResult status = get(API + "/driver/status", access);
        HttpResult trip = get(API + "/driver/trips/active", access);
        Log.i(TAG, "STATUS_HTTP=" + status.status);
        Log.i(TAG, "TRIP_HTTP=" + trip.status);
        prepared.unauthorized = status.status == 401 || trip.status == 401;
        if (prepared.unauthorized) {
            return;
        }
        if (status.status == 200) {
            prepared.available = new JSONObject(status.body).getBoolean("is_available");
        }
        prepared.tripNone = trip.status == 200 && "null".equals(trip.body.trim());
    }

    private static String roleOf(String access) {
        if (access == null) {
            return "";
        }
        String[] parts = access.split("\\.");
        if (parts.length < 2) {
            return "";
        }
        try {
            byte[] decoded = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            return new JSONObject(new String(decoded, StandardCharsets.UTF_8)).optString("role", "");
        } catch (Exception exception) {
            return "";
        }
    }

    private static HttpResult get(String url, String access) throws Exception {
        if (!url.startsWith(API + "/")) {
            throw new IllegalStateException("endpoint_refused");
        }
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        try {
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(20_000);
            connection.setReadTimeout(20_000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + access);
            int status = connection.getResponseCode();
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            return new HttpResult(status, read(stream));
        } finally {
            connection.disconnect();
        }
    }

    private static String read(InputStream stream) throws IOException {
        if (stream == null) {
            return "";
        }
        try (InputStream input = stream) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int total = 0;
            int count;
            while ((count = input.read(buffer)) >= 0 && total < 8192) {
                output.write(buffer, 0, count);
                total += count;
            }
            return output.toString(StandardCharsets.UTF_8);
        }
    }

    private String shell(String command) throws IOException {
        return shellStatic(automation, command);
    }

    private static String shellStatic(UiAutomation automation, String command) throws IOException {
        ParcelFileDescriptor descriptor = automation.executeShellCommand(command);
        try (InputStream input = new FileInputStream(descriptor.getFileDescriptor())) {
            return read(input);
        } finally {
            descriptor.close();
        }
    }

    private static void await(java.util.function.BooleanSupplier condition, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (condition.getAsBoolean()) {
                return;
            }
            Thread.sleep(50);
        }
    }

    private static final class Prepared {
        private boolean empty;
        private boolean roleOk;
        private boolean tripNone;
        private boolean available;
        private boolean unauthorized;
        private boolean sessionPresent;
        private boolean refreshed;
        private boolean familySame = true;
        private boolean refreshRotated;
        private String familyId = "";
        private String refreshToken = "";
        private DriverLocationAuth auth;
    }

    private static final class HttpResult {
        private final int status;
        private final String body;

        private HttpResult(int status, String body) {
            this.status = status;
            this.body = body == null ? "" : body;
        }
    }

    private static final class ProofHttp implements VaultHttp {
        private final VaultHttp delegate = new HttpUrlVaultHttp();
        private final List<Call> calls = new ArrayList<>();
        private final AtomicInteger active = new AtomicInteger();
        private final AtomicInteger max = new AtomicInteger();

        @Override
        public Result post(String url, String json, Map<String, String> headers) {
            if (url.contains("tvde-api-fd2z.onrender.com") || !LOCATION.equals(url)) {
                throw new IllegalStateException("endpoint_refused");
            }
            int current = active.incrementAndGet();
            max.accumulateAndGet(current, Math::max);
            try {
                Result result = delegate.post(url, json, headers);
                String contract = headers.get(DriverLocationUpload.CONTRACT_HEADER);
                synchronized (calls) {
                    calls.add(new Call(result.status, timestamp(json), contract));
                }
                return result;
            } finally {
                active.decrementAndGet();
            }
        }

        private boolean hasThree() {
            return size() >= 3;
        }

        private int size() {
            synchronized (calls) {
                return calls.size();
            }
        }

        private List<Call> snapshot() {
            synchronized (calls) {
                return List.copyOf(calls);
            }
        }

        private static long timestamp(String json) {
            int marker = json.indexOf("\"timestamp\":");
            String tail = json.substring(marker + "\"timestamp\":".length());
            int end = 0;
            while (end < tail.length() && (Character.isDigit(tail.charAt(end)) || tail.charAt(end) == '-')) {
                end++;
            }
            return Long.parseLong(tail.substring(0, end));
        }

        private static final class Call {
            private final int status;
            private final long fixTime;
            private final String contract;

            private Call(int status, long fixTime, String contract) {
                this.status = status;
                this.fixTime = fixTime;
                this.contract = contract;
            }
        }
    }
}
