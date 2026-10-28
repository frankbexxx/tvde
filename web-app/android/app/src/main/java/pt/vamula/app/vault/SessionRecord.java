package pt.vamula.app.vault;

import java.util.LinkedHashMap;
import java.util.Map;

/** Estado completo da sessão. O refresh não sai desta classe para o JavaScript. */
public final class SessionRecord {

    private final String accessToken;
    private final String refreshToken;
    private final String familyId;
    private final int generation;
    private final String absoluteExpiresAt;
    private final String idleExpiresAt;
    private final String idempotencyKey;
    private final boolean refreshPending;

    public SessionRecord(
        String accessToken,
        String refreshToken,
        String familyId,
        int generation,
        String absoluteExpiresAt,
        String idleExpiresAt,
        String idempotencyKey,
        boolean refreshPending
    ) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.familyId = familyId;
        this.generation = generation;
        this.absoluteExpiresAt = absoluteExpiresAt;
        this.idleExpiresAt = idleExpiresAt;
        this.idempotencyKey = idempotencyKey;
        this.refreshPending = refreshPending;
    }

    public String accessToken() {
        return accessToken;
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

    public String absoluteExpiresAt() {
        return absoluteExpiresAt;
    }

    public String idleExpiresAt() {
        return idleExpiresAt;
    }

    public String idempotencyKey() {
        return idempotencyKey;
    }

    public boolean refreshPending() {
        return refreshPending;
    }

    public SessionRecord pending(String key) {
        return new SessionRecord(
            accessToken,
            refreshToken,
            familyId,
            generation,
            absoluteExpiresAt,
            idleExpiresAt,
            key,
            true
        );
    }

    /** Campos que a bridge pode devolver. Sem refresh e sem a chave de idempotência. */
    public Map<String, Object> publicFields() {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("accessToken", accessToken);
        fields.put("familyId", familyId);
        fields.put("generation", generation);
        fields.put("absoluteExpiresAt", absoluteExpiresAt);
        fields.put("idleExpiresAt", idleExpiresAt);
        fields.put("hasRefresh", refreshToken != null && !refreshToken.isEmpty());
        return fields;
    }
}
