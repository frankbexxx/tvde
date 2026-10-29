package pt.vamula.app.location;

import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import pt.vamula.app.vault.VaultApiBase;
import pt.vamula.app.vault.VaultHttp;

/**
 * Fila curta e um POST de cada vez para {@code /drivers/location}.
 * O timestamp enviado é o do fix. Não há ligação enquanto o envio não for armado.
 */
public final class DriverLocationUpload {

    public static final String PATH = "/drivers/location";
    public static final String CONTRACT_HEADER = "X-Gps-Contract";
    public static final String CONTRACT = "fix-v1";
    static final int CAPACITY = 4;

    private static final Set<String> SENDABLE_ORIGINS = Set.of("fused", "gps", "network");

    private final ArrayDeque<QueuedFix> queue = new ArrayDeque<>();
    private boolean armed;
    private boolean inFlight;
    private boolean authPaused;
    private int flight;
    private String apiBase;
    private VaultHttp http;
    private DriverLocationAuth auth;
    private int sent;
    private int refreshAttempts;

    public synchronized boolean armed() {
        return armed;
    }

    public synchronized int sent() {
        return sent;
    }

    public synchronized int queued() {
        return queue.size();
    }

    public synchronized int refreshAttempts() {
        return refreshAttempts;
    }

    public synchronized boolean arm(String apiBase, VaultHttp http, DriverLocationAuth auth) {
        if (VaultApiBase.endpoint(apiBase, PATH) == null || http == null || auth == null) {
            return false;
        }
        this.apiBase = apiBase.trim();
        this.http = http;
        this.auth = auth;
        this.armed = true;
        this.authPaused = false;
        return true;
    }

    public synchronized boolean functional() {
        return armed && !authPaused && http != null && auth != null;
    }

    public synchronized String sessionFamily() {
        if (auth == null || auth.sessionFamily() == null) {
            return "";
        }
        return auth.sessionFamily();
    }

    /** Larga a fila e o POST em curso, mas mantém a autorização para um regresso explícito. */
    public synchronized void suspend() {
        inFlight = false;
        flight++;
        queue.clear();
    }

    public synchronized void stop() {
        armed = false;
        inFlight = false;
        authPaused = false;
        flight++;
        queue.clear();
        http = null;
        auth = null;
        apiBase = null;
    }

    public synchronized void reset() {
        stop();
        sent = 0;
        refreshAttempts = 0;
    }

    public synchronized boolean offer(DriverLocationSample sample, long nowMillis) {
        if (!armed || sample == null || !sendable(sample.origin)) {
            return false;
        }
        if (!freshEnough(sample.fixTimeMillis, nowMillis) || queuedTime(sample.fixTimeMillis)) {
            return false;
        }
        if (queue.size() >= CAPACITY) {
            QueuedFix oldest = queue.peekFirst();
            if (oldest == null || sample.fixTimeMillis <= oldest.fixTimeMillis) {
                return false;
            }
            queue.removeFirst();
        }
        queue.addLast(new QueuedFix(sample.fixTimeMillis, sample.latitude, sample.longitude));
        sortOldestFirst();
        return true;
    }

    public void drain(long nowMillis) {
        QueuedFix fix;
        String token;
        String url;
        VaultHttp client;
        DriverLocationAuth currentAuth;
        int ticket;
        synchronized (this) {
            if (!armed || inFlight || authPaused) {
                return;
            }
            discardStale(nowMillis);
            fix = queue.peekFirst();
            if (fix == null) {
                return;
            }
            token = auth.accessToken();
            url = VaultApiBase.endpoint(apiBase, PATH);
            if (token == null || token.trim().isEmpty() || token.indexOf('\n') >= 0 || token.indexOf('\r') >= 0 || url == null) {
                return;
            }
            client = http;
            currentAuth = auth;
            inFlight = true;
            ticket = flight;
        }
        if (!DriverLocationOwnership.beginNativePost()) {
            synchronized (this) {
                if (ticket == flight) {
                    inFlight = false;
                }
            }
            return;
        }
        int status = 0;
        try {
            status = post(client, url, token, fix);
            if (status == 401) {
                boolean refreshNow;
                synchronized (this) {
                    refreshNow = ticket == flight && armed;
                    if (refreshNow) {
                        refreshAttempts++;
                    }
                }
                if (refreshNow) {
                    DriverLocationAuth.Refresh refresh = currentAuth.refresh(apiBase);
                    if (refresh.kind == DriverLocationAuth.Refresh.Kind.SUCCESS && refresh.accessToken != null) {
                        status = post(client, url, refresh.accessToken, fix);
                    } else if (refresh.kind != DriverLocationAuth.Refresh.Kind.INVALID) {
                        status = 0;
                    }
                }
            }
        } catch (RuntimeException exception) {
            status = 0;
        } finally {
            DriverLocationOwnership.endNativePost();
        }
        boolean paused = false;
        synchronized (this) {
            if (ticket != flight) {
                return;
            }
            inFlight = false;
            if (!armed) {
                queue.clear();
                return;
            }
            if (status == 204) {
                remove(fix.fixTimeMillis);
                sent++;
                return;
            }
            if (status == 400) {
                remove(fix.fixTimeMillis);
                return;
            }
            if (status == 401) {
                authPaused = true;
                paused = true;
            }
        }
        if (paused) {
            DriverLocationOwnership.release("auth");
        }
    }

    static String diagnostic(int status, long fixTimeMillis) {
        return "upload status=" + status + " time=" + fixTimeMillis;
    }

    static String body(QueuedFix fix) {
        return "{\"lat\":" + jsonNumber(fix.latitude) + ",\"lng\":" + jsonNumber(fix.longitude) + ",\"timestamp\":" + fix.fixTimeMillis + "}";
    }

    private int post(VaultHttp client, String url, String token, QueuedFix fix) {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Accept", "application/json");
        headers.put("Authorization", "Bearer " + token);
        headers.put(CONTRACT_HEADER, CONTRACT);
        VaultHttp.Result result = client.post(url, body(fix), headers);
        return result.status;
    }

    private void discardStale(long nowMillis) {
        while (!queue.isEmpty()) {
            QueuedFix head = queue.peekFirst();
            if (head != null && freshEnough(head.fixTimeMillis, nowMillis)) {
                return;
            }
            queue.removeFirst();
        }
    }

    private boolean queuedTime(long fixTimeMillis) {
        for (QueuedFix queued : queue) {
            if (queued.fixTimeMillis == fixTimeMillis) {
                return true;
            }
        }
        return false;
    }

    private void remove(long fixTimeMillis) {
        queue.removeIf(queued -> queued.fixTimeMillis == fixTimeMillis);
    }

    private void sortOldestFirst() {
        QueuedFix[] items = queue.toArray(new QueuedFix[0]);
        queue.clear();
        Arrays.sort(items, (left, right) -> Long.compare(left.fixTimeMillis, right.fixTimeMillis));
        for (QueuedFix item : items) {
            queue.addLast(item);
        }
    }

    private static boolean freshEnough(long fixTimeMillis, long nowMillis) {
        if (fixTimeMillis <= 0L) {
            return false;
        }
        long skew = fixTimeMillis - nowMillis;
        if (skew > DriverLocationCadence.FUTURE_SKEW_MILLIS) {
            return false;
        }
        long age = skew >= 0L ? 0L : -skew;
        return age <= DriverLocationCadence.MATCHING_MAX_AGE_MILLIS && age <= DriverLocationCadence.MAX_PAST_MILLIS;
    }

    private static boolean sendable(String origin) {
        return origin != null && SENDABLE_ORIGINS.contains(origin);
    }

    private static String jsonNumber(double value) {
        String formatted = String.format(Locale.US, "%.7f", value);
        int end = formatted.length();
        while (end > 1 && formatted.charAt(end - 1) == '0') {
            end--;
        }
        if (formatted.charAt(end - 1) == '.') {
            end--;
        }
        return formatted.substring(0, end);
    }

    static final class QueuedFix {

        final long fixTimeMillis;
        final double latitude;
        final double longitude;

        QueuedFix(long fixTimeMillis, double latitude, double longitude) {
            this.fixTimeMillis = fixTimeMillis;
            this.latitude = latitude;
            this.longitude = longitude;
        }

        @Override
        public String toString() {
            return "time=" + fixTimeMillis;
        }
    }
}
