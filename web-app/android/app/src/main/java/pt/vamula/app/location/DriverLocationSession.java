package pt.vamula.app.location;

/**
 * Aceita ou recusa fixes e sabe se os callbacks ainda estão activos.
 * Não envia rede, não guarda fila e não inventa coordenadas.
 */
public final class DriverLocationSession {

    private boolean listening;
    private boolean hasFix;
    private long lastFixTimeMillis;
    private double lastAccuracyMeters;
    private String lastOrigin = "";
    private long lastAgeMillis;
    private boolean lastMock;
    private int acceptedFixes;
    private int rejectedFixes;
    private int stopCalls;

    public synchronized boolean listening() {
        return listening;
    }

    public synchronized int acceptedFixes() {
        return acceptedFixes;
    }

    public synchronized int rejectedFixes() {
        return rejectedFixes;
    }

    public synchronized int stopCalls() {
        return stopCalls;
    }

    public synchronized long lastFixTimeMillis() {
        return hasFix ? lastFixTimeMillis : 0L;
    }

    public synchronized double lastAccuracyMeters() {
        return hasFix ? lastAccuracyMeters : 0d;
    }

    public synchronized String lastOrigin() {
        return lastOrigin;
    }

    public synchronized long lastAgeMillis() {
        return hasFix ? lastAgeMillis : 0L;
    }

    public synchronized boolean lastMock() {
        return lastMock;
    }

    public synchronized void onRegistered() {
        listening = true;
    }

    public synchronized void onStop() {
        listening = false;
        stopCalls++;
    }

    public synchronized void reset() {
        listening = false;
        hasFix = false;
        lastFixTimeMillis = 0L;
        lastAccuracyMeters = 0d;
        lastOrigin = "";
        lastAgeMillis = 0L;
        lastMock = false;
        acceptedFixes = 0;
        rejectedFixes = 0;
        stopCalls = 0;
    }

    public synchronized DriverLocationDecision offer(DriverLocationSample sample, long nowMillis) {
        if (!listening) {
            return DriverLocationDecision.reject("not_listening");
        }
        String origin = sanitizeOrigin(sample.origin);
        if (sample.fixTimeMillis <= 0L) {
            return reject("invalid_time");
        }
        if (!validCoordinate(sample.latitude, sample.longitude)) {
            return reject("invalid_coordinate");
        }
        if (!sample.hasAccuracy || !Double.isFinite(sample.accuracyMeters) || sample.accuracyMeters < 0d) {
            return reject("invalid_accuracy");
        }
        long skew = sample.fixTimeMillis - nowMillis;
        if (skew > DriverLocationCadence.FUTURE_SKEW_MILLIS) {
            return reject("future");
        }
        long age = skew >= 0L ? 0L : -skew;
        if (age > DriverLocationCadence.MAX_PAST_MILLIS) {
            return reject("too_old");
        }
        if (hasFix && sample.fixTimeMillis <= lastFixTimeMillis) {
            return reject("duplicate");
        }
        acceptedFixes++;
        hasFix = true;
        lastFixTimeMillis = sample.fixTimeMillis;
        lastAccuracyMeters = sample.accuracyMeters;
        lastOrigin = origin;
        lastAgeMillis = age;
        lastMock = sample.mock;
        return DriverLocationDecision.accept(sample.fixTimeMillis, sample.accuracyMeters, origin, age, sample.mock);
    }

    private DriverLocationDecision reject(String reason) {
        rejectedFixes++;
        return DriverLocationDecision.reject(reason);
    }

    private static boolean validCoordinate(double latitude, double longitude) {
        return Double.isFinite(latitude)
            && Double.isFinite(longitude)
            && latitude >= -90d
            && latitude <= 90d
            && longitude >= -180d
            && longitude <= 180d;
    }

    static String sanitizeOrigin(String origin) {
        if (origin == null) {
            return "unknown";
        }
        String trimmed = origin.trim();
        if (trimmed.isEmpty()) {
            return "unknown";
        }
        for (int index = 0; index < trimmed.length(); index++) {
            char character = trimmed.charAt(index);
            if (!Character.isLetterOrDigit(character) && character != '_' && character != '-') {
                return "unknown";
            }
        }
        return trimmed;
    }
}
