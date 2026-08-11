# Biblioteca de TODOs / intenções — Setembro 2026

**Tipo:** biblioteca de intenções, temas, riscos e decisões  
**Estado:** captura viva — **não** sprint fechado · **não** promessa ao Manel · **não** implementação imediata  
**Tip `main` (contexto):** `1cb01c5` (actualizar após pull)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · painel [`TODOdoDIA.md`](../../TODOdoDIA.md)

Relacionado (não substituído por este ficheiro):

- [`MANEL_INPUTS_TODOS_2026-08-07.md`](MANEL_INPUTS_TODOS_2026-08-07.md)
- [`MANEL_RESUMO_NAO_TECNICO_2026-08-07.md`](MANEL_RESUMO_NAO_TECNICO_2026-08-07.md)
- [`DEMO_MANEL_2_SETEMBRO.md`](../ops/DEMO_MANEL_2_SETEMBRO.md)
- [`MODO_FERIAS_2026.md`](../ops/MODO_FERIAS_2026.md) · [`SSD_FERIAS_READINESS.md`](../ops/SSD_FERIAS_READINESS.md)
- Fontes legais: [`LEGAL_SOURCES_INDEX.md`](../legal/LEGAL_SOURCES_INDEX.md)
- Negócio / custos: [`MANEL_COSTS_OPERATION_MODEL_2026-08.md`](../business/MANEL_COSTS_OPERATION_MODEL_2026-08.md) · [`MANEL_PRICING_COMMISSION_MODEL_2026-08.md`](../business/MANEL_PRICING_COMMISSION_MODEL_2026-08.md) · [`MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md`](../business/MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md)

---

## 1. Nota de propósito

| | |
|--|--|
| **O que é** | Biblioteca central para Setembro: intenções, temas abertos, riscos e decisões a fechar |
| **O que não é** | Sprint fechado · roadmap contratual · lista de garantias ao Manel · backlog de implementação imediata |
| **Uso** | Evitar perda de contexto em férias / pós-férias · escolher 1–2 frentes por vez · gerar specs curtas **só** quando um item for seleccionado |
| **Regras** | Exemplos de % / plataformas / logos = **a validar** · não inventar decisões · não activar Stripe live / B2 / PF3D só porque estão listados |
| **Horizonte** | Até Setembro: sobretudo docs, marca, alinhamento produto/jurídico/financeiro · implementação só com escolha explícita |

**P0** = útil para demo/piloto Setembro · **P1** = pré-piloto comercial · **P2** = maturidade operacional · **P3** = futuro/escala.

Formato de cada item: **ID** · Origem · Resumo · Porque interessa · Estado actual · Prioridade Setembro · Precisa decisão de · Não fazer agora.

---

## 2. Jurídico / propriedade intelectual

### LEGAL-TVDE-001 — Decreto-Lei n.º 84/2026 (tempo de trabalho / transporte rodoviário)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Documento legal recebido / Decreto-Lei n.º 84/2026, de 13 de abril · PDF em [`docs/legal/sources/`](../legal/sources/decreto-lei-84-2026-tvde-transporte-rodoviario.pdf) · índice [`LEGAL_SOURCES_INDEX.md`](../legal/LEGAL_SOURCES_INDEX.md) |
| **Resumo** | Analisar em Setembro obrigações legais aplicáveis à operação TVDE/plataforma, especialmente tempos de trabalho/condução, pausas, repousos, registos, responsabilidades, fiscalização, documentos e contraordenações. |
| **Porque interessa** | Perceber o que a app, admin, parceiro/frota e motorista têm de suportar para ajudar a operar em conformidade. |
| **Estado actual** | PDF guardado; ainda **não** analisado artigo a artigo. |
| **Prioridade Setembro** | P0 |
| **Precisa decisão de** | Francisco + Manel + apoio jurídico/contabilístico/regulatório |
| **Não fazer agora** | Não implementar regras automáticas · não prometer conformidade · não interpretar como parecer jurídico |

### BUSINESS-MANEL-001 — Custos, comissões, tarifário e simulador económico

| Campo | Conteúdo |
|-------|----------|
| **Origem** | DOCX Manel/IA sobre custos de operação, preços e simulador económico · [`sources/quais-os-custos-operacao-app-depois-construida.docx`](../business/sources/quais-os-custos-operacao-app-depois-construida.docx) |
| **Resumo** | Consolidar hipóteses de custos mensais, comissões, tarifário, margem por viagem, mercados iniciais e simulador financeiro de 36 meses. |
| **Porque interessa** | Definir se a Vamo Lá consegue ser mais barata para passageiros, pagar melhor a motoristas e ainda operar com margem positiva. |
| **Estado actual** | Fonte recebida; 3 docs derivados criados; números ainda **não** validados. |
| **Prioridade Setembro** | P0 |
| **Precisa decisão de** | Francisco + Manel + contabilista/financeiro + eventual apoio PSP/pagamentos |
| **Não fazer agora** | Não fechar tarifário · não prometer rendimentos · não publicar campanha · não implementar lógica automática de comissões |

Docs derivados: [`MANEL_COSTS_OPERATION_MODEL_2026-08.md`](../business/MANEL_COSTS_OPERATION_MODEL_2026-08.md) · [`MANEL_PRICING_COMMISSION_MODEL_2026-08.md`](../business/MANEL_PRICING_COMMISSION_MODEL_2026-08.md) · [`MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md`](../business/MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md)

### MOBILE-001 — Passagem da app para Android / iOS

| Campo | Conteúdo |
|-------|----------|
| **Tema** | Passagem da app para Android / iOS |
| **Origem** | Pergunta do Manel: *«Vamos ter problemas a passar a APP para Android e/ou iOS?»* |
| **Resumo** | Avaliar forma de transformar a web app actual numa app distribuível em Android/iOS, provavelmente via PWA / wrapper mobile / Capacitor, reaproveitando a base actual. |
| **Porque interessa** | A app não deve ficar presa ao browser; Android/iOS serão importantes para adopção real por passageiros e motoristas. |
| **Estado actual** | Arquitectura actual **parece** compatível, mas precisa **spike técnico** em Setembro. |
| **Prioridade Setembro** | P0 / P1 |
| **Precisa decisão de** | Francisco + Manel + validação técnica mobile |
| **Não fazer agora** | Não prometer data de publicação nas lojas · não assumir aprovação automática na App Store / Google Play · não iniciar app nativa do zero · **não** mexer em código · **não** configurar lojas agora |

**Notas (intenção — não conclusão técnica fechada):**

- Não parece haver bloqueio estrutural óbvio; **não** é recomeçar do zero.
- Há trabalho próprio de **mobile packaging** (PWA / wrapper / Capacitor — caminho a escolher no spike).
- Pontos a validar no spike:
  - GPS / localização em tempo real
  - localização em background
  - notificações push
  - permissões Android / iOS
  - abertura de Waze / Google Maps
  - login persistente
  - mapas
  - política de privacidade
  - TestFlight / Google Play Console
  - testes em telemóveis reais

### SEP-IP-01 — Propriedade intelectual da app

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Risco de negócio / conversa parceiro |
| **Resumo** | Clarificar quem detém IP do software TVDE (código, docs de produto, desenho UX) |
| **Porque interessa** | Evita conflito futuro com parceiro / investidores / piloto |
| **Estado actual** | Intenção capturada — sem auditoria externa feita |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Francisco (+ jurídico quando aplicável) · alinhamento com Manel se houver contribuição |
| **Não fazer agora** | Contratos longos · auditoria externa · litígio |

### SEP-IP-02 — Titularidade código / design / marca / logos / domínios / contas

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Ops + marca + contas (GitHub, cloud, domínio, Stripe, etc.) |
| **Resumo** | Inventário de quem é titular de: código, design, marca verbal/visual, logos, domínios, contas de serviço |
| **Porque interessa** | Operação e saída/entrada de parceiros sem ambiguidade |
| **Estado actual** | Parcialmente implícito no dia a dia — **não** documentado de forma canónica |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Francisco · lista de contas críticas |
| **Não fazer agora** | Transferências de titularidade · mudanças de DNS/contas em prod |

### SEP-IP-03 — Origem e licença dos logos (Manel + gerados)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Material Manel (`_assets/LOGO`) + gerações Ideogram / arquivo `image/` |
| **Resumo** | Registar origem, direitos de uso e restrições de cada família de logo (Manel vs gerados vs produção actual) |
| **Porque interessa** | Marca em app/demo sem risco de uso indevido |
| **Estado actual** | Shortlist visual local (16 PNG) · notas em `_temp` · **sem** parecer legal |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Francisco · Manel (contribuições dele) · jurídico se for a registo |
| **Não fazer agora** | Registo de marca formal · substituir logos em produção |

### SEP-IP-04 — Registo / pesquisa de marca

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Auditoria produto (marca V@mulá referida) · intenção Setembro |
| **Resumo** | Pesquisa de anterioridade + eventual registo (nome / logo) — calendário e orçamento a definir |
| **Porque interessa** | Protecção antes de escala / comunicação pública ampla |
| **Estado actual** | Intenção — sem processo iniciado neste doc |
| **Prioridade Setembro** | P2 |
| **Precisa decisão de** | Francisco · agente de PI / jurídico |
| **Não fazer agora** | Pedido de registo sem pesquisa · gastar budget sem brief |

---

## 3. Pagamentos / Stripe / SIBS / MB WAY

### SEP-PAY-01 — Stripe Connect (opção MVP provável)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Inputs Manel · [`MANEL_INPUTS_TODOS`](MANEL_INPUTS_TODOS_2026-08-07.md) |
| **Resumo** | Stripe Connect como caminho recomendado para marketplace (auth/capture, split, payouts) — **sujeito a validação** financeira/jurídica |
| **Porque interessa** | Base para cobrança real e divisão plataforma / motorista ou parceiro |
| **Estado actual** | Mock / test local · **live bloqueado** · não é decisão final fechada |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Francisco + Manel + financeiro/jurídico |
| **Não fazer agora** | Activar Stripe live · mudar envs de produção · Connect end-to-end |

### SEP-PAY-02 — SIBS / MB WAY / Multibanco (Portugal)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Inputs Manel · mercado PT |
| **Resumo** | Relevância local forte; obrigatório no MVP ou fase 2 — **a validar** |
| **Porque interessa** | Expectativa do passageiro português |
| **Estado actual** | Tema aberto (pergunta Q2 aos inputs Manel) |
| **Prioridade Setembro** | P2 |
| **Precisa decisão de** | Manel + Francisco |
| **Não fazer agora** | Integração SIBS · contratos adquirente |

### SEP-PAY-03 — Comissão real (15% / 12% / 20% = exemplos)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Materiais Manel — percentagens citadas como exemplo |
| **Resumo** | Fechar modelo de comissão da plataforma; valores 15/12/20 **não** são verdade final |
| **Porque interessa** | Split, preço líquido motorista, narrativa comercial |
| **Estado actual** | **A decidir** — exemplos apenas |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Manel + Francisco + modelo financeiro |
| **Não fazer agora** | Hardcode de % em código · comunicar % como fechado |

### SEP-PAY-04 — Payouts motorista vs parceiro

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Arquitectura pagamentos Manel |
| **Resumo** | Quem recebe (motorista directo vs partner) e cadência (diário / semanal / outro) |
| **Porque interessa** | KYC, fiscalidade, UX de rendimentos |
| **Estado actual** | Pergunta aberta |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Manel + Francisco + jurídico/financeiro |
| **Não fazer agora** | Payouts reais · onboarding KYC em prod |

### SEP-PAY-05 — Documentos e suspensão automática

| Campo | Conteúdo |
|-------|----------|
| **Origem** | PDF app Motorista · PF3D / compliance (gates OFF) |
| **Resumo** | Avisos de validade de documentos; suspensão automática **só** se operacional e legalmente OK |
| **Porque interessa** | Piloto seguro vs risco jurídico |
| **Estado actual** | Gates OFF · política não fechada |
| **Prioridade Setembro** | P2 |
| **Precisa decisão de** | Manel + Francisco + jurídico |
| **Não fazer agora** | Activar PF3D / bloqueio automático em prod |

---

## 4. App Motorista

### SEP-DRV-01 — Preço líquido + informação completa da viagem

| Campo | Conteúdo |
|-------|----------|
| **Origem** | PDF Motorista · inputs Manel · resumo não técnico |
| **Resumo** | Mostrar viagem completa e **preço líquido** (fórmula a fechar: comissão, portagens, gorjetas…) |
| **Porque interessa** | Alto valor demo/piloto · confiança do motorista |
| **Estado actual** | Parcial na app · fórmula não fechada |
| **Prioridade Setembro** | P0 |
| **Precisa decisão de** | Manel (fórmula) + Francisco |
| **Não fazer agora** | Implementar sem fórmula acordada |

### SEP-DRV-02 — Navegação Waze / Google Maps + GPS próprio

| Campo | Conteúdo |
|-------|----------|
| **Origem** | PDF Motorista · produção actual |
| **Resumo** | Afinação da base de navegação externa; GPS próprio = mapa/fallback vs nav completa (pergunta) |
| **Porque interessa** | Fluxo diário do motorista |
| **Estado actual** | Base já trabalhada · afinação pendente |
| **Prioridade Setembro** | P0–P1 |
| **Precisa decisão de** | Manel (GPS próprio: escopo) |
| **Não fazer agora** | Motor de navegação turn-by-turn próprio |

### SEP-DRV-03 — Menu, rendimentos, historial, categorias

| Campo | Conteúdo |
|-------|----------|
| **Origem** | PDF Motorista · `DRIVER_MENU_SPEC` / Top 3 |
| **Resumo** | Fechar gaps vs PDF: menu (foto/nome/rating), rendimentos, historial + reporte, categorias ligáveis (lista MVP exacta a validar) |
| **Porque interessa** | App “de negócio” para piloto |
| **Estado actual** | Menu/historial parciais · categorias em evolução |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Manel (categorias MVP) + Francisco |
| **Não fazer agora** | PDF inteiro de uma vez · campanhas / inbox / telefone temp (salvo decisão) |

---

## 5. App Passageiro

### SEP-PAX-01 — Fluxo demo estável (pedir → acompanhar → rating)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Demo Manel 1 completa · guião Manel 2 |
| **Resumo** | Manter núcleo passageiro fiável para Setembro; polish só se bloquear demo |
| **Porque interessa** | Demo e piloto dependem do pedido estável |
| **Estado actual** | Núcleo demonstrável |
| **Prioridade Setembro** | P0 (estabilidade) / P2 (novas features) |
| **Precisa decisão de** | Francisco (o que entra além do núcleo) |
| **Não fazer agora** | Redesign grande · wallet passageiro · promoções complexas |

### SEP-PAX-02 — Expectativa de pagamento real no ecrã

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Pagamentos · demo |
| **Resumo** | Alinhar copy/UX: nesta fase sem cobrança real; depois path Connect/MB WAY |
| **Porque interessa** | Evitar mal-entendidos na demo |
| **Estado actual** | Mock / sem live |
| **Prioridade Setembro** | P1 (copy/clareza) · P2 (métodos PT) |
| **Precisa decisão de** | Francisco + Manel |
| **Não fazer agora** | Cobrança real ao passageiro |

---

## 6. Partner / Frota

### SEP-PRT-01 — Frota, viagens, mapa operacional

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Demo 4 papéis · Partner mapa smoke PASS |
| **Resumo** | Partner como papel diário (frota/viagens/KPIs); mapa “em evolução” na demo |
| **Porque interessa** | Operação real não passa só pelo Admin |
| **Estado actual** | Usável · polish mapa não blocker |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Francisco (prioridade polish vs outras frentes) |
| **Não fazer agora** | Tracking perfeito · reassign complexo |

### SEP-PRT-02 — Documentos / veículos do parceiro

| Campo | Conteúdo |
|-------|----------|
| **Origem** | PDF Motorista · PF3D OFF · frota |
| **Resumo** | Quem valida docs; ligação veículos ↔ motoristas; avisos sem suspensão automática prematura |
| **Porque interessa** | Piloto e conformidade |
| **Estado actual** | Superfícies parciais · gates OFF |
| **Prioridade Setembro** | P1–P2 |
| **Precisa decisão de** | Manel + Francisco |
| **Não fazer agora** | Suspensão automática · PF3D ON |

---

## 7. Admin / Backoffice

### SEP-ADM-01 — Admin = leitura + excepção (não dispatcher)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Guião Demo Manel 2 · produto |
| **Resumo** | Manter Admin fora do matching diário; ferramentas de excepção e saúde |
| **Porque interessa** | Demo limpa · modelo operacional correcto |
| **Estado actual** | Alinhado em guião |
| **Prioridade Setembro** | P0 (disciplina demo) / P2 (novas tools) |
| **Precisa decisão de** | Francisco |
| **Não fazer agora** | Admin como dispatcher · recovery improvisado na demo |

### SEP-ADM-02 — Backoffice pagamentos / reconciliação (futuro)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Arquitectura pagamentos Manel |
| **Resumo** | Ferramentas de excepções, reembolsos, reconciliação — após path de pagamento real |
| **Porque interessa** | Ops pós-piloto |
| **Estado actual** | Parcial / mock |
| **Prioridade Setembro** | P2 |
| **Precisa decisão de** | Francisco (após SEP-PAY-01) |
| **Não fazer agora** | Reconciliação live |

---

## 8. Marca / logo / identidade visual

### SEP-BRD-01 — Shortlist visual 16 / base Ideogram

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Trabalho local Ago 2026 · `_SHORTLIST_FINAL_6` · pranchas `_temp` |
| **Resumo** | 16 ficheiros / ~15 bases úteis; duplicado C5≈B6; candidatos fortes vs só inspiração; 3 linhas Ideogram (A premium/app · B Portugal subtil · C iconmark) |
| **Porque interessa** | Decisão de marca antes de escala / demo pública |
| **Estado actual** | Material comparativo local (gitignored) · **sem** vencedor |
| **Prioridade Setembro** | P0–P1 (decisão visual) · P2 (produção) |
| **Precisa decisão de** | Francisco (+ Manel se logos dele entrarem) |
| **Não fazer agora** | Substituir `web-app/public/brand` · commit de binários de arquivo · escolha “final” sem brief |

### SEP-BRD-02 — Produção actual (A1 wordmark / A2 iconmark)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | `web-app/public/brand/` |
| **Resumo** | Logos em uso na app; baseline até haver decisão de mudança |
| **Porque interessa** | Demo e produto actuais |
| **Estado actual** | Em produção |
| **Prioridade Setembro** | P0 (manter estável) |
| **Precisa decisão de** | Francisco (se/quando trocar) |
| **Não fazer agora** | Troca em prod sem decisão + assets finais |

---

## 9. Demo Manel 2

### SEP-DEM-01 — Núcleo seguro + extras controlados

| Campo | Conteúdo |
|-------|----------|
| **Origem** | [`DEMO_MANEL_2_SETEMBRO.md`](../ops/DEMO_MANEL_2_SETEMBRO.md) |
| **Resumo** | ~15–20 min: viagem completa 4 papéis; extras só se tempo (Recusar · Partner mapa · F5); sem B2/Stripe live/PF3D |
| **Porque interessa** | Momento comercial Setembro |
| **Estado actual** | Guião pronto · smoke pré-demo = Setembro |
| **Prioridade Setembro** | P0 |
| **Precisa decisão de** | Francisco (data) · Manel (disponibilidade) |
| **Não fazer agora** | Prometer features OFF · alargar guião sem ensaio |

---

## 10. Piloto / operação real

### SEP-PIL-01 — Critérios mínimos de piloto

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Inputs Manel + resumo não técnico + pagamentos |
| **Resumo** | Definir o que é “piloto”: papéis, zona, pagamentos (mock vs real), docs, suporte |
| **Porque interessa** | Evitar piloto ambíguo |
| **Estado actual** | Intenção — critérios não fechados |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Manel + Francisco |
| **Não fazer agora** | Abrir piloto com cobrança real sem checklist |

### SEP-PIL-02 — Operação diária (Partner vs Admin vs Driver)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Modelo 4 papéis |
| **Resumo** | Papéis claros: matching/frota no Partner+Driver; Admin excepção |
| **Porque interessa** | Escala humana do piloto |
| **Estado actual** | Alinhado em docs/demo |
| **Prioridade Setembro** | P1 |
| **Precisa decisão de** | Francisco + Manel (ops) |
| **Não fazer agora** | Contratar processos pesados |

---

## 11. Pós-férias / reconciliação técnica

### SEP-OPS-01 — Modo férias (enquanto decorrer / fecho)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | [`MODO_FERIAS_2026.md`](../ops/MODO_FERIAS_2026.md) · SSD readiness |
| **Resumo** | Branches pequenas · push GitHub · GitHub = verdade · portátil MJ máquina activa · sem Docker/backend MJ · sem B2/Stripe live/PF3D |
| **Estado actual** | MODO FÉRIAS ainda **OFF** até gatilho (refresh SSD + secrets cifrados) |
| **Prioridade Setembro** | P0 (disciplina operacional) |
| **Precisa decisão de** | Francisco (quando ON/OFF) |
| **Não fazer agora** | Frentes grandes no portátil · activar flags de risco |

### SEP-OPS-02 — Reconciliação pós-férias

| Campo | Conteúdo |
|-------|----------|
| **Origem** | Handoff pré-férias |
| **Resumo** | `main` alinhada PC/SSD/GitHub · ramos reconciliados · smoke leve · escolher 1º P0/P1 da biblioteca |
| **Porque interessa** | Retoma sem caos |
| **Estado actual** | Planeado |
| **Prioridade Setembro** | P0 (na retoma) |
| **Precisa decisão de** | Francisco (1º carril) |
| **Não fazer agora** | Implementar B2 / Connect / troca de marca no dia 1 |

### SEP-OPS-03 — B2 next-trip (groundwork feito, OFF)

| Campo | Conteúdo |
|-------|----------|
| **Origem** | #525–#527 · decisões produto B2 |
| **Resumo** | Lifecycle/UI/matching ETA **pós** escolha explícita; flag OFF |
| **Porque interessa** | Não reabrir por acidente em férias |
| **Estado actual** | Schema inerte · zero writers · OFF |
| **Prioridade Setembro** | P2 (só se escolhido) |
| **Precisa decisão de** | Francisco |
| **Não fazer agora** | Activar B2 · writers · UI next-trip |

---

## 12. Mapa rápido (Setembro)

| Área | IDs | Foco sugerido |
|------|-----|---------------|
| Jurídico / PI | LEGAL-TVDE-001 · SEP-IP-01…04 | DL 84/2026 (P0 leitura) · titularidade · logos · marca |
| Negócio / preços | BUSINESS-MANEL-001 | Custos · comissões · tarifário · simulador 36m (hipóteses) |
| Mobile Android/iOS | MOBILE-001 | Spike packaging (PWA/wrapper/Capacitor) · GPS/push/lojas · **sem** código agora |
| Pagamentos | SEP-PAY-01…05 | Validar Connect path · % · payouts · MB WAY |
| Motorista | SEP-DRV-01…03 | Líquido + nav + menu/rendimentos |
| Passageiro | SEP-PAX-01…02 | Estabilidade demo · clareza pagamento |
| Partner | SEP-PRT-01…02 | Frota/ops · docs sem suspensão auto |
| Admin | SEP-ADM-01…02 | Disciplina demo · BO pay depois |
| Marca | SEP-BRD-01…02 | Shortlist → Ideogram A/B/C → decisão |
| Demo | SEP-DEM-01 | Núcleo + extras controlados |
| Piloto | SEP-PIL-01…02 | Critérios mínimos |
| Ops | SEP-OPS-01…03 | Férias / reconciliação / B2 OFF |

---

## 13. Próximos passos sugeridos (sem código)

1. Ler esta biblioteca com Francisco (e Manel nos itens PAY/DRV/IP que o tocam).  
2. Em férias: só docs/marca leve + branches pequenas — **não** esvaziar a biblioteca em implementação.  
3. Pós-férias: escolher **um** P0 (ex. Demo Manel 2 ou decisão marca) e **um** P1 (ex. fórmula líquido ou path Connect em papel).  
4. Manter [`MANEL_INPUTS_TODOS_2026-08-07.md`](MANEL_INPUTS_TODOS_2026-08-07.md) para o detalhe Q1–Q10.

---

**Frase:** Setembro = biblioteca de intenções. Nada aqui activa Stripe live, B2, PF3D ou troca de logos em produção.
