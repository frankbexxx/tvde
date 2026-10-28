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
            persist(stored);
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
}
