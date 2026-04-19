# Consulta obrigatória — abertura da sessão (2026-04-09)

**Status:** documento de **consulta obrigatória** na primeira mensagem do dia seguinte à conversa de **2026-04-08**. Resume decisões, circuito de trabalho e avisos legais.

**Relacionado:** [`UI_VISIBILITY_IMPLEMENTATION_TODO.md`](UI_VISIBILITY_IMPLEMENTATION_TODO.md) · [`PROXIMA_SESSAO.md`](PROXIMA_SESSAO.md) · [`../../TODOdoDIA.md`](../../TODOdoDIA.md) · [`../todo-em-curso.md`](../todo-em-curso.md)

---

## 1. Circuito de implementação (o que seguir “amanhã”)

1. **Inventário vivo** — [`UI_VISIBILITY_IMPLEMENTATION_TODO.md`](UI_VISIBILITY_IMPLEMENTATION_TODO.md): fechar `TBD` → `visível` / `parcial` / `invisível` com evidência no código.
2. **Ordem:** **Admin** primeiro (maior ROI operação + smoke); depois motorista / passageiro conforme bloqueios de piloto.
3. **Critério de “existe”:** **Telemóvel = barreira** — o que não for utilizável no **device real** não conta como entregue para validação (viewport móvel no desktop é apoio ao dev).
4. **Roles:** **admin** — operações correntes **sem** “grande decisão” de sistema (ex.: aceitar utilizador, password a pedido). **super_admin** — **omnisciente** / o que o admin não resolve (reconcile Stripe, stuck profundo, overrides perigosos).
5. **Testes:** **Playwright o mais cedo possível** por fluxo estável; smoke **manual** só quando for **inevitável** (presença humana, Stripe real, multi-device físico, etc.).
6. **Velocidade:** **implementação em bulk com juízo** — vários gaps no **mesmo ecrã** ou **mesmo padrão** na mesma PR quando fizer sentido; CI (lint + testes) pega regressões cedo.
7. **Visual:** a maior parte do que é **puramente UI** (layout, botões, estados legíveis, mobile) **pode ser agrupado** e feito **quase de uma vez** **por superfície** (ex.: uma tab admin, um dashboard), **não** “toda a app num único PR gigante sem critério” — manter PRs **revisáveis** e com **testes** onde couber.
8. **Dúvidas:** se houver **dúvida de produto, segurança ou âmbito legal**, **parar** e perguntar ao Frank **antes** de assumir.

---

## 2. Compliance Portugal (enquadramento — não é assessoria jurídica)

- O digital em PT assenta sobretudo no **RGPD** e quadro nacional de protecção de dados; para mobilidade há ainda **contexto sectorial e contratual** (utilizadores, motoristas, parceiros, conservação, litígios).
- **Incremental:** no início do piloto (ou **antes**, se configs/testes de integração o exigirem) incluir o **mínimo aconselhável**: política de privacidade e termos **alinhados ao comportamento real da app**, **subprocessadores** (Render, Stripe, MapTiler, GitHub, cron, Docker onde aplicável, etc.), fluxos para **direitos** (acesso, apagamento onde legalmente possível, reclamação CNPD), **segurança mínima** (secrets, logs sem excesso de dados pessoais).
- **Confirmação externa:** **advogado em Portugal** com experiência em **plataformas / mobilidade** — obrigatório para decisões vinculativas; este repositório não substitui isso.

---

## 3. Integrações como “import”

- Tratar **Stripe, Render, cron, mapas, GitHub**, e futuros fornecedores como **blocos**: cada um com config, testes de integração quando necessário, e linha no inventário de dados / subprocessadores.
- **Waze / navegação:** caminho incremental típico = **deep link** (“abrir no Waze até ao ponto”) antes de qualquer **SDK** pesado ou dependência única; rever termos do fornecedor de mapas em conjunto com o pacote de privacidade.

---

## 4. Plataformas externas de audit / revisão

- Enquadramento acordado: **investimento**, não “gasto”, quando há **triagem**, âmbito e cadência.
- Opções discutidas (resumo): **CI** (GHAS, Snyk, Semgrep, Sonar, Veracode/Checkmarx enterprise se contrato exigir); **DAST**; **pentest** pontual antes de piloto alargado; **bug bounty** depois de scope e triagem; **compliance** tipo Vanta/Drata se B2B/SOC2; **UX/a11y** em paralelo ao critério telemóvel.
- Integrar findings no **TODO de visibilidade** ou backlog com dono — evitar fila infinita sem prioridade.

---

## 5. Estado Git / docs (pós-merge conversa 2026-04-08)

- **`main`:** inclui merge do handoff de visibilidade (PR **#140** — docs: `UI_VISIBILITY_IMPLEMENTATION_TODO.md`, actualizações em `TODOdoDIA`, `PROXIMA_SESSAO`, `todo-em-curso`, `GUIA_TESTES`, `TODO_FUTURO`).
- **#139** já na `main` antes disso — **Alinhar pagamento** em Activas/Histórico.

---

## 6. Aceleração e tokens

- Na sessão seguinte: **implementação directa** segundo o circuito acima; **permitido** usar contexto longo e PRs com **mais ficheiros** quando for **o mesmo padrão visual** na mesma superfície — sempre que possível com **Playwright** e **passagem no telemóvel** após merge.

---

_Última actualização deste ficheiro: 2026-04-08 (fim de conversa)._
