# Manel, pedidos de produto e obrigações legais — backlog EXTRA (2026-05)

Documento **canónico** para itens vindos de **feedback do Manel** (sessões, smoke, roadmap visível nos specs existentes) e para **riscos de conformidade** que o produto deve endereçar antes ou durante escala. **Não** substitui parecer jurídico: onde aparece *[Legal]*, a equipa deve validar texto e prazos com **assessoria**.

**Relacionado:** [`DRIVER_MENU_SPEC.md`](DRIVER_MENU_SPEC.md) (menu motorista, documentos §3), [`DRIVER_HOME_TOP3_MANEL.md`](DRIVER_HOME_TOP3_MANEL.md), [`PORTAGENS_SPEC.md`](PORTAGENS_SPEC.md), [`docs/research/driver-app-benchmarks.md`](../research/driver-app-benchmarks.md).

---

## Introdução

O produto **TVDE** combina operações diárias (motorista, passageiro, frota) com requisitos **regulatórios** e expectativas de **UX** alinhadas a referências de mercado (ver benchmarks). O Manel tem sido referência nas decisões de **ecrã principal**, **zonas**, **lista de viagens** e **clareza não restritiva**; em paralelo, normas e interpretações (protecção de dados, TVDE, igualdade de tratamento no rating, documentação de motoristas/veículos) **mudam ou apertam** o que a app pode mostrar ou delegar.

Este ficheiro **organiza** um conjunto **EXTRA** de ideias e obrigações **ainda não implementadas** como uma única lista priorizável. Cada linha deve, ao ser escolhida para desenvolvimento, gerar **spec curta + critérios de aceitação** (e, se *[Legal]*, registo da fonte normativa acordada).

### Legenda rápida

| Etiqueta        | Significado                                      |
|----------------|---------------------------------------------------|
| **UX motorista** | Comportamento da app lado motorista            |
| **Partner**      | Superfície frota / operações centralizadas      |
| **Passageiro**   | Superfície passageiro                           |
| **Legal**        | Requer validação jurídica explícita antes de “fechar” |
| **Crescimento**  | Monetização / aquisição / programa (não urgente core) |

---

## Lista EXTRA (1–10)

1. **Som de chamada quando uma viagem “cai”.** *[UX motorista]* — Notificar audio (ou canal configurável) quando um novo pedido entra no fluxo de ofertas; respeitar **modo silencioso** do SO e preferências em Definições.
2. **Ecrã: modo nocturno automático.** *[UX motorista / passageiro]* — Seguir `prefers-color-scheme` ou horário; alinhar theming global quando existir superfície única.
3. **Ecrã: sempre activo quando em uso.** *[UX motorista]* — Política de **wake lock** durante viagem activa ou ecrã de disponível (com aviso bateria, já mencionado no spec de menu); evitar manter ligado sem consentimento explícito.
4. **Tirar classificação do passageiro da app do motorista.** *[Legal] [UX motorista]* — Legislação / interpretação deixou de permitir expor rating do passageiro ao motorista (ou restringe o uso). **Acção:** inventário de UI/API onde rating passageiro aparece; remoção ou substituição por sinal neutro; validação jurídica e data de vigência.
5. **Partner: gerir sempre documentos de veículos e motoristas.** *[Partner] [Legal]* — **Fonte de verdade** no painel partner/admin (já alinhado em [`DRIVER_MENU_SPEC.md`](DRIVER_MENU_SPEC.md) §3); reforçar fluxos, estados, auditoria e relatórios operacionais.
6. **Driver: entregar documentos ao partner; avisos de caducidade.** *[Partner] [UX motorista] [Legal]* — Upload ou envio para a **central** (partner); avisos na app (ex. registo criminal, carta de condução, seguro, inspecção); prazos e textos a validar juridicamente. **Centralização = sempre partner** (cada motorista tem org, mesmo quando “é o próprio”).
7. **QR Code para download rápido da app.** *[Crescimento] [Partner]* — Landing ou deep link por loja; QR em materiais operacionais / frota (liga ao roadmap já mencionado nas sessões Manel).
8. **Promoções: PROMO CODES ou menu Família.** *[Crescimento]* — Modelo comercial a definir (subsídios, contas agrupadas, limites legais de desconto).
9. **Passageiro pertencer a uma Família.** *[Crescimento] [Passageiro]* — Modelo de conta / billing familiar; regras de privacidade (menores, consentimento).
10. **Passageiro: menu lateral tipo driver + histórico fora do ecrã principal.** *[UX passageiro]* — Drawer/side menu coerente com shell motorista; **histórico só dentro do menu** para ecrã principal mais limpo.

---

## Questões para fechar com produto / jurídico

- **Item 4 (rating passageiro):** Qual **diploma / orientação** exacta e **data de vigência**? Proíbe só **exibir** nota ao motorista, ou também **recolha** pós-viagem no fluxo motorista? Há alternativa legítima (ex. feedback interno só para a plataforma)?
- **Itens 5–6 (documentos):** Os prazos de **registo criminal** (ex. 3/3 meses na conversa com Manel) ficam **parametrizáveis por partner** ou fixos nacionais na app?
- **Item 3 (wake lock):** Confirmação de que **só em viagem activa** e não só “disponível”, para não ser visto como consumo abusivo de bateria/dados?
- **Item 1 (som):** O som deve disparar em **novo pedido na lista**, em **oferta atribuída**, ou em ambos? Política quando a app está em segundo plano (notificação nativa vs só in-app)?
- **Itens 8–9 (Família / promo):** **MARCA** alvo (uma org vs multi-tenant) e se “Família” implica **pagamento agregado**, **sub-contas**, ou apenas etiqueta CRM?
- **Item 7 (QR):** Destino único (**PWA**, **Play/App Store**, ou **página por tenant**)?
- **Item 10:** Histórico “fora do ecrã principal” — mantém-se acesso em **um toque** no drawer (requisito de descobribilidade)?

---

## Próximos passos recomendados (triagem)

1. **P0 conformidade:** confirmar **item 4** (norma + âmbito + prazo) com assessoria; planear remoção técnica.
2. **P0 operação documental:** **itens 5–6** — um único **fluxo documentos** (partner + notificações motorista) em spec curta.
3. **P1 UX motorista:** **1–3** (som, dark mode, wake lock) — podem agrupar-se numa onda “preferências de sessão” se reduzirem fricção sem choque legal.
4. **P2 crescimento:** **7–9** — dependem de modelo de negócio.
5. **P2 passageiro shell:** **10** — alinha com refactors de navegação já discutidos noutros specs.

_Última revisão: **2026-05-06** (introdução + lista EXTRA; `main` pós-merge zonas **#282**)._
