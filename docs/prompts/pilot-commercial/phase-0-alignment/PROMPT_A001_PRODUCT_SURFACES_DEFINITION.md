# PROMPT A001 — Product surfaces definition

**Estado:** contém as instruções (prompt) e a secção **Execução (resultado)**; no fim, verificação ao código e **última revisão** do ficheiro.  
**Fase:** 0 — Alinhamento & contrato de produto  
**Stack actual:** `web-app/` (React/Vite), `backend/` (FastAPI/Postgres). Rotas: `/passenger`, `/driver`, `/admin`. Parceiro = **a criar**.

---

## Prompt (instruções)

### Contexto

Este projeto é uma plataforma TVDE com:

- Backend: FastAPI + PostgreSQL
- Frontend: React (`web-app/`)
- Sistema já funcional end-to-end (passageiro ↔ motorista)
- Admin já existente (parcial)
- Nova necessidade: suportar **4 superfícies distintas (app-a-like)**

Superfícies alvo:

1. Passenger
2. Driver
3. Partner (fleet owner)
4. Admin

**Importante:** não são 4 apps separadas. É uma **única web-app** com múltiplas experiências por role.

### Objetivo

Definir **claramente e sem ambiguidade**:

- o que é cada superfície
- para quem é
- qual o seu propósito
- o que **não** é responsabilidade dessa superfície

### Instruções por superfície

Para cada uma das 4 superfícies, definir:

1. **Identidade** — utilizador, contexto de uso, frequência (alta/média/baixa)
2. **Objetivo principal** — uma frase
3. **Responsabilidades** — máx. 5
4. **Fora de scope** — o que **explicitamente não faz** (evitar sobreposição driver/partner e partner/admin)
5. **Tipo de UI dominante** — map-first | state-first | hybrid
6. **Sensibilidade a tempo real** — alta | média | baixa

### Restrições

- Não inventar features fora do que existe ou extensão natural do modelo
- Clareza > completude

### Output esperado

Markdown com 4 secções, cada uma com os 6 blocos.

---

## Execução (resultado)

### Passenger

1. **Identidade** — Pessoa que pede viagens TVDE. Contexto: rua / imediato antes e durante a viagem. **Frequência:** alta para utilizadores activos; episódica para ocasionais.
2. **Objetivo principal** — Pedir, acompanhar e concluir uma viagem com clareza de estado e posição do motorista quando aplicável.
3. **Responsabilidades** — Indicar origem/destino; criar e cancelar **as próprias** viagens; ver estado e mapa da **sua** viagem activa; histórico **próprio**.
4. **Fora de scope** — Gerir frota; aprovar motoristas; ver viagens de terceiros; configurar comissões; operações de plataforma; pagamentos manuais de backoffice.
5. **UI dominante** — **Hybrid** (mapa forte durante viagem activa; formulário/lista em pedido e histórico).
6. **Tempo real** — **Alta** durante `accepted` / `arriving` / `ongoing` (posição e estado); média em `requested`.

---

### Driver

1. **Identidade** — Profissional que executa viagens. Contexto: em deslocação, foco em acções rápidas. **Frequência:** alta em horário de trabalho.
2. **Objetivo principal** — Ver pedidos elegíveis, aceitar e executar o ciclo da viagem até conclusão dentro das regras (ex.: proximidade ao pickup).
3. **Responsabilidades** — Online/offline operacional; aceitar / recusar / cancelar **no contexto da sua** viagem; reportar localização durante viagem activa; concluir viagem.
4. **Fora de scope** — Criar contas para outros motoristas; ver dashboard de frota; alterar comissões de outros; aceder a dados de outro parceiro; administração da plataforma; gestão contratual da empresa.
5. **UI dominante** — **Hybrid** (lista de pedidos + mapa na viagem activa).
6. **Tempo real** — **Alta** durante viagem (localização, estado); média na lista de disponíveis.

---

### Partner (fleet owner)

1. **Identidade** — Entidade (empresa/operador) que **detém ou organiza** motoristas. Contexto: escritório / gestão diária, não cabine. **Frequência:** média a alta operacionalmente.
2. **Objetivo principal** — Garantir que **os seus** motoristas estão activos, visíveis e alinhados com a operação (onboarding mínimo, visibilidade de viagens da frota, métricas básicas).
3. **Responsabilidades** — Ver e gerir **motoristas do seu tenant**; convidar/criar fluxo mínimo de motorista (conforme produto); ver viagens **dos seus** motoristas; métricas **agregadas do tenant**; relatórios/export mínimos se definidos no piloto.
4. **Fora de scope** — Executar viagens como motorista (salvo ter também conta driver, outra superfície); alterar regras globais da plataforma; ver dados de **outro** parceiro; substituir completamente o admin de sistema.
5. **UI dominante** — **State-first** (tabelas, filtros, KPIs); mapa opcional (overview), não obrigatório no MVP.
6. **Tempo real** — **Média** (refresh periódico); não exige o mesmo ritmo que passageiro em tracking.

---

### Admin

1. **Identidade** — Operador da **plataforma** (interno ou confiado). Contexto: suporte, compliance, saúde do sistema. **Frequência:** baixa a média.
2. **Objetivo principal** — Supervisionar utilizadores, viagens e saúde do sistema; corrigir ou investigar quando o automático não chega.
3. **Responsabilidades** — Aprovar/bloquear utilizadores (BETA); visão transversal conforme política; ferramentas de saúde/debug; overrides **explícitos** e auditáveis quando existirem.
4. **Fora de scope** — Substituir o dia-a-dia operacional do parceiro (gestão quotidiana da frota é do Partner); tornar-se “CRM” completo do parceiro.
5. **UI dominante** — **State-first** (painéis, tabelas, detalhe).
6. **Tempo real** — **Baixa** (polling espaçado ou sob demanda).

---

### Nota de encerramento (A001)

Este bloco é o **contrato de produto** entre as quatro superfícies. Sobreposições proibidas no desenho: **Driver ≠ gestão de frota**; **Partner ≠ governo global da plataforma**; **Admin ≠ operação diária de frota**.

---

### Fluxos mínimos por superfície (executável)

Cadeias **já suportadas** pelo produto actual + extensão mínima explícita para Partner (alvo). Servem para não “interpretar” — são o happy path de teste/review.

| Superfície         | Fluxo mínimo (ordem)                                                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Passenger**      | Autenticar → **criar trip** (origem/destino) → ver **detalhe** / mapa conforme estado → **cancelar** ou **concluir** / avaliar (conforme regras) → **histórico**.                                                                |
| **Driver**         | Autenticar → **online/disponível** → listar **disponíveis** → **aceitar** (oferta/trip) → **arriving** → **iniciar** (gate proximidade) → **concluir** → **histórico** / avaliar.                                                |
| **Partner** (alvo) | Autenticar como `partner` → **listar motoristas do tenant** → **listar trips** dos motoristas do tenant (somente) → **convidar/adicionar** motorista ao tenant (fluxo mínimo definido na Fase 2) → export/métricas se no piloto. |
| **Admin**          | Autenticar → **painel** utilizadores (BETA approve/block) → **visão global** trips/users conforme política → ferramentas **health/debug** — **sem** substituir o fluxo diário “frota” do Partner.                                |

**Nota:** Partner não partilha o mesmo prefixo de API que passageiro (`/trips`) nem motorista (`/driver/trips`); ver [`../IMPLEMENTATION_SEQUENCE.md`](../IMPLEMENTATION_SEQUENCE.md).

---

### Verificação cruzada com o código

- Contrato de produto; rotas actuais na `web-app`: `/passenger`, `/driver`, `/admin`. Superfície **Partner** = alvo (rota/UI **ainda não** no código).

---

_Última revisão deste ficheiro: 2026-04-05_
