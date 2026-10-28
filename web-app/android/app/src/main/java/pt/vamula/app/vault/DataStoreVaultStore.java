package pt.vamula.app.vault;

import android.content.Context;
import android.util.Base64;
import androidx.datastore.preferences.core.MutablePreferences;
import androidx.datastore.preferences.core.Preferences;
import androidx.datastore.preferences.core.PreferencesKeys;
import androidx.datastore.preferences.rxjava3.RxPreferenceDataStoreBuilder;
import androidx.datastore.rxjava3.RxDataStore;
import io.reactivex.rxjava3.core.Single;

/** Um único valor cifrado. O updateData do DataStore substitui o registo inteiro. */
public final class DataStoreVaultStore implements VaultStore {

    private static final Preferences.Key<String> BLOB = PreferencesKeys.stringKey("session_blob");

    private final RxDataStore<Preferences> dataStore;

    public DataStoreVaultStore(Context context) {
        dataStore = new RxPreferenceDataStoreBuilder(context.getApplicationContext(), VaultFiles.DATASTORE_NAME).build();
    }

    @Override
    public byte[] read() {
        String stored = dataStore
            .data()
            .firstOrError()
            .map(prefs -> {
                String value = prefs.get(BLOB);
                return value == null ? "" : value;
            })
            .onErrorReturnItem("")
            .blockingGet();
        if (stored == null || stored.isEmpty()) {
            return null;
        }
        return Base64.decode(stored, Base64.DEFAULT);
    }

    @Override
    public void write(byte[] blob) {
        String encoded = Base64.encodeToString(blob, Base64.NO_WRAP);
        dataStore
            .updateDataAsync(prefs -> {
                MutablePreferences mutable = prefs.toMutablePreferences();
                mutable.set(BLOB, encoded);
                return Single.just(mutable);
            })
            .blockingGet();
    }

    @Override
    public void delete() {
        dataStore
            .updateDataAsync(prefs -> {
                MutablePreferences mutable = prefs.toMutablePreferences();
                mutable.remove(BLOB);
                return Single.just(mutable);
            })
            .blockingGet();
    }
}
