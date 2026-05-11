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

1. **Som em cada solicitação relevante (motorista).** *[UX motorista]* — **Três momentos com sinal sonoro distinto (ou configurável):** (a) quando o pedido **aparece no ecrã**; (b) quando o motorista **aceita**; (c) quando a viagem **conclui**. Respeitar **modo silencioso** do SO e preferências em Definições; em segundo plano, alinhar com **notificação nativa** quando fizer sentido técnico.
2. **Ecrã: modo nocturno automático.** *[UX motorista / passageiro]* — Seguir `prefers-color-scheme` ou horário; alinhar theming global quando existir superfície única.
3. **Ecrã: sempre activo durante o uso da app (motorista).** *[UX motorista]* — **Decisão de produto:** os motoristas usam o telefone **a carregar** (ou quase sempre); **não** há receio operacional de bateria para este segmento. Pretende-se **ecrã sempre activo** sempre que a app está **em uso** (disponível, em viagem, etc.), com **wake lock** / política equivalente na plataforma. *Texto legal de consentimento / definição “em uso” a cruzar com jurídico se necessário.*
4. **Deixar de pedir classificação do passageiro na app do motorista.** *[Legal] [UX motorista]* — **Decisão:** a app **deixa de solicitar** rating do passageiro no fluxo do motorista (não basta esconder a nota: remove-se o **pedido** / recolha nesse papel). **Acção técnica:** inventário de UI/API/`Trip`/`rating` onde isso ocorre; remoção coerente. **Acção jurídica:** manter registo da norma/fonte e copy final.
5. **Partner: gerir sempre documentos de veículos e motoristas.** *[Partner] [Legal]* — **Fonte de verdade** no painel partner (regras podem **variar por tipo de documento** — parâmetros por partner onde fizer sentido). Reforçar fluxos, estados, auditoria e relatórios operacionais (ver [`DRIVER_MENU_SPEC.md`](DRIVER_MENU_SPEC.md) §3).
6. **Driver: enviar documentos ao partner; caducidade com leitura automática + manual.** *[Partner] [UX motorista] [Legal]* — **Centralização = partner.** **Digitalização:** em princípio **todos** os documentos admitidos via **captura / PDF** (OCR ou leitura estruturada). **Carta de condução** e **cartão de cidadão:** leitura por **digitalização** do documento. **Registo criminal** (obtido **online**): o **PDF** pode ser tratado para **extrair automaticamente** texto de **validade**; fluxo **automático** com **fallback manual** se a leitura automática falhar. Avisos na app sobre caducidade; textos finais com jurídico.
7. **QR Code para download rápido da app.** *[Crescimento] [Partner]* — **Destino técnico ainda em aberto** (landing, loja, tenant, etc.). **Uso previsto genérico:** materiais físicos (**flyer**, **t-shirt**, merchandising) — o QR deve apontar para um alvo **único e estável** a definir quando houver decisão de URL/universal link.
8. **Promoções: PROMO CODES ou menu Família.** *[Crescimento]* — **Não prioritário agora** — manter só em **TODO futuro** / modelação comercial quando fizer sentido.
9. **Passageiro pertencente a uma “Família”.** *[Crescimento] [Passageiro]* — **Não essencial agora** — apenas **TODO futuro** (modelo de conta, billing, privacidade).
10. **Passageiro: menu lateral tipo driver + histórico fora do ecrã principal.** *[UX passageiro]* — Drawer/side menu coerente com shell motorista; **histórico só dentro do menu** para ecrã principal mais limpo. *(Descobribilidade: requisito de “um toque” para o histórico — confirmar em spec de implementação.)*

---

## Decisões de produto (registo 2026-05-06)

| Item | Decisão |
|------|---------|
| **1** | Som nos três momentos: pedido **no ecrã**, **aceite**, **concluído**. |
| **3** | **Ecrã sempre activo** enquanto a app está em uso; sem preocupação principal de bateria para este perfil. |
| **4** | **Deixar de pedir** rating do passageiro no fluxo motorista (remover pedido, não só UI). |
| **5–6** | **Partner** como dono das regras por tipo de doc; **todos** os docs via digitalização/PDF; **validade** automática do PDF do registo criminal com **fallback manual**; carta + CC por scan. |
| **7** | Forma genérica para **flyer / t-shirt**; técnica do destino **TBD**. |
| **8–9** | **Família / promo:** pensar mais tarde; **não essencial** nesta fase — backlog futuro. |

### Questões ainda em aberto

- **Item 4:** Citar **fonte normativa** e data em documentação jurídica quando existir parecer escrito.
- **Item 7:** URL final, deep links por loja, e se há **QR por tenant** (frota).
- **Item 10:** Confirmar **acesso ao histórico** em um toque a partir do drawer (propagação para spec UX).

---

## Próximos passos recomendados (triagem)

*Actualização 2026-05-06:* a **onda técnica** alinhada aos pontos **4**, **5–6** (MVP), **1–3**, **7** e **10** foi **mergeada** em `main` (**#285**). Seguem trabalhos **jurídicos/copy**, **OCR/upload binário**, **URL QR em produção**, e itens **8–9** (futuro).

1. ~~**P0 conformidade:** **item 4**~~ — *pedido de rating pelo motorista removido (API + UI); copy/fonte normativa com jurídico.*
2. ~~**P0 operação documental:** **itens 5–6**~~ — *MVP JSON + partner/driver + sugestão validade por texto; evolução: ingestão ficheiros, OCR, notificações.*
3. ~~**P1 UX motorista:** **itens 1–3**~~ — *sons, dark sem tema gravado, wake lock sessão.*
4. **P2 crescimento:** **item 7** — *definir **URL estável** (`VITE_APP_DOWNLOAD_URL`) para materiais impressos;* **itens 8–9** empurradas para **futuro**.
5. ~~**P2 passageiro shell:** **item 10**~~ — *menu lateral + histórico no drawer.*

_Última revisão: **2026-05-06** — estado pós-merge #285._
