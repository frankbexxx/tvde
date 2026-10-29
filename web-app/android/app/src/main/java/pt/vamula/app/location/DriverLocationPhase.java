package pt.vamula.app.location;

/** Estados observáveis do serviço. A recolha é local e ainda não há envio. */
public enum DriverLocationPhase {
    STOPPED,
    STARTING,
    OPERATIONAL,
    ERROR;

    public String wire() {
        return name().toLowerCase();
    }
}
