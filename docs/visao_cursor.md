# Visão geral do projeto TVDE — perspectiva Cursor

_Documento gerado como síntese de contexto de repositório, conversas de implementação e leitura de `README`, `docs/meta/PROJECT.md`, `docs/ops/OPERATION_CHECKLIST.md`, `docs/meta/DOCS_INDEX.md` e roadmap. Serve de handoff mental entre sessões e de quadro para decisões de comercialização._

---

## 1. O que isto é (em uma frase)

Uma **plataforma de ride-sharing** orientada ao mercado português — **MVP tecnicamente credível**: passageiro e motorista na **web** (React), **API** FastAPI, **PostgreSQL**, **pagamentos Stripe**, **tempo real** (WebSockets), **admin** e documentação operacional substancial. O `README` regista **validação em campo** (fluxo completo com dispositivos reais e rede móvel).

---

## 2. Onde o projeto está hoje (março 2026)

### 2.1 Produto e utilizador

- **Passageiro (web):** pedido com mapa, estados de viagem, estimativa/preço comunicados de forma explícita (modelo híbrido documentado em `docs/PRICING_DECISION.md`), cancelamento, histórico.
- **Motorista (web):** disponibilidade, ofertas, aceitação, estados da viagem, mapa.
- **Admin (web):** operações, métricas, saúde do sistema (`system-health`), fluxos de suporte ao negócio.
- **DevTools / BETA:** caminhos acelerados para testes controlados (com cuidado em produção — política CORS, env, routers dev documentados).

### 2.2 Engenharia

- **Backend:** domínio de viagens, matching, ofertas com timeout, webhooks Stripe, auditoria de eventos, cron agregado (`GET /cron/jobs`), hardening de segurança (JWT, CORS, RBAC em testes), constraints de BD (ex.: unicidade de PaymentIntent).
- **Frontend:** UX refinada (A021) com hierarquia visual por estado; alinhamento com copy de pricing e estados.
- **CI:** GitHub Actions com **PostgreSQL** e **pytest** na `main`, com possibilidade de **branch protection** exigindo o check `backend-ci`.
- **Qualidade:** ruff/mypy/bandit/pip-audit trabalhados em ciclos; dependências sensíveis (ex. Pygments) em monitorização.

### 2.3 Documentação e operação

- Índice em `docs/meta/DOCS_INDEX.md`; checklists em `docs/ops/OPERATION_CHECKLIST.md`, `docs/testing/GUIA_TESTES.md`, prompts A022/A026/A032, etc.
- O projeto **não é** só código: há explícita preocupação com **deploy Render**, **Stripe**, **cron**, **migrações SQL** e **saúde operacional**.

---

## 3. Visão personalizada (ideias e posicionamento)

### 3.1 O ativo mais forte

Não é “mais uma app de mapa”. O ativo é um **ciclo de viagem paga end-to-end** com **infraestrutura de pagamento** e **regras de negócio** já encarnadas no código — isto separa o projeto de demos que param no mock. Para investidor ou parceiro, o argumento é: **“já há máquina de estados + dinheiro + prova de campo limitada”**, não só slides.

### 3.2 O fosso natural (PROJECT.md vs realidade)

O `PROJECT.md` descreve **iOS/Android nativos (React Native)** como alvo de produto. O repositório, nesta fase, é **web-first**. Isto não invalida o MVP comercial se o primeiro segmento for **web + motoristas/profissionais com smartphone browser** ou **piloto B2B**; mas para **paridade Uber/Bolt em App Store** falta **app store presence**, **push notifications**, **background location** e **polimento nativo**. Sugestão honesta no pitch: **“MVP web + API pronta para embrulhar em shell nativo ou PWA”** até haver budget para RN.

### 3.3 Diferenciação possível em Portugal

- **Transparência de preço** (já encorajada na UI e em `PRICING_DECISION.md`) como narrativa regulatória e de confiança.
- **Operação TVDE** explícita: contratos, comissões, aprovação de motoristas — o admin e os enums de estado sustentam uma história **“plataforma com controlo humano”**, útil perante IMT e parceiros.
- **Não competir em feature parity** cedo: foco em **fiabilidade**, **suporte** e **corredor geográfico** (ex. Grande Lisboa) com menos caos que escala global.

### 3.4 Riscos que eu manteria no radar

| Risco                              | Comentário                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Regulamentação TVDE / licenças** | Produto ≠ legalização da operação. Falta playbook jurídico e contratos tipo.                                   |
| **Confiança e segurança**          | Verificação de motoristas, seguros, incidentes — ainda narrativa mais técnica que “trust & safety” de mercado. |
| **Escala e custo de mapas/OSRM**   | Dependência de serviços externos e limites; custo MapTiler/OSRM em volume.                                     |
| **Dependência de uma pessoa**      | Bus factor = 1; documentação ajuda, mas não substitui segunda linha ou runbook 24/7.                           |

### 3.5 Ideias que eu exploraria (produto / técnico)

1. **PWA + install** para passageiro/motorista antes de investir pesado em React Native.
2. **Modo “operador”** ou **frota pequena** (3–10 carros) como primeiro cliente pagador — menos cold-start que marketplace aberto.
3. **Painel de KPIs mínimo** exportável (CSV) para o primeiro contabilista/parceiro.
4. **Staging obrigatório** com Stripe test + smoke automatizado antes de cada release (roadmap já aponta A027).
5. **Backups automatizados** documentados + teste de restore (A028) antes de chamar “produção comercial”.
6. **Política de privacidade / RGPD** ligada aos logs (`audit_events`, interaction logs) — retenção já mencionada no código; falta pacote legal.

---

## 4. Checklist para comercialização

Legenda: **Temos** = existe de forma utilizável ou documentada no repo / operação descrita. **Parcial** = existe mas incompleto para venda séria. **Falta** = bloqueador ou esperado por mercado/regulador.

### 4.1 Produto e experiência

| Item                                                                     | Estado                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Ciclo viagem (pedir → atribuir → aceitar → executar → concluir/cancelar) | **Temos**                                                           |
| Pagamento com Stripe (autorização/captura alinhada ao modelo)            | **Temos** / **Parcial** (sempre validar edge cases em staging)      |
| Web passageiro + motorista + admin                                       | **Temos**                                                           |
| Apps iOS/Android nativos (React Native)                                  | **Falta** (planeado em `PROJECT.md`, não é o núcleo atual do repo) |
| Push notifications                                                       | **Falta** (relevante para motorista em produção)                    |
| Suporte in-app / tickets                                                 | **Falta**                                                           |
| FAQ / Centro de ajuda para utilizadores                                  | **Falta**                                                           |

### 4.2 Legal, compliance e confiança

| Item                                                                     | Estado                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Termos de utilização / contrato de prestação de serviços                 | **Falta**                                                           |
| Política de privacidade + RGPD (DPA, sub-processadores, retention)       | **Falta**                                                           |
| Quadro TVDE (IMT, documentação motorista, seguros) — _advisory jurídico_ | **Falta**                                                           |
| Processo KYC/verificação documental alinhado à lei                       | **Parcial** (fluxo admin existe; formalização legal é outra camada) |
| Seguro de responsabilidade civil / operações                             | **Falta** (negócio, não só código)                                  |

### 4.3 Operação, finanças e go-to-market

| Item                                                     | Estado                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Preço/comissão definidos e comunicados                   | **Parcial** (`PROJECT.md` + `PRICING_DECISION.md`; falta contrato comercial padrão) |
| Faturação/recibos conforme contabilidade PT              | **Falta**                                                                           |
| Conta Stripe em modo live + webhook produção             | **Parcial** (depende do teu ambiente; checklist em docs)                            |
| Cron `CRON_SECRET` + job em produção                     | **Parcial** (`OPERATION_CHECKLIST.md`; tem de estar configurado no host)            |
| Playbook de incidentes (pagamento preso, disputa Stripe) | **Parcial** (system-health + logs; falta runbook humano curto)                      |
| Marca, site marketing, App Store assets                  | **Falta**                                                                           |
| Plano de aquisição (motoristas primeiro vs passageiros)  | **Falta** (estratégia comercial)                                                    |

### 4.4 Tecnologia, segurança e escala

| Item                                     | Estado                                                               |
| ---------------------------------------- | -------------------------------------------------------------------- |
| CI com testes em Postgres                | **Temos**                                                            |
| Branch protection + merge só com CI      | **Temos** (se mantiveres a regra no GitHub)                          |
| Ambientes dev / staging / prod separados | **Parcial** (roadmap A027)                                           |
| Backups DB + teste de restore            | **Falta** / **Parcial** (A028)                                       |
| Monitorização (uptime, erros, alertas)   | **Parcial** (health endpoints; falta alerting tipo PagerDuty/Uptime) |
| Secrets rotação, least privilege         | **Parcial**                                                          |
| Pen-test ou security review externo      | **Falta** (para alguns parceiros B2B)                                |

### 4.5 Dados e analytics

| Item                                                    | Estado      |
| ------------------------------------------------------- | ----------- |
| Auditoria de eventos / logs estruturados                | **Temos**   |
| Dashboard admin operacional                             | **Temos**   |
| Funil de conversão / analytics produto (Mixpanel, etc.) | **Falta**   |
| Relatórios financeiros automáticos                      | **Parcial** |

---

## 5. Síntese executiva

- **Tecnicamente:** o projeto está num patamar **raro para MVP solo**: domínio rico, testes, CI, hardening recente, UX pensada, operação documentada.
- **Comercialmente:** o gargalo deixa de ser “fazer o botão pedir viagem” e passa a ser **legalização**, **confiança**, **go-to-market**, **apps nativos ou estratégia PWA**, e **operação financeira/contabilística** em Portugal.
- **Próximo salto recomendado:** fechar **A027/A028** (ambientes + backups), **staging + Stripe live smoke**, e **pacote legal mínimo** antes de cobrar a estranhos fora do círculo de beta.

---

## 6. Manutenção deste ficheiro

Atualizar `docs/visao_cursor.md` quando:

- mudar fase (ex. “pré-produção” → “piloto pago”);
- fechar blocos A023–A035 (`docs/architecture/TVDE_ENGINEERING_ROADMAP.md`, anexo pré-produção);
- entrar/sair de mercado (novo corredor, parceiro B2B, licença).

---

_Fim do documento._
