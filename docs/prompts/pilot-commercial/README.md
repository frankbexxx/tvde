# Prompts — piloto comercial & 4 superfícies

Fila **nomeada por fase** (`PROMPT_*.md`): em cada ficheiro pode haver só placeholder **ou** instruções + resultado quando já redigido.

**Fase 0 — estado actual:** [`PROMPT_A001`](phase-0-alignment/PROMPT_A001_PRODUCT_SURFACES_DEFINITION.md), [`A002`](phase-0-alignment/PROMPT_A002_ROLES_AND_PERMISSIONS_MODEL.md), [`A003`](phase-0-alignment/PROMPT_A003_MULTI_TENANT_BOUNDARIES.md) têm **prompt completo + secção «Execução (resultado)»** e verificação ao código. **A004–A007** continuam por redigir.

**Leitura obrigatória antes de escrever prompts:** [`REALITY_NOTES.md`](REALITY_NOTES.md) (alinhamento ao repo actual).

**Antes de codar Partner / multi-tenant:** [`IMPLEMENTATION_SEQUENCE.md`](IMPLEMENTATION_SEQUENCE.md) (ordem de trabalhos + ficheiros reais).

**Mapa da UI (cores/componentes):** [`../../UI_MAP.md`](../../UI_MAP.md)

**Pacotes de execução em série («super prompts» = ordem, não substituem `PROMPT_*.md`):** [`super-prompts/README.md`](super-prompts/README.md) — pacotes **01** → **02** → **03**, cada um com uma **sequência** de prompts granulares. Inclui **C017** (onboarding admin na app) e **G008** como **prioridade máxima** (bloqueador de consistência).

---

## Fases e pastas

| Fase | Pasta                                                    | Eixo                                                                     |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| 0    | [`phase-0-alignment/`](phase-0-alignment/)               | Contrato de produto, superfícies, multi-tenant, critérios de entrega     |
| 1    | [`phase-1-core-reuse/`](phase-1-core-reuse/)             | Reuso de domínio, API, auth, auditoria ao que já existe (admin, polling) |
| 2    | [`phase-2-partner/`](phase-2-partner/)                   | **Critical path** — superfície parceiro (frota, isolamento)              |
| 3    | [`phase-3-driver/`](phase-3-driver/)                     | Motorista: estabilizar, não expandir                                     |
| 4    | [`phase-4-passenger/`](phase-4-passenger/)               | Passageiro: freeze + garantias                                           |
| 5    | [`phase-5-admin/`](phase-5-admin/)                       | Admin vs parceiro, operações mínimas                                     |
| 6    | [`phase-6-multitenant-rbac/`](phase-6-multitenant-rbac/) | Enforcement RBAC, testes de fuga entre tenants                           |
| 7    | [`phase-7-pilot-ops/`](phase-7-pilot-ops/)               | Piloto real, volume, suporte                                             |
| 8    | [`phase-8-ux-controlled/`](phase-8-ux-controlled/)       | Timing/percepção sem over-tuning                                         |
| 9    | [`phase-9-delivery/`](phase-9-delivery/)                 | Shells por papel, PWA, deploy                                            |
| 10   | [`phase-10-commercial/`](phase-10-commercial/)           | Onboarding, legal mínimo, reporting, 1.º parceiro                        |

**Ordem:** não é estritamente linear — **Fase 2** é prioridade estratégica; Fases 3–4 em modo _stabilize / freeze_.

---

## Índice por ficheiro

Cada ficheiro: `PROMPT_<ID>_<SNAKE_NAME>.md` na pasta da fase.

- **Fase 0:** `PROMPT_A001` … `PROMPT_A007`
- **Fase 1:** `PROMPT_B001` … `PROMPT_B007`
- **Fase 2:** `PROMPT_C001` … `PROMPT_C010`
- **Fase 3:** `PROMPT_D001` … `PROMPT_D006`
- **Fase 4:** `PROMPT_E001` … `PROMPT_E005`
- **Fase 5:** `PROMPT_F001` … `PROMPT_F005`
- **Fase 6:** `PROMPT_G001` … `PROMPT_G005`
- **Fase 7:** `PROMPT_H001` … `PROMPT_H006`
- **Fase 8:** `PROMPT_I001` … `PROMPT_I005`
- **Fase 9:** `PROMPT_J001` … `PROMPT_J006`
- **Fase 10:** `PROMPT_K001` … `PROMPT_K006`

**Total:** 68 placeholders (ficheiros `PROMPT_*.md` por fase).

**Extensão (IDs novos):** sequência e notas em [`super-prompts/`](super-prompts/) — C013–C017, I009–I011, G008–G010, H009–H010, J009–J010, K008–K009. Os `SUPER_PROMPT_0N_*.md` são **roteiros de ordem**; cada tarefa deve acabar num **`PROMPT_<ID>_*.md`** na pasta da fase (a criar quando fores executar).

---

_Última revisão deste índice: 2026-04-07_
