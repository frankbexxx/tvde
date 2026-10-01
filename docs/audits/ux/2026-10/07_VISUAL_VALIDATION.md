# Validação visual — UX-PAX-009, UX-PAX-011, UX-PAX-028

Só estes três. Sem correcção. Sem viagem criada.

Produção: `https://tvde-app-j51f.onrender.com`. Conta de teste já usada na auditoria, papel Passageiro. Não se seleccionou conta Google. Não se pediu viagem. Não se avançou nenhum estado de viagem.

As capturas ficaram na sessão do browser. Não foram copiadas para o repositório.

## 1. Resumo

| Finding | Superfície | Resultado |
|---|---|---|
| UX-PAX-009 | Google onboarding | NOT_CONFIRMED |
| UX-PAX-011 | Home passageiro | NOT_CONFIRMED |
| UX-PAX-028 | Viagem activa passageiro | NÃO OBSERVADO |
| UX-PAX-028 | Viagem activa motorista | NÃO OBSERVADO |

`NÃO OBSERVADO` não é `NOT_CONFIRMED`. O ecrã não abriu. O finding não fica provado nem desmentido.

## 2. UX-PAX-009

### Observado

Entrada `/passenger`, separador Passageiro. Botão «Continuar com Google». Por baixo: «Só para passageiro (v1).»

Toque no botão. O separador deixou a app e abriu a página da Google:

- título «Iniciar sessão com o Google»;
- «Selecione uma conta»;
- «Continuar para vamula»;
- uma conta já com sessão neste browser;
- «Usar outra conta».

Não apareceu ecrã da app com «Como queres continuar», «Criar nova conta» ou «Ligar a uma conta VAMULÁ existente». Não houve voltar dentro da app: a página era a da Google. Não se escolheu conta. Voltou-se a `/passenger` sem concluir sessão Google.

Largura nesta passagem: a mesma janela larga da entrada. Não se repetiu o picker em janela estreita. O que mudaria nessa largura não foi visto.

### Evidência

| | |
|---|---|
| Rota | `/passenger`, depois `accounts.google.com` (escolha de conta), depois outra vez `/passenger` |
| Papel | Passageiro, sem sessão |
| Estado | Entrada; OAuth não concluído |
| Janela | Larga, a mesma da entrada |
| Texto | «Continuar com Google»; «Só para passageiro (v1).»; na Google, «Selecione uma conta» e «Continuar para vamula» |
| Controlo | Botão Google; na Google, a conta já presente e «Usar outra conta» |
| Scroll | Não foi preciso para ver o botão |
| Resultado | Os ecrãs de criar e de ligar da app não apareceram |

### Resultado

NOT_CONFIRMED.

### Formulação final do finding

O finding deve sair da lista como problema confirmado. Nesta passagem, criar conta e ligar conta existente não chegaram a aparecer. O que apareceu a seguir ao botão foi a escolha de conta da Google. Não se viu título, opções, volta, nem linguagem técnica desses dois caminhos da app.

## 3. UX-PAX-011

### Observado

Sessão Passageiro em `/passenger`. Sem pedido de viagem.

O aviso do topo mudou de frase entre vistas. Não é um botão.

**A. Janela larga, 1148 × 752, sem scroll.**

- Primeira frase no conteúdo: «Estimativa ao pedir; o preço final aparece no fim da viagem.»
- Primeiro controlo do pedido: campo «Recolha da viagem», placeholder «Recolha: rua, localidade, código postal…».
- Acção principal, botão azul: «Marcar recolha no mapa».
- Recolha está à vista, por cima desse botão.
- Barra: Início, Histórico, Conta, Menu.
- Mapa atrás. Sem scroll.

**B. Janela estreita, 391 × 844, sem scroll.** Emulação de telemóvel no mesmo separador, não inferida pelo CSS.

- Primeira frase no conteúdo, nesta vista: «Dúvidas operacionais: usa o registo de actividade (⚙️) para rever o que a app fez.»
- O mesmo campo de recolha e o mesmo botão «Marcar recolha no mapa» estão à vista.
- A barra Início, Histórico, Conta, Menu está na base da janela (o fundo da barra coincide com a altura 844).
- Sem scroll.

Histórico desta conta, aberto só para ver se havia viagem: «Ainda não há viagens nesta conta.» Fechado em seguida.

### Evidência

| | Largo | Estreito |
|---|---|---|
| Rota | `/passenger` | `/passenger` |
| Papel | Passageiro com sessão | Passageiro com sessão |
| Estado | Home, sem viagem | Home, sem viagem |
| Janela | 1148 × 752 | 391 × 844 |
| Primeira frase | Estimativa ao pedir… | Dúvidas operacionais… |
| Primeiro controlo do pedido | Campo Recolha da viagem | O mesmo campo |
| Acção reconhecível | «Marcar recolha no mapa» | «Marcar recolha no mapa» |
| Scroll | Não | Não |

### Resultado

NOT_CONFIRMED.

### Formulação final do finding

O finding deve sair da lista. A home mostra, sem scroll, um campo de recolha e um botão «Marcar recolha no mapa», nas duas larguras. Isso é um início de pedido reconhecível. A primeira frase do topo não diz «pedir viagem», mas não é a acção.

## 4. UX-PAX-028

### Passageiro

Não houve viagem activa. A conta de teste não tem viagens. A home não mostra folha de viagem, acção de viagem nem SOS.

Não se criou viagem. Criar uma em produção alteraria dados e poderia chamar um motorista. O pedido pedia para não alterar dados de forma permanente.

### Motorista

Não se abriu o shell Motorista com esta sessão. A conta usada é de Passageiro. Não se criou viagem para chegar à folha do motorista.

### Comparação factual

Não há comparação. Nenhum dos dois ecrãs de viagem activa foi visto. A constante de altura da folha não foi usada como resultado.

### Resultado final

Passageiro: NÃO OBSERVADO. Motorista: NÃO OBSERVADO. O finding UX-PAX-028, incluindo o antigo UX-DRV-009, não muda de estado. Continua por validar.

### Formulação final do finding

Mantém-se a formulação já revista: falta ver se a acção principal e o SOS cabem na primeira vista. Esta passagem não a confirma nem a retira.

## 5. Fecho da auditoria

| Resultado | Quantidade | IDs |
|---|---:|---|
| CONFIRMED | 0 | — |
| PARTIALLY_CONFIRMED | 0 | — |
| NOT_CONFIRMED | 2 | UX-PAX-009, UX-PAX-011 |
| NÃO OBSERVADO | 1 finding, duas superfícies | UX-PAX-028 passageiro e motorista |

- Continua: UX-PAX-028, à espera de uma viagem activa já existente, nos dois papéis.
- Reformular: nenhum nesta passagem.
- Deixam de existir como problema confirmado: UX-PAX-009 e UX-PAX-011.
- IDs não foram renumerados.

## Controlo

- Validados apenas estes três findings.
- Não houve redesign.
- Não houve correcção de código nem de copy.
- Não houve alteração de código.
- Relatórios `00` a `06` não foram modificados.
- Não se seleccionou conta Google.
- Não se criou nem se avançou viagem.
- Repo alterado: NÃO.
