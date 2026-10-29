package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.app.UiAutomation;
import android.util.Log;
import android.content.Context;
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
import pt.vamula.app.MainActivity;
import pt.vamula.app.vault.VaultHttp;

/**
 * Dashboard real. O POST nativo fica num transporte em memória.
 * O laboratório local só serve o login. Não há ligação a STAGING nem a PROD.
 */
@RunWith(AndroidJUnit4.class)
public class NativeSenderHandoffTest {

    private static final String LAB = "http://10.0.2.2:8765";
    private static final String FAMILY = "handoff-family";
    private ActivityScenario<MainActivity> scenario;
    private UiAutomation automation;
    private final RecordingHttp http = new RecordingHttp();

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
        lab("{\"fail_active\":false,\"fail_detail\":false,\"trip\":null,\"available\":false}");
        scenario = ActivityScenario.launch(MainActivity.class);
    }

    @After
    public void close() {
        DriverLocationService.releaseForNewSession();
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
    public void dashboardHandsTheSendToTheNativeTransport() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        awaitEval("(function(){return document.getElementById('phone')||document.body?'ready':'wait';})()", "ready", 40_000L);
        eval("(function(){if(location.pathname.indexOf('/driver')!==0){location.assign('/driver');}})()");
        awaitEval("(function(){return document.getElementById('phone')?'login':'wait';})()", "login", 20_000L);
        submitLogin();
        awaitEval("(function(){return document.querySelector('[data-testid=\"driver-bottom-nav-home\"]')?'dash':'wait';})()", "dash", 45_000L);
        assertFalse(DriverLocationService.uploadArmed());

        FamilyAuth auth = new FamilyAuth(FAMILY);
        assertFalse(DriverLocationService.grantProduction(LAB, FAMILY, http, auth));
        assertFalse(DriverLocationService.grantProduction("https://tvde-staging-api.onrender.com", FAMILY, http, auth));
        assertFalse(DriverLocationService.grantProduction("https://evil.example", FAMILY, http, auth));
        assertFalse(DriverLocationService.armUpload(context, "https://evil.example", http, auth));
        assertTrue(DriverLocationService.armUpload(context, "https://tvde-staging-api.onrender.com", http, auth));
        DriverLocationService.releaseForNewSession();
        assertFalse(DriverLocationService.uploadArmed());
        assertEquals(0, http.posts());

        assertTrue(DriverLocationService.grantProduction(DriverLocationEndpoint.configured(), FAMILY, http, auth));
        assertTrue(DriverLocationService.uploadArmed());
        assertEquals(0, http.posts());

        click("driver-map-availability-micro-offline-pill");
        awaitNativeReady(20_000L);
        Log.i("GPS11C", "ARM_READY");
        System.out.println("GPS11C ARM_READY");
        Thread.sleep(1_500L);
        int labBefore = new JSONObject(httpJson("GET", LAB + "/__lab/stats", null)).optInt("location_posts");
        awaitPosts(35_000L);
        Thread.sleep(3_000L);
        int labAfter = new JSONObject(httpJson("GET", LAB + "/__lab/stats", null)).optInt("location_posts");
        int onrender = new JSONObject(httpJson("GET", LAB + "/__lab/stats", null)).optInt("onrender");
        String lease = eval("(function(){return window.vamulaGps&&window.vamulaGps.beginWebViewSend()===false?'blocked':'open';})()");

        assertEquals("blocked", lease);
        assertTrue(DriverLocationOwnership.nativeOwnsUpload());
        assertTrue(DriverLocationService.sending());
        assertTrue(http.posts() >= 1);
        assertEquals(http.posts(), DriverLocationService.uploadedFixes());
        for (String url : http.urls()) {
            assertEquals(DriverLocationEndpoint.configured() + DriverLocationUpload.PATH, url);
            assertFalse(url.contains("staging"));
        }
        assertEquals(DriverLocationUpload.CONTRACT, http.contract());
        assertEquals(labBefore, labAfter);
        assertEquals(0, onrender);
        assertEquals(0, new JSONObject(httpJson("GET", LAB + "/__lab/stats", null)).optInt("duplicate_timestamps"));

        int posted = http.posts();
        click("driver-bottom-nav-menu");
        awaitEval("(function(){var nodes=document.querySelectorAll('button');for(var i=0;i<nodes.length;i++){if(nodes[i].textContent.indexOf('Sair')>=0){nodes[i].click();return 'clicked';}}return 'missing';})()", "clicked", 8_000L);
        awaitEval("(function(){return document.getElementById('phone')?'login':'wait';})()", "login", 20_000L);
        Thread.sleep(1_500L);
        assertFalse(DriverLocationService.uploadArmed());
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertEquals(posted, http.posts());
        System.out.println("GPS11C PASS posts=" + posted + " lab_delta=0");
    }

    private void awaitNativeReady(long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL
                && DriverLocationHost.needed()
                && DriverLocationService.listening()
                && DriverLocationOwnership.nativeOwnsUpload()) {
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

    private void awaitPosts(long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (http.posts() >= 1) {
                return;
            }
            Thread.sleep(80L);
        }
        throw new AssertionError("native post missing");
    }

    private void submitLogin() throws Exception {
        String script = "(function(){var phone=document.getElementById('phone');var password=document.getElementById('password');"
            + "var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;"
            + "set.call(phone,'+351911111111');"
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

    private void lab(String json) throws IOException {
        String status = httpJson("POST", LAB + "/__lab/state", json);
        if (!status.startsWith("204") && !status.startsWith("200")) {
            throw new IOException("lab " + status);
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

    private static final class FamilyAuth implements DriverLocationAuth {
        private final String family;

        private FamilyAuth(String family) {
            this.family = family;
        }

        @Override
        public String accessToken() {
            return "handoff-access";
        }

        @Override
        public String sessionFamily() {
            return family;
        }

        @Override
        public Refresh refresh(String apiBase) {
            return Refresh.transientFailure();
        }
    }

    private static final class RecordingHttp implements VaultHttp {
        private final List<String> urls = Collections.synchronizedList(new ArrayList<>());
        private int posts;
        private String contract = "";

        private synchronized int posts() {
            return posts;
        }

        private synchronized String contract() {
            return contract;
        }

        private List<String> urls() {
            return new ArrayList<>(urls);
        }

        @Override
        public synchronized Result post(String url, String json, Map<String, String> headers) {
            posts++;
            urls.add(url);
            String header = headers.get(DriverLocationUpload.CONTRACT_HEADER);
            contract = header == null ? "" : header;
            return new Result(204, "");
        }
    }
}
