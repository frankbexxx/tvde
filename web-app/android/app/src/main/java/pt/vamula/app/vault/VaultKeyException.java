package pt.vamula.app.vault;

/** A chave do cofre não pôde ser usada. A mensagem não inclui segredos. */
public final class VaultKeyException extends Exception {

    public enum Kind {
        TRANSIENT,
        INVALIDATED
    }

    private final Kind kind;

    public VaultKeyException(Kind kind) {
        super(kind.name());
        this.kind = kind;
    }

    public Kind kind() {
        return kind;
    }
}
