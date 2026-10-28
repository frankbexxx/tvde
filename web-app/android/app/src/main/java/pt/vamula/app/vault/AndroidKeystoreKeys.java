package pt.vamula.app.vault;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/** Chave AES que não sai do Android Keystore. Sem autenticação de ecrã, para o futuro serviço. */
public final class AndroidKeystoreKeys implements AesGcmCipher.KeySource {

    static final String ALIAS = "vamula_session_vault_v1";
    private static final String STORE = "AndroidKeyStore";

    @Override
    public SecretKey getOrCreate() throws VaultKeyException {
        try {
            KeyStore keyStore = keyStore();
            if (keyStore.containsAlias(ALIAS)) {
                return (SecretKey) keyStore.getKey(ALIAS, null);
            }
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, STORE);
            generator.init(
                new KeyGenParameterSpec.Builder(
                    ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .setRandomizedEncryptionRequired(true)
                    .build()
            );
            return generator.generateKey();
        } catch (GeneralSecurityException exception) {
            throw new VaultKeyException(invalidated(exception));
        }
    }

    @Override
    public void destroy() throws VaultKeyException {
        try {
            KeyStore keyStore = keyStore();
            if (keyStore.containsAlias(ALIAS)) {
                keyStore.deleteEntry(ALIAS);
            }
        } catch (GeneralSecurityException exception) {
            throw new VaultKeyException(VaultKeyException.Kind.TRANSIENT);
        }
    }

    private static KeyStore keyStore() throws GeneralSecurityException {
        try {
            KeyStore keyStore = KeyStore.getInstance(STORE);
            keyStore.load(null);
            return keyStore;
        } catch (IOException exception) {
            throw new KeyStoreException("keystore_unavailable");
        }
    }

    private static VaultKeyException.Kind invalidated(GeneralSecurityException exception) {
        String name = exception.getClass().getName();
        if (
            name.endsWith("KeyPermanentlyInvalidatedException") ||
            name.endsWith("UnrecoverableKeyException")
        ) {
            return VaultKeyException.Kind.INVALIDATED;
        }
        return VaultKeyException.Kind.TRANSIENT;
    }
}
