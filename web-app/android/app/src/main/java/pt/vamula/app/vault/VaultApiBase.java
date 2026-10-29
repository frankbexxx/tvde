package pt.vamula.app.vault;

import java.net.URI;
import java.util.Set;

/**
 * O refresh token só segue para a API da Vamulá ou para o loopback de desenvolvimento.
 * Um endereço rejeitado não chega a abrir ligação.
 */
public final class VaultApiBase {

    private static final Set<String> HTTPS_HOSTS = Set.of(
        "tvde-api-fd2z.onrender.com",
        "tvde-staging-api.onrender.com"
    );
    private static final Set<String> LOOPBACK = Set.of("localhost", "127.0.0.1", "10.0.2.2");

    private VaultApiBase() {}

    public static String endpoint(String base, String path) {
        if (base == null || path == null || !path.startsWith("/")) {
            return null;
        }
        URI uri;
        try {
            uri = URI.create(base.trim());
        } catch (IllegalArgumentException exception) {
            return null;
        }
        if (uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null) {
            return null;
        }
        String host = uri.getHost();
        String scheme = uri.getScheme();
        if (host == null || scheme == null) {
            return null;
        }
        boolean loopback = LOOPBACK.contains(host);
        if ("https".equals(scheme)) {
            if (!HTTPS_HOSTS.contains(host) && !loopback) {
                return null;
            }
        } else if ("http".equals(scheme)) {
            if (!loopback) {
                return null;
            }
        } else {
            return null;
        }
        String rawPath = uri.getRawPath();
        if (rawPath != null && !rawPath.isEmpty() && !"/".equals(rawPath)) {
            return null;
        }
        String authority = uri.getPort() == -1 ? host : host + ":" + uri.getPort();
        return scheme + "://" + authority + path;
    }
}
