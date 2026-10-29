package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import android.Manifest;
import android.app.UiAutomation;
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
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import pt.vamula.app.MainActivity;

/**
 * DriverDashboard real no emulador. A API é o laboratório local.
 * Não arma o upload e não chama STAGING nem PROD.
 */
@RunWith(AndroidJUnit4.class)
public class DashboardGpsProofTest {

    private static final String LAB = "http://10.0.2.2:8765";
    private ActivityScenario<MainActivity> scenario;
    private UiAutomation automation;
    private final List<String> report = new ArrayList<>();

    @Before
    public void open() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_FINE_LOCATION);
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.ACCESS_COARSE_LOCATION);
        automation.grantRuntimePermission(context.getPackageName(), Manifest.permission.POST_NOTIFICATIONS);
        DriverLocationHost.resetForTests();
        DriverLocationService.clearTrail();
        lab("{\"fail_active\":true,\"fail_detail\":false,\"trip\":null,\"available\":false}");
        scenario = ActivityScenario.launch(MainActivity.class);
    }

    @After
    public void close() {
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
    }

    @Test
    public void realDashboardDrivesTheNativeService() throws Exception {
        try {
            openDriverLogin();
            submitLogin("+351911111111");
            awaitDashboard(40_000L);
        } catch (Throwable error) {
            for (String id : new String[] {"1", "2", "3", "4", "5", "6", "7", "8", "9", "10"}) {
                report.add(id + " PENDING login");
            }
            System.out.println("GPS11A login FAIL " + error);
            fail("login " + error);
        }

        record("6", this::networkFailureDoesNotStartGps);
        lab("{\"fail_active\":false,\"trip\":null,\"available\":false}");
        reload();
        awaitDashboard(40_000L);
        record("1", this::offlineWithoutTripStaysStopped);

        click("driver-map-availability-micro-offline-pill");
        record("2", this::confirmedOnlineStartsAndCollects);
        record("9", this::backgroundDoesNotStopOperationalService);
        click("driver-map-availability-micro-online");
        record("3", this::goingOfflineStopsTheService);

        lab("{\"trip\":\"accepted\",\"available\":false,\"fail_detail\":false}");
        reload();
        awaitText("A caminho do passageiro", 40_000L);
        record("4", this::activeTripKeepsTheService);

        lab("{\"fail_detail\":true}");
        record("7", this::confirmedTripSurvivesNetworkLoss);

        lab("{\"fail_detail\":false,\"trip\":\"completed\",\"available\":false}");
        record("5", this::endedTripOfflineStopsTheService);

        lab("{\"trip\":null,\"available\":false}");
        reload();
        awaitDashboard(40_000L);
        record("8", this::logoutAndNewFamilyLeaveTheServiceStopped);
        record("10", this::releaseUploadStaysDisarmedAndWebViewKeepsTheReporter);

        System.out.println("GPS11A " + String.join(" | ", report));
        List<String> failed = new ArrayList<>();
        for (String line : report) {
            if (!line.contains(" PASS")) {
                failed.add(line);
            }
        }
        if (!failed.isEmpty()) {
            fail(String.join(" | ", failed));
        }
    }

    private boolean networkFailureDoesNotStartGps() throws Exception {
        awaitText("Sem uma viagem já confirmada, o GPS fica inactivo", 30_000L);
        JSONObject probe = probe();
        return DriverLocationService.phase() == DriverLocationPhase.STOPPED
            && !DriverLocationHost.needed()
            && "Indisponível".equals(probe.optString("state"))
            && probe.optBoolean("dash")
            && probe.optBoolean("bridge")
            && "/driver".equals(probe.optString("path"));
    }

    private boolean offlineWithoutTripStaysStopped() throws Exception {
        JSONObject probe = probe();
        int records = serviceRecords();
        if (DriverLocationService.phase() != DriverLocationPhase.STOPPED
            || DriverLocationHost.needed()
            || DriverLocationService.uploadArmed()
            || DriverLocationService.uploadedFixes() != 0
            || !"Indisponível".equals(probe.optString("state"))
            || records != 0) {
            throw new AssertionError("phase=" + DriverLocationService.phase().wire()
                + " needed=" + DriverLocationHost.needed()
                + " state=" + probe.optString("state")
                + " records=" + records);
        }
        return true;
    }

    private boolean confirmedOnlineStartsAndCollects() throws Exception {
        awaitPhase(DriverLocationPhase.OPERATIONAL, 12_000L);
        awaitState("Disponível", 12_000L);
        JSONObject probe = probe();
        boolean notification = shell("dumpsys notification --noredact").contains("Serviço em primeiro plano")
            && shell("dumpsys notification --noredact").contains("VAMULÁ");
        boolean collected = awaitLog("fix accepted", 35_000L);
        String logs = shell("logcat -d -s " + DriverLocationService.TAG + ":I");
        return DriverLocationHost.needed()
            && "Disponível".equals(probe.optString("state"))
            && "true".equals(eval("(function(){return String(window.vamulaGps.serviceOperational());})()"))
            && notification
            && collected
            && !logs.contains("lat=")
            && !logs.contains("lng=")
            && !logs.contains("onrender.com")
            && serviceRecords() == 1
            && !DriverLocationService.uploadArmed()
            && DriverLocationService.uploadedFixes() == 0;
    }

    private boolean backgroundDoesNotStopOperationalService() throws Exception {
        shell("input keyevent 3");
        Thread.sleep(2500L);
        boolean stayed = DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL && DriverLocationHost.needed();
        shell("am start -n pt.vamula.app/.MainActivity");
        awaitPhase(DriverLocationPhase.OPERATIONAL, 8_000L);
        return stayed && DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL;
    }

    private boolean goingOfflineStopsTheService() throws Exception {
        awaitPhase(DriverLocationPhase.STOPPED, 12_000L);
        awaitState("Indisponível", 12_000L);
        JSONObject probe = probe();
        return !DriverLocationHost.needed()
            && "Indisponível".equals(probe.optString("state"))
            && DriverLocationService.uploadedFixes() == 0
            && serviceRecords() == 0;
    }

    private boolean activeTripKeepsTheService() throws Exception {
        awaitPhase(DriverLocationPhase.OPERATIONAL, 12_000L);
        if (!DriverLocationHost.needed() || !"accepted".equals(waitLabel("A caminho do passageiro"))) {
            return false;
        }
        lab("{\"trip\":\"arriving\"}");
        if (!"arriving".equals(waitLabel("No local de recolha"))) {
            return false;
        }
        lab("{\"trip\":\"ongoing\"}");
        if (!"ongoing".equals(waitLabel("Em viagem"))) {
            return false;
        }
        JSONObject probe = probe();
        return DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL
            && DriverLocationHost.needed()
            && !"Disponível".equals(probe.optString("state"))
            && serviceRecords() == 1
            && DriverLocationService.uploadedFixes() == 0;
    }

    private boolean confirmedTripSurvivesNetworkLoss() throws Exception {
        Thread.sleep(4000L);
        JSONObject probe = probe();
        return DriverLocationService.phase() == DriverLocationPhase.OPERATIONAL
            && DriverLocationHost.needed()
            && probe.optString("labels").contains("Em viagem")
            && DriverLocationService.uploadedFixes() == 0;
    }

    private boolean endedTripOfflineStopsTheService() throws Exception {
        awaitText("Viagem concluída", 12_000L);
        awaitPhase(DriverLocationPhase.STOPPED, 12_000L);
        return !DriverLocationHost.needed() && DriverLocationService.uploadedFixes() == 0;
    }

    private boolean logoutAndNewFamilyLeaveTheServiceStopped() throws Exception {
        click("driver-map-availability-micro-offline-pill");
        awaitPhase(DriverLocationPhase.OPERATIONAL, 12_000L);
        click("driver-bottom-nav-menu");
        awaitEval("(function(){var nodes=document.querySelectorAll('button');for(var i=0;i<nodes.length;i++){if(nodes[i].textContent.indexOf('Sair')>=0){nodes[i].click();return 'clicked';}}return 'missing';})()", "clicked", 8_000L);
        awaitEval("(function(){return document.getElementById('phone')?'login':'wait';})()", "login", 20_000L);
        awaitPhase(DriverLocationPhase.STOPPED, 8_000L);
        boolean stoppedAfterLogout = !DriverLocationHost.needed();
        lab("{\"trip\":null,\"available\":false,\"fail_active\":false,\"fail_detail\":false}");
        submitLogin("+351922222222");
        awaitDashboard(40_000L);
        awaitState("Indisponível", 12_000L);
        JSONObject probe = probe();
        if (!stoppedAfterLogout
            || DriverLocationService.phase() != DriverLocationPhase.STOPPED
            || DriverLocationHost.needed()
            || !"Indisponível".equals(probe.optString("state"))
            || !"/driver".equals(probe.optString("path"))
            || DriverLocationService.uploadedFixes() != 0) {
            throw new AssertionError("afterLogout=" + stoppedAfterLogout
                + " phase=" + DriverLocationService.phase().wire()
                + " needed=" + DriverLocationHost.needed()
                + " state=" + probe.optString("state")
                + " path=" + probe.optString("path"));
        }
        return true;
    }

    private boolean releaseUploadStaysDisarmedAndWebViewKeepsTheReporter() throws Exception {
        click("driver-map-availability-micro-offline-pill");
        awaitPhase(DriverLocationPhase.OPERATIONAL, 12_000L);
        awaitState("Disponível", 12_000L);
        String lease = eval("(function(){var ok=window.vamulaGps.beginWebViewSend()===true;window.vamulaGps.endWebViewSend();return String(ok&&window.vamulaGps.serviceSending()!==true&&window.vamulaGps.nativeOwnsUpload()!==true);})()");
        JSONObject stats = new JSONObject(http("GET", LAB + "/__lab/stats", null));
        String logs = shell("logcat -d -s " + DriverLocationService.TAG + ":I");
        return "true".equals(lease)
            && !DriverLocationService.uploadArmed()
            && DriverLocationService.uploadedFixes() == 0
            && stats.optInt("onrender") == 0
            && stats.optInt("duplicate_timestamps") == 0
            && !logs.contains("onrender.com")
            && !logs.contains("eyJ");
    }

    private interface Check {
        boolean run() throws Exception;
    }

    private void record(String id, Check check) {
        try {
            boolean passed = check.run();
            report.add(id + (passed ? " PASS" : " FAIL"));
            System.out.println("GPS11A scenario " + id + (passed ? " PASS" : " FAIL"));
        } catch (Throwable error) {
            report.add(id + " FAIL " + error.getClass().getSimpleName());
            System.out.println("GPS11A scenario " + id + " FAIL " + error);
        }
    }

    private void openDriverLogin() throws Exception {
        awaitEval("(function(){return document.getElementById('phone')||document.body?'ready':'wait';})()", "ready", 40_000L);
        eval("(function(){if(location.pathname.indexOf('/driver')!==0){location.assign('/driver');}})()");
        awaitEval("(function(){return document.getElementById('phone')?'login':'wait';})()", "login", 20_000L);
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

    private void reload() throws Exception {
        eval("(function(){window.__gps11=1;location.reload();return 'reloading';})()");
        awaitEval("(function(){return window.__gps11?'old':'new';})()", "new", 20_000L);
    }

    private void click(String testId) throws Exception {
        String script = "(function(){var node=document.querySelector('[data-testid=\"" + testId + "\"]');"
            + "if(!node||node.disabled){return 'missing';}node.click();return 'clicked';})()";
        awaitEval(script, "clicked", 20_000L);
    }

    private void awaitDashboard(long timeoutMs) throws Exception {
        awaitEval("(function(){return document.querySelector('[data-testid=\"driver-bottom-nav-home\"]')?'dash':'wait';})()", "dash", timeoutMs);
    }

    private void awaitState(String exact, long timeoutMs) throws Exception {
        String script = "(function(){var node=document.querySelector('[data-testid=\"driver-availability-state\"]');"
            + "return node&&node.textContent===" + JSONObject.quote(exact) + "?'yes':'no';})()";
        awaitEval(script, "yes", timeoutMs);
    }

    private void awaitText(String text, long timeoutMs) throws Exception {
        String script = "(function(){var body=document.body?document.body.innerText:'';return body.indexOf("
            + JSONObject.quote(text) + ")>=0?'yes':'no';})()";
        awaitEval(script, "yes", timeoutMs);
    }

    private String waitLabel(String text) throws Exception {
        awaitText(text, 12_000L);
        if ("A caminho do passageiro".equals(text)) {
            return "accepted";
        }
        if ("No local de recolha".equals(text)) {
            return "arriving";
        }
        if ("Em viagem".equals(text)) {
            return "ongoing";
        }
        return "";
    }

    private JSONObject probe() throws Exception {
        String raw = eval("(function(){var state=document.querySelector('[data-testid=\"driver-availability-state\"]');"
            + "var text=document.body?document.body.innerText:'';"
            + "var labels=['A caminho do passageiro','No local de recolha','Em viagem','Viagem concluída'];"
            + "var hit=[];for(var i=0;i<labels.length;i++){if(text.indexOf(labels[i])>=0){hit.push(labels[i]);}}"
            + "return {path:location.pathname,state:state?state.textContent:'',labels:hit.join('|'),"
            + "bridge:!!(window.vamulaGps&&window.vamulaGps.setServiceNeeded),"
            + "dash:!!document.querySelector('[data-testid=\"driver-bottom-nav-home\"]')};})()");
        return new JSONObject(raw);
    }

    private void awaitPhase(DriverLocationPhase phase, long timeoutMs) throws InterruptedException {
        await(() -> DriverLocationService.phase() == phase, timeoutMs);
    }

    private boolean awaitLog(String text, long timeoutMs) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (shell("logcat -d -s " + DriverLocationService.TAG + ":I").contains(text)) {
                return true;
            }
            Thread.sleep(400L);
        }
        return false;
    }

    private int serviceRecords() throws IOException {
        String dump = shell("dumpsys activity services pt.vamula.app/.location.DriverLocationService");
        int count = 0;
        int from = 0;
        String needle = "ServiceRecord{";
        while (from < dump.length()) {
            int found = dump.indexOf(needle, from);
            if (found < 0) {
                break;
            }
            count += 1;
            from = found + needle.length();
        }
        return count;
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
        throw new AssertionError("js timeout expected=" + expected + " last=" + last);
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

    private static void await(BooleanSupplier condition, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (condition.getAsBoolean()) {
                return;
            }
            Thread.sleep(80L);
        }
        throw new AssertionError("timeout phase=" + DriverLocationService.phase().wire()
            + " needed=" + DriverLocationHost.needed()
            + " reason=" + DriverLocationService.stopReason());
    }

    private void lab(String json) throws IOException {
        String status = http("POST", LAB + "/__lab/state", json);
        if (!status.startsWith("204") && !status.startsWith("200")) {
            throw new IOException("lab " + status);
        }
    }

    private static String http(String method, String address, String body) throws IOException {
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

    private String shell(String command) throws IOException {
        android.os.ParcelFileDescriptor descriptor = automation.executeShellCommand(command);
        try (InputStream input = new FileInputStream(descriptor.getFileDescriptor())) {
            return read(input);
        } finally {
            descriptor.close();
        }
    }

    private static String read(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) >= 0) {
            output.write(buffer, 0, read);
        }
        return output.toString(StandardCharsets.UTF_8);
    }
}
