package pt.vamula.app.location;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import org.junit.Test;
import pt.vamula.app.BuildConfig;

/** A build debug de desenvolvimento mantém o destino de produção. */
public class DriverLocationVariantTest {

    @Test
    public void debugBuildTargetsProductionOnly() {
        assertEquals("debug", BuildConfig.BUILD_TYPE);
        assertEquals(DriverLocationEndpoint.PRODUCTION, DriverLocationEndpoint.configured());
        assertFalse(DriverLocationEndpoint.isReleaseDestination(DriverLocationEndpoint.STAGING_PROOF));
    }
}
