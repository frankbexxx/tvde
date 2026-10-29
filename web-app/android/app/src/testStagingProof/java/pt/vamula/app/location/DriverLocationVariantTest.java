package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import org.junit.Test;
import pt.vamula.app.BuildConfig;

/** A variante de prova aponta só a STAGING. PROD e loopback não são alternativas. */
public class DriverLocationVariantTest {

    @Test
    public void stagingProofBuildTargetsStagingOnly() {
        assertEquals("stagingProof", BuildConfig.BUILD_TYPE);
        assertEquals(DriverLocationEndpoint.STAGING_PROOF, DriverLocationEndpoint.configured());
        assertFalse(DriverLocationEndpoint.isReleaseDestination(DriverLocationEndpoint.PRODUCTION));
        assertFalse(DriverLocationEndpoint.isReleaseDestination("http://10.0.2.2:8765"));
        assertFalse(DriverLocationEndpoint.isReleaseDestination("http://127.0.0.1:9"));
    }
}
