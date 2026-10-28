package pt.vamula.app.vault;

/** Caminho do DataStore. O mesmo valor tem de estar excluído dos backups. */
public final class VaultFiles {

    public static final String DATASTORE_NAME = "vamula_session";
    public static final String DIRECTORY = "datastore";
    public static final String RELATIVE_PATH = "datastore/vamula_session.preferences_pb";

    private VaultFiles() {}
}
