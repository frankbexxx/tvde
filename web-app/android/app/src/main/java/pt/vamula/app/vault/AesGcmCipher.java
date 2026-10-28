package pt.vamula.app.vault;

import java.security.GeneralSecurityException;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** AES-GCM com uma chave já existente. A cifra pede o IV ao Keystore. */
public final class AesGcmCipher implements VaultCipher {

    static final int IV_LENGTH = 12;
    static final int TAG_BITS = 128;
    private static final byte[] AAD = "vamula-session-vault-v1".getBytes(java.nio.charset.StandardCharsets.UTF_8);

    private final KeySource keys;

    public AesGcmCipher(KeySource keys) {
        this.keys = keys;
    }

    @Override
    public byte[] encrypt(byte[] plaintext) throws VaultKeyException {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keys.getOrCreate());
            byte[] iv = cipher.getIV();
            if (iv == null || iv.length != IV_LENGTH) {
                throw new VaultKeyException(VaultKeyException.Kind.TRANSIENT);
            }
            cipher.updateAAD(AAD);
            byte[] body = cipher.doFinal(plaintext);
            byte[] packed = new byte[iv.length + body.length];
            System.arraycopy(iv, 0, packed, 0, iv.length);
            System.arraycopy(body, 0, packed, iv.length, body.length);
            return packed;
        } catch (VaultKeyException exception) {
            throw exception;
        } catch (GeneralSecurityException exception) {
            throw new VaultKeyException(VaultKeyException.Kind.TRANSIENT);
        }
    }

    @Override
    public byte[] decrypt(byte[] ciphertext) throws VaultKeyException {
        if (ciphertext == null || ciphertext.length <= IV_LENGTH) {
            throw new VaultKeyException(VaultKeyException.Kind.INVALIDATED);
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            byte[] iv = new byte[IV_LENGTH];
            System.arraycopy(ciphertext, 0, iv, 0, IV_LENGTH);
            cipher.init(Cipher.DECRYPT_MODE, keys.getOrCreate(), new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(AAD);
            return cipher.doFinal(ciphertext, IV_LENGTH, ciphertext.length - IV_LENGTH);
        } catch (VaultKeyException exception) {
            throw exception;
        } catch (GeneralSecurityException exception) {
            throw new VaultKeyException(failureKind(exception));
        }
    }

    @Override
    public void destroy() {
        try {
            keys.destroy();
        } catch (VaultKeyException ignored) {
            // A limpeza do ciphertext já aconteceu.
        }
    }

    private static VaultKeyException.Kind failureKind(GeneralSecurityException exception) {
        String name = exception.getClass().getName();
        if (name.endsWith("AEADBadTagException") || name.endsWith("KeyPermanentlyInvalidatedException")) {
            return VaultKeyException.Kind.INVALIDATED;
        }
        return VaultKeyException.Kind.TRANSIENT;
    }

    public interface KeySource {

        SecretKey getOrCreate() throws VaultKeyException;

        void destroy() throws VaultKeyException;
    }
}
