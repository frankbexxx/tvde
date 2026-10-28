package pt.vamula.app.vault;

public interface VaultStore {

    byte[] read();

    /** Substitui o blob inteiro. A implementação tem de ser atómica. */
    void write(byte[] blob);

    void delete();
}
