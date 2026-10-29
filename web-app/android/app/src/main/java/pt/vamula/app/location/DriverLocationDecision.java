package pt.vamula.app.location;

import java.util.Locale;

/** Resultado de um fix. {@link #line()} não inclui coordenadas. */
public final class DriverLocationDecision {

    public final boolean accepted;
    public final String reason;
    public final long fixTimeMillis;
    public final double accuracyMeters;
    public final String origin;
    public final long ageMillis;
    public final boolean mock;

    private DriverLocationDecision(
        boolean accepted,
        String reason,
        long fixTimeMillis,
        double accuracyMeters,
        String origin,
        long ageMillis,
        boolean mock
    ) {
        this.accepted = accepted;
        this.reason = reason;
        this.fixTimeMillis = fixTimeMillis;
        this.accuracyMeters = accuracyMeters;
        this.origin = origin;
        this.ageMillis = ageMillis;
        this.mock = mock;
    }

    static DriverLocationDecision accept(long fixTimeMillis, double accuracyMeters, String origin, long ageMillis, boolean mock) {
        return new DriverLocationDecision(true, "accepted", fixTimeMillis, accuracyMeters, origin, ageMillis, mock);
    }

    static DriverLocationDecision reject(String reason) {
        return new DriverLocationDecision(false, reason, 0L, 0d, "", 0L, false);
    }

    public String line() {
        if (!accepted) {
            return "fix rejected reason=" + reason;
        }
        return "fix accepted time=" + fixTimeMillis
            + " accuracy=" + String.format(Locale.US, "%.1f", accuracyMeters)
            + " origin=" + origin
            + " ageMs=" + ageMillis
            + " mock=" + mock;
    }
}
