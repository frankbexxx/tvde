package pt.vamula.app.vault;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Cofre da sessão. A chave de idempotência fica escrita antes de beginRefresh regressar.
 * A ponte e o futuro serviço partilham a mesma instância e o mesmo lock.
 */
public final class SessionVault {

    private final VaultCipher cipher;
    private final VaultStore store;
    private final ReentrantLock lock = new ReentrantLock();
    /** Geração da sessão instalada. Não entra no formato persistido e não acompanha a rotação do token. */
    private int sessionGeneration;

    public SessionVault(VaultCipher cipher, VaultStore store) {
        this.cipher = cipher;
        this.store = store;
    }

    public enum State {
        READY,
        EMPTY,
        UNAVAILABLE
    }

    public State state() {
        lock.lock();
        try {
            byte[] blob = store.read();
            if (blob == null) {
                return State.EMPTY;
            }
            decrypt(blob);
            return State.READY;
        } catch (VaultKeyException exception) {
            if (exception.kind() == VaultKeyException.Kind.INVALIDATED) {
                wipe();
            }
            return State.UNAVAILABLE;
        } finally {
            lock.unlock();
        }
    }

    public Optional<SessionRecord> read() throws VaultKeyException {
        lock.lock();
        try {
            return Optional.ofNullable(load());
        } finally {
            lock.unlock();
        }
    }

    public void save(SessionRecord record) throws VaultKeyException {
        requireSession(record.accessToken(), record.refreshToken(), record.familyId(), record.generation());
        SessionRecord stored = new SessionRecord(
            record.accessToken(),
            record.refreshToken(),
            record.familyId(),
            record.generation(),
            record.absoluteExpiresAt(),
            record.idleExpiresAt(),
            null,
            false
        );
        lock.lock();
        try {
            int next = nextSessionGenerationLocked();
            persist(stored);
            sessionGeneration = next;
        } finally {
            lock.unlock();
        }
    }

    /** Família e geração de sessão vistas debaixo do mesmo lock. O refresh token não entra em {@code toString}. */
    public ObservedSession observe() throws VaultKeyException {
        lock.lock();
        try {
            SessionRecord current = load();
            if (current == null) {
                return ObservedSession.empty();
            }
            return new ObservedSession(current.familyId(), adoptSessionGenerationLocked(), current.refreshToken());
        } finally {
            lock.unlock();
        }
    }

    /**
     * Apaga só se o cofre ainda tiver a sessão observada. Cofre vazio ou sessão substituída ficam como estão.
     */
    public boolean clearIfSameSession(String familyId, int observedSessionGeneration) {
        if (familyId == null || familyId.trim().isEmpty() || observedSessionGeneration <= 0) {
            return false;
        }
        lock.lock();
        try {
            SessionRecord current = load();
            if (current == null) {
                return false;
            }
            if (!familyId.equals(current.familyId()) || observedSessionGeneration != adoptSessionGenerationLocked()) {
                return false;
            }
            wipe();
            return true;
        } catch (VaultKeyException exception) {
            return false;
        } finally {
            lock.unlock();
        }
    }

    /** Apaga só se a operação de refresh observada ainda for a que está pendente. */
    public boolean clearIfSameRefresh(RefreshLease lease) {
        lock.lock();
        try {
            if (!sameOperation(load(), lease)) {
                return false;
            }
            wipe();
            return true;
        } catch (VaultKeyException exception) {
            return false;
        } finally {
            lock.unlock();
        }
    }

    public RefreshLease beginRefresh() throws VaultKeyException {
        lock.lock();
        try {
            SessionRecord current = load();
            if (current == null) {
                throw new IllegalStateException("session_absent");
            }
            if (current.refreshPending() && current.idempotencyKey() != null) {
                return lease(current, true);
            }
            SessionRecord pending = current.pending(UUID.randomUUID().toString());
            persist(pending);
            return lease(pending, false);
        } finally {
            lock.unlock();
        }
    }

    /**
     * Grava a sessão rodada só se o cofre ainda tiver a operação de {@code lease}.
     * Não cria sessão quando o logout, outra conta ou outra rotação já ganharam.
     */
    public void completeRefresh(RefreshLease lease, SessionRecord rotated) throws VaultKeyException, StaleRefreshException {
        requireSession(rotated.accessToken(), rotated.refreshToken(), rotated.familyId(), rotated.generation());
        SessionRecord stored = new SessionRecord(
            rotated.accessToken(),
            rotated.refreshToken(),
            rotated.familyId(),
            rotated.generation(),
            rotated.absoluteExpiresAt(),
            rotated.idleExpiresAt(),
            null,
            false
        );
        lock.lock();
        try {
            SessionRecord current = load();
            if (!sameOperation(current, lease) || !lease.familyId().equals(rotated.familyId())) {
                throw new StaleRefreshException();
            }
            persist(stored);
        } finally {
            lock.unlock();
        }
    }

    public void clear() {
        lock.lock();
        try {
            wipe();
        } finally {
            lock.unlock();
        }
    }

    private SessionRecord load() throws VaultKeyException {
        byte[] blob = store.read();
        if (blob == null) {
            return null;
        }
        try {
            return SessionCodec.decode(decrypt(blob));
        } catch (IOException exception) {
            wipe();
            throw new VaultKeyException(VaultKeyException.Kind.INVALIDATED);
        }
    }

    private byte[] decrypt(byte[] blob) throws VaultKeyException {
        try {
            return cipher.decrypt(blob);
        } catch (VaultKeyException exception) {
            if (exception.kind() == VaultKeyException.Kind.INVALIDATED) {
                wipe();
            }
            throw exception;
        }
    }

    private void persist(SessionRecord record) throws VaultKeyException {
        try {
            store.write(cipher.encrypt(SessionCodec.encode(record)));
        } catch (VaultKeyException exception) {
            if (exception.kind() == VaultKeyException.Kind.INVALIDATED) {
                wipe();
            }
            throw exception;
        }
    }

    private void wipe() {
        store.delete();
        cipher.destroy();
        sessionGeneration = 0;
    }

    private int adoptSessionGenerationLocked() {
        if (sessionGeneration <= 0) {
            sessionGeneration = 1;
        }
        return sessionGeneration;
    }

    private int nextSessionGenerationLocked() {
        int next = sessionGeneration + 1;
        return next <= 0 ? 1 : next;
    }

    private static boolean sameOperation(SessionRecord current, RefreshLease lease) {
        if (current == null || lease == null || lease.familyId() == null || lease.idempotencyKey() == null) {
            return false;
        }
        return (
            current.refreshPending() &&
            lease.generation() == current.generation() &&
            lease.familyId().equals(current.familyId()) &&
            lease.idempotencyKey().equals(current.idempotencyKey())
        );
    }

    private static RefreshLease lease(SessionRecord record, boolean resumed) {
        return new RefreshLease(
            record.idempotencyKey(),
            record.refreshToken(),
            record.familyId(),
            record.generation(),
            resumed
        );
    }

    private static void requireSession(String access, String refresh, String familyId, int generation)
        throws VaultKeyException {
        if (access == null || access.trim().isEmpty() || refresh == null || refresh.trim().isEmpty() || familyId == null || familyId.trim().isEmpty() || generation < 1) {
            throw new VaultKeyException(VaultKeyException.Kind.TRANSIENT);
        }
    }

    /** Observação atómica. Não inclui o refresh token em {@link #toString()}. */
    public static final class ObservedSession {
        private final String familyId;
        private final int sessionGeneration;
        private final String refreshToken;

        private ObservedSession(String familyId, int sessionGeneration, String refreshToken) {
            this.familyId = familyId;
            this.sessionGeneration = sessionGeneration;
            this.refreshToken = refreshToken;
        }

        static ObservedSession empty() {
            return new ObservedSession(null, 0, null);
        }

        public boolean present() {
            return familyId != null && !familyId.trim().isEmpty();
        }

        public String familyId() {
            return familyId == null ? "" : familyId;
        }

        public int sessionGeneration() {
            return sessionGeneration;
        }

        public String refreshToken() {
            return refreshToken == null ? "" : refreshToken;
        }

        @Override
        public String toString() {
            return "ObservedSession{present=" + present() + ",sessionGeneration=" + sessionGeneration + "}";
        }
    }
}
