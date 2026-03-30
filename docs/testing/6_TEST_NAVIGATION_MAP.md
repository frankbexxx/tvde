# TVDE — Mapa de Navegação

Este documento descreve **onde o testador deve ir na interface**.

---

## Aplicação Passageiro

| Destino | Como chegar | Descrição |
|---------|-------------|-----------|
| **Login** | URL `/passenger` ou `/driver` com BETA_MODE | Ecrã com Telemóvel e Password |
| **Pedir viagem** | Botão "Pedir viagem" no dashboard | Cria nova viagem |
| **Estado da viagem** | Header e mapa após pedir viagem | Mostra requested, assigned, accepted, arriving, ongoing, completed |
| **Cancelar viagem** | Botão "Cancelar" quando viagem ativa | Cancela viagem em curso |
| **Histórico** | Seção "Histórico" ou painel lateral | Lista viagens concluídas |
| **Mudar para Motorista** | Configuração (ícone engrenagem) → secção **Modo da app** → Motorista | Troca papel e navega para `/driver` |
| **Registo de atividade** | Configuração → **Registo de atividade** | Painel de eventos da sessão (embebido) |

---

## Aplicação Motorista

| Destino | Como chegar | Descrição |
|---------|-------------|-----------|
| **Viagens disponíveis** | Dashboard motorista | Lista de viagens para aceitar |
| **Aceitar viagem** | Botão na viagem disponível | Aceita a viagem |
| **Viagem ativa** | Após aceitar | Mostra estado (accepted, arriving, ongoing) |
| **Marcar a chegar** | Botão "Cheguei" | Transição para arriving |
| **Iniciar viagem** | Botão "Iniciar viagem" | Transição para ongoing |
| **Concluir viagem** | Botão "Concluir viagem" | Transição para completed |
| **Histórico** | Seção histórico | Lista viagens concluídas |
| **Mudar para Passageiro** | Configuração → **Modo da app** → Passageiro | Troca papel e navega para `/passenger` |

---

## Painel Admin (se aplicável)

| Destino | Como chegar | Descrição |
|---------|-------------|-----------|
| **Utilizadores** | Rota `/admin` | Gestão de utilizadores |
| **Aprovação de motoristas** | Seção apropriada | Aprovar/rejeitar motoristas |
| **Métricas** | Endpoint `/admin/metrics` | Contagens operacionais |

---

## URLs de Referência

- **Frontend:** http://localhost:5173
- **Passageiro:** http://localhost:5173/passenger
- **Motorista:** http://localhost:5173/driver
- **Admin:** http://localhost:5173/admin
- **API Docs:** http://localhost:8000/docs
