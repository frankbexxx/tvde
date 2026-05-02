# Menu do motorista — especificação mínima (v1)

Documento para fechar o menu embutido no `DriverDashboard` (botão **Menu**) por fatias, sem bloquear o fluxo de viagem.

**Ecrã principal (fora do menu):** fluxo **Top 3 Manel** — mapa largo + inactivo/activo → segundo ecrã com botões inferiores — ver **[`DRIVER_HOME_TOP3_MANEL.md`](DRIVER_HOME_TOP3_MANEL.md)** (desenho canónico, prompts e métricas).

**Fonte de verdade para suspensão, documentos e conformidade legal:** painel **admin** (backoffice), não este menu.

---

## 1. Rendimentos

| Campo / bloco | Origem (v1) | Notas |
|-----------------|-------------|--------|
| Semana actual | Soma de `final_price` (ou `estimated_price`) de viagens `completed` com `completed_at` na semana civil corrente (dom–sáb ou ISO semana — alinhar com produto). | Já mostrado como total estimado. |
| Semana anterior | Idem para a semana anterior. | Idem. |
| Moeda | `€`, duas casas decimais. | |
| Estado vazio | «Sem dados ainda» quando não há viagens fechadas. | Opcional. |

**Futuro:** ligar a relatório exportável / Stripe Connect quando existir.

---

## 2. Histórico de viagens

| Campo | v1 | Evolução |
|--------|-----|----------|
| Lista | Primeiras 5 no menu; **Mostrar mais** (+5) até ao fim da lista; scroll suave (`max-h`). | Ecrã dedicado ou link para detalhe. |
| Linha | `#trip_id` + estado PT, percurso resumido (recolha→destino), data, preço. | Detalhe completo (`GET` trip). |
| Acção **Reportar** | Placeholder / ocorrência local (comportamento actual). | Workflow com ticket + admin. |

**Estados `status` relevantes para o motorista:** `requested`, `assigned`, `accepted`, `arriving`, `ongoing`, `completed`, `cancelled`, `failed` — mapear labels em PT num único sítio (ex.: constantes partilhadas com passageiro onde fizer sentido).

---

## 3. Documentos e licenças

| Item | v1 | Dono |
|------|-----|------|
| Lista de documentos | Não mostrar lista fictícia. | Admin. |
| Cópia | «Documentos e validações: gere-se no painel da operação / admin.» | Evitar duplicar dados sensíveis na app motorista. |
| Alertas de validade | Push ou banner — fora de v1. | |

---

## 4. Preferências já no menu (referência)

- **Navegação:** Waze vs Google Maps (persistido).
- **Categorias de veículo:** toggles; sincronização `GET/PATCH /driver/preferences/vehicle-categories`; filtro da lista de pedidos por intersecção com `vehicle_categories` / `vehicle_category` do pedido.
- **Categorias (política partner + escolha motorista):** partner define catálogo/limites operacionais; motorista ativa/desativa no dia dentro desses limites (ex.: `pet` pode ser ligado/desligado por contexto operacional).

---

## 5. Decisões operacionais confirmadas (2026-04-30)

- Guardar app preferida de navegação até mudança explícita.
- Navegação em 2 fases: ir à recolha e ir ao destino.
- Foco no retorno do Waze: reduzir fricção de desbloqueio ao voltar à app.
- Manter ecrã ligado em viagem ativa; adicionar aviso de bateria baixa quando aplicável.
- Mapa MVP: primeiro posição + rota; voz/turn-by-turn fica para vaga seguinte.
- Rendimentos MVP: totais semanais suficientes para arranque.
- Ocorrências: registo com **tipo + texto**.
- Categorias atuais: lista fechada nesta fase.
- Categorias: partner define política/catálogo base; motorista pode ajustar no dia dentro dos limites do partner.
- Se categoria estiver marcada como obrigatória pelo partner, o motorista não a desativa no app (escalação via partner).
- Regra «2 destinos/dia»: interpreta-se como **2 mudanças de zona por dia**.
- Reset diário dos usos: **00:00 local** (v1).
- Consumo de uso: só ao concluir a 1.ª viagem na nova zona; sem viagem concluída, não consome.
- **Confirmado com Manel (2026-05-01):** viagens “no caminho” até à zona-alvo **não** debitam o uso; só a **1.ª concluída na zona-alvo** conta.
- Exceções/extra mudanças de zona: autorização pelo **partner**.
- Janela de entrada em nova zona: ETA (Waze) + margem percentual; extensão/reset com justificação do motorista.

**Princípio geral (produto):** preferir regras **não restritivas**; reservar restrições fortes a **contextos necessários** (ex.: obrigações legais, pandemia, eventos de grande impacto operacional).

---

## 6. Checklist de implementação por fatia

1. [x] Rendimentos: totais semanais mínimos (UI actual) + mensagem quando não há viagens `completed`.
2. [x] Histórico (menu): estado PT, percurso resumido, data, preço; 5 iniciais + **Mostrar mais** + contador «n de total».
3. [x] Documentos (motorista): checklist local com estados + gate opcional (default OFF em testes).
4. [x] Documentos (admin): tab `docs` com controlo rápido local por motorista/documento.
5. [x] Ocorrências: fluxo local com tipo + texto.
6. [ ] Admin/backend: endpoints e workflow real de documentos antes de refletir estado oficial no motorista.
7. [ ] Regra de zonas «2 por dia»: fechar modelo de zona/reset/exceções e implementar política.
8. [ ] Menu MVP: «top 3» Manel — **especificado** em [`DRIVER_HOME_TOP3_MANEL.md`](DRIVER_HOME_TOP3_MANEL.md) (esboço 2026-05); implementação UI por fatias com feature-flag quando arrancar código.

**Pós-reunião Manel (2026-05-01) — fora do menu imediato, documentado em** [`docs/research/driver-app-benchmarks.md`](../research/driver-app-benchmarks.md)**:** QR Driver/Passenger; portagens (dois percursos, preferências, recálculo contínuo — TODO técnico); tiers tipo Pro (Diamond/Silver/Gold); lista de viagens rica + retenção 2 anos; registo criminal 3/3 meses; fila aeroporto Lisboa como referência operacional.

---

## 7. Contrato técnico v1 — zonas dinâmicas («2 por dia»)

Objetivo: permitir ao motorista declarar uma zona operacional temporária (ex.: Aeroporto, Baixa, Porto Centro), com controlo simples e auditável pelo partner, sem bloquear viagens normais.

**Referência visual (fila / zona de espera LIS):** três capturas do ecossistema Uber (Manel) + notas de produto em [`docs/research/driver-app-benchmarks.md`](../research/driver-app-benchmarks.md) §6 e em `docs/research/assets/lis-uber-waiting-zone-ref/` — inspiração UX, não contrato com terceiros.

### 7.1 Regras de negócio (v1)

- Limite base: **2 mudanças de zona por dia** por motorista.
- Reset diário: **00:00 local** (timezone de operação PT).
- Um uso só é consumido quando existir **1.ª viagem concluída** na nova zona.
- **Corridas aceites “a caminho” da zona-alvo** (ex.: pernadas até Portimão) **não** gastam o uso até essa conclusão na zona-alvo (confirmado Manel 2026-05-01).
- Se não houver viagem concluída na nova zona, ao regressar não consome uso.
- Mudança extra (>2) só com **autorização do partner**.
- Janela de entrada na zona: ETA (Waze/Google) + margem percentual configurável.
- Se houver bloqueio real (acidente/incêndio/corte), motorista pode pedir **extensão** com justificação textual.

### 7.2 Modelo de dados sugerido (backend)

```txt
driver_zone_day_budget
- driver_id (pk parcial)
- service_date_local (pk parcial, YYYY-MM-DD)
- used_changes_count (int, default 0)
- max_changes_count (int, default 2)
- timezone (string, default Europe/Lisbon)

driver_zone_session
- id (uuid)
- driver_id
- zone_id (string)
- started_at
- eta_seconds_baseline (int)
- eta_margin_percent (int)   # ex: 25
- deadline_at                # started_at + eta + margem
- arrived_at (nullable)
- first_completed_trip_id (nullable)
- first_completed_at (nullable)
- consume_reason (enum: completed_trip | partner_override)
- status (enum: open | consumed | cancelled | expired)
- cancel_reason (nullable text)
- extension_requested (bool)
- extension_reason (nullable text)
- extension_seconds_approved (nullable int)
- approved_by_partner_id (nullable)
```

### 7.3 API mínima sugerida (v1)

- `POST /driver/zones/sessions`
  - cria intenção de mudança de zona (abre sessão com ETA + margem).
- `POST /driver/zones/sessions/{id}/arrived`
  - motorista confirma entrada na zona (opcional para UX; backend pode validar por geodado no futuro).
- `POST /driver/zones/sessions/{id}/request-extension`
  - pede extensão com motivo.
- `POST /partner/drivers/{driver_id}/zones/sessions/{id}/approve-extension`
  - partner aprova segundos extra.
- `GET /driver/zones/budget/today`
  - devolve `used`, `max`, `remaining`, `resets_at`.
- `GET /driver/zones/catalog`
  - lista estática v1 de `zone_id` + `label_pt` + `kind` (`generic` \| `airport`) + `ops_note_pt` opcional (nota curta para o motorista, ex. roadmap fila LIS) para dropdown na app; o `POST` de sessão continua a aceitar qualquer `zone_id` válido (parceiro pode alargar no servidor sem obrigar actualização imediata do catálogo).

### 7.4 Comportamento frontend (driver)

- No menu, mostrar cartão:
  - `Mudanças de zona hoje: X/2`
  - botão `Definir zona temporária`
  - estado da sessão ativa (`a caminho`, `em zona`, `consumido`, `expirado`)
  - ação `Pedir mais tempo` com texto curto.
- Mensagem de bloqueio amigável quando `remaining=0`:
  - “Limite diário atingido. Pede autorização ao partner para mudança extra.”
- Registar no log local eventos de sessão/justificação para suporte operacional.

### 7.5 Integração com viagens (consumo de uso)

- Não consumir na criação da sessão.
- Não consumir em `arrived`.
- Consumir apenas quando backend observar a **primeira viagem `completed`** associável à zona ativa.
- Após consumo, sessão fecha como `consumed` e incrementa budget diário.

### 7.6 Guard-rails v1 (simples)

- Sem geofencing rígido na v1 (evitar falsos bloqueios).
- Sem regras nacionais fixas por concelho obrigatório na v1.
- Zonas são catálogo operacional dinâmico gerido por partner/admin.
- Auditoria mínima: motivo da extensão + quem aprovou + timestamps.

### 7.7 Critérios de aceitação (smoke)

1. Criar zona temporária não reduz contador imediatamente.
2. Concluir 1.ª viagem na zona reduz contador em 1.
3. Sem viagem concluída, cancelar/regressar mantém contador.
4. Ao atingir 2/2, UI bloqueia nova mudança e indica partner.
5. Partner aprova extra e motorista consegue nova sessão.
6. À meia-noite local, contador volta a 0/2.

---

_Última revisão: 2026-05-01_
