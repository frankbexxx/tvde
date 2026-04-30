# Menu do motorista — especificação mínima (v1)

Documento para fechar o menu embutido no `DriverDashboard` (botão **Menu**) por fatias, sem bloquear o fluxo de viagem.

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
| Lista | Últimas N viagens (hoje N=3) a partir de `GET` histórico já usado no dashboard. | Paginação ou ecrã dedicado. |
| Linha | `#trip_id` truncado + `status` legível (API). | Mostrar data/hora, origem/destino resumidos. |
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

---

## 5. Checklist de implementação por fatia

1. [x] Rendimentos: totais semanais mínimos (UI actual).
2. [ ] Histórico: mais colunas (data, valor) + link opcional para detalhe.
3. [ ] Documentos: bloco estático com redireccionamento / copy para admin.
4. [ ] Admin: endpoints e UI para documentos antes de reflectir no motorista.

---

_Última revisão: 2026-04-30_
