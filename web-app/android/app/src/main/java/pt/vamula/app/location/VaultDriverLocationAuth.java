package pt.vamula.app.location;

import pt.vamula.app.vault.AndroidRefreshCoordinator;
import pt.vamula.app.vault.SessionRecord;
import pt.vamula.app.vault.SessionVault;
import pt.vamula.app.vault.VaultKeyException;

/** Lê o access token no SessionVault e renova pelo coordenador já existente. */
public final class VaultDriverLocationAuth implements DriverLocationAuth {

    private final SessionVault vault;
    private final AndroidRefreshCoordinator coordinator;

    public VaultDriverLocationAuth(SessionVault vault, AndroidRefreshCoordinator coordinator) {
        this.vault = vault;
        this.coordinator = coordinator;
    }

    @Override
    public String accessToken() {
        try {
            return vault.read().map(SessionRecord::accessToken).orElse(null);
        } catch (VaultKeyException exception) {
            return null;
        }
    }

    @Override
    public String sessionFamily() {
        try {
            return vault.read().map(SessionRecord::familyId).orElse("");
        } catch (VaultKeyException exception) {
            return "";
        }
    }

    @Override
    public Refresh refresh(String apiBase) {
        AndroidRefreshCoordinator.Outcome outcome = coordinator.refresh(apiBase);
        if ("refreshed".equals(outcome.kind)) {
            return Refresh.success(outcome.accessToken);
        }
        if ("invalid".equals(outcome.kind)) {
            return Refresh.invalid();
        }
        return Refresh.transientFailure();
    }
}
