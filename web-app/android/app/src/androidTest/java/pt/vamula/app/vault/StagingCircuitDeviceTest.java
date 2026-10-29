package pt.vamula.app.vault;

import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.util.Base64;
import android.util.Log;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Prova controlada no emulador. Não limpa a sessão no arranque e não regista segredos.
 * O modo vem do argumento de instrumentação {@code mode}.
 */
@RunWith(AndroidJUnit4.class)
public class StagingCircuitDeviceTest {

    private static final String TAG = "VAMULA_PROOF";
    private static final String API = "https://tvde-staging-api.onrender.com";
    private static final String HELD = "staging-proof-refresh.bin";

    @Test
    public void runRequestedMode() throws Exception {
        String mode = InstrumentationRegistry.getArguments().getString("mode", "inspect");
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ExecutorService worker = Executors.newSingleThreadExecutor();
        try {
            worker.submit(() -> {
                try {
                    execute(mode, context);
                    return null;
                } catch (Exception exception) {
                    Log.i(TAG, "FAIL=" + exception.getClass().getSimpleName());
                    throw new RuntimeException(exception.getClass().getSimpleName());
                }
            }).get(70, TimeUnit.SECONDS);
        } finally {
            worker.shutdownNow();
        }
    }

    private static void execute(String mode, Context context) throws Exception {
        SessionVault vault = SessionVaults.get(context);
        if ("inspect".equals(mode)) {
            inspect(vault, context);
            return;
        }
        if ("expire-access".equals(mode)) {
            SessionRecord current = vault.read().orElseThrow();
            vault.save(new SessionRecord(
                expiredAccess(),
                current.refreshToken(),
                current.familyId(),
                Math.max(1, current.generation()),
                current.absoluteExpiresAt(),
                current.idleExpiresAt(),
                null,
                false
            ));
            Log.i(TAG, "EXPIRED=true");
            inspect(vault, context);
            return;
        }
        if ("hold-refresh".equals(mode)) {
            SessionRecord current = vault.read().orElseThrow();
            File file = new File(context.getFilesDir(), HELD);
            try (FileOutputStream output = new FileOutputStream(file)) {
                output.write(current.refreshToken().getBytes(StandardCharsets.UTF_8));
            }
            Log.i(TAG, "HELD=true");
            return;
        }
        if ("prove-held".equals(mode)) {
            File file = new File(context.getFilesDir(), HELD);
            byte[] stored = readFile(file);
            file.delete();
            String refresh = new String(stored, StandardCharsets.UTF_8);
            String body = FlatJson.object()
                .put("refresh_token", refresh)
                .put("idempotency_key", UUID.randomUUID().toString())
                .emit();
            java.util.Map<String, String> headers = new java.util.LinkedHashMap<>();
            headers.put("Content-Type", "application/json");
            headers.put("Accept", "application/json");
            headers.put("X-Auth-Contract", "refresh-v1");
            headers.put("X-Auth-Client", "android");
            VaultHttp.Result result = new HttpUrlVaultHttp().post(API + "/auth/refresh", body, headers);
            Log.i(TAG, "HELD_HTTP=" + result.status);
            return;
        }
        if ("restore".equals(mode)) {
            AndroidRefreshCoordinator.Outcome outcome = new AndroidRefreshCoordinator(vault, new HttpUrlVaultHttp()).restore(API);
            Log.i(TAG, "RESTORE_KIND=" + outcome.kind);
            inspect(vault, context);
            return;
        }
        if ("concurrent-refresh".equals(mode)) {
            SessionRecord before = vault.read().orElseThrow();
            java.util.List<String> keys = java.util.Collections.synchronizedList(new java.util.ArrayList<>());
            VaultHttp http = (url, json, headers) -> {
                if (url.endsWith("/auth/refresh")) {
                    try {
                        keys.add(FlatJson.parse(json).text("idempotency_key"));
                    } catch (RuntimeException exception) {
                        keys.add("unreadable");
                    }
                }
                return new HttpUrlVaultHttp().post(url, json, headers);
            };
            AndroidRefreshCoordinator coordinator = new AndroidRefreshCoordinator(vault, http);
            ExecutorService pool = Executors.newFixedThreadPool(2);
            try {
                java.util.concurrent.Future<String> first = pool.submit(() -> coordinator.refresh(API).kind);
                java.util.concurrent.Future<String> second = pool.submit(() -> coordinator.refresh(API).kind);
                Log.i(TAG, "KIND_A=" + first.get(60, TimeUnit.SECONDS));
                Log.i(TAG, "KIND_B=" + second.get(60, TimeUnit.SECONDS));
            } finally {
                pool.shutdownNow();
            }
            java.util.Set<String> distinct = new java.util.HashSet<>(keys);
            Log.i(TAG, "HTTP_KEYS=" + distinct.size());
            Log.i(TAG, "HTTP_CALLS=" + keys.size());
            inspect(vault, context);
            Log.i(TAG, "SAME_FAMILY=" + before.familyId().equals(vault.read().orElseThrow().familyId()));
            return;
        }
        if ("seed-and-late".equals(mode)) {
            vault.save(new SessionRecord("access-local", "refresh-local", "family-local", 1, null, null, null, false));
            RefreshLease lease = vault.beginRefresh();
            vault.clear();
            boolean stale = false;
            try {
                vault.completeRefresh(
                    lease,
                    new SessionRecord("access-late", "refresh-late", lease.familyId(), lease.generation() + 1, null, null, null, false)
                );
            } catch (StaleRefreshException exception) {
                stale = true;
            }
            Log.i(TAG, "LATE_REJECTED=" + stale);
            Log.i(TAG, "EMPTY=" + vault.read().isEmpty());
            return;
        }
        if ("late-clear".equals(mode)) {
            RefreshLease lease = vault.beginRefresh();
            vault.clear();
            boolean stale = false;
            try {
                vault.completeRefresh(lease, new SessionRecord("access-late", "refresh-late", lease.familyId(), lease.generation() + 1, null, null, null, false));
            } catch (StaleRefreshException exception) {
                stale = true;
            }
            Log.i(TAG, "LATE_REJECTED=" + stale);
            Log.i(TAG, "EMPTY=" + vault.read().isEmpty());
            return;
        }
        throw new IllegalArgumentException("mode");
    }

    private static void inspect(SessionVault vault, Context context) throws Exception {
        SessionRecord record = vault.read().orElse(null);
        if (record == null) {
            Log.i(TAG, "EMPTY=true");
            return;
        }
        File blob = new File(context.getFilesDir(), VaultFiles.RELATIVE_PATH);
        byte[] stored = blob.isFile() ? readFile(blob) : new byte[0];
        String text = new String(stored, StandardCharsets.ISO_8859_1);
        Log.i(TAG, "EMPTY=false");
        Log.i(TAG, "GENERATION=" + record.generation());
        Log.i(TAG, "FAMILY=" + record.familyId());
        Log.i(TAG, "PENDING=" + record.refreshPending());
        Log.i(TAG, "HAS_REFRESH=" + (record.refreshToken() != null && !record.refreshToken().trim().isEmpty()));
        Log.i(TAG, "ACCESS_HASH=" + hash(record.accessToken()));
        Log.i(TAG, "REFRESH_HASH=" + hash(record.refreshToken()));
        Log.i(TAG, "FILE_LEAK=" + (text.contains(record.accessToken()) || text.contains(record.refreshToken())));
        Log.i(TAG, "KEY_EXPORTABLE=" + (new AndroidKeystoreKeys().getOrCreate().getEncoded() != null));
        assertTrue(record.familyId() != null && !record.familyId().trim().isEmpty());
    }

    private static String expiredAccess() {
        String header = Base64.encodeToString("{\"alg\":\"none\"}".getBytes(StandardCharsets.UTF_8), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        String payload = Base64.encodeToString("{\"sub\":\"user-1\",\"role\":\"driver\",\"exp\":1}".getBytes(StandardCharsets.UTF_8), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        return header + "." + payload + ".x";
    }

    private static String hash(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder output = new StringBuilder();
        for (int index = 0; index < 6; index++) {
            output.append(String.format("%02x", digest[index]));
        }
        return output.toString();
    }

    private static byte[] readFile(File file) throws Exception {
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[(int) file.length()];
            int offset = 0;
            while (offset < buffer.length) {
                int count = input.read(buffer, offset, buffer.length - offset);
                if (count < 0) {
                    break;
                }
                offset += count;
            }
            return buffer;
        }
    }
}
