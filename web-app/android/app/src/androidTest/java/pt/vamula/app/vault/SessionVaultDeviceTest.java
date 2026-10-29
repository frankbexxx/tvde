package pt.vamula.app.vault;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.os.Build;
import android.util.Base64;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import javax.crypto.SecretKey;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Keystore e DataStore reais. Corre fora da thread principal e só dentro desta app. */
@RunWith(AndroidJUnit4.class)
public class SessionVaultDeviceTest {

    private static final String ACCESS = "access-probe-token";
    private static final String REFRESH = "refresh-probe-token";

    private Context context;
    private ExecutorService worker;
    private SessionVault vault;

    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        worker = Executors.newSingleThreadExecutor();
        vault = new SessionVault(new AesGcmCipher(new AndroidKeystoreKeys()), new DataStoreVaultStore(context));
        call(() -> {
            vault.clear();
            return null;
        });
    }

    @After
    public void tearDown() {
        if (vault != null && worker != null) {
            call(() -> {
                vault.clear();
                return null;
            });
        }
        if (worker != null) {
            worker.shutdownNow();
        }
    }

    @Test
    public void keystoreRoundTripAndDatastoreKeepTokensOutOfTheFile() throws Exception {
        assertTrue(Build.VERSION.SDK_INT >= 24);
        SecretKey key = new AndroidKeystoreKeys().getOrCreate();
        assertNull(key.getEncoded());
        assertTrue(key.getClass().getName().contains("AndroidKeyStore"));

        call(() -> {
            vault.save(new SessionRecord(ACCESS, REFRESH, "family-probe", 1, "abs", "idle", null, false));
            return null;
        });
        SessionRecord read = call(() -> vault.read().orElseThrow());
        assertEquals(ACCESS, read.accessToken());
        assertEquals(REFRESH, read.refreshToken());
        assertEquals(1, read.generation());

        File blob = new File(context.getFilesDir(), VaultFiles.RELATIVE_PATH);
        assertTrue(blob.isFile());
        String stored = new String(readFile(blob), StandardCharsets.ISO_8859_1);
        assertFalse(stored.contains(ACCESS));
        assertFalse(stored.contains(REFRESH));
        assertTrue(blob.getParentFile().getName().equals(VaultFiles.DIRECTORY));

        byte[] sample = Base64.decode(Base64.encodeToString(new byte[] { 1, 2, 3 }, Base64.NO_WRAP), Base64.DEFAULT);
        assertEquals(3, sample.length);

        RefreshLease lease = call(vault::beginRefresh);
        call(() -> {
            vault.clear();
            return null;
        });
        try {
            call(() -> {
                vault.completeRefresh(
                    lease,
                    new SessionRecord("access-2", "refresh-2", "family-probe", 2, "abs", "idle", null, false)
                );
                return null;
            });
            throw new AssertionError("late refresh was stored");
        } catch (RuntimeException exception) {
            assertTrue(causedByStaleRefresh(exception));
        }
        assertTrue(call(() -> vault.read().isEmpty()));
        assertNotNull(vault);
    }

    private byte[] readFile(File file) throws Exception {
        try (FileInputStream in = new FileInputStream(file)) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096];
            int count;
            while ((count = in.read(chunk)) >= 0) {
                buffer.write(chunk, 0, count);
            }
            return buffer.toByteArray();
        }
    }

    private static boolean causedByStaleRefresh(Throwable exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof StaleRefreshException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private <T> T call(Callable<T> action) {
        Future<T> future = worker.submit(action);
        try {
            return future.get();
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }
}
