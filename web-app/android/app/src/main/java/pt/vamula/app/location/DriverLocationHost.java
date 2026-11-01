package pt.vamula.app.location;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.ContextCompat;
import pt.vamula.app.vault.SessionVaults;

/**
 * Arranca o serviço só com a activity visível, uma família no cofre e uma única
 * vez por necessidade. Não arma o upload e não lê viagens guardadas.
 */
public final class DriverLocationHost {

    private static final Object LOCK = new Object();
    /** Igual a DRIVER_TOKEN_GAP_MS. Um pedido maior não prolonga o prazo. */
    private static final long MAX_AUTHORIZATION_GAP_MS = 15_000L;
    private static Context appContext;
    private static boolean visible;
    private static boolean needed;
    private static int gapGeneration;
    private static Runnable gapTask;
    private static Handler gapHandler;
    private static final GapScheduler PLATFORM_GAP = new GapScheduler() {
        @Override
        public void schedule(Runnable task, long delayMs) {
            gapHandler().postDelayed(task, delayMs);
        }

        @Override
        public void cancel(Runnable task) {
            Handler current = gapHandler;
            if (current != null) {
                current.removeCallbacks(task);
            }
        }
    };
    private static GapScheduler gapScheduler = PLATFORM_GAP;
    private static PermissionCheck permissionCheck = DriverLocationHost::devicePermission;
    private static FamilyCheck familyCheck = DriverLocationHost::vaultFamilyPresent;
    private static Starter starter = DriverLocationHost::platformStart;

    private DriverLocationHost() {}

    public static void attach(Context context) {
        if (context == null) {
            return;
        }
        synchronized (LOCK) {
            Context application = context;
            try {
                Context resolved = context.getApplicationContext();
                if (resolved != null) {
                    application = resolved;
                }
            } catch (RuntimeException exception) {
                application = context;
            }
            appContext = application;
        }
    }

    public static void resumed() {
        synchronized (LOCK) {
            visible = true;
            syncLocked();
        }
    }

    public static void paused() {
        synchronized (LOCK) {
            visible = false;
        }
    }

    public static void setNeeded(boolean value) {
        synchronized (LOCK) {
            needed = value;
            syncLocked();
        }
    }

    public static boolean needed() {
        synchronized (LOCK) {
            return needed;
        }
    }

    public static boolean shouldStayUp() {
        synchronized (LOCK) {
            return needed && permittedLocked();
        }
    }

    /**
     * Para o serviço ao fim do prazo mesmo com a activity em pausa.
     * O Handler do looper principal não fica congelado pelo WebView.onPause.
     */
    public static void armAuthorizationGap(long delayMs) {
        synchronized (LOCK) {
            cancelGapLocked();
            final int generation = ++gapGeneration;
            Runnable task = () -> {
                synchronized (LOCK) {
                    if (generation != gapGeneration) {
                        return;
                    }
                    gapTask = null;
                    DriverLocationNeedTrace.record("gap-expired-native", false, null, null, null, null);
                    needed = false;
                    syncLocked();
                }
            };
            gapTask = task;
            if (delayMs <= 0) {
                task.run();
                return;
            }
            long delay = Math.min(delayMs, MAX_AUTHORIZATION_GAP_MS);
            gapScheduler.schedule(task, delay);
        }
    }

    public static void clearAuthorizationGap() {
        synchronized (LOCK) {
            cancelGapLocked();
        }
    }

    static void resetForTests() {
        DriverLocationNeedTrace.resetForTests();
        synchronized (LOCK) {
            cancelGapLocked();
            visible = false;
            needed = false;
            appContext = null;
            gapScheduler = PLATFORM_GAP;
            permissionCheck = DriverLocationHost::devicePermission;
            familyCheck = DriverLocationHost::vaultFamilyPresent;
            starter = DriverLocationHost::platformStart;
        }
        DriverLocationService.clearLaunchRequested();
        DriverLocationService.clearPermissionBlock();
        DriverLocationCommands.resetForTests();
    }

    static void setPermissionCheckForTests(PermissionCheck check) {
        synchronized (LOCK) {
            permissionCheck = check == null ? DriverLocationHost::devicePermission : check;
        }
    }

    static void setFamilyCheckForTests(FamilyCheck check) {
        synchronized (LOCK) {
            familyCheck = check == null ? DriverLocationHost::vaultFamilyPresent : check;
        }
    }

    static void setStarterForTests(Starter next) {
        synchronized (LOCK) {
            starter = next == null ? DriverLocationHost::platformStart : next;
        }
    }

    static void setGapSchedulerForTests(GapScheduler next) {
        synchronized (LOCK) {
            gapScheduler = next == null ? PLATFORM_GAP : next;
        }
    }

    private static void syncLocked() {
        Context context = appContext;
        boolean permitted = permittedLocked();
        if (!needed || !permitted) {
            if (!permitted && needed) {
                DriverLocationService.failPermission();
            } else {
                stopCollectionLocked(context);
            }
            return;
        }
        if (!familyPresentLocked()) {
            stopCollectionLocked(context);
            try {
                DriverLocationService.releaseForNewSession();
            } catch (RuntimeException exception) {
                // A recolha já foi recusada. O upload não pode seguir com o cofre inválido.
            }
            return;
        }
        DriverLocationService.clearPermissionBlock();
        if (!visible || context == null) {
            return;
        }
        DriverLocationPhase phase = DriverLocationService.phase();
        if (phase == DriverLocationPhase.STARTING || phase == DriverLocationPhase.OPERATIONAL) {
            return;
        }
        if (!DriverLocationService.markLaunchRequested()) {
            return;
        }
        try {
            starter.start(context);
        } catch (RuntimeException exception) {
            DriverLocationService.clearLaunchRequested();
        }
    }

    private static void cancelGapLocked() {
        gapGeneration++;
        if (gapTask != null) {
            gapScheduler.cancel(gapTask);
            gapTask = null;
        }
    }

    private static Handler gapHandler() {
        if (gapHandler == null) {
            gapHandler = new Handler(Looper.getMainLooper());
        }
        return gapHandler;
    }

    private static void platformStart(Context context) {
        Intent start = new Intent(context, DriverLocationService.class);
        if (Build.VERSION.SDK_INT >= 26) {
            context.startForegroundService(start);
        } else {
            context.startService(start);
        }
    }

    private static void platformStop(Context context) {
        context.stopService(new Intent(context, DriverLocationService.class));
    }

    private static void stopCollectionLocked(Context context) {
        DriverLocationService.clearPermissionBlock();
        DriverLocationService.noteHostStop();
        if (context != null && (DriverLocationService.phase() != DriverLocationPhase.STOPPED || DriverLocationService.launchRequested())) {
            DriverLocationNeedTrace.record("host-stop", false, null, null, null, null);
            starter.stop(context);
        }
        DriverLocationService.clearLaunchRequested();
    }

    private static boolean familyPresentLocked() {
        try {
            return familyCheck.present();
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private static boolean vaultFamilyPresent() {
        Context context = appContext;
        if (context == null) {
            return false;
        }
        try {
            return DriverLocationArmament.hasSessionFamily(SessionVaults.get(context));
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private static boolean permittedLocked() {
        try {
            return permissionCheck.granted(appContext);
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private static boolean devicePermission(Context context) {
        if (context == null) {
            return false;
        }
        return ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    interface PermissionCheck {
        boolean granted(Context context);
    }

    interface FamilyCheck {
        boolean present();
    }

    interface Starter {
        void start(Context context);

        default void stop(Context context) {
            platformStop(context);
        }
    }

    interface GapScheduler {
        void schedule(Runnable task, long delayMs);

        void cancel(Runnable task);
    }
}
