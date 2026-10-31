package pt.vamula.app.vault;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.function.LongSupplier;

/**
 * Login, renovação, recuperação e logout do contrato android-refresh-v1.
 * O refresh token não sai nos resultados. A janela de idempotência do servidor é de 30s:
 * fora dela, repetir a mesma chave revoga a família e a resposta é 401. Não há outra
 * recuperação segura; a sessão local termina.
 *
 * Se o logout remoto falhar, a família continua no servidor até ao idle ou ao prazo
 * absoluto. O cofre só é limpo se ainda tiver a sessão observada antes do pedido,
 * por isso este aparelho deixa de a renovar sem apagar uma sessão mais recente.
 */
public final class AndroidRefreshCoordinator {

    public static final String CONTRACT = "android-refresh-v1";

    private final SessionVault vault;
    private final VaultHttp http;
    private final LongSupplier clock;

    public AndroidRefreshCoordinator(SessionVault vault, VaultHttp http) {
        this(vault, http, System::currentTimeMillis);
    }

    AndroidRefreshCoordinator(SessionVault vault, VaultHttp http, LongSupplier clock) {
        this.vault = vault;
        this.http = http;
        this.clock = clock;
    }

    public Outcome commit(String apiBase, String accessToken, String refreshToken, String familyId, String absoluteExpiresAt) {
        if (VaultApiBase.endpoint(apiBase, "/auth/logout") == null) {
            return Outcome.failure("api_rejected");
        }
        if (blank(accessToken) || blank(refreshToken) || blank(familyId)) {
            return Outcome.failure("session_rejected");
        }
        String previousRefresh = null;
        try {
            Optional<SessionRecord> previous = vault.read();
            if (previous.isPresent()) {
                previousRefresh = previous.get().refreshToken();
            }
            vault.save(new SessionRecord(accessToken, refreshToken, familyId, 1, blankToNull(absoluteExpiresAt), null, null, false));
        } catch (VaultKeyException exception) {
            revokeQuietly(apiBase, refreshToken);
            return Outcome.failure("vault_unavailable");
        } catch (RuntimeException exception) {
            revokeQuietly(apiBase, refreshToken);
            return Outcome.failure("vault_unavailable");
        }
        revokeQuietly(apiBase, previousRefresh);
        return Outcome.ok("committed");
    }

    public Outcome refresh(String apiBase) {
        String url = VaultApiBase.endpoint(apiBase, "/auth/refresh");
        if (url == null) {
            return Outcome.failure("transient");
        }
        RefreshLease lease;
        try {
            lease = vault.beginRefresh();
        } catch (IllegalStateException exception) {
            return Outcome.failure("invalid");
        } catch (VaultKeyException exception) {
            return Outcome.failure(exception.kind() == VaultKeyException.Kind.INVALIDATED ? "unavailable" : "transient");
        }
        VaultHttp.Result result = http.post(
            url,
            FlatJson.object().put("refresh_token", lease.refreshToken()).put("idempotency_key", lease.idempotencyKey()).emit(),
            headers()
        );
        if (result.status == 0 || result.status >= 500) {
            return Outcome.failure("transient");
        }
        if (result.status == 401 || result.status == 400) {
            return Outcome.failure(vault.clearIfSameRefresh(lease) ? "invalid" : "stale");
        }
        if (result.status != 200) {
            return Outcome.failure("transient");
        }
        FlatJson body;
        try {
            body = FlatJson.parse(result.body);
        } catch (IllegalArgumentException exception) {
            return Outcome.failure("transient");
        }
        String access = body.text("access_token");
        String refresh = body.text("refresh_token");
        String family = body.text("session_id");
        if (blank(access) || blank(refresh) || !lease.familyId().equals(family)) {
            if (!lease.familyId().equals(family) && !blank(family)) {
                return Outcome.failure(vault.clearIfSameRefresh(lease) ? "invalid" : "stale");
            }
            return Outcome.failure("transient");
        }
        String absolute = body.isNull("absolute_expires_at") ? null : body.text("absolute_expires_at");
        try {
            vault.completeRefresh(
                lease,
                new SessionRecord(access, refresh, family, lease.generation() + 1, absolute, null, null, false)
            );
        } catch (StaleRefreshException exception) {
            return currentOrInvalid();
        } catch (VaultKeyException exception) {
            return Outcome.failure(exception.kind() == VaultKeyException.Kind.INVALIDATED ? "unavailable" : "transient");
        }
        return identity("refreshed", access, body.text("user_id"), body.text("role"), body.text("phone"), body.text("display_name"));
    }

    public Outcome logout(String apiBase) {
        SessionVault.ObservedSession observed;
        try {
            observed = vault.observe();
        } catch (VaultKeyException exception) {
            Outcome failed = Outcome.ok("logged_out");
            failed.cleared = vaultIsEmpty();
            return failed;
        }
        boolean revoked = false;
        if (observed.present()) {
            revoked = revoke(apiBase, observed.refreshToken());
        }
        boolean cleared = !observed.present() || vault.clearIfSameSession(observed.familyId(), observed.sessionGeneration());
        Outcome outcome = Outcome.ok("logged_out");
        outcome.revoked = revoked;
        outcome.cleared = cleared;
        return outcome;
    }

    private boolean vaultIsEmpty() {
        try {
            return vault.read().isEmpty();
        } catch (VaultKeyException exception) {
            return false;
        }
    }

    public Outcome restore(String apiBase) {
        SessionRecord current;
        try {
            Optional<SessionRecord> stored = vault.read();
            if (stored.isEmpty()) {
                return Outcome.ok("empty");
            }
            current = stored.get();
        } catch (VaultKeyException exception) {
            return Outcome.failure(exception.kind() == VaultKeyException.Kind.INVALIDATED ? "unavailable" : "offline");
        }
        if (!accessExpired(current.accessToken())) {
            JwtIdentity identity = jwtIdentity(current.accessToken());
            return identity("ready", current.accessToken(), identity.userId, identity.role, null, null);
        }
        Outcome renewed = refresh(apiBase);
        if ("refreshed".equals(renewed.kind)) {
            return renewed;
        }
        if ("transient".equals(renewed.kind) || "stale".equals(renewed.kind)) {
            return Outcome.failure("offline");
        }
        if ("unavailable".equals(renewed.kind)) {
            return renewed;
        }
        return Outcome.failure("revoked");
    }

    private Outcome currentOrInvalid() {
        try {
            if (vault.read().isEmpty()) {
                return Outcome.failure("invalid");
            }
            return Outcome.failure("stale");
        } catch (VaultKeyException exception) {
            return Outcome.failure("unavailable");
        }
    }

    private void revokeQuietly(String apiBase, String refreshToken) {
        if (blank(refreshToken)) {
            return;
        }
        try {
            revoke(apiBase, refreshToken);
        } catch (RuntimeException exception) {
            // A falha remota não impede a sessão que ficou no cofre.
        }
    }

    private boolean revoke(String apiBase, String refreshToken) {
        String url = VaultApiBase.endpoint(apiBase, "/auth/logout");
        if (url == null || blank(refreshToken)) {
            return false;
        }
        VaultHttp.Result result = http.post(url, FlatJson.object().put("refresh_token", refreshToken).emit(), headers());
        return result.status == 204 || result.status == 401;
    }

    private boolean accessExpired(String accessToken) {
        JwtIdentity identity = jwtIdentity(accessToken);
        if (identity.expiresAtMillis == null) {
            return true;
        }
        return identity.expiresAtMillis <= clock.getAsLong() + 30_000L;
    }

    private static JwtIdentity jwtIdentity(String accessToken) {
        JwtIdentity identity = new JwtIdentity();
        if (accessToken == null) {
            return identity;
        }
        String[] parts = accessToken.split("\\.");
        if (parts.length < 2) {
            return identity;
        }
        try {
            byte[] decoded = decodeUrl(parts[1]);
            if (decoded == null) {
                return identity;
            }
            FlatJson payload = FlatJson.parse(new String(decoded, StandardCharsets.UTF_8));
            identity.userId = payload.text("sub");
            identity.role = payload.text("role");
            Long expiresAt = payload.longValue("exp");
            if (expiresAt != null) {
                identity.expiresAtMillis = expiresAt * 1000L;
            }
        } catch (RuntimeException exception) {
            return new JwtIdentity();
        }
        return identity;
    }

    private static Map<String, String> headers() {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Accept", "application/json");
        headers.put("X-Auth-Contract", "refresh-v1");
        headers.put("X-Auth-Client", "android");
        return headers;
    }

    private static Outcome identity(String kind, String accessToken, String userId, String role, String phone, String displayName) {
        Outcome outcome = Outcome.ok(kind);
        outcome.accessToken = accessToken;
        outcome.userId = userId;
        outcome.role = role;
        outcome.phone = phone;
        outcome.displayName = displayName;
        return outcome;
    }

    private static String blankToNull(String value) {
        return blank(value) ? null : value;
    }

    private static boolean blank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /** Payload do JWT, sem verificar a assinatura. Não usa java.util.Base64 (API 26). */
    private static byte[] decodeUrl(String segment) {
        int length = segment.length();
        if (length == 0 || length % 4 == 1) {
            return null;
        }
        int padding = length % 4 == 0 ? 0 : 4 - (length % 4);
        int outputLength = ((length + padding) / 4) * 3 - padding;
        byte[] output = new byte[outputLength];
        int buffer = 0;
        int bits = 0;
        int written = 0;
        for (int index = 0; index < length; index++) {
            int value = urlAlphabet(segment.charAt(index));
            if (value < 0) {
                return null;
            }
            buffer = (buffer << 6) | value;
            bits += 6;
            if (bits >= 8 && written < output.length) {
                bits -= 8;
                output[written++] = (byte) ((buffer >> bits) & 0xff);
            }
        }
        return written == output.length ? output : null;
    }

    private static int urlAlphabet(char symbol) {
        if (symbol >= 'A' && symbol <= 'Z') {
            return symbol - 'A';
        }
        if (symbol >= 'a' && symbol <= 'z') {
            return symbol - 'a' + 26;
        }
        if (symbol >= '0' && symbol <= '9') {
            return symbol - '0' + 52;
        }
        if (symbol == '-' || symbol == '+') {
            return 62;
        }
        if (symbol == '_' || symbol == '/') {
            return 63;
        }
        return -1;
    }

    private static final class JwtIdentity {
        private String userId;
        private String role;
        private Long expiresAtMillis;
    }

    /** Resultado sem refresh token. {@link #toString()} também não o inclui. */
    public static final class Outcome {

        public final String kind;
        public String accessToken;
        public String userId;
        public String role;
        public String phone;
        public String displayName;
        public boolean revoked;
        /** Verdadeiro quando o logout retirou a sessão observada, ou quando o cofre já estava vazio. */
        public boolean cleared;

        private Outcome(String kind) {
            this.kind = kind;
        }

        static Outcome ok(String kind) {
            return new Outcome(kind);
        }

        static Outcome failure(String kind) {
            return new Outcome(kind);
        }

        @Override
        public String toString() {
            return kind;
        }
    }
}
