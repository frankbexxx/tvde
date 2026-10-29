package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.app.UiAutomation;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.util.Log;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import pt.vamula.app.BuildConfig;
import pt.vamula.app.MainActivity;
import pt.vamula.app.vault.AndroidRefreshCoordinator;
import pt.vamula.app.vault.SessionVault;
import pt.vamula.app.vault.SessionVaults;
import pt.vamula.app.vault.VaultChannel;
import pt.vamula.app.vault.VaultHttp;

/**
 * Variante stagingProof. O dashboard usa o laboratório local.
 * O POST nativo fica num transporte em memória e o destino é o STAGING da build.
 * Não há ligação a STAGING nem a PROD.
 */
@RunWith(AndroidJUnit4.class)
public class DistributionArmamentProofTest {

    private static final String LAB = "http://10.0.2.2:8765";
    private static final String FAMILY_A = "proof-family-a";
    private static final String FAMILY_B = "proof-family-b";
    private ActivityScenario<MainActivity> scenario;
    private UiAutomation automation;
    private final ControlledHttp http = new ControlledHttp();

    @Before
    public void open() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_FINE_LOCATION);
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_COARSE_LOCATION);
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.POST_NOTIFICATIONS);
        DriverLocationHost.resetForTests();
        DriverLocationOwnership.resetForProcessStart();
        DriverLocationService.clearTrail();
        DriverLocationTransportHook.use(http);
        lab("{\"fail_active\":false,\"fail_detail\":false,\"trip\":null,\"available\":false}");
        scenario = ActivityScenario.launch(MainActivity.class);
    }

    @After
    public void close() {
        DriverLocationService.releaseForNewSession();
        DriverLocationTransportHook.use(null);
        DriverLocationHost.setNeeded(false);
        if (scenario != null) {
            try {
                scenario.onActivity(activity -> activity.stopService(
                    new android.content.Intent(activity, DriverLocationService.class)));
            } catch (RuntimeException ignored) {
                // A activity pode já ter fechado.
            }
            scenario.close();
        }
        DriverLocationHost.resetForTests();
        DriverLocationService.clearTrail();
        DriverLocationOwnership.resetForProcessStart();
    }

    @Test
    public void distributionGrantFollowsTheConfiguredStagingEndpoint() throws Exception {
        assertEquals("stagingProof", BuildConfig.BUILD_TYPE);
        assertEquals(DriverLocationEndpoint.STAGING_PROOF, DriverLocationEndpoint.configured());
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        boolean debuggable = (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;

        awaitEval("(function(){return document.getElementById('phone')||document.body?'ready':'wait';})()", "ready", 40_000L);
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals(0, DriverLocationService.uploadedFixes());
        assertEquals("", DriverLocationService.grantedFamily());

        eval("(function(){if(location.pathname.indexOf('/driver')!==0){location.assign('/driver');}})()");
        awaitEval("(function(){return document.getElementById('phone')?'login':'wait';})()", "login", 20_000L);
        submitLogin("+351911111111");
        awaitDash();
        assertFalse(DriverLocationService.uploadArmed());

        SessionVault vault = SessionVaults.get(context);
        String first = commit(vault, FAMILY_A);
        assertTrue(first.contains("\"ok\":true"));
        assertTrue(DriverLocationService.uploadArmed());
        assertEquals(FAMILY_A, DriverLocationService.grantedFamily());
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertEquals(0, http.locationPosts());

        String second = commit(vault, FAMILY_B);
        assertTrue(second.contains("\"ok\":true"));
        assertEquals(FAMILY_B, DriverLocationService.grantedFamily());
        assertEquals(0, DriverLocationService.uploadedFixes());
        assertEquals(0, http.locationPosts());

        click("driver-map-availability-micro-offline-pill");
        awaitNativeReady(20_000L);
        assertEquals("blocked", eval("(function(){return window.vamulaGps&&window.vamulaGps.beginWebViewSend()===false?'blocked':'open';})()"));
        Thread.sleep(1_000L);
        int labBefore = stats().optInt("location_posts");
        Log.i("GPS11D", "ARM_READY");
        System.out.println("GPS11D ARM_READY");
        awaitLocationPosts(1, 35_000L);
        assertEquals(1, DriverLocationService.uploadedFixes());
        assertEquals(FAMILY_B, DriverLocationService.grantedFamily());
        assertEquals(DriverLocationUpload.CONTRACT, http.contract());

        shell("input keyevent 3");
        Thread.sleep(2_000L);
        assertEquals(DriverLocationPhase.OPERATIONAL, DriverLocationService.phase());
        assertTrue(DriverLocationService.uploadArmed());
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());
        shell("am start -n " + context.getPackageName() + "/pt.vamula.app.MainActivity");
        awaitNativeReady(8_000L);

        int afterSuccess = http.locationPosts();
        http.nextLocation(500);
        Log.i("GPS11D", "WANT_5XX");
        System.out.println("GPS11D WANT_5XX");
        awaitLocationPosts(afterSuccess + 1, 35_000L);
        assertEquals(1, DriverLocationService.uploadedFixes());
        assertTrue(DriverLocationService.uploadArmed());
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());
        assertEquals(FAMILY_B, DriverLocationService.grantedFamily());

        int afterServer = http.locationPosts();
        http.nextLocation(0);
        Log.i("GPS11D", "WANT_DROP");
        System.out.println("GPS11D WANT_DROP");
        awaitLocationPosts(afterServer + 1, 35_000L);
        assertEquals(1, DriverLocationService.uploadedFixes());
        assertTrue(DriverLocationService.uploadArmed());
        assertEquals(DriverLocationPhase.OPERATIONAL, DriverLocationService.phase());
        for (String url : http.locationUrls()) {
            assertEquals(DriverLocationEndpoint.configured() + DriverLocationUpload.PATH, url);
            assertFalse(url.contains("tvde-api-fd2z.onrender.com"));
            assertFalse(url.contains("10.0.2.2"));
        }
        assertEquals(labBefore, stats().optInt("location_posts"));
        assertEquals(0, stats().optInt("onrender"));
        assertEquals(0, stats().optInt("duplicate_timestamps"));
        String logs = shell("logcat -d -s " + DriverLocationService.TAG + ":I");
        assertFalse(logs.contains("lat="));
        assertFalse(logs.contains("lng="));
        assertFalse(logs.contains("eyJ"));

        lab("{\"trip\":\"ongoing\",\"available\":true}");
        awaitEval("(function(){var body=document.body?document.body.innerText:'';return body.indexOf('Em viagem')>=0?'yes':'no';})()", "yes", 12_000L);
        assertEquals(DriverLocationPhase.OPERATIONAL, DriverLocationService.phase());
        assertTrue(DriverLocationService.uploadArmed());
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());
        assertEquals(FAMILY_B, DriverLocationService.grantedFamily());
        lab("{\"trip\":\"completed\",\"available\":true}");
        awaitEval("(function(){var body=document.body?document.body.innerText:'';return body.indexOf('Em viagem')<0?'gone':'stay';})()", "gone", 12_000L);
        assertEquals(DriverLocationPhase.OPERATIONAL, DriverLocationService.phase());
        assertTrue(DriverLocationService.uploadArmed());
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());
        assertEquals(FAMILY_B, DriverLocationService.grantedFamily());
        lab("{\"trip\":null,\"available\":true}");

        click("driver-map-availability-micro-online");
        awaitPhase(DriverLocationPhase.STOPPED, 12_000L);
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertTrue(DriverLocationService.uploadArmed());
        assertEquals(FAMILY_B, DriverLocationService.grantedFamily());
        assertEquals("open", eval("(function(){var ok=window.vamulaGps.beginWebViewSend()===true;window.vamulaGps.endWebViewSend();return ok?'open':'blocked';})()"));

        int parkedPosts = http.locationPosts();
        http.nextLocation(204);
        click("driver-map-availability-micro-offline-pill");
        awaitNativeReady(20_000L);
        Log.i("GPS11E", "ARM_RESUME");
        System.out.println("GPS11E ARM_RESUME");
        awaitLocationPosts(parkedPosts + 1, 35_000L);
        assertEquals(2, DriverLocationService.uploadedFixes());
        assertEquals(FAMILY_B, DriverLocationService.grantedFamily());
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());
        assertEquals("blocked", eval("(function(){return window.vamulaGps&&window.vamulaGps.beginWebViewSend()===false?'blocked':'open';})()"));

        click("driver-bottom-nav-menu");
        awaitEval("(function(){var nodes=document.querySelectorAll('button');for(var i=0;i<nodes.length;i++){if(nodes[i].textContent.indexOf('Sair')>=0){nodes[i].click();return 'clicked';}}return 'missing';})()", "clicked", 8_000L);
        awaitEval("(function(){return document.getElementById('phone')?'login':'wait';})()", "login", 20_000L);
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals("", DriverLocationService.grantedFamily());

        submitLogin("+351922222222");
        awaitDash();
        awaitEval("(function(){var node=document.querySelector('[data-testid=\"driver-availability-state\"]');return node&&node.textContent==='Indisponível'?'yes':'no';})()", "yes", 12_000L);
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals(2, DriverLocationService.uploadedFixes());
        System.out.println("GPS11E PASS posts=" + http.locationPosts() + " successes=2 debuggable=" + debuggable);
    }

    private String commit(SessionVault vault, String family) {
        AndroidRefreshCoordinator coordinator = new AndroidRefreshCoordinator(vault, http);
        String json = "{\"id\":\"c\",\"op\":\"commit\",\"api_base\":" + JSONObject.quote(DriverLocationEndpoint.configured())
            + ",\"access_token\":\"proof-access\",\"refresh_token\":\"proof-refresh-" + family
            + "\",\"session_id\":" + JSONObject.quote(family)
            + ",\"absolute_expires_at\":\"\"}";
        return VaultChannel.reply(vault, coordinator, true, "https://localhost", json);
    }

    private void awaitDash() throws Exception {
        awaitEval("(function(){return document.querySelector('[data-testid=\"driver-bottom-nav-home\"]')?'dash':'wait';})()", "dash", 45_000L);
    }

    private void awaitNativeReady(long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL
                && DriverLocationHost.needed()
                && DriverLocationService.listening()
                && DriverLocationOwnership.nativeOwnsUpload()
                && DriverLocationService.uploadArmed()) {
                return;
            }
            Thread.sleep(80L);
        }
        throw new AssertionError("handoff phase=" + DriverLocationService.phase().wire()
            + " needed=" + DriverLocationHost.needed()
            + " listening=" + DriverLocationService.listening()
            + " armed=" + DriverLocationService.uploadArmed()
            + " owns=" + DriverLocationOwnership.nativeOwnsUpload());
    }

    private void awaitPhase(DriverLocationPhase phase, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (DriverLocationService.phase() == phase) {
                return;
            }
            Thread.sleep(80L);
        }
        throw new AssertionError("phase " + DriverLocationService.phase().wire());
    }

    private void awaitLocationPosts(int atLeast, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (http.locationPosts() >= atLeast) {
                return;
            }
            Thread.sleep(80L);
        }
        throw new AssertionError("location posts " + http.locationPosts());
    }

    private void submitLogin(String phone) throws Exception {
        String script = "(function(){var phone=document.getElementById('phone');var password=document.getElementById('password');"
            + "var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;"
            + "set.call(phone," + JSONObject.quote(phone) + ");"
            + "phone.dispatchEvent(new Event('input',{bubbles:true}));"
            + "set.call(password,'lab-gps-11a');"
            + "password.dispatchEvent(new Event('input',{bubbles:true}));"
            + "var button=document.querySelector('form button[type=submit]');"
            + "if(!button){return 'missing';}button.click();return 'clicked';})()";
        assertEquals("clicked", eval(script));
    }

    private void click(String testId) throws Exception {
        String script = "(function(){var node=document.querySelector('[data-testid=\"" + testId + "\"]');"
            + "if(!node||node.disabled){return 'missing';}node.click();return 'clicked';})()";
        awaitEval(script, "clicked", 20_000L);
    }

    private String eval(String script) throws InterruptedException {
        CountDownLatch done = new CountDownLatch(1);
        String[] value = new String[1];
        scenario.onActivity(activity -> {
            WebView webView = activity.findViewById(com.getcapacitor.android.R.id.webview);
            if (webView == null) {
                value[0] = "null";
                done.countDown();
                return;
            }
            webView.evaluateJavascript(script, result -> {
                value[0] = result;
                done.countDown();
            });
        });
        if (!done.await(4, TimeUnit.SECONDS)) {
            return "";
        }
        return unwrap(value[0]);
    }

    private void awaitEval(String script, String expected, long timeoutMs) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutMs;
        String last = "";
        while (System.currentTimeMillis() < deadline) {
            last = eval(script);
            if (expected.equals(last)) {
                return;
            }
            Thread.sleep(250L);
        }
        String path = eval("(function(){return location.pathname;})()");
        throw new AssertionError("js timeout expected=" + expected + " last=" + last + " path=" + path);
    }

    private static String unwrap(String text) {
        if (text == null || "null".equals(text)) {
            return "";
        }
        if (text.length() >= 2 && text.charAt(0) == '"' && text.charAt(text.length() - 1) == '"') {
            return text.substring(1, text.length() - 1)
                .replace("\\\"", "\"")
                .replace("\\n", "\n")
                .replace("\\\\", "\\");
        }
        return text;
    }

    private JSONObject stats() throws Exception {
        return new JSONObject(httpJson("GET", LAB + "/__lab/stats", null));
    }

    private void lab(String json) throws IOException {
        String status = httpJson("POST", LAB + "/__lab/state", json);
        if (!status.startsWith("204") && !status.startsWith("200")) {
            throw new IOException("lab " + status);
        }
    }

    private String shell(String command) throws IOException {
        android.os.ParcelFileDescriptor descriptor = automation.executeShellCommand(command);
        try (InputStream input = new FileInputStream(descriptor.getFileDescriptor())) {
            return read(input);
        } finally {
            descriptor.close();
        }
    }

    private static String httpJson(String method, String address, String body) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(5000);
        connection.setRequestMethod(method);
        if (body != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(bytes);
            }
        }
        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String response = stream == null ? "" : read(stream);
        connection.disconnect();
        if ("GET".equals(method)) {
            return response;
        }
        return status + " " + response;
    }

    private static String read(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int count;
        while ((count = input.read(buffer)) >= 0) {
            output.write(buffer, 0, count);
        }
        return output.toString(StandardCharsets.UTF_8);
    }

    private static final class ControlledHttp implements VaultHttp {
        private final List<String> locationUrls = Collections.synchronizedList(new ArrayList<>());
        private int locationPosts;
        private int nextLocation = 204;
        private String contract = "";

        private synchronized void nextLocation(int status) {
            nextLocation = status;
        }

        private synchronized int locationPosts() {
            return locationPosts;
        }

        private synchronized String contract() {
            return contract;
        }

        private List<String> locationUrls() {
            return new ArrayList<>(locationUrls);
        }

        @Override
        public synchronized Result post(String url, String json, Map<String, String> headers) {
            if (url != null && url.contains(DriverLocationUpload.PATH)) {
                locationPosts++;
                locationUrls.add(url);
                String header = headers.get(DriverLocationUpload.CONTRACT_HEADER);
                contract = header == null ? "" : header;
                return new Result(nextLocation, "");
            }
            return new Result(204, "");
        }
    }
}
