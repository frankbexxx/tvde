package pt.vamula.app.vault;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.Key;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.junit.Test;

public class SessionVaultTest {

    @Test
    public void storesAndReadsTheWholeSession() throws Exception {
        SessionVault vault = vault();
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        SessionRecord read = vault.read().orElseThrow();
        assertEquals("access-1", read.accessToken());
        assertEquals("refresh-1", read.refreshToken());
        assertEquals("family-1", read.familyId());
        assertEquals(1, read.generation());
        assertEquals("abs", read.absoluteExpiresAt());
        assertEquals("idle", read.idleExpiresAt());
        assertFalse(read.refreshPending());
        assertEquals(SessionVault.State.READY, vault.state());
    }

    @Test
    public void publicFieldsOmitTheRefreshTokenAndIdempotencyKey() throws Exception {
        SessionVault vault = vault();
        vault.save(session("access-1", "refresh-secret", "family-1", 2));
        vault.beginRefresh();
        Map<String, Object> fields = vault.read().orElseThrow().publicFields();
        assertFalse(fields.containsKey("refreshToken"));
        assertFalse(fields.containsKey("idempotencyKey"));
        assertEquals(Boolean.TRUE, fields.get("hasRefresh"));
        assertEquals("access-1", fields.get("accessToken"));
        assertFalse(fields.toString().contains("refresh-secret"));
    }

    @Test
    public void concurrentSavesKeepOneCompleteRecord() throws Exception {
        SessionVault vault = vault();
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> tasks = new ArrayList<>();
        var pool = Executors.newFixedThreadPool(4);
        try {
            for (int index = 0; index < 4; index++) {
                int id = index;
                tasks.add(pool.submit(() -> {
                    start.await();
                    vault.save(session("access-" + id, "refresh-" + id, "family-" + id, id + 1));
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> task : tasks) {
                task.get();
            }
        } finally {
            pool.shutdownNow();
        }
        SessionRecord read = vault.read().orElseThrow();
        String id = read.accessToken().substring("access-".length());
        assertEquals("refresh-" + id, read.refreshToken());
        assertEquals("family-" + id, read.familyId());
    }

    @Test
    public void beginRefreshPersistsTheKeyBeforeReturningAndSurvivesRestart() throws Exception {
        MemoryStore store = new MemoryStore();
        AesGcmCipher cipher = cipher();
        SessionVault vault = new SessionVault(cipher, store);
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        RefreshLease first = vault.beginRefresh();
        SessionRecord persisted = new SessionVault(cipher, store).read().orElseThrow();
        assertTrue(persisted.refreshPending());
        assertEquals(first.idempotencyKey(), persisted.idempotencyKey());
        assertEquals("refresh-1", persisted.refreshToken());

        RefreshLease resumed = new SessionVault(cipher, store).beginRefresh();
        assertTrue(resumed.resumed());
        assertEquals(first.idempotencyKey(), resumed.idempotencyKey());
        assertEquals("refresh-1", resumed.refreshToken());
    }

    @Test
    public void concurrentBeginRefreshSharesOneKey() throws Exception {
        SessionVault vault = vault();
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        CountDownLatch start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(4);
        List<Future<RefreshLease>> tasks = new ArrayList<>();
        try {
            for (int index = 0; index < 4; index++) {
                tasks.add(pool.submit(() -> {
                    start.await();
                    return vault.beginRefresh();
                }));
            }
            start.countDown();
            String key = tasks.get(0).get().idempotencyKey();
            for (Future<RefreshLease> task : tasks) {
                assertEquals(key, task.get().idempotencyKey());
            }
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    public void rotationReplacesTheSessionAndClearsThePendingKey() throws Exception {
        SessionVault vault = vault();
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        RefreshLease lease = vault.beginRefresh();
        vault.completeRefresh(lease, session("access-2", "refresh-2", "family-1", 2));
        SessionRecord read = vault.read().orElseThrow();
        assertEquals("access-2", read.accessToken());
        assertEquals("refresh-2", read.refreshToken());
        assertEquals(2, read.generation());
        assertFalse(read.refreshPending());
        assertNull(read.idempotencyKey());
        RefreshLease next = vault.beginRefresh();
        assertFalse(next.resumed());
        assertNotEquals(lease.idempotencyKey(), next.idempotencyKey());
    }

    @Test
    public void storedBlobDoesNotContainTheTokens() throws Exception {
        MemoryStore store = new MemoryStore();
        SessionVault vault = new SessionVault(cipher(), store);
        vault.save(session("access-plain-token", "refresh-plain-token", "family-1", 1));
        String stored = new String(store.read(), StandardCharsets.ISO_8859_1);
        assertFalse(stored.contains("access-plain-token"));
        assertFalse(stored.contains("refresh-plain-token"));
    }

    @Test
    public void logoutDuringRefreshRejectsTheLateCompletion() throws Exception {
        TrackingKeys keys = keys();
        SessionVault vault = new SessionVault(new AesGcmCipher(keys), new MemoryStore());
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        RefreshLease lease = vault.beginRefresh();
        vault.clear();
        int usesAfterClear = keys.uses;
        assertThrows(StaleRefreshException.class, () ->
            vault.completeRefresh(lease, session("access-2", "refresh-2", "family-1", 2))
        );
        assertEquals(usesAfterClear, keys.uses);
        assertTrue(vault.read().isEmpty());
        assertEquals(SessionVault.State.EMPTY, vault.state());
        assertTrue(keys.destroyed);
    }

    @Test
    public void accountSwitchRejectsThePreviousRefresh() throws Exception {
        SessionVault vault = vault();
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        RefreshLease lease = vault.beginRefresh();
        vault.save(session("access-b", "refresh-b", "family-b", 1));
        assertThrows(StaleRefreshException.class, () ->
            vault.completeRefresh(lease, session("access-2", "refresh-2", "family-1", 2))
        );
        SessionRecord read = vault.read().orElseThrow();
        assertEquals("family-b", read.familyId());
        assertEquals("access-b", read.accessToken());
        assertEquals("refresh-b", read.refreshToken());
        assertFalse(read.refreshPending());
    }

    @Test
    public void outOfOrderCompletionCannotReplaceTheLaterSession() throws Exception {
        SessionVault vault = vault();
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        RefreshLease first = vault.beginRefresh();
        vault.completeRefresh(first, session("access-2", "refresh-2", "family-1", 2));
        RefreshLease second = vault.beginRefresh();
        assertThrows(StaleRefreshException.class, () ->
            vault.completeRefresh(first, session("access-9", "refresh-9", "family-1", 9))
        );
        vault.completeRefresh(second, session("access-3", "refresh-3", "family-1", 3));
        assertThrows(StaleRefreshException.class, () ->
            vault.completeRefresh(first, session("access-8", "refresh-8", "family-1", 8))
        );
        assertThrows(StaleRefreshException.class, () -> vault.completeRefresh(second, session("access-7", "refresh-7", "family-1", 7)));
        SessionRecord read = vault.read().orElseThrow();
        assertEquals("access-3", read.accessToken());
        assertEquals("refresh-3", read.refreshToken());
        assertEquals(3, read.generation());
        assertFalse(read.refreshPending());
    }

    @Test
    public void clearRemovesTheSession() throws Exception {
        TrackingKeys keys = keys();
        SessionVault vault = new SessionVault(new AesGcmCipher(keys), new MemoryStore());
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        vault.clear();
        assertTrue(vault.read().isEmpty());
        assertEquals(SessionVault.State.EMPTY, vault.state());
        assertTrue(keys.destroyed);
    }

    @Test
    public void invalidatedKeyWipesTheStoredBlob() throws Exception {
        TrackingKeys keys = keys();
        MemoryStore store = new MemoryStore();
        SessionVault vault = new SessionVault(new AesGcmCipher(keys), store);
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        keys.current = newKey();
        assertEquals(SessionVault.State.UNAVAILABLE, vault.state());
        assertNull(store.read());
        assertTrue(keys.destroyed);
    }

    @Test
    public void transientKeyFailureKeepsTheStoredBlob() throws Exception {
        TrackingKeys keys = keys();
        MemoryStore store = new MemoryStore();
        SessionVault vault = new SessionVault(new AesGcmCipher(keys), store);
        vault.save(session("access-1", "refresh-1", "family-1", 1));
        byte[] before = store.read();
        keys.failure = new VaultKeyException(VaultKeyException.Kind.TRANSIENT);
        assertEquals(SessionVault.State.UNAVAILABLE, vault.state());
        assertTrue(java.util.Arrays.equals(before, store.read()));
        assertFalse(keys.destroyed);
    }

    @Test
    public void backupRulesExcludeTheDatastoreFileFromCloudAndDeviceTransfer() throws Exception {
        String directory = "path=\"" + VaultFiles.DIRECTORY + "\"";
        String backup = read("src/main/res/xml/backup_rules.xml");
        String transfer = read("src/main/res/xml/data_extraction_rules.xml");
        String manifest = read("src/main/AndroidManifest.xml");
        assertTrue(VaultFiles.RELATIVE_PATH.startsWith(VaultFiles.DIRECTORY + "/"));
        assertTrue(backup.contains(directory));
        assertFalse(backup.contains("preferences_pb"));
        assertTrue(transfer.contains("cloud-backup"));
        assertTrue(transfer.contains("device-transfer"));
        assertEquals(2, count(transfer, directory));
        assertFalse(transfer.contains("preferences_pb"));
        assertTrue(manifest.contains("android:fullBackupContent"));
        assertTrue(manifest.contains("android:dataExtractionRules"));
        assertTrue(manifest.contains("@xml/backup_rules"));
        assertTrue(manifest.contains("@xml/data_extraction_rules"));
    }

    private static int count(String text, String needle) {
        int found = 0;
        int from = 0;
        while (true) {
            int index = text.indexOf(needle, from);
            if (index < 0) {
                return found;
            }
            found++;
            from = index + needle.length();
        }
    }

    private static String read(String path) throws IOException {
        try (InputStream in = new FileInputStream(path)) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096];
            int read;
            while ((read = in.read(chunk)) >= 0) {
                buffer.write(chunk, 0, read);
            }
            return buffer.toString(StandardCharsets.UTF_8);
        }
    }

    private static SessionVault vault() throws GeneralSecurityException {
        return new SessionVault(new AesGcmCipher(keys()), new MemoryStore());
    }

    private static AesGcmCipher cipher() throws GeneralSecurityException {
        return new AesGcmCipher(keys());
    }

    private static TrackingKeys keys() throws GeneralSecurityException {
        return new TrackingKeys(newKey());
    }

    private static SecretKey newKey() throws GeneralSecurityException {
        KeyGenerator generator = KeyGenerator.getInstance("AES");
        generator.init(256);
        return generator.generateKey();
    }

    private static SessionRecord session(String access, String refresh, String family, int generation) {
        return new SessionRecord(access, refresh, family, generation, "abs", "idle", null, false);
    }

    private static final class MemoryStore implements VaultStore {

        private byte[] blob;

        @Override
        public synchronized byte[] read() {
            return blob == null ? null : blob.clone();
        }

        @Override
        public synchronized void write(byte[] value) {
            blob = value.clone();
        }

        @Override
        public synchronized void delete() {
            blob = null;
        }
    }

    private static final class TrackingKeys implements AesGcmCipher.KeySource {

        private Key current;
        private VaultKeyException failure;
        private boolean destroyed;
        private int uses;

        private TrackingKeys(SecretKey key) {
            this.current = key;
        }

        @Override
        public SecretKey getOrCreate() throws VaultKeyException {
            uses++;
            if (failure != null) {
                throw failure;
            }
            return (SecretKey) current;
        }

        @Override
        public void destroy() {
            destroyed = true;
            current = null;
        }
    }
}
