package pt.vamula.app.vault;

public interface VaultCipher {

    byte[] encrypt(byte[] plaintext) throws VaultKeyException;

    byte[] decrypt(byte[] ciphertext) throws VaultKeyException;

    /** Apaga a chave. O chamador já removeu o ciphertext. */
    void destroy();
}
