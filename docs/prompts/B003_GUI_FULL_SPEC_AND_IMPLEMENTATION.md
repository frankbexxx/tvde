# B003_GUI_FULL_SPEC_AND_IMPLEMENTATION

## Contexto

O sistema TVDE MVP está funcional:

- Auth estável (JWT)
- Driver tracking funcional
- Dispatch funcional (trip-based)
- UX states definidos (SEARCHING, ASSIGNED, ONGOING, COMPLETED)

## Objetivo

Desenhar, implementar e documentar completamente a GUI para:

- Passenger
- Driver
- Admin

**IMPORTANTE:** Não quero apenas código. Quero um "GUI SPEC" completo, explicativo e implementável.

---

## 1. Para cada tipo de utilizador

### PASSENGER / DRIVER / ADMIN

Descrever:

1. O que o utilizador vê (VISUAL)
2. O que está a acontecer no sistema (STATE)
3. O que o utilizador deve sentir (PERCEPTION)

---

## 2. Layout detalhado (obrigatório)

Para cada screen principal:

- Estrutura em layout (tipo wireframe textual)
- Coordenadas relativas (flex/grid)
- Hierarquia visual (o que é dominante vs secundário)

---

## 3. Componentes (obrigatório)

Listar todos os componentes UI. Para cada componente:

- Responsabilidade
- Props
- Estados possíveis
- Exemplo de uso

---

## 4. Estados UX (CRÍTICO)

Mapear explicitamente: SEARCHING_DRIVER, DRIVER_ASSIGNED, DRIVER_ARRIVING, TRIP_ONGOING, TRIP_COMPLETED

Para cada estado: texto, cores, animações, comportamento do botão, alterações no mapa.

---

## 5. CSS / Estilo (obrigatório)

- Paleta de cores
- Tipografia
- Espaçamentos
- Component styles (snippets reais)

---

## 6. Animações

- loading states
- transições entre estados
- micro-interactions

---

## 7. Map integration

- como o mapa reage a cada estado
- quando centra no driver
- quando mostra rota
- quando fica estático

---

## 8. Regras de percepção (CRÍTICO)

- como evitar sensação de "app parada"
- como mostrar progresso mesmo com polling
- como evitar flicker

---

## 9. Código (organizado)

- estrutura de ficheiros
- componentes React principais
- exemplos de implementação

---

## 10. NÃO fazer

- Não alterar backend
- Não adicionar features fora do scope
- Não usar bibliotecas pesadas novas

---

## 11. Critério de sucesso

- UI parece responsiva mesmo com polling
- Utilizador percebe sempre o estado
- Sem ecrãs vazios
- Sem logs visíveis de erro em fluxo normal

---

## Output esperado

1. GUI SPEC (explicação completa)
2. Wireframes textuais
3. Component breakdown
4. CSS snippets
5. Código React organizado
