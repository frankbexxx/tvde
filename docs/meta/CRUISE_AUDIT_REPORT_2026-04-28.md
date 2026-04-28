# Cruise Audit Report 2026-04-28

Audit profundo por sequência (`passenger` -> `driver` -> integração), com foco em risco funcional e regressões prováveis.

Escopo: `web-app/src/features/passenger`, `web-app/src/features/driver`, `web-app/src/components/layout/AppHeaderBar.tsx`, `web-app/e2e/driver-passenger-flow.spec.ts`.

---

## Findings (ordenados por severidade)

### P1 — E2E crítico vai falhar após remoção de `TVDE` no header

**Impacto**

- O teste E2E de fluxo crítico depende de `heading` com texto `TVDE` em driver e passageiro.
- O header foi alterado para remover `TVDE`, portanto o selector atual deixa de encontrar o elemento.

**Evidência**

- `web-app/e2e/driver-passenger-flow.spec.ts` usa:
  - `getByRole('heading', { name: /TVDE/i })` (driver)
  - `getByRole('heading', { name: /TVDE/i })` (passenger)
- `web-app/src/components/layout/AppHeaderBar.tsx` já não renderiza `TVDE`.

**Risco**

- Falso negativo em CI E2E para o fluxo mais importante.

**Ação recomendada**

- Trocar selectors E2E para um marcador estável não textual:
  - `data-testid` no header/brand, ou
  - selector por presença do logo (`img[alt="V@mulá"]`) + validação de elemento de página (`Motorista`/`Onde te vamos buscar?`).

---

### P2 — Dependência frágil em copy de UI para automação de fluxo

**Impacto**

- O E2E usa textos orientados a copy para validar estado inicial.
- Pequenas alterações de wording podem partir testes sem regressão funcional real.

**Evidência**

- `web-app/e2e/driver-passenger-flow.spec.ts` usa regex com palavras de copy para detectar “estado válido”.

**Risco**

- manutenção cara e ruído em CI.

**Ação recomendada**

- Introduzir 2-3 âncoras `data-testid` para estados críticos:
  - container de status no passenger,
  - ação principal no driver,
  - bloco de mapa/planeamento.

---

### P2 — Header novo: risco de truncamento visual com nomes longos

**Impacto**

- Nome em itálico ao lado do logo é correto em UX, mas nomes muito longos podem competir com ícones de perfil/settings.

**Evidência**

- `AppHeaderBar` usa `truncate` e `min-w-0`, mitigando bastante; risco residual em ecrãs muito estreitos.

**Risco**

- apenas visual (não funcional).

**Ação recomendada**

- manter como está para já; validar no smoke manual com nome longo (ex.: 20+ chars).

---

### P3 — Passenger: compactação de gaps ainda requer validação em device real

**Impacto**

- Ajuste de espaçamento já aplicado no bloco unificado.
- Sem smoke em device, pode haver edge-case de densidade em 360x800 com zoom/font scaling.

**Evidência**

- Alterações em `PassengerDashboard` de `mt/pt/pb` e ordem de secções.

**Risco**

- visual apenas.

**Ação recomendada**

- smoke manual rápido em 2 densidades (360x800 e 390x844).

---

## O que está sólido neste momento

- Fluxo driver ganhou robustez de estado:
  - fallback sem detalhe polled,
  - hints de polling,
  - hints de próxima ação.
- Cobertura RTL aumentou para caminhos `arriving` e estado sem fallback.
- Build/testes unitários estavam verdes nos últimos ciclos locais.

---

## Ordem recomendada (execução)

1. **Corrigir E2E selector `TVDE`** (P1).
2. **Adicionar âncoras estáveis de teste** no header/fluxos (P2 curto).
3. **Smoke manual device** de passenger/driver para fechar P3 visual.

