package pt.vamula.app.location;

/**
 * Ritmo inicial da recolha, alinhado à futura actividade TVDE.
 * A frescura de matching (45 s) e o contrato fix-v1 não são alterados aqui.
 */
public final class DriverLocationCadence {

    public static final long INTERVAL_MILLIS = 10_000L;
    public static final long MAX_DELAY_MILLIS = 15_000L;

    /** Igual à janela fix-v1 já aceite pelo servidor: futuro acima disto é inválido. */
    public static final long FUTURE_SKEW_MILLIS = 60_000L;

    /** Igual à janela fix-v1 já aceite pelo servidor: mais antigo do que isto é inválido. */
    public static final long MAX_PAST_MILLIS = 3_600_000L;

    /** Frescura de matching já usada pelo servidor, inclusive. */
    public static final long MATCHING_MAX_AGE_MILLIS = 45_000L;

    private DriverLocationCadence() {}
}
