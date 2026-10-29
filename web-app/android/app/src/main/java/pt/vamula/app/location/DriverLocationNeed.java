package pt.vamula.app.location;

/**
 * Quando o serviço de localização é necessário. Não arranca nada e não lê a sessão.
 * Uma viagem sem estado confirmado não conta: só recuperação provisória ou
 * {@code accepted}, {@code arriving}, {@code ongoing}.
 */
public final class DriverLocationNeed {

    public enum Trip {
        NONE,
        PROVISIONAL,
        ACTIVE,
        ENDED
    }

    private DriverLocationNeed() {}

    public static boolean required(boolean sessionPresent, boolean onlineConfirmed, Trip trip, boolean locationPermission) {
        if (!sessionPresent || !locationPermission || trip == null) {
            return false;
        }
        if (trip == Trip.PROVISIONAL || trip == Trip.ACTIVE) {
            return true;
        }
        return onlineConfirmed;
    }

    public static Trip trip(String status, boolean bootstrapPending, boolean recoveryUnresolved) {
        if (bootstrapPending || recoveryUnresolved) {
            return Trip.PROVISIONAL;
        }
        if (status == null) {
            return Trip.NONE;
        }
        String value = status.trim();
        if (value.equals("accepted") || value.equals("arriving") || value.equals("ongoing")) {
            return Trip.ACTIVE;
        }
        if (value.equals("completed") || value.equals("cancelled") || value.equals("failed")) {
            return Trip.ENDED;
        }
        return Trip.NONE;
    }
}
