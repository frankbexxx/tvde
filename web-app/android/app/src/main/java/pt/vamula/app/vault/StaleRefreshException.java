package pt.vamula.app.vault;

/** A conclusão já não corresponde à sessão guardada. A mensagem não inclui segredos. */
public final class StaleRefreshException extends Exception {

    public StaleRefreshException() {
        super("refresh_rejected");
    }
}
