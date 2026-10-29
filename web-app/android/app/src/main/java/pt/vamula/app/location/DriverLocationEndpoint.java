package pt.vamula.app.location;

import java.net.URI;
import pt.vamula.app.BuildConfig;
import pt.vamula.app.vault.VaultApiBase;

/**
 * Destino do POST nativo. Em release só o endpoint HTTPS configurado nesta APK.
 * Um URL vindo da WebView não é autoridade: tem de coincidir com este destino.
 * Redireccionamentos não são seguidos e não mudam o destino.
 */
public final class DriverLocationEndpoint {

    public static final String PRODUCTION = "https://tvde-api-fd2z.onrender.com";
    public static final String STAGING_PROOF = "https://tvde-staging-api.onrender.com";

    private DriverLocationEndpoint() {}

    public static String configured() {
        return BuildConfig.GPS_UPLOAD_BASE;
    }

    /** Um único destino HTTPS: o desta build. Nem PROD nem STAGING são alternativas um do outro. */
    public static boolean isReleaseDestination(String base) {
        URI uri = parse(base);
        URI expected = parse(configured());
        if (uri == null || expected == null || !"https".equals(uri.getScheme()) || !"https".equals(expected.getScheme())) {
            return false;
        }
        return sameAuthority(base, configured()) && emptyPath(uri) && emptyPath(expected);
    }

    /** Laboratório: produção, STAGING e loopback HTTP. Continua atrás de FLAG_DEBUGGABLE. */
    public static boolean isDebugSupplied(String base) {
        return parse(base) != null && VaultApiBase.endpoint(base, DriverLocationUpload.PATH) != null;
    }

    public static boolean sameAuthority(String observed, String expected) {
        URI left = parse(observed);
        URI right = parse(expected);
        if (left == null || right == null || left.getScheme() == null || !left.getScheme().equals(right.getScheme())) {
            return false;
        }
        if (left.getHost() == null || !left.getHost().equalsIgnoreCase(right.getHost())) {
            return false;
        }
        return port(left) == port(right);
    }

    static URI parse(String base) {
        if (base == null) {
            return null;
        }
        String trimmed = base.trim();
        if (trimmed.isEmpty() || !trimmed.equals(base) || trimmed.indexOf('@') >= 0 || trimmed.indexOf('\\') >= 0
            || trimmed.indexOf(' ') >= 0 || trimmed.indexOf('\n') >= 0 || trimmed.indexOf('\r') >= 0) {
            return null;
        }
        URI uri;
        try {
            uri = URI.create(trimmed);
        } catch (IllegalArgumentException exception) {
            return null;
        }
        if (uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null) {
            return null;
        }
        if (uri.getHost() == null || uri.getScheme() == null) {
            return null;
        }
        return uri;
    }

    private static boolean emptyPath(URI uri) {
        String rawPath = uri.getRawPath();
        return rawPath == null || rawPath.isEmpty() || "/".equals(rawPath);
    }

    private static int port(URI uri) {
        if (uri.getPort() != -1) {
            return uri.getPort();
        }
        return "https".equals(uri.getScheme()) ? 443 : 80;
    }
}
