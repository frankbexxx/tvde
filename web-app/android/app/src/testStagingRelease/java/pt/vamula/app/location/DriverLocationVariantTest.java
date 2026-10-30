package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import org.junit.Test;
import pt.vamula.app.BuildConfig;

/** A prova TLS aponta só a STAGING e não é uma build depurável. */
public class DriverLocationVariantTest {

    @Test
    public void stagingReleaseBuildTargetsStagingOnly() {
        assertEquals("stagingRelease", BuildConfig.BUILD_TYPE);
        assertFalse(BuildConfig.DEBUG);
        assertEquals(DriverLocationEndpoint.STAGING_PROOF, DriverLocationEndpoint.configured());
        assertFalse(DriverLocationEndpoint.isReleaseDestination(DriverLocationEndpoint.PRODUCTION));
        assertFalse(DriverLocationEndpoint.isReleaseDestination("http://10.0.2.2:8765"));
        assertFalse(DriverLocationEndpoint.isReleaseDestination("http://127.0.0.1:9"));
        assertFalse(DriverLocationEndpoint.isReleaseDestination("https://tvde-staging-api.onrender.com:8443"));
    }
}
