package pt.vamula.app.location;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import pt.vamula.app.MainActivity;
import pt.vamula.app.R;
import pt.vamula.app.vault.VaultHttp;

/**
 * Serviço em primeiro plano com recolha Fused Location.
 * O envio só existe depois de uma autorização explícita e não arranca sozinho.
 */
public final class DriverLocationService extends Service {

    public static final String TAG = "VAMULA_LOCATION";
    public static final String EXTRA_FAIL_START = "pt.vamula.app.location.FAIL_START";
    public static final String CHANNEL_ID = "vamula_location";
    public static final int NOTIFICATION_ID = 10041;

    private static final DriverLocationRuntime RUNTIME = new DriverLocationRuntime();
    private static final DriverLocationSession SESSION = new DriverLocationSession();
    private static final DriverLocationUpload UPLOAD = new DriverLocationUpload();
    private static volatile String lastFailure = "";
    private static volatile String stopReason = "";
    private static volatile boolean launchRequested;
    private static volatile boolean hostManaged;
    private static volatile boolean wanted;
    private static volatile boolean permissionBlocked;
    private static volatile DriverLocationService running;
    private static ExecutorService drain;
    private final DriverLocationCollector collector = new DriverLocationCollector(SESSION);

    public static DriverLocationPhase phase() {
        return RUNTIME.phase();
    }

    public static List<DriverLocationPhase> trail() {
        return RUNTIME.trail();
    }

    static void clearTrail() {
        RUNTIME.clearTrail();
        SESSION.reset();
        UPLOAD.reset();
        lastFailure = "";
        stopReason = "";
        launchRequested = false;
        hostManaged = false;
        wanted = false;
        permissionBlocked = false;
    }

    public static String stopReason() {
        return stopReason;
    }

    public static boolean launchRequested() {
        return launchRequested;
    }

    public static boolean shouldStayUp() {
        return wanted && !permissionBlocked;
    }

    static boolean markLaunchRequested() {
        synchronized (DriverLocationService.class) {
            DriverLocationPhase phase = RUNTIME.phase();
            if (launchRequested || phase == DriverLocationPhase.STARTING || phase == DriverLocationPhase.OPERATIONAL) {
                return false;
            }
            launchRequested = true;
            hostManaged = true;
            wanted = true;
            permissionBlocked = false;
            stopReason = "";
            return true;
        }
    }

    static void clearLaunchRequested() {
        synchronized (DriverLocationService.class) {
            launchRequested = false;
        }
    }

    static void noteHostStop() {
        wanted = false;
    }

    static void clearPermissionBlock() {
        permissionBlocked = false;
    }

    static void failPermission() {
        stopReason = "permission";
        permissionBlocked = true;
        wanted = false;
        clearLaunchRequested();
        try {
            DriverLocationPhase phase = RUNTIME.phase();
            if (phase == DriverLocationPhase.STARTING || phase == DriverLocationPhase.OPERATIONAL) {
                RUNTIME.fail();
                logPhase(DriverLocationPhase.ERROR);
            }
        } catch (RuntimeException exception) {
            // Já não estava numa fase que possa falhar.
        }
        UPLOAD.suspend();
        DriverLocationOwnership.release("permission");
        DriverLocationService current = running;
        if (current != null) {
            current.stopSelf();
        }
    }

    public static boolean listening() {
        return SESSION.listening();
    }

    public static int acceptedFixes() {
        return SESSION.acceptedFixes();
    }

    public static long lastFixTimeMillis() {
        return SESSION.lastFixTimeMillis();
    }

    public static double lastAccuracyMeters() {
        return SESSION.lastAccuracyMeters();
    }

    public static String lastOrigin() {
        return SESSION.lastOrigin();
    }

    public static long lastAgeMillis() {
        return SESSION.lastAgeMillis();
    }

    public static boolean uploadArmed() {
        return UPLOAD.armed();
    }

    public static boolean sending() {
        return DriverLocationOwnership.nativeOwnsUpload() && UPLOAD.armed() && UPLOAD.functional() && SESSION.listening();
    }

    public static int uploadedFixes() {
        return UPLOAD.sent();
    }

    static boolean armUpload(android.content.Context context, String apiBase, VaultHttp http, DriverLocationAuth auth) {
        if (context == null || (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) {
            return false;
        }
        boolean armed = UPLOAD.arm(apiBase, http, auth);
        if (armed) {
            scheduleReconcile();
        }
        return armed;
    }

    static void releaseForNewSession() {
        DriverLocationOwnership.releaseForNewSession(UPLOAD::stop);
    }

    static void onCollectionEnded(String reason) {
        if ("stopped".equals(reason)) {
            return;
        }
        UPLOAD.suspend();
        DriverLocationOwnership.release(reason);
        if ("permission_lost".equals(reason) || "permission_missing".equals(reason)) {
            failPermission();
        }
    }

    private static boolean reconcileUpload() {
        int decision = DriverLocationOwnership.reconcile(
            RUNTIME.phase() == DriverLocationPhase.OPERATIONAL,
            UPLOAD.armed(),
            UPLOAD.functional() && SESSION.listening(),
            UPLOAD.sessionFamily()
        );
        if (decision == DriverLocationOwnership.SESSION_CHANGED) {
            UPLOAD.stop();
            return false;
        }
        return decision == DriverLocationOwnership.NATIVE;
    }

    static void onAcceptedFix(DriverLocationSample sample, long nowMillis) {
        if (!UPLOAD.offer(sample, nowMillis)) {
            return;
        }
        synchronized (DriverLocationService.class) {
            if (drain == null || drain.isShutdown()) {
                drain = Executors.newSingleThreadExecutor(runnable -> {
                    Thread thread = new Thread(runnable, "vamula-location-upload");
                    thread.setDaemon(true);
                    return thread;
                });
            }
            drain.execute(() -> {
                if (!reconcileUpload()) {
                    return;
                }
                // Espera o POST da WebView acabar. Se o prazo passar, não envia por cima.
                if (!DriverLocationOwnership.awaitWebViewIdle(DriverLocationCadence.MATCHING_MAX_AGE_MILLIS)) {
                    return;
                }
                UPLOAD.drain(System.currentTimeMillis());
            });
        }
    }

    private static void scheduleReconcile() {
        synchronized (DriverLocationService.class) {
            if (drain == null || drain.isShutdown()) {
                drain = Executors.newSingleThreadExecutor(runnable -> {
                    Thread thread = new Thread(runnable, "vamula-location-upload");
                    thread.setDaemon(true);
                    return thread;
                });
            }
            drain.execute(() -> {
                reconcileUpload();
            });
        }
    }

    static String lastFailure() {
        return lastFailure;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        running = this;
        ensureChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        launchRequested = false;
        if (hostManaged && !wanted) {
            // O arranque já foi pedido ao sistema. Sem startForeground o processo é morto.
            try {
                promote(buildNotification());
            } catch (RuntimeException exception) {
                lastFailure = exception.getClass().getSimpleName();
            }
            stopSelf();
            return START_NOT_STICKY;
        }
        if (RUNTIME.phase() == DriverLocationPhase.OPERATIONAL) {
            promote(buildNotification());
            collector.start(this);
            logPhase(DriverLocationPhase.OPERATIONAL);
            scheduleReconcile();
            return START_NOT_STICKY;
        }
        try {
            RUNTIME.beginStart();
            logPhase(DriverLocationPhase.STARTING);
            if (simulateFailure(intent)) {
                throw new IllegalStateException("simulated_start_failure");
            }
            promote(buildNotification());
            RUNTIME.markOperational();
            stopReason = "";
            logPhase(DriverLocationPhase.OPERATIONAL);
            collector.start(this);
            scheduleReconcile();
        } catch (RuntimeException exception) {
            if (RUNTIME.phase() == DriverLocationPhase.STARTING || RUNTIME.phase() == DriverLocationPhase.OPERATIONAL) {
                RUNTIME.fail();
            }
            lastFailure = exception.getClass().getSimpleName() + ": " + exception.getMessage();
            logPhase(DriverLocationPhase.ERROR);
            UPLOAD.stop();
            DriverLocationOwnership.release("start_failed");
            leaveForeground();
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        try {
            collector.stop();
        } catch (RuntimeException exception) {
            // A limpeza dos callbacks não pode impedir o fecho do serviço.
        }
        UPLOAD.stop();
        DriverLocationOwnership.release("stopped");
        synchronized (DriverLocationService.class) {
            if (drain != null) {
                drain.shutdownNow();
                drain = null;
            }
        }
        leaveForeground();
        if (running == this) {
            running = null;
        }
        launchRequested = false;
        hostManaged = false;
        RUNTIME.stop();
        logPhase(DriverLocationPhase.STOPPED);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private boolean simulateFailure(Intent intent) {
        if (intent == null || !intent.getBooleanExtra(EXTRA_FAIL_START, false)) {
            return false;
        }
        return (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void promote(Notification notification) {
        if (DriverLocationPlatform.useTypedStartForeground(Build.VERSION.SDK_INT)) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < 26) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            getString(R.string.vamula_location_channel_name),
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(getString(R.string.vamula_location_channel_description));
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        PendingIntent open = PendingIntent.getActivity(
            this,
            0,
            new Intent(this, MainActivity.class),
            PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_vamula)
            .setContentTitle(getString(R.string.vamula_location_notification_title))
            .setContentText(getString(R.string.vamula_location_notification_text))
            .setContentIntent(open)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    private void leaveForeground() {
        try {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } catch (RuntimeException exception) {
            // O serviço pode ainda não ter chegado a primeiro plano.
        }
    }

    private static void logPhase(DriverLocationPhase phase) {
        Log.i(TAG, "phase=" + phase.wire());
    }
}
