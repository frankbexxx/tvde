# Painel de Atividade — Web App

Documentação do sistema de log e estado em tempo real.

---

## 1. O que foi implementado

### Painel direito (ActivityPanel)

- **Vista** — Role atual (passageiro / motorista)
- **Ao vivo** — Indicador de que a app está responsiva
- **Estado** — Mensagem do que está a acontecer em cada momento
- **Registo** — Log sequencial de todas as ações (com timestamp)
- **Copiar** — Copia o log para a área de transferência
- **Limpar** — Limpa o registo

### Persistência

- O log é guardado em `localStorage` (`tvde_activity_log`)
- Sobrevive a refresh da página
- Máximo 200 entradas (as mais antigas são removidas)

### Tipos de log

| Tipo   | Cor      | Uso                          |
|--------|----------|------------------------------|
| action | Azul     | Ação iniciada (ex.: "Pedido de viagem enviado") |
| success| Verde    | Ação concluída com sucesso   |
| error  | Vermelho | Erro                         |
| info   | Cinzento | Informação geral            |

---

## 2. Mensagens de estado

### Passageiro

- "Pronto"
- "A pedir viagem..."
- "Pedido enviado, à espera de atribuição"
- "Viagem atribuída, à espera de motorista"
- "Motorista aceitou"
- "Motorista a chegar"
- "Viagem em curso"

### Motorista

- "À espera de viagens"
- "X viagem(ns) disponível(eis)"
- "A executar: Accept..."
- "Viagem aceite — a chegar ou iniciar"
- "A chegar ao passageiro"
- "Viagem em curso — completar ao chegar"

### Dev Tools

- "A executar seed..."
- "A atribuir viagem..."
- "A executar timeouts..."
- "Auto-trip em execução..."

---

## 3. Ações instrumentadas

- Carregamento de tokens
- Pedir viagem
- Cancelar viagem
- Accept / Arriving / Start / Complete / Cancel (motorista)
- Seed / Assign / Run timeouts / Auto-trip (Dev Tools)

---

## 4. Essencial para testes

Para o fluxo completo com pagamentos funcionar:

1. **Stripe webhook** — `stripe listen --forward-to localhost:8000/webhooks/stripe`
2. **Seed** — Botão nas Dev Tools da web app (ou `POST /dev/seed`); executar antes de usar as outras funcionalidades
3. **PostgreSQL** — Container Docker a correr
