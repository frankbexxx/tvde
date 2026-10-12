"""Human-facing titles for Q-EXT blocks in external dossiers (build-time only)."""

from __future__ import annotations

# Keys: Q-EXT-* IDs. Values: short external title (without «Questão N —» prefix).
Q_EXT_EXTERNAL_TITLES: dict[str, str] = {
    # Fiscal (EXT-FIS v1 order)
    "Q-EXT-FIS-004": "Acerto manual semanal com o parceiro",
    "Q-EXT-FIS-002": "Comissão de intermediação e base de cálculo",
    "Q-EXT-FIS-001": "Facturação ao passageiro",
    "Q-EXT-FIS-003": "Contribuição AMT",
    "Q-EXT-FIS-006": "Portagens",
    "Q-EXT-FIS-005": "Refunds e chargebacks",
    # Legal (EXT-LEG v1)
    "Q-EXT-LEG-001": "Validação operador, motorista e veículo",
    "Q-EXT-LEG-005": "Licenciamento e responsabilidade do parceiro TVDE",
    "Q-EXT-LEG-002": "Limite de 10 horas de condução",
    "Q-EXT-LEG-003": "SOS e partilha de viagem",
    "Q-EXT-LEG-004": "Termos, privacidade e contratos na aplicação",
    "Q-EXT-LEG-007": "Comunicações regulatórias IMT/AMT",
    "Q-EXT-LEG-999": "Fixture técnica",
}


def external_question_heading(index: int, qid: str, overrides: dict[str, str] | None = None) -> str:
    """1-based index in dossier q_ext order."""
    titles = dict(Q_EXT_EXTERNAL_TITLES)
    if overrides:
        titles.update(overrides)
    title = titles.get(qid, qid)
    return f"Questão {index} — {title}"
