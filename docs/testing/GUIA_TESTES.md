# Manual de Testes — TVDE Web App

Manual completo e extensivo, passo a passo, para testar toda a aplicação. Inclui todos os passos, mesmo os óbvios.

**Teste no Render (produção):** Ver [PREPARACAO_RENDER.md](../deploy/PREPARACAO_RENDER.md) para deploy e teste em `https://tvde-app-j51f.onrender.com`.

---

# PARTE I — PREPARAÇÃO

---

## 1. Verificar software instalado

Antes de começar, confirme que tem tudo instalado.

### 1.1 Docker Desktop

1. Abra o menu **Iniciar** do Windows.
2. Procure **Docker Desktop**.
3. Se existir, clique para abrir.
4. Se não existir, instale a partir de [docker.com](https://www.docker.com/products/docker-desktop/).
5. **Verificação:** Abra o PowerShell e escreva:
   ```
   docker --version
   ```
6. Prima Enter.
7. **Resultado esperado:** Algo como `Docker version 24.x.x`. Se aparecer erro, o Docker não está instalado ou não está no PATH.

### 1.2 Python

1. Abra o PowerShell.
2. Escreva:
   ```
   python --version
   ```
3. Prima Enter.
4. **Resultado esperado:** `Python 3.10` ou superior. Se não tiver, instale de [python.org](https://www.python.org/downloads/).

### 1.3 Node.js

1. No PowerShell, escreva:
   ```
   node --version
   ```
2. Prima Enter.
3. **Resultado esperado:** `v18.x` ou superior. Se não tiver, instale de [nodejs.org](https://nodejs.org/).

### 1.4 Stripe CLI

1. No PowerShell, escreva:
   ```
   stripe --version
   ```
2. Prima Enter.
3. **Resultado esperado:** Versão do Stripe CLI. Se não tiver, instale: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli).
4. **Nota:** Pode ser necessário fazer login com `stripe login` antes da primeira utilização.

---

## 2. Verificar estrutura do projeto

1. Abra o Explorador de Ficheiros.
2. Navegue até à pasta do projeto (ex.: `C:\dev\APP`).
3. Confirme que existem estas pastas:
   - `backend`
   - `web-app`
4. Dentro de `backend`, confirme que existe:
   - `venv` (pasta do ambiente virtual)
   - `requirements.txt`
   - `app`
5. Dentro de `web-app`, confirme que existe:
   - `node_modules` (se já tiver corrido `npm install` antes)
   - `package.json`
   - `src`

---

# PARTE II — ARRANQUE DOS SERVIÇOS

Os serviços devem ser iniciados **por esta ordem** e **todos a correr em simultâneo**.

---

## 3. Passo 0 — Docker Desktop

1. Abra o **Docker Desktop**.
2. Espere até ver o ícone da baleia na barra de tarefas (canto inferior direito).
3. Clique no ícone da baleia.
4. **Resultado esperado:** Diz "Docker Desktop is running" ou similar.
5. **Não avance** enquanto o Docker não estiver totalmente iniciado (pode levar 1–2 minutos na primeira vez).
6. **Se o Docker não iniciar:** Reinicie o computador e tente novamente.

---

## 4. Passo 1 — Base de dados

### 4.1 Abrir janela do PowerShell

1. Prima a tecla **Windows**.
2. Escreva `PowerShell`.
3. Prima Enter.
4. **Resultado esperado:** Abre uma janela preta/azul com texto branco.

### 4.2 Criar ou iniciar o contentor PostgreSQL

**Primeira vez (contentor não existe):**

1. Copie e cole este comando:
   ```
   docker run --name ride_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ride_db -p 5432:5432 -d postgres
   ```
2. Prima Enter.
3. **Resultado esperado:** Aparece um código longo (ID do contentor). Não deve aparecer erro. A linha de comando volta a ficar disponível.

**Se o contentor já existir:**

1. Copie e cole:
   ```
   docker start ride_postgres
   ```
2. Prima Enter.
3. **Resultado esperado:** Aparece `ride_postgres`.

### 4.3 Verificar que está a correr

1. Execute:
   ```
   docker ps
   ```
2. **Resultado esperado:** Na lista aparece `ride_postgres` com estado "Up" ou "running".
3. **Deixe esta janela aberta.** A base de dados está a correr.

---

## 5. Passo 2 — Backend

### 5.1 Abrir nova janela do PowerShell

1. Na janela anterior (onde está o Docker), prima **Ctrl+Shift+N** ou clique em **File → New Window** (se aplicável).
2. Ou: feche o menu Iniciar e abra novamente o PowerShell como no passo 4.1.

### 5.2 Navegar até à pasta do backend

1. Escreva:
   ```
   cd C:\dev\APP\backend
   ```
2. Prima Enter.
3. **Nota:** Se o projeto estiver noutra pasta, ajuste o caminho (ex.: `cd D:\projetos\APP\backend`).

### 5.3 Criar ambiente virtual (se não existir)

1. Verifique se existe a pasta `venv`:
   ```
   dir venv
   ```
2. Se aparecer "cannot find" ou erro:
   - Execute: `python -m venv venv`
   - Execute: `.\venv\Scripts\activate`
   - Execute: `pip install -r requirements.txt`
   - Feche esta janela e volte ao passo 5.1.

### 5.4 Ativar o ambiente virtual

1. Execute:
   ```
   .\venv\Scripts\activate
   ```
2. **Resultado esperado:** O início da linha passa a mostrar `(venv)`.
3. Se aparecer erro de execução de scripts: execute `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` e tente novamente.

### 5.5 Instalar dependências (se necessário)

1. Se ainda não instalou, execute:
   ```
   pip install -r requirements.txt
   ```
2. Espere terminar. Não deve aparecer erro.

### 5.6 Verificar ficheiro .env

1. Execute:
   ```
   dir .env
   ```
2. Se aparecer "cannot find", crie o ficheiro com:
   ```
   DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/ride_db
   ```
3. Pode usar o Notepad: `notepad .env`

### 5.7 Iniciar o servidor

1. Execute:
   ```
   uvicorn app.main:app --reload --port 8000
   ```
2. **Resultado esperado:** Aparece algo como:
   ```
   INFO:     Uvicorn running on http://127.0.0.1:8000
   INFO:     Application startup complete.
   ```
3. **Não feche esta janela.** O backend está a correr.
4. **Se aparecer erro de base de dados:** Verifique se o Docker está a correr e se o contentor `ride_postgres` está "Up".

---

## 6. Passo 3 — Stripe Webhook

### 6.1 Abrir nova janela do PowerShell

1. Abra outra janela do PowerShell (como no passo 5.1).

### 6.2 Iniciar o Stripe Listen

1. Execute:
   ```
   stripe listen --forward-to localhost:8000/webhooks/stripe
   ```
2. **Resultado esperado:** Aparece "Ready!" e um código que começa por `whsec_...`.
3. **Se pedir login:** Execute `stripe login` numa janela separada, complete o browser, e tente novamente.
4. **Não feche esta janela.** O webhook está a correr. É necessário para os pagamentos funcionarem.

---

## 7. Passo 4 — Web App

### 7.1 Abrir nova janela do PowerShell

1. Abra outra janela do PowerShell.

### 7.2 Navegar até à pasta da web app

1. Execute:
   ```
   cd C:\dev\APP\web-app
   ```
2. Prima Enter.

### 7.3 Instalar dependências (se necessário)

1. Verifique se existe a pasta `node_modules`:
   ```
   dir node_modules
   ```
2. Se não existir: execute `npm install` e espere terminar.

### 7.4 Iniciar a web app

1. Execute:
   ```
   npm run dev
   ```
2. **Resultado esperado:** Aparece algo como:
   ```
   ➜  Local:   http://localhost:5173/
   ```
3. **Não feche esta janela.** A web app está a correr.

---

## 8. Resumo — Janelas abertas

Deve ter **4 janelas** do PowerShell abertas:

| Janela | O que está a correr | Comando                                                     |
| ------ | ------------------- | ----------------------------------------------------------- |
| 1      | Base de dados       | `docker start ride_postgres` (ou `docker run...`)           |
| 2      | Backend             | `uvicorn app.main:app --reload --port 8000`                 |
| 3      | Stripe              | `stripe listen --forward-to localhost:8000/webhooks/stripe` |
| 4      | Web app             | `npm run dev`                                               |

**Todos devem estar a correr ao mesmo tempo.**

---

# PARTE III — TESTES NO BROWSER

---

## 9. Abrir a aplicação

### 9.1 Abrir o browser

1. Abra o **Chrome**, **Edge** ou **Firefox**.
2. **Não use** o Internet Explorer (não suportado).

### 9.2 Abrir o endereço

1. Clique na barra de endereços (onde está o URL).
2. Apague o que lá estiver.
3. Escreva: `http://localhost:5173`
4. Prima Enter.

### 9.3 Verificar que carregou

1. **Resultado esperado:** Aparece um ecrã com:
   - Título "TVDE" no topo
   - Dois botões: "Passageiro" e "Motorista"
   - O botão "Passageiro" está azul (selecionado)
2. **Se aparecer "A carregar...":** Espere alguns segundos. Se não mudar, verifique se o backend está a correr.
3. **Se aparecer página em branco ou erro:** Verifique a consola do browser (F12 → Console) e se o backend está a correr.

---

## 10. Executar o Seed (obrigatório)

O Seed cria utilizadores e motoristas de teste. **Sem executar o Seed, nada funciona.**

### 10.1 Localizar o Dev Tools

1. Na página, vá para baixo.
2. Procure uma caixa com o texto **"▶ Dev"** (ou "▼ Dev" se estiver expandido).
3. Esta caixa está abaixo do texto "Passageiro" e "Pedir e acompanhar viagens".

### 10.2 Expandir o Dev Tools

1. Clique em **"▶ Dev"**.
2. **Resultado esperado:** A caixa expande e mostra botões: **Seed**, **Auto-trip**, **Timeouts**, **Assign**.

### 10.3 Executar o Seed

1. Clique no botão **"Seed"**.
2. **Resultado esperado:** A página recarrega automaticamente (refresh).
3. Após recarregar, a página volta a aparecer normalmente.
4. **Se aparecer erro:** Verifique se o backend está a correr (janela 2). Veja se há mensagens de erro na janela do backend. Tente novamente.

### 10.4 Confirmar que o Seed funcionou

1. Após o recarregar, a página deve carregar sem erros.
2. Não deve aparecer mensagem de erro a vermelho.
3. O botão "Passageiro" deve estar visível e clicável.

---

# PARTE IV — TESTES DO PASSAGEIRO

---

## 11. Vista Passageiro — Estado inicial

### 11.1 Selecionar Passageiro

1. Clique no botão **"Passageiro"** no topo (se não estiver já selecionado).
2. **Resultado esperado:** O botão fica azul. O conteúdo muda para a vista do passageiro.

### 11.2 Verificar o que aparece

1. Deve ver:
   - Título "Passageiro"
   - Subtítulo "Pedir e acompanhar viagens"
   - Caixa "▶ Dev" (colapsada ou expandida)
   - Um badge grande com o texto **"Sem viagem ativa"** (cinzento)
   - Texto "Estimativa: **4–6 €**"
   - Botão fixo no fundo (azul): **"Pedir viagem"**
2. **Não deve** aparecer nenhum erro a vermelho.

---

## 12. Pedir uma viagem

### 12.1 Clicar em Pedir viagem

1. Clique no botão **"Pedir viagem"** (no fundo do ecrã).
2. **Resultado esperado:** O botão muda para "A processar..." com um spinner. O botão fica desativado (mais transparente).

### 12.2 Aguardar a criação

1. Espere 1–3 segundos.
2. **Resultado esperado:** O ecrã muda. O badge muda para **"À procura de motorista"** (amarelo). Aparece um spinner e o texto "Estamos a encontrar o motorista mais próximo." O botão no fundo passa a ser **"Cancelar"** (vermelho).

### 12.3 Verificar o estado

1. A viagem foi criada mas ainda não tem motorista atribuído.
2. O estado "À procura" significa que o sistema está à espera de um motorista aceitar (ou de um Assign manual via Dev Tools).

---

## 13. Atribuir motorista (via Dev Tools)

Para testar o fluxo completo, é preciso atribuir um motorista à viagem.

### 13.1 Expandir Dev Tools

1. Na página do Passageiro, vá até à caixa **"▶ Dev"**.
2. Se estiver colapsada, clique para expandir.
3. **Resultado esperado:** Aparecem os botões Seed, Auto-trip, Timeouts, **Assign**.

### 13.2 Clicar em Assign

1. Com a viagem em "À procura", clique no botão **"Assign"** (verde).
2. **Resultado esperado:** O botão pode fazer um clique. O estado deve mudar (pode levar 1–2 segundos devido ao polling).
3. O badge deve mudar para **"Motorista atribuído"** (azul).
4. Aparece o card da viagem com:
   - Origem: "Centro de Lisboa"
   - Destino: "Lisboa"
   - Preço
   - Texto "O seu motorista está a caminho"

### 13.3 Se não aparecer Assign

1. O botão "Assign" só aparece quando há uma viagem criada pelo passageiro atual.
2. Se não aparecer, volte ao passo 12 e crie uma viagem primeiro.

---

## 14. Cancelar viagem (passageiro)

### 14.1 Com viagem em "À procura" ou "Motorista atribuído"

1. O botão no fundo deve ser **"Cancelar"** (vermelho).
2. Clique em **"Cancelar"**.
3. **Resultado esperado:** O botão muda para "A processar...". Após 1–2 segundos, a viagem desaparece. O estado volta a "Sem viagem ativa" e o botão volta a "Pedir viagem".

### 14.2 Verificar

1. Após cancelar, não deve haver viagem ativa.
2. O histórico (se existir) pode mostrar a viagem cancelada.

---

## 15. Fluxo completo Passageiro — Pedir até Concluir

Para testar o fluxo completo, precisa de dois "dispositivos" ou duas abas: uma como Passageiro, outra como Motorista.

### 15.1 Preparar (Passageiro)

1. Na vista **Passageiro**, clique em **"Pedir viagem"**.
2. Espere até ver "À procura de motorista" ou "Motorista atribuído".
3. Se quiser, clique em **Assign** no Dev Tools para atribuir motorista.

### 15.2 Mudar para Motorista

1. Clique no botão **"Motorista"** no topo.
2. **Resultado esperado:** A vista muda para o motorista.
3. Deve ver o toggle "Disponível" e a lista de viagens disponíveis (assigned).
4. Se houver viagens, cada uma mostra: Recolha, valor em € (grande e verde), botão **"ACEITAR"**.

### 15.3 Aceitar a viagem (Motorista)

1. Clique no botão **"ACEITAR"** numa das viagens.
2. **Resultado esperado:** O botão fica em loading. Após 1–2 segundos, a viagem desaparece da lista e aparece a seção "Viagem ativa" com o estado "A caminho do passageiro".
3. O botão fixo no fundo passa a ser **"Cheguei"**.

### 15.4 Simular chegada (Motorista)

1. Clique em **"Cheguei"**.
2. **Resultado esperado:** O estado muda para "A chegar". O botão passa a **"Iniciar viagem"**.

### 15.5 Iniciar viagem (Motorista)

1. Clique em **"Iniciar viagem"**.
2. **Resultado esperado:** O estado muda para "Em viagem". O botão passa a **"Concluir viagem"**.

### 15.6 Concluir viagem (Motorista)

1. Clique em **"Concluir viagem"**.
2. **Resultado esperado:** O botão fica em "A processar...". Após 1–2 segundos, a viagem desaparece da vista ativa. O motorista volta a ver "À espera de viagens" ou a lista de viagens disponíveis.
3. A viagem aparece no **Histórico** (abaixo).

### 15.7 Verificar no Passageiro

1. Clique no botão **"Passageiro"** no topo.
2. **Resultado esperado:** O estado deve mostrar "Viagem concluída" (cinzento) ou já ter voltado a "Sem viagem ativa" com o botão "Pedir nova viagem" ou "Pedir viagem".
3. A viagem concluída deve aparecer no **Histórico** do passageiro.

---

## 16. Histórico do Passageiro

### 16.1 Verificar após viagem concluída

1. Na vista Passageiro, vá até ao final da página.
2. Deve ver a seção **"Histórico"** (título cinzento, mais discreto).
3. Cada linha mostra: origem → destino e o preço.

### 16.2 Verificar conteúdo

1. O histórico não mostra IDs nem dados técnicos.
2. Mostra apenas viagens concluídas (ou canceladas, dependendo da implementação).

---

# PARTE V — TESTES DO MOTORISTA

---

## 17. Vista Motorista — Estado inicial

### 17.1 Selecionar Motorista

1. Clique no botão **"Motorista"** no topo.
2. **Resultado esperado:** O botão fica azul. O conteúdo muda para a vista do motorista.

### 17.2 Verificar o que aparece

1. Deve ver:
   - Título "Motorista"
   - Subtítulo "Aceitar e completar viagens"
   - Caixa "▶ Dev"
   - **Toggle** (grande): "Estado" com "Disponível" ou "Offline" e um interruptor
   - Badge "À espera de viagens" ou "X viagem(ns) disponível(eis)"
   - Lista de viagens (se houver) ou mensagem "Nenhuma viagem disponível."
   - Botão fixo no fundo **só** quando há viagem ativa (Cheguei / Iniciar / Concluir)

---

## 18. Toggle Offline / Disponível

### 18.1 Verificar estado inicial

1. O toggle deve estar em **"Disponível"** (verde) por defeito.
2. Se não estiver, clique no interruptor para ativar.

### 18.2 Passar para Offline

1. Clique no interruptor (o círculo do toggle).
2. **Resultado esperado:** O interruptor desliza para a esquerda. O estado muda para "Offline". A cor fica cinzenta.
3. Aparece a mensagem: "Está offline." e "Ative para receber viagens."
4. A lista de viagens desaparece (se existia).

### 18.3 Voltar a Disponível

1. Clique novamente no interruptor.
2. **Resultado esperado:** O interruptor desliza para a direita. O estado volta a "Disponível". A lista de viagens aparece novamente (se houver viagens).

### 18.4 Persistência

1. Passe para Offline.
2. Recarregue a página (F5).
3. **Resultado esperado:** O toggle deve manter-se em Offline (o estado é guardado no browser).

---

## 19. Aceitar viagem

### 19.1 Pré-requisito

1. Deve haver pelo menos uma viagem "assigned" na lista.
2. Para criar: na vista Passageiro, peça uma viagem e clique em Assign (Dev Tools).

### 19.2 Ver o card da viagem

1. Cada viagem mostra:
   - "Recolha" com o local (ex.: "Centro de Lisboa")
   - Valor em € (grande, verde, bold)
   - Botão **"ACEITAR"** (verde)

### 19.3 Clicar em ACEITAR

1. Clique no botão **"ACEITAR"**.
2. **Resultado esperado:** O botão fica em loading (spinner). Após 1–2 segundos, a viagem desaparece da lista e aparece a seção "Viagem ativa" com o card da viagem e o estado "A caminho do passageiro".
3. O botão fixo no fundo passa a ser **"Cheguei"**.

---

## 20. Cancelar viagem (motorista)

### 20.1 Com viagem em "A caminho" ou "A chegar"

1. O botão fixo é "Cheguei" ou "Iniciar viagem".
2. Abaixo dele, aparece o link **"Cancelar viagem"** (texto cinzento).
3. Clique em **"Cancelar viagem"**.
4. **Resultado esperado:** O botão fica em loading. Após 1–2 segundos, a viagem desaparece. O motorista volta a ver a lista de viagens disponíveis (ou "À espera de viagens").
5. A viagem pode aparecer no histórico como cancelada.

---

## 21. Conflito 409 (dois motoristas)

Este teste verifica o que acontece quando dois motoristas tentam aceitar a mesma viagem.

### 21.1 Preparar

1. Abra a aplicação em **duas abas** ou **dois browsers** (ex.: Chrome e Edge).
2. Em ambas, vá à vista **Motorista**.
3. Certifique-se de que há **uma** viagem disponível na lista.

### 21.2 Primeiro motorista

1. Na primeira aba, clique em **"ACEITAR"** na viagem.
2. Espere até a viagem ser aceite (estado "A caminho do passageiro").

### 21.3 Segundo motorista

1. Na segunda aba, clique em **"ACEITAR"** na mesma viagem (antes de a lista atualizar).
2. **Resultado esperado:** Aparece um banner amarelo no topo: **"Viagem já foi aceite por outro motorista."**
3. O banner desaparece automaticamente após 3 segundos.
4. A lista de viagens na segunda aba atualiza e a viagem desaparece (foi aceite pelo primeiro).

---

## 22. Histórico do Motorista

### 22.1 Verificar após viagem concluída

1. Na vista Motorista, vá até ao final da página.
2. Deve ver a seção **"Histórico"** (título cinzento).
3. Cada linha mostra: origem → destino e o preço.

---

# PARTE VI — DEV TOOLS

---

## 23. Auto-trip

### 23.1 O que faz

O Auto-trip cria uma viagem completa automaticamente (passageiro + motorista + conclusão). Útil para testes rápidos.

### 23.2 Executar

1. Expanda **Dev Tools** (▶ Dev).
2. Clique em **"Auto-trip"**.
3. **Resultado esperado:** A página pode atualizar. Uma viagem é criada e concluída automaticamente.
4. **Se aparecer erro "Driver is not available":** Execute o **Seed** primeiro e tente novamente.

---

## 24. Run timeouts

### 24.1 O que faz

Executa as regras de timeout: viagens "assigned" há muito tempo voltam a "requested"; viagens "accepted" não iniciadas são canceladas; etc.

### 24.2 Executar

1. Expanda **Dev Tools**.
2. Clique em **"Timeouts"**.
3. **Resultado esperado:** O botão executa. Pode não haver feedback visual imediato se não houver viagens a expirar.

---

# PARTE VII — PROBLEMAS COMUNS

---

## 25. Tabela de resolução

| Problema                               | Causa provável                        | Solução                                                                                                 |
| -------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `docker: command not found`            | Docker não instalado ou não no PATH   | Instale o Docker Desktop e reinicie o PowerShell                                                        |
| `password authentication failed`       | Base de dados com credenciais erradas | Verifique `backend/.env`: `DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/ride_db` |
| `Connection refused` na web app        | Backend não está a correr             | Inicie o backend (Passo 2)                                                                              |
| Página em branco ou 403                | Seed não executado                    | Execute o Seed (Passo 10)                                                                               |
| "Driver is not available" no Auto-trip | Motoristas não disponíveis            | Execute o Seed e tente novamente                                                                        |
| "Viagem já foi aceite" ao aceitar      | Outro motorista aceitou primeiro      | Normal. Teste o fluxo 409 (Passo 21)                                                                    |
| Botão Assign não aparece               | Não há viagem criada pelo passageiro  | Crie uma viagem na vista Passageiro primeiro                                                            |
| Stripe pede login                      | Não autenticado                       | Execute `stripe login` e complete no browser                                                            |
| Docker não inicia                      | Recursos do sistema                   | Reinicie o computador. Abra o Docker Desktop novamente                                                  |

---

# PARTE VIII — PARAR TUDO

---

## 26. Parar os serviços

### 26.1 Parar a web app

1. Vá à janela do PowerShell onde está `npm run dev`.
2. Prima **Ctrl+C**.
3. **Resultado esperado:** O processo termina. A linha de comando volta.

### 26.2 Parar o Stripe

1. Vá à janela do Stripe.
2. Prima **Ctrl+C**.

### 26.3 Parar o backend

1. Vá à janela do backend. Prima **Ctrl+C**.

### 26.4 Parar a base de dados

1. Abra o PowerShell.
2. Execute:
   ```
   docker stop ride_postgres
   ```
3. **Resultado esperado:** Aparece `ride_postgres`.

### 26.5 Fechar o Docker (opcional)

1. Pode fechar o Docker Desktop quando terminar. O contentor fica parado.

---

## 27. Reiniciar tudo (para nova sessão)

1. Execute o Passo 1 (docker start ride_postgres).
2. Execute o Passo 2 (backend).
3. Execute o Passo 3 (Stripe).
4. Execute o Passo 4 (web app).
5. Não é necessário executar o Seed novamente se a base de dados não foi apagada.

---

# PARTE IX — CHECKLIST RÁPIDO

Use esta lista para verificar que testou tudo:

- [ ] Docker a correr
- [ ] Backend a correr
- [ ] Stripe webhook a correr
- [ ] Web app a correr
- [ ] Seed executado
- [ ] Vista Passageiro: estado inicial
- [ ] Pedir viagem
- [ ] Estado "À procura"
- [ ] Assign (Dev Tools)
- [ ] Estado "Motorista atribuído"
- [ ] Cancelar viagem (passageiro)
- [ ] Vista Motorista: estado inicial
- [ ] Toggle Offline / Disponível
- [ ] Aceitar viagem
- [ ] Cheguei → Iniciar → Concluir
- [ ] Histórico (passageiro e motorista)
- [ ] Cancelar viagem (motorista)
- [ ] Conflito 409 (duas abas)
- [ ] Auto-trip (Dev Tools)
- [ ] Run timeouts (Dev Tools)
