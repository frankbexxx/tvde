package pt.vamula.app.location;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;

/**
 * Activity de depuração para os testes instrumentados.
 * Não arranca o serviço sozinha e não entra na APK de distribuição.
 */
public final class DriverLocationHarnessActivity extends Activity {

    public void startLocationService(boolean fail) {
        Intent start = new Intent(this, DriverLocationService.class);
        if (fail) {
            start.putExtra(DriverLocationService.EXTRA_FAIL_START, true);
            startService(start);
            return;
        }
        if (Build.VERSION.SDK_INT >= 26) {
            startForegroundService(start);
        } else {
            startService(start);
        }
    }

    public void stopLocationService() {
        stopService(new Intent(this, DriverLocationService.class));
    }
}
