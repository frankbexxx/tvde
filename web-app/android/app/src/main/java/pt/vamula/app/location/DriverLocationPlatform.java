package pt.vamula.app.location;

/** Regras de arranque em primeiro plano entre API 24 e 36. Sem efeitos no sistema. */
public final class DriverLocationPlatform {

    /** {@code startForeground(id, notification, type)} existe desde API 29. */
    public static final int TYPED_START_SINCE = 29;

    /** A partir da API 34 o tipo tem de ser passado no arranque, não só no manifesto. */
    public static final int TYPED_START_REQUIRED_SINCE = 34;

    private DriverLocationPlatform() {}

    public static boolean useTypedStartForeground(int sdkInt) {
        return sdkInt >= TYPED_START_SINCE;
    }

    public static boolean typedStartIsMandatory(int sdkInt) {
        return sdkInt >= TYPED_START_REQUIRED_SINCE;
    }
}
