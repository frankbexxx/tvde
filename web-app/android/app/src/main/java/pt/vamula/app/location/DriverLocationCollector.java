package pt.vamula.app.location;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.ContextCompat;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.Granularity;
import com.google.android.gms.location.LocationAvailability;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import android.util.Log;

/**
 * Recolhe fixes do Fused Location enquanto o serviço está activo.
 * Não faz HTTP e não regista coordenadas.
 */
final class DriverLocationCollector {

    /** A prova integrada desliga a entrega dos fixes do aparelho. A recolha real fica ligada. */
    static volatile boolean deliverFixes = true;

    private final DriverLocationSession session;
    private FusedLocationProviderClient client;
    private LocationCallback callback;
    private AppOpsManager ops;
    private AppOpsManager.OnOpChangedListener opsListener;
    private Context appContext;
    private Handler handler;
    private final Runnable permissionRecheck = new Runnable() {
        @Override
        public void run() {
            if (!session.listening() || appContext == null || handler == null) {
                return;
            }
            if (!hasAnyLocationPermission(appContext)) {
                stop("permission_lost");
                return;
            }
            handler.postDelayed(this, 1_000L);
        }
    };

    DriverLocationCollector(DriverLocationSession session) {
        this.session = session;
    }

    void start(Context context) {
        if (session.listening() || callback != null) {
            return;
        }
        appContext = context.getApplicationContext();
        if (!hasAnyLocationPermission(appContext)) {
            Log.i(DriverLocationService.TAG, "listen stopped reason=permission_missing");
            return;
        }
        if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(appContext) != ConnectionResult.SUCCESS) {
            Log.i(DriverLocationService.TAG, "listen stopped reason=play_services_unavailable");
            return;
        }
        watchPermissions(appContext);
        client = LocationServices.getFusedLocationProviderClient(appContext);
        callback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result == null) {
                    return;
                }
                if (!hasAnyLocationPermission(appContext)) {
                    stop("permission_lost");
                    return;
                }
                for (Location location : result.getLocations()) {
                    record(location);
                }
            }

            @Override
            public void onLocationAvailability(LocationAvailability availability) {
                if (availability != null && !availability.isLocationAvailable()) {
                    Log.i(DriverLocationService.TAG, "fix unavailable");
                }
            }
        };
        session.onRegistered();
        handler = new Handler(Looper.getMainLooper());
        handler.post(permissionRecheck);
        try {
            client.requestLocationUpdates(request(appContext), callback, Looper.getMainLooper())
                .addOnFailureListener(ContextCompat.getMainExecutor(appContext), error -> stop("unavailable"));
            Log.i(DriverLocationService.TAG, "listen started intervalMs=" + DriverLocationCadence.INTERVAL_MILLIS);
        } catch (SecurityException exception) {
            stop("permission_missing");
        } catch (RuntimeException exception) {
            stop("unavailable");
        }
    }

    void stop() {
        stop("stopped");
    }

    private void record(Location location) {
        if (location == null || !deliverFixes) {
            return;
        }
        String provider = location.getProvider();
        DriverLocationSample sample = new DriverLocationSample(
            location.getTime(),
            location.getLatitude(),
            location.getLongitude(),
            location.hasAccuracy(),
            location.getAccuracy(),
            provider == null || provider.trim().isEmpty() ? "fused" : provider,
            isMock(location)
        );
        long nowMillis = System.currentTimeMillis();
        DriverLocationDecision decision = session.offer(sample, nowMillis);
        Log.i(DriverLocationService.TAG, decision.line());
        if (decision.accepted) {
            DriverLocationService.onAcceptedFix(sample, nowMillis);
        }
    }

    private void stop(String reason) {
        boolean active = session.listening() || callback != null;
        session.onStop();
        if (client != null && callback != null) {
            try {
                client.removeLocationUpdates(callback);
            } catch (RuntimeException exception) {
                // O cliente pode já ter sido fechado.
            }
        }
        callback = null;
        unwatchPermissions();
        if (handler != null) {
            handler.removeCallbacks(permissionRecheck);
        }
        if (active) {
            Log.i(DriverLocationService.TAG, "listen stopped reason=" + reason);
        }
        DriverLocationService.onCollectionEnded(reason);
    }

    private void watchPermissions(Context context) {
        ops = context.getSystemService(AppOpsManager.class);
        if (ops == null) {
            return;
        }
        opsListener = (op, packageName) -> {
            if (packageName == null || !packageName.equals(context.getPackageName())) {
                return;
            }
            ContextCompat.getMainExecutor(context).execute(() -> {
                if (!hasAnyLocationPermission(context)) {
                    stop("permission_lost");
                }
            });
        };
        try {
            ops.startWatchingMode(AppOpsManager.OPSTR_FINE_LOCATION, context.getPackageName(), opsListener);
            ops.startWatchingMode(AppOpsManager.OPSTR_COARSE_LOCATION, context.getPackageName(), opsListener);
        } catch (RuntimeException exception) {
            opsListener = null;
        }
    }

    private void unwatchPermissions() {
        if (ops == null || opsListener == null) {
            opsListener = null;
            return;
        }
        try {
            ops.stopWatchingMode(opsListener);
        } catch (RuntimeException exception) {
            // Já não está registado.
        }
        opsListener = null;
    }

    private static LocationRequest request(Context context) {
        boolean fine = hasPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION);
        int priority = fine ? Priority.PRIORITY_HIGH_ACCURACY : Priority.PRIORITY_BALANCED_POWER_ACCURACY;
        return new LocationRequest.Builder(priority, DriverLocationCadence.INTERVAL_MILLIS)
            .setMinUpdateIntervalMillis(DriverLocationCadence.INTERVAL_MILLIS)
            .setMaxUpdateDelayMillis(DriverLocationCadence.MAX_DELAY_MILLIS)
            .setWaitForAccurateLocation(false)
            .setGranularity(Granularity.GRANULARITY_PERMISSION_LEVEL)
            .build();
    }

    private static boolean hasAnyLocationPermission(Context context) {
        return hasPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION)
            || hasPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    private static boolean hasPermission(Context context, String permission) {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED;
    }

    @SuppressWarnings("deprecation")
    private static boolean isMock(Location location) {
        if (Build.VERSION.SDK_INT >= 31) {
            return location.isMock();
        }
        return location.isFromMockProvider();
    }
}
