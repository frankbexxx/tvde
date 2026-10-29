package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** Matriz de necessidade. Não arranca o serviço. */
public class DriverLocationNeedTest {

    @Test
    public void onlineConfirmedNeedsTheService() {
        assertTrue(DriverLocationNeed.required(true, true, DriverLocationNeed.Trip.NONE, true));
    }

    @Test
    public void offlineWithoutATripDoesNotNeedTheService() {
        assertFalse(DriverLocationNeed.required(true, false, DriverLocationNeed.Trip.NONE, true));
        assertEquals(DriverLocationNeed.Trip.NONE, DriverLocationNeed.trip(null, false, false));
        assertEquals(DriverLocationNeed.Trip.NONE, DriverLocationNeed.trip("assigned", false, false));
    }

    @Test
    public void activeTripNeedsTheServiceEvenOffline() {
        assertEquals(DriverLocationNeed.Trip.ACTIVE, DriverLocationNeed.trip("accepted", false, false));
        assertEquals(DriverLocationNeed.Trip.ACTIVE, DriverLocationNeed.trip("arriving", false, false));
        assertEquals(DriverLocationNeed.Trip.ACTIVE, DriverLocationNeed.trip("ongoing", false, false));
        assertTrue(DriverLocationNeed.required(true, false, DriverLocationNeed.Trip.ACTIVE, true));
    }

    @Test
    public void recoveryStaysProvisionalUntilConfirmation() {
        assertEquals(DriverLocationNeed.Trip.PROVISIONAL, DriverLocationNeed.trip(null, true, false));
        assertEquals(DriverLocationNeed.Trip.PROVISIONAL, DriverLocationNeed.trip("stored-id", false, true));
        assertTrue(DriverLocationNeed.required(true, false, DriverLocationNeed.Trip.PROVISIONAL, true));
    }

    @Test
    public void endedTripFollowsOnline() {
        assertEquals(DriverLocationNeed.Trip.ENDED, DriverLocationNeed.trip("completed", false, false));
        assertEquals(DriverLocationNeed.Trip.ENDED, DriverLocationNeed.trip("cancelled", false, false));
        assertEquals(DriverLocationNeed.Trip.ENDED, DriverLocationNeed.trip("failed", false, false));
        assertTrue(DriverLocationNeed.required(true, true, DriverLocationNeed.Trip.ENDED, true));
        assertFalse(DriverLocationNeed.required(true, false, DriverLocationNeed.Trip.ENDED, true));
    }

    @Test
    public void logoutOrMissingPermissionDoesNotNeedTheService() {
        assertFalse(DriverLocationNeed.required(false, true, DriverLocationNeed.Trip.ACTIVE, true));
        assertFalse(DriverLocationNeed.required(true, true, DriverLocationNeed.Trip.ACTIVE, false));
        assertFalse(DriverLocationNeed.required(true, true, null, true));
    }
}
