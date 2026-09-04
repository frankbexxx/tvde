# ROADMAP FINAL — Entrega TVDE-APP (Setembro 2026+)

**Documento canónico de execução:** CARRIL → ETAPA → PASSOS  
**Fonte consolidada:** [`TVDE_STATUS_SETEMBRO_2026.md`](TVDE_STATUS_SETEMBRO_2026.md) · [`SETEMBRO_2026_TODO_LIBRARY.md`](product/SETEMBRO_2026_TODO_LIBRARY.md) · painéis/`TODOdoDIA.md` · docs pay/mobile/legal/business/ops  
**Regra:** itens já implementados / STALE **não** reentram. Não activar Stripe live / B2 / PF3D / Capacitor sem o passo correspondente.

| Fecho já feito | Estado |
|----------------|--------|
| Retoma operacional (ETAPA 01 · `S-OPS-01`) | **DONE** 2026-09-01 |
| Demo Manel 2 (ETAPA 02 · `S-DEM-01`) | **DONE** 2026-09-01 · DEMO PASS prod |
| 4 papéis · fluxo viagem principal | **VALIDADO** em produção |
| **M1 — APP TECNICAMENTE CONCLUÍDA** | **DONE** 2026-09-03 · G3.1 PASS · tip `e556a3b` |

**Como usar:** executar um passo → marcar `DONE` → seguinte.  
**Tipos:** `CONFIRMAR` · `DECISÃO` · `DOCS` · `CONFIG` · `CÓDIGO` · `TESTE` · `EXTERNO`.

**Regra de decisão:** antes de *propor / decidir / escolher / fechar*, ler docs canónicos. Se a decisão **já existir** → passo `CONFIRMAR` (citar doc). `DECISÃO` só quando a documentação **não** resolve.

---

# Índice mestre

| Carril | Etapas |
|--------|--------|
| **A** Negócio / Legal / Compliance | **A1 PARCIAL** · A2 · **A3 PARCIAL** (D01–D08 + **D03-REV1/D04-REV1**) · A4 · A5 · **A6 no crítico M2** *(flag OFF = implementação pendente)* |
| **B** Pagamentos / Financeiro | B1 Stripe live (Pax) · B2 Confirm/3DS · B3 Connect/split · B4 Payouts · B5 Métodos PT |
| **C** Autenticação / Comunicação | C1 SMS OTP · C2 SMS ops · C3 OAuth staging |
| **D** Mobile / Push / Distribuição | **D0 DONE (HÍBRIDO)** · D1 Spike Android · D2 Device · D3 Push · D4 Landing |
| **E** Produto final (4 papéis) | E1 Driver piloto · E2 Nav Driver · E3 Copy pay Pax · E4 Copy Partner · **E5 DONE** |
| **F** Infra / Segurança / Operação | F1 Restore drill · F2 Staging · F3 Sentry · F4 Higiene mock GPS |
| **G** QA / Hardening / Go-live | G1 E2E comercial · G2 QA devices · G3 Checklist marcos |
| **H** Pós-entrega / Futuro | H1 B2 next-trip · H2 Redispatch · H3 Dead code/CI · H4 Admin rastos · H5 Futuro |

---

# Dependências críticas

1. **A1 → A2** — hipóteses validadas antes de fechar %/tarifário.  
2. **A2 → B3/B4/E1** — comissão/beneficiário condicionam split, payouts e líquido.  
3. **A3 → A6** — A6 só no crítico se A3 gerar obrigação concreta de gates/enforcement.  
4. **B1** = pagamento real do passageiro; **B3** = split automático; **B4** = payout automático — camadas distintas.  
5. **B3/B4 no crítico** só se o modelo do piloto/comercial **exigir automatização**; senão processo financeiro manual documentado (Marco 2/3 conforme aplicável).  
6. **C1 → onboarding utilizadores reais** (Marco 2).  
7. **D0 = HÍBRIDO (DONE)** — WEB/PWA fecha Marco 1; D1→D2→D3(+G2) críticos no Marco 2 com **Android primeiro**; iOS no mesmo carril sem bloquear piloto Android.  
8. **B1 + C1 + G1 + D1→D2→D3(+G2 Android) (+ condicionais B3/B4/A6) → Marcos 2/3**.  
9. **B5** — MB WAY/SIBS só se decisão MVP; senão → H.  
10. **H1 (B2)** — produto V1 já decidido; activação **nunca** no crítico sem OK explícito.

---

# Três caminhos críticos (por marco)

Não duplicar etapas — só indicar quais entram em cada marco. Condicionais entre parênteses.

## CAMINHO CRÍTICO — APP TECNICAMENTE CONCLUÍDA (Marco 1) — **DONE**

```
D0(DONE) → A3(PARCIAL) → E5(DONE) → G3(M1) DONE
```

**Etapas:** D0 (**DONE**) · A3 (**PARCIAL** — suficiente para M1; A3.7/A3.9 → M2) · E5 (**DONE**) · G3.1 (**DONE** 2026-09-03)  

*WEB/PWA suficiente. **D1/D2/D3/G2 não entram no Marco 1.** Termos/Privacidade **não** bloqueiam M1 (A3-D07). Não exige live pay, SMS, Connect, package mobile nem gates ON.*

*Critério M1.3 (histórico):* decisões A3-D01…D08 + A3.8 WARN+RECORD fecharam M1 técnico. **A3-D03-REV1 / A3-D04-REV1 (2026-09-04) alteram requisitos de M2, não reabrem M1.**

**Acta G3.1 (2026-09-03):** tip `e556a3b` · Demo Manel 2 PASS · flags default seguras.  
**Nota legal 2026-09-04:** M1 permanece **DONE**. A nova validação (Lei 45/2018 via 59/2026) altera M2 / operação TVDE real — ver [`A3_REQUISITOS`](legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md).

## CAMINHO CRÍTICO — PILOTO REAL (Marco 2) — **READY FOR REAL PILOT**

```
[M1] → A1 → A2 → C1 → B1 → E3 → G1 → F1
         → D1 → D2 → D3 → G2   (foco Android; iOS pode seguir depois)
         → A3-REV / A6 (IMT + gates + 10h/24h + emergência)  ← crítico M2
         → G3(M2)
         ↘ (B3)/(B4) **fora crítico M2** nesta fase (**A1-D05/D06**)
```

**Definição `READY FOR REAL PILOT`:** operação tecnicamente funcional · requisitos legais **bloqueantes** implementados ou operacionalmente satisfeitos · integração/processo **IMT** disponível · **enforcement** efectivo de compliance · **emergência** disponível · pagamentos reais · autenticação real · package mobile necessário · condições legais/contratuais mínimas concluídas.

**Etapas base:** A1 · A2 · C1 · B1 · E3 · G1 · F1 · **D1 · D2 · D3 · G2** · **A6 / compliance legal** · G3 (+ M1)  
**Condicionais:** B3 · B4 *(adiados pós A1-D05/D06)*  

*Package mobile **exigido**. Prioridade **Android**. Processo financeiro **manual semanal ao Partner** (**A1-D03…D06**) → **B3/B4 fora** do crítico M2 nesta fase. **A6 no crítico M2** (A3-D03-REV1); flag OFF = implementação pendente, **não** decisão de produto.*

### BLOCKERS M2 legais (concretos — 12)

| # | Blocker |
|---|---------|
| 1 | Validação IMT operador |
| 2 | Validação IMT motorista |
| 3 | Validação IMT veículo |
| 4 | Bloqueio operador |
| 5 | Bloqueio motorista |
| 6 | Bloqueio veículo |
| 7 | Enforcement 10 h / 24 h |
| 8 | Emergência passageiro |
| 9 | Emergência motorista |
| 10 | Chamada em tempo real às autoridades |
| 11 | Partilha de localização em emergência |
| 12 | Licença IMT do gestor da plataforma |

### NECESSÁRIOS M2 legais (12)

Registo de tempos · retenção actividade 2 anos · retenção reclamações 2 anos · hard-cap comissão 25% sem IVA · breakdown legal preço/comissão · fatura electrónica · reporting mensal AMT · apuramento contribuição AMT 5% · contratos de adesão operadores · disponibilização contrato ao motorista · Livro de Reclamações / RAL · processos comunicação IMT/AMT.

*Matriz:* [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md). **Prioridades legais individuais da matriz mantêm-se**; abaixo = ordem **prática** de implementação.

### Ordem operacional M2 — setembro 2026

Agrupamento por dependências reais (não altera IDs L-xx da matriz).

| Bloco | Conteúdo (matriz) | Natureza |
|-------|-------------------|----------|
| **M2-L0** | L-26 — licença IMT do **gestor da plataforma** | **`PRATICAMENTE FECHADO — PENDENTE CONSOLIDAÇÃO DOCUMENTAL`** (2026-09-04): marca **VAMULÁ** INPI · titular **Ventos Férteis, Lda** · licença IMT Operador de Plataforma Electrónica TVDE observada em documento físico; falta no repo NIPC/sede/nº/data/validade/acto oficial (Manel) |
| **M2-L1** | L-01…L-03 — validação IMT operador / motorista / veículo | **`PENDENTE DEPENDÊNCIA EXTERNA`**: discovery técnico DONE; sem client/API IMT inventado; falta spec/canal oficial |
| **M2-L2** | L-04…L-06 — bloqueio operador / motorista / veículo | **`PENDENTE DEPENDÊNCIA EXTERNA`** (depende M2-L1) |
| **M2-L3** | L-10 (+ L-07…L-09) — enforcement **10 h / 24 h** | **`FOUNDATION IMPLEMENTADA / ENFORCEMENT PENDENTE`** — PR [#548](https://github.com/frankbexxx/tvde/pull/548) · merge `c8d2c35` · rolling 24h · sem 11h fixas · `driving_rest_until` legacy isolado · arriving+ongoing provisório · **ENFORCEMENT OFF** · 31 tests |
| **M2-L4** | L-19…L-22 — emergência | **`FOUNDATION IMPLEMENTADA` / L-19…22 `PARCIAL`** — PR [#549](https://github.com/frankbexxx/tvde/pull/549) · merge `717270a` · SOS PAX+DRV · `tel:112` · snapshot · share/clipboard · audits · smoke mobile PASS · validação legal pendente |

**Ordem de execução:**

1. **M2-L0** — fechar formalmente quando docs Manel entrarem no repo.  
2. **M2-L1** discovery / contacto IMT (bloqueado externamente).  
3. Se **M2-L1** bloqueado → avançar L3/L4 (já feito foundation 2026-09-04).  
4. Quando fonte IMT definida → **M2-L1**, depois **M2-L2**.  
5. **M2-L4** foundation DONE — parecer se foundation basta.  
6. Continuar **NECESSÁRIOS M2** (retenção, AMT, …).

### Sessão 2026-09-04 (fecho)

| | |
|--|--|
| **`main`** | Alinhada com `origin/main` (pós-merge #548 + #549) |
| **Driving-hours** | Foundation merged; enforcement deliberadamente OFF |
| **Emergency** | Foundation merged; smoke PAX/DRV + `tel:112` telefone real PASS |
| **Próximas frentes** | (1) fechar L0 com docs Manel · (2) parecer/decisão legal L3 · (3) retention/audit · (4) AMT/reporting · (5) L1/L2 quando houver documentação IMT |

*Pendentes finos (L3):* definição de “operar” · estados que contam · viagem no limite · **enforcement ON** · cross-platform. *Tweak L4 não bloqueante:* origem/destino legíveis (morada) no painel SOS.

## CAMINHO CRÍTICO — EXPLORAÇÃO COMERCIAL (Marco 3)

```
[M2] → A4 → A5 → E1 → E4 → G3(M3)
         ↘ B3 → B4   se operação comercial exigir split/payout automático
         ↘ A6        se A3/negócio exigir compliance activa
         ↘ iOS (D*)  se ainda em falta após Android do M2
         ↘ D4        conforme necessidade real de distribuição/stores
         ↘ B5        se MVP PT o exigir
```

**Etapas base:** A4 · A5 · E1 · E4 · G3 → **5** (+ M2)  
**Condicionais:** B3 · B4 · A6 · D4 · B5 · continuação iOS no carril D

---

# PODE CORRER EM PARALELO

| Em paralelo | Sem conflito se… |
|-------------|------------------|
| **A1–A4** ‖ **C1** ‖ **D1 (Android)** ‖ **F1** | Sem `STRIPE_MOCK=false` nem gates ON |
| **A5** ‖ **E2** ‖ **F3** ‖ **C3** ‖ **iOS (após/paralelo Android)** | Sem path pay live; iOS não bloqueia Android |
| **B2** ‖ **E5** ‖ **F4** | Após/com cuidado face a B1 |
| **H*** | Sem activar flags comerciais |

**Não paralelizar:** B3 com A2 aberto; D3 sem D1; A6 ON sem A3-D03-REV1 / IMT-processo; live Stripe sem B1 completo.

---

# CARRIL A — Negócio / Legal / Compliance

## A1 — Validar modelo económico — **PARCIAL**

- **Objectivo:** Validar hipóteses custos/comissões/simulador (não inventar números).  
- **IDs:** `S-BIZ-01` · `BUSINESS-MANEL-001`  
- **Dependências:** —  
- **Estado:** **PARCIAL** (2026-09-03) — **A1.1 DONE** · **A1-D01…D10 DONE** · **A1.2 EM CURSO** (fixo vs variável; Manel ≠ orçamento) · A1.3–A1.4 abertos · código pricing/cancel ainda legado  
- **Entrega levantamento:** [`A1_MODELO_ECONOMICO_SETEMBRO_2026.md`](business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md)  
- **Nota legal 2026-09-04:** considerar contribuição AMT **5%** sobre taxas de intermediação (base IVA a confirmar AMT/jurídico). **Não** altera **A1-D01** (comissão piloto **15%**).  
- **Conclusão (quando fechado):** Francisco+Manel(+contabilista) registam aceite / correcções por escrito.  
- **Docs base (hipóteses, não aprovadas):** [`MANEL_COSTS_OPERATION_MODEL_2026-08.md`](business/MANEL_COSTS_OPERATION_MODEL_2026-08.md) · [`MANEL_PRICING_COMMISSION_MODEL_2026-08.md`](business/MANEL_PRICING_COMMISSION_MODEL_2026-08.md) · [`MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md`](business/MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md)

| Passo | Acção | Resultado esperado | Tipo | Dep. | Estado |
|-------|--------|-------------------|------|------|--------|
| A1.1 | Confirmar pacote dos 3 docs business + levantamento matriz | Matriz em `A1_MODELO_ECONOMICO…` | CONFIRMAR · DOCS | — | **DONE** |
| A1.2 | Modelo custos: fixos vs variáveis; validar rubricas vs realidade (sem baseline 1–2,5 k€) | Lista rubricas + valores reais / `A CONFIRMAR` | DECISÃO · DOCS | A1.1 · **A1-D10** | **EM CURSO** |
| A1.3 | Sessão margem/viagem + GTM 36m | Simulador válido ou a corrigir | DECISÃO | A1.2 | Por iniciar |
| A1.4 | Acta curta no repo (só resultados) | Fecho A1 sem % inventados | DOCS | A1.3 | Por iniciar |

## A2 — Fechar comissão e tarifário

- **Objectivo:** Comissão + tarifário piloto aprovados (hoje só hipóteses/exemplos).  
- **IDs:** `S-BIZ-02` · `SEP-PAY-03` · perguntas Q1/Q3 em [`MANEL_INPUTS_TODOS_2026-08-07.md`](product/MANEL_INPUTS_TODOS_2026-08-07.md)  
- **Dependências:** A1  
- **Conclusão:** % + regras + beneficiário documentados.  
- **Nota:** [`PRICING_DECISION.md`](PRICING_DECISION.md) fecha o **modelo híbrido estimativa→preço final** — **não** a % de comissão.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| A2.1 | Confirmar hipóteses de comissão no doc pricing Manel (ex. 15% = hipótese) | Ponto de partida explícito | CONFIRMAR | A1 · `MANEL_PRICING_COMMISSION_MODEL_2026-08.md` |
| A2.2 | Confirmar modelo híbrido estimativa/final | Alinhado a produto actual | CONFIRMAR | [`PRICING_DECISION.md`](PRICING_DECISION.md) |
| A2.3 | Fechar % comissão piloto (adoptar/alterar hipótese) | % aprovada — **pré-fechado A1-D01 = 15%** (confirmar/publicar em A2) | DECISÃO | A2.1 |
| A2.4 | Fechar beneficiário split (motorista vs partner) + cadência payout pretendida | **Pré-fechado:** Partner (**A1-D03**) · cadência **semanal** (**A1-D04**) — confirmar/publicar em A2 | DECISÃO | A2.3 · `MANEL_INPUTS` Q3 |
| A2.5 | Fechar tarifário mínimo piloto | Tabela = grelha Manel (**A1-D07**) — publicar + alinhar código | DECISÃO · CÓDIGO | A2.3 · A1-D07 |
| A2.6 | Publicar decisão canónica (doc curto) | Referência B3/B4/E1 | DOCS | A2.4 · A2.5 |

## A3 — Validar requisitos legais TVDE aplicáveis — **PARCIAL**

- **Objectivo:** Fonte legal → requisitos operacionais → impacto técnico M2. Base principal = **Lei 45/2018** (republicação **59/2026**) arts. **13.º / 14.º / 17.º-A / 20.º / 20.º-A**. DL 84 / Reg. 561 = **complementares**, não o centro dos tempos TVDE.  
- **IDs:** `S-COMP-04` · `LEGAL-TVDE-001…`  
- **Dependências:** — (IMT / parecer fino para detalhes)  
- **Estado:** **PARCIAL** (rev. **2026-09-04**) — **A3-D01…D08 DONE** · **A3-D03-REV1 / A3-D04-REV1 DECIDIDO — IMPLEMENTAÇÃO PENDENTE** · A3.8 WARN+RECORD = código actual · falta arquivo PDFs P0 + implementação M2  
- **Entrega:** [`A3_REQUISITOS_TVDE_SETEMBRO_2026.md`](legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · matriz [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md)  
- **A6:** **no crítico M2** (**A3-D03-REV1**); flag OFF = implementação pendente  
- **Driving-hours:** **A3-D04-REV1** — M2 exige enforcement 10 h/24 h; WARN+RECORD **não** basta  
- **Marco 2:** Termos + Privacidade (A3-D07) + blockers legais listados no caminho M2

| Passo | Acção | Resultado esperado | Tipo | Dep. | Estado |
|-------|--------|-------------------|------|------|--------|
| A3.1 | Confirmar fontes índice + PDF DL 84/2026 | Fontes localizadas | CONFIRMAR | [`LEGAL_SOURCES_INDEX.md`](legal/LEGAL_SOURCES_INDEX.md) | **DONE** |
| A3.2 | Ler objeto/âmbito DL 84 | Notas Arts. 1.º–2.º | DOCS | A3.1 | **DONE** |
| A3.3 | Matriz requisitos | Matriz | DOCS | A3.2 | **DONE** |
| A3.4 | Impacto técnico / ops | Lista; sem inventar features | DOCS | A3.3 | **DONE** |
| A3.5 | A6 obrigação gates ON? | Indeterminado nas fontes *(histórico)* | DECISÃO | A3.4 | **DONE** → **REV1** |
| A3.6 | Brief A6 + decisões D01–D08 | Acta em `A3_REQUISITOS` §8 | DOCS | A3.5 | **DONE** |
| A3.7 | Validação jurídica externa (pacote A3-D06) | Parecer / source pack / matriz | EXTERNO · DOCS | A3-D06 | **PARCIAL** (2026-09-04 — base legal identificada; detalhes IMT/parecer fino abertos) |
| A3.8 | Código A3-D04 antigo: WARN+RECORD sem bloqueio | Alinhado à decisão **antiga** | CÓDIGO · TESTE | A3-D04 | **DONE** *(meta M2 = A3-D04-REV1 — implementação pendente)* |
| A3.9 | Arquivar PDFs oficiais TVDE P0 + indexar | Fontes no repo | DOCS · EXTERNO | A3-D01 | **EM CURSO** (índice; PDFs P0 em falta) |
| A3.10 | Acta **A3-D03-REV1** / **A3-D04-REV1** + blockers M2 | Decisões produto M2 | DOCS | A3.7 | **DONE** 2026-09-04 |

## A4 — Titularidade IP / contas

- **Objectivo:** Inventário titularidade código/design/marca/contas/domínios.  
- **IDs:** `S-IP-01` · `SEP-IP-01` · `SEP-IP-02` · *reminder* [`SEP-IP-05`](product/SETEMBRO_2026_TODO_LIBRARY.md) (OXS/VAMULÁ housekeeping — **não agora**)  
- **Dependências:** —  
- **Conclusão:** Inventário assinado por Francisco (e Manel se aplicável).

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| A4.1 | Listar contas críticas (GitHub, Render, Stripe, domínio, MapTiler, …) | Inventário v1 | DOCS | — |
| A4.2 | Atribuir titular por item | Tabela dono/acesso | DECISÃO | A4.1 |
| A4.3 | Guardar inventário em `docs/` | Referência estável | DOCS | A4.2 |

## A5 — Decisão de marca (logo)

- **Objectivo:** Escolher logo de produção e planear troca controlada.  
- **IDs:** `S-BRD-01` · `S-IP-02` (parcial)  
- **Dependências:** A4 recomendado  
- **Conclusão:** Vencedor + plano `public/brand` (sem executar sem OK).  
- **Nota:** shortlist local existe; **sem** vencedor canónico ainda.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| A5.1 | Confirmar existência shortlist local (KEEP / `_temp`) | Material de review | CONFIRMAR | — |
| A5.2 | Review → shortlist final 2–3 | Candidatos | DECISÃO | A5.1 |
| A5.3 | Verificar origem/licença candidatos | OK uso | DECISÃO | A5.2 · A4 |
| A5.4 | Escolher vencedor + brief troca assets | Decisão + checklist | DECISÃO | A5.3 |
| A5.5 | (Opcional) pesquisa/registo marca | Iniciado ou → H | EXTERNO | A5.4 |

## A6 — Compliance frota / IMT / bloqueio (dados → gates) — **CRÍTICO M2**

- **Objectivo:** Validação IMT + bloqueio operacional real (operador/motorista/veículo) + gates efectivos para M2.  
- **IDs:** `S-COMP-01` · `S-COMP-02` · `S-COMP-03` · `S-COMP-05`  
- **Dependências:** **A3-D03-REV1** · IMT / regulamentação para mecanismo exacto  
- **Conclusão M2:** gates efectivos **obrigatórios**; PF3D = base útil, **não** suficiente.  
- **Estado:** **No caminho crítico M2** — flag `ENABLE_VEHICLE_COMPLIANCE_GATES` **OFF agora** só por implementação pendente (**não** decisão de produto). Ver [`A3_REQUISITOS`](legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) §7.  
- **Canónico:** [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) · matriz legal 2026-09-04.

| Passo | Acção | Resultado esperado | Tipo | Dep. | Estado |
|-------|--------|-------------------|------|------|--------|
| A6.1 | Confirmar PF3D atrás de flag OFF + smokes OFF PASS | Não reabrir “falta código” | CONFIRMAR | `PF3D_…` | Por confirmar |
| A6.2 | Acta **A3-D03-REV1**: A6 crítico M2; OFF = implementação pendente | Acta | DOCS | A3-D03-REV1 | **DONE** |
| A6.3 | Desenhar validação IMT (operador/motorista/veículo) sem inventar API | Spec + gaps IMT | DOCS · EXTERNO | A6.2 | Por iniciar |
| A6.4 | Auditoria frota + docs mínimos Partner | Frota piloto completa | DOCS · EXTERNO | A6.2 | Por iniciar |
| A6.5 | Fechar decisões A–E PF3D-0 ainda abertas | Acta A–E | DECISÃO | A6.1 | Por iniciar |
| A6.6 | Implementar bloqueio operacional real (disponível/matching/accept/start) | Entidade bloqueada inoperante | CÓDIGO | A6.3 · A6.5 | Por iniciar |
| A6.7 | Activar flag staging→prod + smoke **só** quando gates+IMT/processo prontos | Gates ON após PASS | CONFIG · TESTE | A6.4 · A6.6 | Por iniciar |
| A6.8 | UX Admin: rever falso positivo / revalidar; **sem** override contra estado oficial inválido | Override seguro | CÓDIGO | A6.6 | Por iniciar |
| A6.9 | Enforcement 10 h/24 h (**A3-D04-REV1**) — janela móvel + estados granulares | Bloqueio efectivo M2 | CÓDIGO · TESTE | A3-D04-REV1 | Por iniciar |

---

# CARRIL B — Pagamentos / Financeiro

**Três camadas (não confundir):**

| Camada | Etapa | Significado |
|--------|-------|-------------|
| Pagamento real do passageiro | **B1** | Cobrança PI live na plataforma |
| Split automático | **B3** | Connect / transferência automática plataforma↔beneficiário |
| Payout automático | **B4** | Cadência payout ao beneficiário |

Piloto pode usar **B1 + liquidação manual** se legal/ops o permitirem — documentar; B3/B4 ficam P1 sem bloquear Marco 1 nem necessariamente Marco 2.

## B1 — Stripe live (pagamento passageiro)

- **Objectivo:** Authorize/capture + webhook em prod; mock OFF.  
- **IDs:** `S-PAY-01` · `S-PAY-06` · `S-PAY-07` · `S-PAX-01`  
- **Dependências:** A2 recomendado; OK Francisco+parceiro  
- **Conclusão:** Viagem paga real; `STRIPE_MOCK=false`.  
- **Política actual piloto:** mock ON — [`ENV_SINGLE_REALITY.md`](env/ENV_SINGLE_REALITY.md) · `O-STRIPE-1`.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| B1.1 | Confirmar política actual: mock em piloto até go-live explícito | Não activar por engano | CONFIRMAR | `ENV_SINGLE_REALITY.md` |
| B1.2 | Decisão go-live Stripe (conta + responsável) | OK escrito | DECISÃO | A2 · B1.1 |
| B1.3 | `sk_live_*` + webhook prod no Render | Keys fora do git | CONFIG | B1.2 |
| B1.4 | Webhook endpoint + signing secret | Eventos 2xx | CONFIG | B1.3 |
| B1.5 | `STRIPE_MOCK=false` (+ FE alinhado) | Mock OFF | CONFIG | B1.4 |
| B1.6 | Smoke 1 viagem valor real mínimo | Payment `succeeded` | TESTE | B1.5 |
| B1.7 | Alinhar auth placeholder / preço vs complete | Comportamento documentado | CÓDIGO | B1.5 |
| B1.8 | Copy Pax real (ver também E3) | UI sem copy mock | CÓDIGO | B1.5 |
| B1.9 | Cancel fee / `authorization_expires_at` | Aceite ou ticket explícito | CÓDIGO | B1.6 |

## B2 — Confirm on accept / 3DS

- **Objectivo:** Só activar se política live o exigir **contra** decisão de pricing actual.  
- **IDs:** `S-PAY-04`  
- **Dependências:** B1  
- **Canónico:** [`PRICING_DECISION.md`](PRICING_DECISION.md) — `ENABLE_CONFIRM_ON_ACCEPT` **OFF**; confirmação no accept fora do modelo híbrido.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| B2.1 | Confirmar decisão: confirm-on-accept OFF no modelo híbrido | Default = manter OFF | CONFIRMAR | `PRICING_DECISION.md` |
| B2.2 | Só se negócio exigir override: decidir activar 3DS/confirm | Acta override | DECISÃO | B1 · B2.1 |
| B2.3 | Se override: flag + FE `client_secret` | Fluxo completo | CONFIG · CÓDIGO | B2.2 |
| B2.4 | Se override: smoke 3DS | PASS | TESTE | B2.3 |

## B3 — Stripe Connect + split automático

- **Objectivo:** Split automático conforme A2 — **só crítico se modelo exigir automatização**.  
- **IDs:** `S-PAY-02` · `SEP-PAY-01`  
- **Dependências:** B1 · A2  
- **Alternativa piloto:** liquidação manual semanal ao Partner (**A1-D03…D05**) → **B3 fora do crítico M2** nesta fase.  
- **A1-D05:** Connect/split **não** é requisito do piloto; só depois se operação o exigir.

| Passo | Acção | Resultado esperado | Tipo | Dep. | Estado |
|-------|--------|-------------------|------|------|--------|
| B3.1 | Confirmar intent Manel: Connect = caminho MVP **provável** (não fechado) | Input, não activação | CONFIRMAR | `MANEL_INPUTS_TODOS` · `SETEMBRO` SEP-PAY-01 | — |
| B3.2 | Decidir: piloto/comercial exige **split automático** agora? | Sim → B3 crítico; Não → processo manual | DECISÃO | A2 · B3.1 | **DONE** piloto = **Não** (**A1-D05**) |
| B3.3 | Se Não: documentar processo financeiro temporário (responsável, cadência, prova) | Alternativa válida — ver **A1-D04** | DOCS | B3.2 · A1-D04 | **PARCIAL** (cadência DONE; dia da semana TBD) |
| B3.4 | Se Sim: escolher tipo Connect (Express/Custom/…) | Arquitectura | DECISÃO | B3.2 |
| B3.5 | Se Sim: KYC conta piloto | Conta capaz de receber | EXTERNO | B3.4 |
| B3.6 | Se Sim: implementar/ligar split | Código alinhado a A2 | CÓDIGO | B3.4 |
| B3.7 | Se Sim: smoke split 1 viagem | Valores OK | TESTE | B3.5 · B3.6 |

## B4 — Payouts automáticos

- **Objectivo:** Payout automático ao beneficiário A2.  
- **IDs:** `S-PAY-03` · `S-PRT-01` · `S-DRV-01` (fórmula)  
- **Dependências:** B3 (se automático) · A2  
- **Nota:** **A1-D06** — payouts automáticos **não** são requisito do piloto; B4 fora do crítico M2 nesta fase (liquidação manual D04).

| Passo | Acção | Resultado esperado | Tipo | Dep. | Estado |
|-------|--------|-------------------|------|------|--------|
| B4.1 | Confirmar perguntas abertas cadência/beneficiário (Q3) | Estado das respostas | CONFIRMAR | `MANEL_INPUTS` Q3 · A2.4 | **DONE** via A1-D03/D04 |
| B4.2 | Decidir: payout **automático** exigido neste marco? | Sim/Não | DECISÃO | B4.1 · B3.2 | **DONE** piloto = **Não** (**A1-D06**) |
| B4.3 | Se Não: estender doc processo manual | Ops coberta — ver **A1-D04** | DOCS | B4.2 · B3.3 | **PARCIAL** |
| B4.4 | Se Sim: implementar/ops payouts | Dinheiro ao beneficiário | CÓDIGO · EXTERNO | B3 · B4.2 | N/A piloto |
| B4.5 | Fórmula líquido motorista (app) — ver E1 | UI/API coerente A2 | CÓDIGO | A2 · B4.1 | — |
| B4.6 | Copy Partner alinhada (ver E4) | Sem prometer payout inexistente | CÓDIGO | B4.3 ou B4.4 | — |

## B5 — Métodos PT (MB WAY / SIBS / Multibanco)

- **Objectivo:** MVP vs fase 2 (Q2 Manel).  
- **IDs:** `S-PAY-05` · `SEP-PAY-02`  
- **Dependências:** B1  
- **Conclusão:** Fora MVP → H **ou** 1 método PT em smoke.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| B5.1 | Confirmar que obrigatoriedade PT está **aberta** (Q2) | Não assumir MVP | CONFIRMAR | `MANEL_INPUTS` Q2 |
| B5.2 | Decisão: MVP ou fase 2 | Escopo fechado | DECISÃO | B5.1 |
| B5.3 | Se MVP: contrato/PSP + integração + smoke | Pagamento PT OK | EXTERNO · CÓDIGO · TESTE | B5.2 |
| B5.4 | Se fase 2: mover para H | Fora críticos | DOCS | B5.2 |

---

# CARRIL C — Autenticação / Comunicação

## C1 — OTP SMS real

- **Objectivo:** OTP por SMS fora de non-prod.  
- **IDs:** `S-AUTH-01`  
- **Dependências:** Provider SMS  
- **Conclusão:** Login OTP em telemóvel real.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| C1.1 | Escolher provider SMS | Conta + pricing OK | DECISÃO · EXTERNO | — |
| C1.2 | Credenciais no Render | Envio possível | CONFIG | C1.1 |
| C1.3 | Ligar envio real em prod | Sem path só-log | CÓDIGO · CONFIG | C1.2 |
| C1.4 | Smoke OTP Passenger + Driver | SMS + login OK | TESTE | C1.3 |

## C2 — SMS transaccionais (oferta/viagem)

- **IDs:** `S-NOTIF-02` · **Dependências:** C1  
- **Conclusão:** 1–2 eventos **ou** → H.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| C2.1 | Decidir eventos MVP | Lista curta ou adiar | DECISÃO | C1 |
| C2.2 | Implementar ou mover H | DONE / H | CÓDIGO · DOCS | C2.1 |

## C3 — Google OAuth staging

- **IDs:** `S-AUTH-02`  
- **Conclusão:** Smoke staging PASS **ou** pós-Marco 3.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| C3.1 | Config URIs Google staging | Console OK | CONFIG | — |
| C3.2 | Smoke login Google passenger | PASS | TESTE | C3.1 |

---

# CARRIL D — Mobile / Push / Distribuição

## D0 — Definir requisito de entrega mobile — **DONE**

- **Objectivo:** Fixar requisito de entrega mobile por marco.  
- **IDs:** `S-MOB-01` (gate) · `MOBILE-001`  
- **Dependências:** —  
- **Estado:** **DONE** (2026-09-02) — decisão Francisco/Manel  
- **Decisão registada:** **HÍBRIDO** — WEB/PWA fecha Marco 1; package mobile exigido para piloto/comercial, Android primeiro  
- **Princípio técnico:** reaproveitar a web-app actual (Capacitor / wrapper equivalente / PWA quando suficiente). **Não** reescrita React Native/native de raiz nesta fase.  
- **Efeito nos caminhos:**  
  - **Marco 1:** WEB/PWA; D1/D2/D3/G2 **fora** do crítico.  
  - **Marco 2:** D1→D2→D3(+G2) **no crítico**, foco **Android**; iOS previsto no carril sem bloquear piloto Android.  
  - **Marco 3 / D4:** stores/landing conforme necessidade real de distribuição; iOS se ainda em falta.

| Passo | Acção | Resultado esperado | Tipo | Dep. | Estado |
|-------|--------|-------------------|------|------|--------|
| D0.1 | Confirmar estado: sem Capacitor/stores; só intenção MOBILE-001 | Não assumir package | CONFIRMAR | `SETEMBRO_2026_TODO_LIBRARY` MOBILE-001 | **DONE** |
| D0.2 | Decidir requisito entrega (modelo HÍBRIDO) | Acta Francisco/Manel | DECISÃO | D0.1 | **DONE** |
| D0.3 | Actualizar caminhos críticos D*/G2 por marco | Secção caminhos alinhada | DOCS | D0.2 | **DONE** |

## D1 — Spike packaging (Android primeiro)

- **Objectivo:** Escolher Capacitor/wrapper/PWA e provar build — **prioridade Android**.  
- **IDs:** `S-MOB-01` · `MOBILE-001`  
- **Dependências:** D0 **DONE** (HÍBRIDO) — crítico no **Marco 2** (não no M1)  
- **Conclusão:** Caminho técnico escolhido + spike Android instalável interno.  
- **Nota iOS:** mesma stack depois; não bloqueia arranque D1 Android.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| D1.1 | Comparar Capacitor vs wrapper vs PWA (reuso web-app) | Matriz | DOCS | D0 |
| D1.2 | Spike mínimo **Android** | Build interno instalável | CÓDIGO | D1.1 |
| D1.3 | Confirmar caminho de packaging oficial | Acta técnica | DECISÃO | D1.2 |

## D2 — Validação em device (Android primeiro)

- **IDs:** `S-MOB-02` · **Dependências:** D1 · crítico **Marco 2**  
- **Foco:** GPS/permissões/background · Waze/Maps/deep links · login/persistência · lifecycle (background/fechada).  
- **iOS:** mesma checklist depois; não bloqueia PASS Android do piloto.
| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| D2.1 | Checklist permissões | Lista | DOCS | D1 |
| D2.2 | GPS + background (limites OS) | Notas | TESTE | D2.1 |
| D2.3 | Waze/Maps deep link | OK | TESTE | D2.1 |
| D2.4 | Login persistente + mapa | OK | TESTE | D2.1 · C1 |
| D2.5 | Corrigir bloqueadores | Build estável | CÓDIGO | D2.2–D2.4 |

## D3 — Push notifications

- **IDs:** `S-NOTIF-01` · **Dependências:** D1/D2 · crítico **Marco 2** (Android primeiro)  

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| D3.1 | Contas FCM/APNs | Prontas | EXTERNO · CONFIG | D1 |
| D3.2 | Backend device + send | API push | CÓDIGO | D3.1 |
| D3.3 | Cliente handlers | Recebe | CÓDIGO | D3.2 |
| D3.4 | Smoke oferta→push | PASS | TESTE | D3.3 |

## D4 — Landing / URL lojas

- **IDs:** `S-MOB-03` · **Dependências:** necessidade real de distribuição (não automático no M2)  
- **Nota:** só entra no crítico do Marco 3 se stores/landing forem exigidos para exploração comercial.  

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| D4.1 | Timing lojas vs internal | Plano | DECISÃO | D2 |
| D4.2 | URL + página download | Link OK | CONFIG · CÓDIGO | D4.1 |

---

# CARRIL E — Produto final (4 papéis)

*Núcleo 4 papéis VALIDADO — gaps para marcos 2/3.*

## E1 — Driver piloto (líquido + gaps Manel)

- **IDs:** `S-DRV-01` · `S-DRV-03`  
- **Dependências:** A2; líquido real típico após modelo pay (B4.5 / manual)  
- **Inputs:** [`MANEL_INPUTS_TODOS_2026-08-07.md`](product/MANEL_INPUTS_TODOS_2026-08-07.md) §4–6 (DRV-*, Q6/Q10)

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| E1.1 | Confirmar lista DRV-* / P0–P1 do input Manel vs app | Gaps mapeados (não redecidir o PDF) | CONFIRMAR | `MANEL_INPUTS_TODOS` |
| E1.2 | Responder Q6/Q10 (categorias MVP + fórmula líquido) | Respostas | DECISÃO | E1.1 · A2 |
| E1.3 | Implementar líquido conforme fórmula | UI correcta | CÓDIGO | E1.2 |
| E1.4 | Fechar gaps P1 seleccionados | Smoke Driver | CÓDIGO · TESTE | E1.2 |

## E2 — Afinação nav Waze/Maps

- **IDs:** `S-DRV-02`  
- **Canónico nav:** Opção B (manual, sem auto-open) — PR #405 / ops Julho.

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| E2.1 | Confirmar Opção B nav já em produção | Não reabrir auto-nav | CONFIRMAR | `FORWARD_PLAN` / #405 |
| E2.2 | Spec residual NAV-ROUTE-STOPS / nextStop se ainda aberto | Spec 1 página ou → H | DECISÃO · DOCS | E2.1 · `MANEL_INPUTS` DRV-NAV |
| E2.3 | Implementar residual + smoke | PASS ou adiado H | CÓDIGO · TESTE | E2.2 |

## E3 — Copy pagamento Passenger

- **IDs:** `S-PAX-01` · **Dependências:** B1  

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| E3.1 | Review strings vs modelo híbrido + live | Diff | DOCS | B1 · `PRICING_DECISION.md` |
| E3.2 | Aplicar copy | UI actualizada | CÓDIGO | E3.1 |

## E4 — Copy / receitas Partner

- **IDs:** `S-PRT-01` · **Dependências:** realidade B3/B4 ou processo manual  

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| E4.1 | Auditar copy vs payout real/manual | Lista | DOCS | B3.3 ou B4 |
| E4.2 | Corrigir UI | PASS visual | CÓDIGO | E4.1 |

## E5 — Admin approve/reject stubs — **DONE**

- **IDs:** `S-ADM-01`  
- **Estado:** **DONE** (2026-09-03) — E5.1 = **A implementar**  
- **Comportamento:** `POST /admin/drivers/{id}/approve|reject`  
  - `pending|rejected → approved` · `pending|approved → rejected`  
  - estado actual repetido = **idempotente** (sem audit extra)  
  - transição impossível → `409` · inexistente → `404` · não-admin → `403`  
  - audit `admin.driver_approve` / `admin.driver_reject` só com mudança real  
- **Fora de âmbito:** sem UI Admin nova; Partner frota/docs inalterados; PF3D inalterado  
- **Nota:** FE Admin **não** chama estes endpoints (API operacional + fecho de stubs 501)

| Passo | Acção | Resultado esperado | Tipo | Dep. | Estado |
|-------|--------|-------------------|------|------|--------|
| E5.1 | Decidir: implementar vs remover 501 | Acta = **A implementar** | DECISÃO | — | **DONE** |
| E5.2 | Código conforme | Sem 501 nestas rotas | CÓDIGO | E5.1 | **DONE** |
| E5.3 | Testes Admin approve/reject | PASS | TESTE | E5.2 | **DONE** |

---

# CARRIL F — Infra / Segurança / Operação

## F1 — Drill restore Postgres

- **IDs:** `S-OPS-03` · Runbook [`TVDE_BKP_RUNBOOK.md`](ops/TVDE_BKP_RUNBOOK.md)

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| F1.1 | Executar drill | Restore seguro | EXTERNO · TESTE | — |
| F1.2 | Acta PASS/FAIL | Registo | DOCS | F1.1 |

## F2 — Staging OAuth / smoke staging

- **IDs:** `S-OPS-02`

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| F2.1 | Stack staging viva | URLs OK | CONFIG | — |
| F2.2 | Smoke curto | PASS | TESTE | F2.1 · C3 |

## F3 — Sentry prod FE/BE

- **IDs:** `S-OPS-04`

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| F3.1 | Verificar DSN prod | CONFIGURADO | CONFIG | — |
| F3.2 | Evento teste | Visível | TESTE | F3.1 |

## F4 — Higiene mock GPS prod

- **IDs:** `S-HYG-01`

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| F4.1 | Política mock GPS prod | Regra | DECISÃO | — |
| F4.2 | Restrição | Sem abuso público | CÓDIGO | F4.1 |

---

# CARRIL G — QA / Hardening / Go-live

## G1 — Suite E2E / regression comercial

- **IDs:** `S-QA-01` · **Dependências:** B1 (piloto)

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| G1.1 | Guião comercial (pay conforme modelo piloto) | Checklist | DOCS | B1 |
| G1.2 | Playwright + smoke humano | PASS | TESTE | G1.1 |
| G1.3 | Corrigir P0 | Verde | CÓDIGO | G1.2 |

## G2 — Testes em telemóveis reais

- **IDs:** `S-QA-02` · **Dependências:** D2/D3 · crítico **Marco 2** (matriz **Android** primeiro; iOS depois)  

| Passo | Acção | Resultado esperado | Tipo | Dep. |
|-------|--------|-------------------|------|------|
| G2.1 | Devices piloto | Lista | DECISÃO | D2 |
| G2.2 | Matriz viagem+push+GPS | PASS/FAIL | TESTE | G2.1 · D3 |
| G2.3 | Corrigir P0 device | PASS | CÓDIGO | G2.2 |

## G3 — Verificação dos três marcos

- **Objectivo:** Declarar M1 / M2 / M3 sem “excepção escrita” a fingir conclusão técnica.  
- **Dependências:** caminhos críticos respectivos  

| Passo | Acção | Resultado esperado | Tipo | Dep. | Estado |
|-------|--------|-------------------|------|------|--------|
| G3.1 | Checklist **Marco 1** | Todos critérios M1 PASS | TESTE · DOCS | crítico M1 | **DONE** 2026-09-03 · tip `e556a3b` |
| G3.2 | Checklist **Marco 2** | Todos critérios M2 PASS | TESTE · DOCS | M1 · crítico M2 | Por iniciar |
| G3.3 | Checklist **Marco 3** | Todos critérios M3 PASS | DECISÃO · DOCS | M2 · crítico M3 | Por iniciar |
| G3.4 | Acta (data, tip SHA, marco atingido, IN/OUT) | Documento | DOCS | G3.1–G3.3 | **PARCIAL** — acta M1 em caminho crítico M1 acima; M2/M3 TBD |
| G3.5 | Comunicar Manel/ops | Expectativas alinhadas | DOCS | G3.4 | Por iniciar (M1) |

---

# CARRIL H — Pós-entrega / Futuro

*Fora dos caminhos críticos dos três marcos (salvo itens movidos explicitamente).*

## H1 — B2 next-trip

- **IDs:** `S-B2-01` · `S-B2-02` · `S-B2-03`  
- **Canónico produto V1:** [`B2_PRODUCT_DECISIONS_2026-08-04.md`](architecture/B2_PRODUCT_DECISIONS_2026-08-04.md) — Opção B · 1 queued · ETA 12 · PI na promoção · flag OFF · groundwork DONE.

| Passo | Acção | Resultado | Tipo | Dep. |
|-------|--------|-----------|------|------|
| H1.1 | Confirmar decisões produto B2 V1 (não reabrir Opção B) | Acta de leitura | CONFIRMAR | `B2_PRODUCT_DECISIONS_2026-08-04.md` |
| H1.2 | Decidir **quando** activar (se alguma vez) | Sim/Não/quando | DECISÃO | H1.1 · B1 |
| H1.3 | Lifecycle accept→queued→promote+PI | Flag OFF até OK | CÓDIGO | H1.2 |
| H1.4 | Matching ETA 12 | OK | CÓDIGO | H1.3 |
| H1.5 | UI Driver/Pax | OK | CÓDIGO | H1.3 |
| H1.6 | Flag ON + smoke | PASS | CONFIG · TESTE | H1.5 |

## H2 — Redispatch imediato pós-reject

- **IDs:** `S-MATCH-01`

| Passo | Acção | Resultado | Tipo | Dep. |
|-------|--------|-----------|------|------|
| H2.1 | Spec + implementar | Reject→oferta rápida | CÓDIGO | — |
| H2.2 | Teste | PASS | TESTE | H2.1 |

## H3 — Higiene código / CI

- **IDs:** `S-HYG-02` · `S-HYG-03` · `R-GIT-1` · `CI-MAINT-1`

| Passo | Acção | Resultado | Tipo | Dep. |
|-------|--------|-----------|------|------|
| H3.1 | Dead code Driver/DebugMap | Diff limpo | CÓDIGO | — |
| H3.2 | CI Node warning | Resolvido | CONFIG | — |
| H3.3 | Branches locais | Higiénico | EXTERNO | — |

## H4 — Admin rastos UX

- **IDs:** `S-ADM-02` · orphan/Agora/reassign

| Passo | Acção | Resultado | Tipo | Dep. |
|-------|--------|-----------|------|------|
| H4.1 | Triagem | Lista | DOCS | — |
| H4.2 | Fixes | PASS | CÓDIGO | H4.1 |

## H5 — Explicitamente futuro

- MB WAY/SIBS se B5.4  
- Registo marca (SEP-IP-04) adiado  
- Ideias Uber/Bolt não comprometidas  
- OCR · app nativa do zero · cosmético mapa Partner  

---

# Três marcos — critérios objectivos

**Regra:** uma “excepção” ou processo manual **não** conta para Marco 1. Coloca-se no marco onde a alternativa é aceite (tipicamente M2/M3).

## MARCO 1 — APP TECNICAMENTE CONCLUÍDA — **DONE** (2026-09-03)

| # | Critério | Estado |
|---|----------|--------|
| M1.1 | Fluxo 4 papéis em prod PASS (já: Demo Manel 2) | **PASS** |
| M1.2 | D0 **DONE** — HÍBRIDO (WEB/PWA fecha M1; package no piloto/comercial, Android primeiro) | **PASS** |
| M1.3 | A3: matriz + D01–D08 DONE; A3.8 WARN+RECORD DONE *(decisão M1)*; PARCIAL externo/arquivo — ver [`A3_REQUISITOS`](legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md). **REV1 2026-09-04 não reabre M1.** | **PASS** |
| M1.4 | E5 **DONE**: `POST /admin/drivers/{id}/approve|reject` implementados (sem 501); ver secção E5 | **PASS** |
| M1.5 | Decisões produto existentes confirmadas onde aplicável (pricing híbrido, B2 OFF, PF3D OFF, nav Opção B) — sem flags perigosas acidentais (`ENABLE_DEV_TOOLS=false`) | **PASS** |
| M1.6 | G3.1 assinado | **PASS** |

*Não exige:* SMS prod, Stripe live, Connect, payouts, package/push, gates ON.

## MARCO 2 — APP PRONTA PARA PILOTO REAL (`READY FOR REAL PILOT`)

Além de M1 — **não** marcar M2 “bloqueado” genericamente; fechar blockers **concretos** (secção caminho M2 + abaixo).

| # | Critério |
|---|----------|
| M2.1 | A1 + A2 fechados (comissões/tarifário/beneficiário para o piloto) |
| M2.2 | C1 OTP SMS real PASS |
| M2.3 | B1 Stripe live PASS **conforme modelo do piloto** (mock OFF se o piloto cobrar real) |
| M2.4 | E3 copy pagamento alinhada |
| M2.5 | G1 regression/smoke piloto PASS |
| M2.6 | F1 restore drill PASS (recente) |
| M2.7 | Se B3.2=Não: processo financeiro **manual** documentado e operável |
| M2.8 | Se B3.2=Sim: B3 smoke split PASS |
| M2.9 | **A6 / compliance:** validação IMT + bloqueio efectivo operador/motorista/veículo (**A3-D03-REV1**) — flag OFF **não** conta como PASS |
| M2.10 | D1–D3 (+G2) PASS em **Android** (D0 HÍBRIDO); iOS pode estar pendente |
| M2.11 | **Termos de utilização + Política de Privacidade** publicados/aceites no fluxo (A3-D07) |
| M2.12 | Base legal M2 documentada (source pack / A3-REV); riscos residuais IMT/parecer **aceites por escrito** onde aplicável |
| M2.13 | Driving-hours: **enforcement 10 h/24 h** alinhado a **A3-D04-REV1** (WARN+RECORD sozinho = **não** PASS M2) |
| M2.14 | Emergência passageiro + motorista (chamada autoridades + partilha localização) |
| M2.15 | Licença IMT do gestor da plataforma (processo / evidência) |
| M2.16 | NECESSÁRIOS M2 legais mínimos operáveis (retenção 2 anos, hard-cap 25%, breakdown, fatura/AMT/contratos/RAL — ver lista) ou plano escrito aceite |
| M2.17 | G3.2 assinado |

*Recibos/faturação (A3-D08):* escolha de emissor com contabilista **após A1/A2**; fatura electrónica continua **NECESSÁRIO M2**.  
*Pendentes finos:* definição exacta dos estados 10 h · viagem no limite · revalidação/fallback IMT · cross-platform · “devesse ter conhecimento” · IVA da contribuição 5% · portarias execução — `DEPENDE PARECER / IMT / REGULAMENTAÇÃO`.
## MARCO 3 — APP PRONTA PARA EXPLORAÇÃO COMERCIAL

Além de M2:

| # | Critério |
|---|----------|
| M3.1 | A4 inventário IP + A5 logo de produção decidido (troca feita ou calendarizada com OK) |
| M3.2 | Se operação comercial exige split automático: B3 PASS |
| M3.3 | Se exige payout automático: B4 PASS; senão processo financeiro comercial documentado |
| M3.4 | E1 líquido + gaps Driver P1 do piloto comercial; E4 copy Partner honesta |
| M3.5 | Compliance: A6 no estado que negócio/legal exigir para exploração |
| M3.6 | Distribuição: D4/stores conforme necessidade real; iOS do carril D concluído se exploração o exigir |
| M3.7 | B5 resolvido (integrado **ou** explicitamente fase 2 em H) |
| M3.8 | Ops: on-call + canais incidente; G3.3–G3.5 assinados |

---

# PÓS-ENTREGA / BACKLOG FUTURO

Carril **H** + itens adiados (B5 fase 2, C2, C3, F2, F4, E2 residual). iOS pós-Android e D4/stores ficam no carril D conforme necessidade — não “adiados por WEB/PWA”.

**Não** reabre Demo Manel 2 / retoma como pendência.

---

# Referências rápidas

| Tema | Doc |
|------|-----|
| Estado Setembro | [`TVDE_STATUS_SETEMBRO_2026.md`](TVDE_STATUS_SETEMBRO_2026.md) |
| Biblioteca | [`SETEMBRO_2026_TODO_LIBRARY.md`](product/SETEMBRO_2026_TODO_LIBRARY.md) |
| Pricing híbrido | [`PRICING_DECISION.md`](PRICING_DECISION.md) |
| B2 produto | [`B2_PRODUCT_DECISIONS_2026-08-04.md`](architecture/B2_PRODUCT_DECISIONS_2026-08-04.md) |
| PF3D | [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) |
| Inputs Manel | [`MANEL_INPUTS_TODOS_2026-08-07.md`](product/MANEL_INPUTS_TODOS_2026-08-07.md) |
| Negócio hipóteses | [`docs/business/`](business/) |
| Legal | [`LEGAL_SOURCES_INDEX.md`](legal/LEGAL_SOURCES_INDEX.md) |
| Stripe / env | [`O_STRIPE_1_RUNBOOK.md`](ops/O_STRIPE_1_RUNBOOK.md) · [`ENV_SINGLE_REALITY.md`](env/ENV_SINGLE_REALITY.md) |
| Backup | [`TVDE_BKP_RUNBOOK.md`](ops/TVDE_BKP_RUNBOOK.md) |

---

**Governação:** executar pelos caminhos do marco alvo; paralelizar só o permitido; `CONFIRMAR` antes de reabrir; activação de flags comerciais só com `DECISÃO` explícita no passo.
