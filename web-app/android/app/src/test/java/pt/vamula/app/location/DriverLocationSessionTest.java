package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** Validade, timestamp original, duplicados e limpeza. Não arranca o serviço. */
public class DriverLocationSessionTest {

    private static final long NOW = 1_700_000_000_000L;
    private static final double LATITUDE = 12.345678;
    private static final double LONGITUDE = 98.765432;

    @Test
    public void acceptedFixKeepsTheOriginalTimestampAccuracyAndAge() {
        DriverLocationSession session = listeningSession();
        long fixTime = NOW - 2_500L;
        DriverLocationDecision decision = session.offer(sample(fixTime, 8.5, "gps", false), NOW);

        assertTrue(decision.accepted);
        assertEquals(fixTime, decision.fixTimeMillis);
        assertEquals(fixTime, session.lastFixTimeMillis());
        assertEquals(8.5, session.lastAccuracyMeters(), 0.001);
        assertEquals("gps", session.lastOrigin());
        assertEquals(2_500L, decision.ageMillis);
        assertEquals(2_500L, session.lastAgeMillis());
        assertFalse(decision.line().contains("12.345678"));
        assertFalse(decision.line().contains("98.765432"));
        assertTrue(decision.line().contains("time=" + fixTime));
        assertTrue(decision.line().contains("origin=gps"));
    }

    @Test
    public void duplicateOrOlderTimestampIsRejected() {
        DriverLocationSession session = listeningSession();
        assertTrue(session.offer(sample(NOW - 1_000L, 5d, "fused", true), NOW).accepted);

        DriverLocationDecision same = session.offer(sample(NOW - 1_000L, 5d, "fused", true), NOW);
        DriverLocationDecision older = session.offer(sample(NOW - 2_000L, 5d, "fused", true), NOW);

        assertEquals("duplicate", same.reason);
        assertEquals("duplicate", older.reason);
        assertEquals(1, session.acceptedFixes());
        assertEquals(NOW - 1_000L, session.lastFixTimeMillis());
    }

    @Test
    public void approximateFixIsAcceptedAndInvalidFixesAreRejected() {
        DriverLocationSession session = listeningSession();
        DriverLocationDecision approximate = session.offer(sample(NOW - 45_000L, 2_000d, "network", false), NOW);
        assertTrue(approximate.accepted);
        assertEquals(2_000d, approximate.accuracyMeters, 0.001);
        assertEquals("network", approximate.origin);

        assertEquals("invalid_time", session.offer(sample(0L, 5d, "gps", false), NOW).reason);
        assertEquals("invalid_coordinate", session.offer(sample(NOW, 5d, "gps", false, 91d, LONGITUDE), NOW).reason);
        assertEquals("invalid_coordinate", session.offer(sample(NOW, 5d, "gps", false, LATITUDE, 181d), NOW).reason);
        assertEquals("invalid_accuracy", session.offer(sample(NOW, Double.NaN, "gps", false), NOW).reason);
        assertEquals("invalid_accuracy", session.offer(new DriverLocationSample(NOW, LATITUDE, LONGITUDE, false, 0d, "gps", false), NOW).reason);
        assertEquals("future", session.offer(sample(NOW + DriverLocationCadence.FUTURE_SKEW_MILLIS + 1L, 5d, "gps", false), NOW).reason);
        assertEquals("too_old", session.offer(sample(NOW - DriverLocationCadence.MAX_PAST_MILLIS - 1L, 5d, "gps", false), NOW).reason);
        assertTrue(session.offer(sample(NOW + DriverLocationCadence.FUTURE_SKEW_MILLIS, 5d, "gps", false), NOW).accepted);
        assertEquals(2, session.acceptedFixes());
    }

    @Test
    public void stopAndPermissionLossIgnoreLaterFixes() {
        DriverLocationSession session = listeningSession();
        assertTrue(session.offer(sample(NOW - 1_000L, 6d, "gps", false), NOW).accepted);
        session.onStop();
        session.onStop();

        assertFalse(session.listening());
        assertEquals(2, session.stopCalls());
        assertEquals("not_listening", session.offer(sample(NOW, 6d, "gps", false), NOW).reason);
        assertEquals(1, session.acceptedFixes());
        assertEquals(NOW - 1_000L, session.lastFixTimeMillis());

        session.onRegistered();
        session.onStop();
        assertFalse(session.listening());
        assertEquals(1, session.acceptedFixes());
    }

    @Test
    public void intervalIsTenSecondsAndOriginCannotCarryCoordinates() {
        assertEquals(10_000L, DriverLocationCadence.INTERVAL_MILLIS);
        assertEquals(15_000L, DriverLocationCadence.MAX_DELAY_MILLIS);
        assertEquals("unknown", DriverLocationSession.sanitizeOrigin("12.345678,98.765432"));
        assertEquals("fused", DriverLocationSession.sanitizeOrigin("fused"));
    }

    private static DriverLocationSession listeningSession() {
        DriverLocationSession session = new DriverLocationSession();
        session.onRegistered();
        return session;
    }

    private static DriverLocationSample sample(long fixTimeMillis, double accuracy, String origin, boolean mock) {
        return sample(fixTimeMillis, accuracy, origin, mock, LATITUDE, LONGITUDE);
    }

    private static DriverLocationSample sample(
        long fixTimeMillis,
        double accuracy,
        String origin,
        boolean mock,
        double latitude,
        double longitude
    ) {
        boolean hasAccuracy = !Double.isNaN(accuracy);
        return new DriverLocationSample(fixTimeMillis, latitude, longitude, hasAccuracy, accuracy, origin, mock);
    }
}
