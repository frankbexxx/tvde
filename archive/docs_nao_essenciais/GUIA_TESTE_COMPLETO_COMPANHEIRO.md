# Guia de Teste Completo — Para Quem Não É Informático

Este guia explica como testar a app TVDE do princípio ao fim, de forma simples.

**O que vai fazer:** Abrir a app no telemóvel ou no computador, pedir uma viagem como passageiro, aceitar como motorista, e ver a viagem concluir. Tudo sem escrever código.

---

## Opção A — Testar na Internet (mais fácil)

Se a app já está publicada na internet (por exemplo em tvde-app.onrender.com):

1. **Abre o browser** (Chrome, Edge, Safari) no telemóvel ou no PC.
2. **Escreve o endereço** que o teu parceiro te der (ex: https://tvde-app.onrender.com).
3. **Vê duas abas** no topo: **Passageiro** e **Motorista**.
4. **Passageiro:** Clica em **Pedir viagem**. Aparece "À procura de motorista".
5. **Motorista:** Clica na aba **Motorista**. Deve aparecer uma viagem na lista. Clica em **ACEITAR**.
6. **Passageiro:** Volta à aba Passageiro. Deve mostrar "Motorista a caminho".
7. **Motorista:** Clica em **Cheguei**, depois **Iniciar viagem**, depois **Concluir**.
8. **Passageiro:** Deve mostrar "Viagem concluída" e o preço.

**Se algo falhar:** O teu parceiro pode precisar de executar o "Seed" primeiro (ele sabe o que é).

---

## Opção B — Testar no Computador (local)

Se quiseres testar com tudo a correr no teu PC:

### O que precisas

- **Docker Desktop** — programa que corre bases de dados. O teu parceiro instala.
- **Python** — linguagem de programação. O teu parceiro instala.
- **Node.js** — para a app web. O teu parceiro instala.

### Passos (o teu parceiro faz isto por ti)

1. Liga o Docker.
2. Liga a base de dados (PostgreSQL).
3. Liga o backend (servidor da app).
4. Liga o Stripe (para pagamentos).
5. Liga a app web.
6. Executa o **Seed** (prepara utilizadores de teste).
7. Abre o browser em http://localhost:5173.

Depois disso, fazes os mesmos passos da Opção A (Pedir viagem → Aceitar → Cheguei → Iniciar → Concluir).

---

## O que observar durante o teste

| Momento | O que deves ver |
|---------|-----------------|
| Passageiro pede viagem | "À procura de motorista" |
| Motorista aceita | Passageiro: "Motorista a caminho" |
| Motorista clica "Cheguei" | Passageiro: "Motorista a chegar" |
| Motorista clica "Iniciar" | Ambos: "Em viagem" |
| Motorista clica "Concluir" | "Viagem concluída" e preço |

---

## Teste do Simulador (só o teu parceiro)

O **simulador** é um programa que cria muitos passageiros e motoristas falsos para testar a app sob carga. Não precisas de o usar. O teu parceiro pode executá-lo assim:

1. Backend a correr.
2. Abrir uma janela de comandos (PowerShell ou Terminal).
3. Ir à pasta do projeto.
4. Executar: `python run_simulator.py`
5. Ver mensagens como `[PassengerBot 3] created trip` e `[DriverBot 2] completed trip`.
6. Parar com Ctrl+C.

---

## Resumo

- **Tu:** Abres a app, pedes viagem, vês o motorista aceitar e concluir.
- **O teu parceiro:** Liga os servidores, executa o Seed, e (opcionalmente) o simulador.

Se tiveres dúvidas, pergunta ao teu parceiro. Ele sabe onde está cada coisa.
