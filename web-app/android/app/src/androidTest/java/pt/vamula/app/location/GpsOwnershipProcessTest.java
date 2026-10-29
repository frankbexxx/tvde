package pt.vamula.app.location;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.util.Log;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Cada execução de instrumentação é um processo novo. Não abre rede. */
@RunWith(AndroidJUnit4.class)
public class GpsOwnershipProcessTest {

    public static final String TAG = "VAMULA_GPS_PROOF";

    @Test
    public void holdsNativeLeaseUntilTheProcessIsKilled() throws Exception {
        assertEqualsNative();
        Log.i(TAG, "process-hold native=true");
        Thread.sleep(25_000L);
    }

    @Test
    public void newProcessStartsOnTheWebView() {
        assertFalse(DriverLocationOwnership.nativeOwnsUpload());
        assertTrue(DriverLocationOwnership.webViewBeginSend());
        DriverLocationOwnership.webViewEndSend();
        Log.i(TAG, "process-restart native=false");
    }

    private static void assertEqualsNative() {
        int decision = DriverLocationOwnership.reconcile(true, true, true, "family-hold");
        if (decision != DriverLocationOwnership.NATIVE) {
            throw new AssertionError("decision=" + decision);
        }
        if (!DriverLocationOwnership.nativeOwnsUpload()) {
            throw new AssertionError("holder");
        }
    }
}
