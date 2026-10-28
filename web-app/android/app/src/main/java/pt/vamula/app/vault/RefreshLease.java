package pt.vamula.app.vault;

/** Uso nativo. Não é devolvido à WebView. */
public final class RefreshLease {

    private final String idempotencyKey;
    private final String refreshToken;
    private final String familyId;
    private final int generation;
    private final boolean resumed;

    public RefreshLease(
        String idempotencyKey,
        String refreshToken,
        String familyId,
        int generation,
        boolean resumed
    ) {
        this.idempotencyKey = idempotencyKey;
        this.refreshToken = refreshToken;
        this.familyId = familyId;
        this.generation = generation;
        this.resumed = resumed;
    }

    public String idempotencyKey() {
        return idempotencyKey;
    }

    public String refreshToken() {
        return refreshToken;
    }

    public String familyId() {
        return familyId;
    }

    public int generation() {
        return generation;
    }

    public boolean resumed() {
        return resumed;
    }
}
