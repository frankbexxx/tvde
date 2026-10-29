package pt.vamula.app.location;

import java.util.ArrayList;
import java.util.List;

/**
 * Transições do serviço. {@link #stop()} limpa qualquer estado, incluindo erro.
 * Não arranca o processo, não lê localização e não abre rede.
 */
public final class DriverLocationRuntime {

    private DriverLocationPhase phase = DriverLocationPhase.STOPPED;
    private final ArrayList<DriverLocationPhase> trail = new ArrayList<>();

    public synchronized DriverLocationPhase phase() {
        return phase;
    }

    public synchronized List<DriverLocationPhase> trail() {
        return new ArrayList<>(trail);
    }

    synchronized void clearTrail() {
        trail.clear();
    }

    public synchronized DriverLocationPhase beginStart() {
        if (phase != DriverLocationPhase.STOPPED && phase != DriverLocationPhase.ERROR) {
            throw new IllegalStateException(phase.wire());
        }
        return move(DriverLocationPhase.STARTING);
    }

    public synchronized DriverLocationPhase markOperational() {
        if (phase != DriverLocationPhase.STARTING) {
            throw new IllegalStateException(phase.wire());
        }
        return move(DriverLocationPhase.OPERATIONAL);
    }

    public synchronized DriverLocationPhase fail() {
        if (phase != DriverLocationPhase.STARTING && phase != DriverLocationPhase.OPERATIONAL) {
            throw new IllegalStateException(phase.wire());
        }
        return move(DriverLocationPhase.ERROR);
    }

    public synchronized DriverLocationPhase stop() {
        if (phase == DriverLocationPhase.STOPPED) {
            return phase;
        }
        return move(DriverLocationPhase.STOPPED);
    }

    private DriverLocationPhase move(DriverLocationPhase next) {
        phase = next;
        trail.add(next);
        return phase;
    }
}
