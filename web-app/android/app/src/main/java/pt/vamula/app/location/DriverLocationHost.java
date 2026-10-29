package pt.vamula.app.location;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;

/**
 * Arranca o serviço só com a activity visível e uma única vez por necessidade.
 * Não arma o upload e não lê viagens guardadas.
 */
public final class DriverLocationHost {

    private static final Object LOCK = new Object();
    private static Context appContext;
    private static boolean visible;
    private static boolean needed;
    private static PermissionCheck permissionCheck = DriverLocationHost::devicePermission;
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

    static void resetForTests() {
        synchronized (LOCK) {
            visible = false;
            needed = false;
            appContext = null;
            permissionCheck = DriverLocationHost::devicePermission;
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

    static void setStarterForTests(Starter next) {
        synchronized (LOCK) {
            starter = next == null ? DriverLocationHost::platformStart : next;
        }
    }

    private static void syncLocked() {
        Context context = appContext;
        boolean permitted = permittedLocked();
        if (!needed || !permitted) {
            if (!permitted && needed) {
                DriverLocationService.failPermission();
            } else {
                DriverLocationService.clearPermissionBlock();
                DriverLocationService.noteHostStop();
                if (context != null && (DriverLocationService.phase() != DriverLocationPhase.STOPPED || DriverLocationService.launchRequested())) {
                    starter.stop(context);
                }
                DriverLocationService.clearLaunchRequested();
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

    interface Starter {
        void start(Context context);

        default void stop(Context context) {
            platformStop(context);
        }
    }
}
