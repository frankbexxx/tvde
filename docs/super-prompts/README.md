# Super-prompts TVDE (roadmap operacional)

Documentos de **especificação** para ondas de trabalho: cada ficheiro define intenção, critérios de aceite e exclusões. A sequência acordada é:

1. **[SP-B — Trilho de auditoria](./SP-B-trilho-auditoria.md)** — base legal antes de ampliar poder destrutivo.
2. **[SP-A — Admin operacional](./SP-A-admin-operacional.md)** — intervenções sem SQL/deploy.
3. **[SP-G — Estado agora](./SP-G-estado-agora.md)** — visão de 30 segundos.
4. **[SP-D — Anti-stuck](./SP-D-anti-stuck.md)** — viagem + pagamento sem beco sem saída.
5. **[SP-C — Partner autónomo](./SP-C-partner-autonomo.md)** — frota sem TI no dia-a-dia.
6. **[SP-E — Mutabilidade com memória](./SP-E-mutabilidade-memoria.md)** — RGPD / histórico.
7. **[SP-F — Governança](./SP-F-governanca.md)** — RBAC fino e justificação.

Ordem mnemónica: **B → A → G → D → C → E → F**.

---

## Depois da sequência (nexo — não são “novas letras”)

A fila **B → … → F** fica **fechada** para letras adicionais até decisão explícita. O que se segue entra por **Ondas M** e por **blocos com nexo** aos SP já entregues; **não substitui** a ordem acima, **prolonga-a** em direcção a produto e produção.

| Bloco | Nexo aos SP / ondas | Quando (acordado) |
| ----- | ------------------- | ----------------- |
| **M1** | Identidade + password no ecrã; encaixa **SP-A** (admin operacional) e **SP-E** (mudanças com memória) já na base | **Prioridade imediata** — ver [`TODOdoDIA.md`](../../TODOdoDIA.md) «Hoje 2026-04-17» |
| **Smoke alargado + W2** | Validação operacional; liga **SP-D**, **SP-G** | Entre merges e antes de “gate” largo |
| **Superfície legal** (lista do obrigatório + links para PDFs / políticas na app) | Transparência e dados pessoais; **nexo SP-E** + **M3** (documentação + audit) | **Sessões seguintes** — inventário em [`docs/legal/`](../legal/) antes de UI |
| **Theming** (paleta Portugal, ícone da app, refinamento de temas) | Marca e coerência visual; **nexo M2** (conta «produto») / polish pré-MVP | **Sessões seguintes** — não bloqueia M1 |
| **Vídeos curtos + checklist exaustivo** (por papel / feature) | Regressão humana visível; **nexo** smoke W2 + E2E Playwright | **Após** freeze curto de features (evita regravar o mesmo ecrã) |

**Regra:** não misturar **gravação exaustiva** nem **redesign global de tema** na mesma corrida que **M1** prioritário, salvo decisão explícita no arranque da sessão.
