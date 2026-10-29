package pt.vamula.app.location;

/**
 * Token de acesso do cofre. A implementação nativa não regista o token
 * e não apaga a sessão por falha transitória.
 */
public interface DriverLocationAuth {

    String accessToken();

    Refresh refresh(String apiBase);

    /** Família da sessão. Vazio quando não há sessão. Não é um token. */
    String sessionFamily();

    final class Refresh {

        public enum Kind {
            SUCCESS,
            TRANSIENT,
            INVALID
        }

        public final Kind kind;
        public final String accessToken;

        private Refresh(Kind kind, String accessToken) {
            this.kind = kind;
            this.accessToken = accessToken;
        }

        public static Refresh success(String accessToken) {
            return new Refresh(Kind.SUCCESS, accessToken);
        }

        public static Refresh transientFailure() {
            return new Refresh(Kind.TRANSIENT, null);
        }

        public static Refresh invalid() {
            return new Refresh(Kind.INVALID, null);
        }
    }
}
