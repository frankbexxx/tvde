package pt.vamula.app.location;

import android.util.Log;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import pt.vamula.app.BuildConfig;

/**
 * Diagnóstico de transições da necessidade GPS. Não arranca, não pára e não
 * autoriza o serviço. Só a variante stagingRelease o activa.
 */
public final class DriverLocationNeedTrace {

    public static final String TAG = "VAMULA_GPS_NEED";

    private static final Set<String> CODES = codes();
    private static final Object LOCK = new Object();
    private static Boolean enabledOverride;
    private static String lastKey;
    private static Clock clock = System::currentTimeMillis;
    private static Sink sink = DriverLocationNeedTrace::platformLog;

    private DriverLocationNeedTrace() {}

    public static void record(String code) {
        record(code, null, null, null, null, null);
    }

    /**
     * Um campo null fica de fora da linha. Um código fora da lista é ignorado
     * e nunca é escrito, para não ecoar texto arbitrário.
     */
    public static void record(
        String code,
        Boolean needed,
        Boolean tokenPresent,
        Boolean hydrated,
        Boolean offline,
        Boolean syncing
    ) {
        synchronized (LOCK) {
            if (!activeLocked()) {
                return;
            }
            if (code == null || !CODES.contains(code)) {
                return;
            }
            String key = code
                + '|' + flag(needed)
                + '|' + flag(tokenPresent)
                + '|' + flag(hydrated)
                + '|' + flag(offline)
                + '|' + flag(syncing);
            if (key.equals(lastKey)) {
                return;
            }
            lastKey = key;
            sink.log(TAG, line(code, needed, tokenPresent, hydrated, offline, syncing));
        }
    }

    static void setEnabledForTests(boolean enabled) {
        synchronized (LOCK) {
            enabledOverride = enabled;
        }
    }

    static void setClockForTests(Clock next) {
        synchronized (LOCK) {
            clock = next == null ? System::currentTimeMillis : next;
        }
    }

    static void setSinkForTests(Sink next) {
        synchronized (LOCK) {
            sink = next == null ? DriverLocationNeedTrace::platformLog : next;
        }
    }

    static void resetForTests() {
        synchronized (LOCK) {
            enabledOverride = null;
            lastKey = null;
            clock = System::currentTimeMillis;
            sink = DriverLocationNeedTrace::platformLog;
        }
    }

    private static boolean activeLocked() {
        if (enabledOverride != null) {
            return enabledOverride;
        }
        return BuildConfig.GPS_NEED_TRACE;
    }

    private static String line(
        String code,
        Boolean needed,
        Boolean tokenPresent,
        Boolean hydrated,
        Boolean offline,
        Boolean syncing
    ) {
        StringBuilder builder = new StringBuilder(96);
        builder.append("time=").append(clock.now());
        builder.append(" code=").append(code);
        append(builder, "needed", needed);
        append(builder, "tokenPresent", tokenPresent);
        append(builder, "hydrated", hydrated);
        append(builder, "offline", offline);
        append(builder, "syncing", syncing);
        return builder.toString();
    }

    private static void append(StringBuilder builder, String name, Boolean value) {
        if (value == null) {
            return;
        }
        builder.append(' ').append(name).append('=').append(value.booleanValue());
    }

    private static String flag(Boolean value) {
        if (value == null) {
            return "-";
        }
        return value.booleanValue() ? "1" : "0";
    }

    private static void platformLog(String tag, String line) {
        Log.i(tag, line);
    }

    private static Set<String> codes() {
        HashSet<String> allowed = new HashSet<>();
        Collections.addAll(
            allowed,
            "token-absent",
            "gap-expired",
            "gap-expired-native",
            "family-changed",
            "availability-offline",
            "availability-online",
            "hydration-cleared",
            "dashboard-unmount",
            "ui-detached",
            "legal-blocked",
            "logout",
            "session-changed",
            "host-stop",
            "bridge-failed"
        );
        return Collections.unmodifiableSet(allowed);
    }

    interface Clock {
        long now();
    }

    interface Sink {
        void log(String tag, String line);
    }
}
