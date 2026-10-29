package pt.vamula.app.location;

/** Fix observado. As coordenadas ficam aqui e não entram na linha de diagnóstico. */
public final class DriverLocationSample {

    public final long fixTimeMillis;
    public final double latitude;
    public final double longitude;
    public final boolean hasAccuracy;
    public final double accuracyMeters;
    public final String origin;
    public final boolean mock;

    public DriverLocationSample(
        long fixTimeMillis,
        double latitude,
        double longitude,
        boolean hasAccuracy,
        double accuracyMeters,
        String origin,
        boolean mock
    ) {
        this.fixTimeMillis = fixTimeMillis;
        this.latitude = latitude;
        this.longitude = longitude;
        this.hasAccuracy = hasAccuracy;
        this.accuracyMeters = accuracyMeters;
        this.origin = origin;
        this.mock = mock;
    }
}
