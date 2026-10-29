package pt.vamula.app.location;

import android.os.Handler;
import android.os.Looper;

/**
 * Pedidos da ponte. Uma mudança de sessão invalida os que já foram enfileirados
 * e ainda não correram no main looper.
 */
public final class DriverLocationCommands {

    private static final Object LOCK = new Object();
    private static int generation;
    private static Poster poster = DriverLocationCommands::mainPoster;

    private DriverLocationCommands() {}

    public static void sessionChanged() {
        synchronized (LOCK) {
            generation++;
        }
        DriverLocationService.releaseForNewSession();
        DriverLocationHost.setNeeded(false);
    }

    public static void setNeeded(boolean needed) {
        final int stamp;
        final Poster current;
        synchronized (LOCK) {
            stamp = generation;
            current = poster;
        }
        current.post(() -> apply(stamp, needed));
    }

    static void resetForTests() {
        synchronized (LOCK) {
            generation = 0;
            poster = DriverLocationCommands::mainPoster;
        }
    }

    static void setPosterForTests(Poster next) {
        synchronized (LOCK) {
            poster = next == null ? DriverLocationCommands::mainPoster : next;
        }
    }

    private static void apply(int stamp, boolean needed) {
        synchronized (LOCK) {
            if (stamp != generation) {
                return;
            }
        }
        DriverLocationHost.setNeeded(needed);
    }

    private static void mainPoster(Runnable command) {
        new Handler(Looper.getMainLooper()).post(command);
    }

    interface Poster {
        void post(Runnable command);
    }
}
