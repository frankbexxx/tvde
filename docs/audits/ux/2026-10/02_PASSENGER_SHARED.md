# Auditoria profunda — Entrada, Passageiro e superfícies partilhadas

Sem correcções. Sem ranking.

## Método

| Marca | Significado |
|---|---|
| OBSERVADO | Visto nesta passagem no browser, em `https://tvde-app-j51f.onrender.com`, sem submeter formulários e sem criar viagem, pagamento, cancelamento ou alteração de conta |
| OBSERVADO ANTES | Visto na passagem visual anterior da Conta do Passageiro (barra inferior), na mesma aplicação em produção. Não foi repetido agora |
| INFERIDO | Lido no código e nos textos pt. Não é experiência validada |
| COBERTO POR TESTE | Existe teste de componente ou de navegação. Não substitui o que uma pessoa vê |
| NÃO OBSERVADO | Não houve ecrã real nesta passagem |

Nesta passagem, OBSERVADO: ecrã «A iniciar serviço…»; entrada com Passageiro seleccionado; a mesma entrada com Motorista seleccionado. Não houve login.

---

## A. Entrada / Login

OBSERVADO. Cartão centrado, marca, faixa verde-vermelha, texto `(beta mode)` ao lado da marca.

Separadores em grelha 2×2: Passageiro, Motorista, Parceiro, Administrador. O seleccionado fica verde preenchido; os outros ficam cinzentos. Não há título visível a dizer que são portas de entrada. O nome «Tipo de utilizador» existe só para leitor de ecrã. Uma pessoa pode achar que está a escolher quem é, não apenas por onde entra.

| Elemento | Visível? | Perceptível? | Compreensível? | Acção óbvia? | Problema |
|---|---|---|---|---|---|
| Separadores de papel | sim | o verde marca o escolhido | não explica a diferença entre entrar e criar esse papel | tocar muda a cor | sem frase do que cada um abre |
| `(beta mode)` | sim | pequeno, ao lado da marca | inglês, interno | nenhuma | parece estado de laboratório |
| Português / English | sim | botões | sim | sim | — |
| Frase do telemóvel | sim | texto cinzento | sim | não é botão | — |
| Checkbox legal | sim, vazia | caixa e links | «Obrigatório para criar conta» está sempre visível, também para quem já tem conta | não bloqueia Entrar | mistura criar conta com entrar |
| Continuar com Google | sim no Passageiro | botão de contorno | a nota «Só para passageiro (v1).» é técnica | sim | some no Motorista (OBSERVADO) |
| Telemóvel | sim | campo com bordo | label visível | sim | neste browser vinha preenchido com o último número guardado neste aparelho; não é o estado de uma pessoa nova |
| Palavra-passe | sim | campo com bordo e seis marcas | label visível | sim | o campo não está vazio antes de a pessoa escrever |
| Entrar | sim | botão verde, o mais forte | sim | sim | activo mesmo com a checkbox vazia |
| Versão | sim | `v1.0.0 ·` e um código curto | a frase de suporte pede para usar «este identificador» | nenhuma | código de build à vista |
| Livro de Reclamações, CACCL, CNIACC | sim, no fundo | links pequenos | siglas sem explicação no próprio ecrã | links | — |
| Erros de login | NÃO OBSERVADO | — | textos no ficheiro de erros falam em BETA, token, Alembic, `VITE_API_URL` | — | se o servidor falhar, a pessoa pode ver instruções de operação |
| A entrar… | NÃO OBSERVADO nesta passagem | o botão muda o texto e fica inactivo | — | — | INFERIDO |

Não há «esqueci a palavra-passe» visível. INFERIDO: o código não mostra recuperação.

## B. Google onboarding

NÃO OBSERVADO. INFERIDO de `GooglePassengerOnboarding` e dos textos `auth.json`. COBERTO POR TESTE em `GooglePassengerOnboarding.test.tsx`.

O regresso web do Google não foi percorrido.

Textos que uma pessoa veria, se o fluxo abrir:

- «Como queres continuar?»
- «Este Google ainda não está ligado a uma conta VAMULÁ.»
- «Criar nova conta» e «Ligar a uma conta VAMULÁ existente»
- «Concluir registo» com email só de leitura, nome, telemóvel, termos
- No modo ligar: «Confirma a palavra-passe desta conta» e o botão «Ligar conta Google»

Não aparece a palavra identity no título. Aparece em erros traduzidos: «formas de entrada», «essa conta Google já está ligada a outra conta».

Não há botão Voltar no formulário de criar. Se a sessão Google expirar, o texto pede para entrar outra vez. Fechar a janela a meio do Google não foi observado. Escolher a conta Google errada não foi observado; o endereço de autorização pede `prompt=select_account` (INFERIDO).

Risco de segunda conta: o ecrã de escolha existe no código quando o servidor devolve essa situação. Não foi visto. O botão «Criar nova conta» é o primário verde; «Ligar…» é o de contorno, mas os dois usam a mesma classe de altura.

## C. Passenger Home

NÃO OBSERVADO nesta passagem. INFERIDO.

O que o código monta em `/passenger`: mapa em largura total, header só com marca, hora e uma dica rotativa, duas pesquisas (recolha e destino) cujas labels são só para leitor de ecrã, botão «Marcar recolha no mapa», barra Início · Histórico · Conta · Menu.

Em três segundos, a pista visível é o placeholder «Recolha: rua, localidade, código postal…», não um título «Pede uma viagem». A CTA verde «Confirmar viagem» só aparece depois de haver recolha e destino. O mapa ocupa o fundo. O GPS, quando falha, mostra «Localização indisponível — a usar posição aproximada.» e «Tentar outra vez» (texto no código; ecrã NÃO OBSERVADO).

## D. Pedido

NÃO OBSERVADO. INFERIDO de `TripPlannerPanel`, `PassengerPetBookingPanel`, textos `passenger.json`.

Passos no código: escrever ou tocar recolha → confirmar recolha → destino → confirmar destino → folha com percurso, categoria, animal, estimativa → «Confirmar viagem».

«Alterar» e «Repor» / «Limpar» existem como secundários. Voltar à recolha depende desses botões, não de um passo numerado.

Abaixo da primeira dobra da folha podem ficar categoria (GO, Comfort, XL), animal, portagens, taxa de intermediação e a fórmula «Base … € + … €/km + … €/min». A folha de confirmação tem altura máxima cerca de 78% do ecrã. Não há texto «desliza para ver o preço».

«Confirmar viagem» fica inactivo se os pontos estão demasiado perto, se falta porte do animal, ou enquanto diz «A confirmar…».

## E. Procura

NÃO OBSERVADO. INFERIDO.

Texto principal: «A procurar motorista…». Por baixo, se já existe pedido: «Pedido» mais os primeiros 8 caracteres do identificador interno (`searchingTrip`). Não é o UUID completo. Ainda é um código sem significado.

Não há tempo estimado de espera. Há um estado mais tarde: «Ainda à procura de motorista» e a frase de que se pode esperar ou cancelar. «Tentar novamente» aparece no cartão quando o estado interno é `requested`. Sair da página não está explicado. Cancelar existe como acção da viagem, não como frase fixa no primeiro segundo da procura.

## F. Viagem activa

NÃO OBSERVADO. INFERIDO de `PassengerStatusCard`.

| Momento no código | Frase principal | O que a pessoa deve fazer | O que pode fazer |
|---|---|---|---|
| assigned | «Motorista encontrado» / «A obter a posição do motorista…» | esperar | SOS |
| accepted | «Motorista a caminho» | esperar | SOS, cancelar |
| arriving | «O motorista está próximo do ponto de recolha.» | esperar no ponto | SOS, cancelar |
| ongoing | «Viagem em curso» | seguir | SOS |
| completed | «Viagem concluída» | avaliar ou saltar | — |

O nome mostrado no cartão é a frase fixa «Motorista TVDE», não o nome da pessoa, excepto no painel SOS se a ficha de emergência o trouxer. A viatura é a frase «Veículo TVDE». Matrícula no cartão de viagem: não está neste cartão. ETA e distância existem como «~N min» e «Motorista a … de ti» quando há dados.

SOS não está no mapa parado. Só quando o estado é assigned, accepted, arriving ou ongoing.

## G. Pagamento

NÃO OBSERVADO. INFERIDO de `PassengerPaymentConfirmCard`.

Três ramos no código:

- segredo que termina em `_secret_mock`: título «Pagamento simulado», «Sem cartão real neste ambiente (DEV).», botão «Continuar (simulado)»
- sem chave Stripe: «Cartão indisponível» e «Continuar sem cartão»
- com Stripe: «Autorizar pagamento», «Motorista aceitou — confirma o cartão.», botão «Autorizar cartão»

Se a autorização falha, toast com a mensagem do Stripe ou «Pagamento recusado.» Se o estado não é reconhecido: «Estado do pagamento: …» e, se faltar, a palavra «desconhecido».

Não foi possível ver qual ramo está activo em produção. PROD user-facing confirmado: nenhum nesta passagem. Dev/test no texto: o ramo simulado diz DEV. Reachable hoje em PROD: NÃO VALIDADO VISUALMENTE.

Há também frases no planeamento: «Pagamento simulado — sem cobrança» e «Pagamento por cartão…». Quais aparecem depende do ambiente. NÃO OBSERVADO.

## H. Cancelamento

NÃO OBSERVADO. INFERIDO.

Começa por «Cancelar viagem». Abre «Motivo do cancelamento», «Escolha rápida», campo «Descreve em poucas palavras (opcional).», «Confirmar cancelamento». Não há frase sobre custo. «A cancelar…» e «Não foi possível cancelar» existem. Se a rede falha, o texto pede para tentar de novo. Não há frase a dizer que a viagem continua activa quando o cancelamento falha. Sucesso: «Viagem cancelada».

## I. Avaliação

NÃO OBSERVADO. INFERIDO.

«Como correu a viagem?», «Avalia o motorista (opcional).», estrelas, «Enviar avaliação», «Agora não». O opcional está escrito. «Agora não» fecha sem enviar. Depois do envio: «Obrigado pela avaliação». Erros incluem «Sem permissão para avaliar — em modo BETA, a conta tem de ser de passageiro (não motorista)». A viagem concluída é um cartão anterior; a avaliação não diz outra vez que a viagem já acabou mesmo sem estrelas.

## J. Histórico

NÃO OBSERVADO. INFERIDO. COBERTO POR TESTE de navegação até à Conta, não até ao detalhe visual.

Vazio: «Ainda não há viagens nesta conta.» Falha: «Não foi possível actualizar o histórico. Verifica a ligação.»

Cada linha: ponto de cor (sem texto do estado), depois um sítio. O sítio é «Oeiras», «Centro de Lisboa» / «Lisboa», ou coordenadas com duas casas (`38.72, -9.14`) para o resto do mapa. Preço final ou «—». Sem data na linha. Sem hora.

Detalhe: a palavra de estado é o valor interno com maiúscula inicial (`completed` → «Completed»), não «Viagem concluída». Pagamento mostra `payment_status` cru ou «—». Preço, fórmula, taxa de intermediação, datas, e a linha «ID» mais o identificador completo da viagem. Motivo de cancelamento, se existir, numa linha secundária.

## K. Reclamação

NÃO OBSERVADO. INFERIDO.

Não está no menu nem na barra. Está no detalhe de uma viagem já concluída ou cancelada, como texto sublinhado «Reportar problema / Fazer reclamação». Uma pessoa no meio da viagem não vê este caminho. Uma pessoa depois da viagem tem de abrir Histórico, abrir a linha, descer até ao texto.

Campos: categoria (lista), descrição, anexos «Até 5 ficheiros… Sem apagar nesta versão.» Sucesso: «Reclamação registada. Guarde a referência:» e um código, mais «Pode consultar o estado nas suas reclamações.» Não há, no menu do passageiro, um sítio chamado reclamações. Erro: «Não foi possível enviar a reclamação.» A descrição já escrita não foi verificada visualmente; o código só limpa o erro, não o texto, se o envio falha.

A referência da viagem passada ao formulário é o identificador interno.

## L. SOS

NÃO OBSERVADO. INFERIDO. COBERTO POR TESTE do painel isolado.

O botão diz só «SOS», vermelho, alinhado à direita da folha da viagem, e só nos estados assigned, accepted, arriving, ongoing. Não diz «emergência» nem «112» antes de abrir.

O painel: «Emergência». «Em perigo imediato, liga para o 112. A chamada não é iniciada automaticamente.» Botões de ligar e de partilhar. Mostra «Viagem» com `trip_ref` em mono, matrícula e nome se existirem. Se o GPS falha ao carregar a ficha: «Não foi possível carregar os dados de emergência.» Abrir o painel regista um evento no servidor; isso não foi executado.

O botão é pequeno face ao mapa. A palavra SOS é curta; o que fazer a seguir só aparece depois do toque.

## M. Conta

OBSERVADO ANTES, não repetido agora. A barra Conta abre uma folha à esquerda sobre o mapa.

Visto então, com a conta de teste:

- título Conta, Perfil, telemóvel, nome editável, papel Passageiro
- Alterar palavra-passe com três campos que parecem campos
- Métodos de início de sessão abaixo; foi preciso scroll dentro da folha
- uma linha de email, «Principal · Verificado»
- texto «Adiciona outro método antes de revogar este.» sem botão Revogar
- «Adicionar Google» verde
- entre o aviso e o botão, uma caixa cuja única pista era o placeholder «Palavra-passe para confirmar»

Essa caixa não tem label visível. O componente é um `input` com bordo fino, fundo transparente e só placeholder (`LoginMethodsSection`). Na passagem anterior não foi reconhecida de imediato como sítio para escrever.

O email `qa.identity.profile@example.com` é o dado dessa conta de teste, não uma frase do produto. Uma conta real mostraria o email real dessa pessoa, no mesmo sítio e no mesmo formato «Email · …». O problema de parecer um identificador de laboratório é dos dados de teste. O problema de a caixa de confirmação não parecer um campo é do produto.

«Papel» com o valor «Passageiro» é compreensível. «Principal» e «Verificado» são curtos e não dizem principal em relação a quê.

Definir palavra-passe (quando ainda não há) e alterar palavra-passe não aparecem juntos: INFERIDO do código e alinhado com o que a conta de teste mostrou (só alterar).

## N. Menu

NÃO OBSERVADO nesta passagem. INFERIDO.

Ordem: cartão com nome, telefone e «Passageiro»; secção viagens com Histórico e Partilhar QR; secção conta com Conta; secção app com Definições; Sair.

Histórico e Conta repetem a barra inferior. Partilhar QR e Definições só estão aqui. O cartão repete dados que a Conta também mostra. Sair está no fim da folha.

## O. Definições

NÃO OBSERVADO. INFERIDO.

«Aspeto» com temas, incluindo «Neon (sandbox)» e a descrição «Experimental — alto contraste, só testes.» «Modo da app» só aparece se a sessão tiver mais do que um shell. Os botões usam Passageiro, Motorista, Parceiro, Admin. Não diz que não muda a conta, só o ecrã. O texto de definições do header, não mostrado no passageiro porque o ícone não existe, inclui «A conta não tem perfil de motorista; o painel motorista exige JWT de motorista.» Esse texto está no ficheiro de settings; não foi confirmado se o passageiro o chega a ver.

## P. Barra inferior

NÃO OBSERVADO nesta passagem. A estrutura é INFERIDA e a Conta foi OBSERVADO ANTES.

Início, Histórico, Conta, Menu, ícone mais palavra, altura mínima 52 px. O activo fica com traço verde em cima. Com a folha aberta, a barra continua por baixo (visto na Conta). Início fecha a folha. Menu abre ou fecha. Não há gesto de voltar do sistema documentado; há Voltar dentro da folha.

## Q. Sheets / scroll

| Folha | Primeira vista | Requer scroll? | É óbvio que há mais? | CTA fica visível? |
|---|---|---|---|---|
| Menu lateral | 85% da largura, máximo 26 rem, título e Fechar | INFERIDO se o conteúdo passar a altura | só a barra de scroll do browser, se existir | Sair pode ficar abaixo |
| Conta | OBSERVADO ANTES: perfil e palavra-passe | sim, para os métodos | na primeira vista o título da secção aparecia cortado no fundo; não há frase «há mais abaixo» | Adicionar Google só depois de scroll |
| Histórico / detalhe | INFERIDO | o detalhe acrescenta fórmula, ID e reclamação | não | a reclamação é texto no fim |
| Partilhar / Definições | INFERIDO | temas ocupam altura | não | — |
| Folha do mapa (pedido) | fundo do mapa, altura limitada | a confirmação pode passar 78% do ecrã | não há indicador próprio | Confirmar viagem está no bloco de botões; pode ficar abaixo |
| Folha da viagem activa | altura máxima cerca de 28% do ecrã | INFERIDO: fácil cortar ETA, SOS e pagamento | não | SOS e pagar podem ficar fora |
| Procura | altura máxima muito baixa (cerca de 14% do ecrã) no estado de espera | INFERIDO | o spinner e duas linhas cabem; o resto não | — |

## R. Formulários

| Ecrã | Campo | Reconhecível como campo? | Label clara? | Estado erro claro? | Observação |
|---|---|---|---|---|---|
| Entrada | Telemóvel | sim, OBSERVADO | sim | NÃO OBSERVADO | último número neste browser |
| Entrada | Palavra-passe | sim, OBSERVADO | sim | NÃO OBSERVADO | já tem seis marcas |
| Entrada | Termos | caixa, OBSERVADO | frase legal visível | a nota «criar conta» confunde com o login | não impede Entrar |
| Google | Email, nome, telefone | INFERIDO, têm bordo e label | sim | frases próprias | email não editável |
| Mapa | Recolha e destino | INFERIDO, são inputs | label só para leitor de ecrã | placeholder faz de label | |
| Animal | checkboxes | INFERIDO | textos do painel | erros de porte e transporte | |
| Cancelar | motivo e texto livre | INFERIDO | sim | falha de rede tem frase | sem custo |
| Avaliação | estrelas | INFERIDO, grupo com nome | título visível | erros, um deles fala em BETA | opcional escrito |
| Conta | Nome | sim na passagem anterior | sim | validação 1–120 | |
| Conta | Telefone e papel | texto, não campo | sim | — | telemóvel não se edita; a frase que explica o administrador está no ficheiro `betaAccount.intro` e não está montada neste painel |
| Conta | Palavra-passe actual, nova, confirmar | sim na passagem anterior | sim | inline | |
| Conta | Palavra-passe para confirmar | não foi reconhecida como campo | só placeholder | erro depois da acção | borda fina, fundo transparente, encostada ao botão verde |
| Reclamação | categoria, descrição, anexo | INFERIDO | sim | uma frase genérica | «Sem apagar nesta versão» |

## S. CTAs

| Ecrã | CTA | Intenção perceptível? | Hierarquia clara? | Problema |
|---|---|---|---|---|
| Entrada | Entrar | sim | sim, o verde maior | — |
| Entrada | Continuar com Google | sim | secundário, acima do formulário | nota v1 |
| Entrada | Separadores | parcial | o verde distingue | não dizem o que vão abrir |
| Mapa | Marcar recolha no mapa | INFERIDO, o texto diz | secundário | — |
| Pedido | Confirmar viagem | INFERIDO | verde | pode estar abaixo do scroll |
| Pedido | Alterar | INFERIDO | secundário | — |
| Viagem | Cancelar viagem | INFERIDO | não é o verde principal | não avisa custo porque não há frase de custo |
| Viagem | SOS | a palavra é curta | pequeno, à direita | não diz 112 antes do toque |
| Avaliação | Agora não | INFERIDO | texto, não botão verde | — |
| Histórico | linha inteira | INFERIDO, é botão | parece lista | o estado é uma cor |
| Reclamação | texto sublinhado | parece link, é botão | fraca | fácil de não ver |
| Conta | Adicionar Google | sim, verde | forte | a caixa por cima não parece parte da acção |
| Conta | Guardar nome / Actualizar palavra-passe | sim na passagem anterior | ficam inactivos até haver mudança | — |
| Menu | Sair | INFERIDO | no fim | — |

## T. Linguagem técnica

User-facing no código ou visto:

| Texto | Onde | Tipo |
|---|---|---|
| `(beta mode)` | entrada, OBSERVADO | user-facing |
| `Só para passageiro (v1).` | entrada Passageiro, OBSERVADO | user-facing |
| `v1.0.0 ·` mais código de build | entrada, OBSERVADO | user-facing |
| CACCL, CNIACC | entrada, OBSERVADO | siglas |
| `Pedido` + 8 caracteres | procura | user-facing, INFERIDO |
| estado `completed` e semelhantes | detalhe do histórico | user-facing, INFERIDO |
| `payment_status` cru | detalhe, rótulo Pagamento | user-facing, INFERIDO |
| `ID` + identificador completo | detalhe | user-facing, INFERIDO |
| coordenadas `lat, lng` | lista e detalhe fora de Lisboa/Oeiras | user-facing, INFERIDO |
| `Base … €/km + … €/min` | estimativa e detalhe | user-facing, INFERIDO |
| `Taxa de intermediação VAMULÁ: N%` | estimativa e detalhe | user-facing, INFERIDO |
| `Estado do pagamento: desconhecido` | pagamento | user-facing se o estado não mapear |
| `Pagamento simulado` / `DEV` | ramo mock | dev no texto; reach em PROD NÃO VALIDADO |
| `Neon (sandbox)` / `só testes` | Definições → Aspeto | user-facing, INFERIDO |
| `modo BETA` na avaliação | erro de avaliação | user-facing se ocorrer |
| `BETA cheio`, `Login BETA indisponível` | erros | user-facing se ocorrer |
| `Não autorizado… verifica o token` | `auth.unauthorized` | user-facing se essa chave for usada |
| `Alembic`, `VITE_API_URL`, consola | erros de servidor no login | user-facing se o servidor responder 500 ou a app não ligar |
| `Estado da viagem não permite esta acção` | erros | user-facing |
| `JWT de motorista` | texto de settings | pode não chegar ao passageiro; NÃO VALIDADO |
| `qa.identity.profile@example.com` | Conta da fixture | dado de teste, não copy do produto |
| identity / provider / subject | não estão como rótulos; erros falam em «método» e «conta Google» | traduzidos |

## U. Erros e recuperação

| Fluxo | Diz o que aconteceu? | Diz o que fazer? | Mantém o que foi escrito? | Retry | Voltar | Estado ambíguo |
|---|---|---|---|---|---|---|
| Arranque | «A iniciar serviço…» ou o erro carregado | «Tentar novamente» no erro de arranque | — | sim | — | NÃO OBSERVADO o erro |
| Login | INFERIDO: «Password incorrecta» é claro; erro 500 fala em migrações | às vezes | os campos ficam | sim, Entrar de novo | — | Alembic não diz o que a pessoa faz |
| Google | frases de telefone, nome, palavra-passe | «Voltar ao início de sessão» se expirar | INFERIDO que o rascunho se perde ao reiniciar | sim | fraco no meio do formulário | NÃO OBSERVADO |
| Pedido | «Não foi possível pedir a viagem…» | verifica a ligação | INFERIDO que os pontos ficam | sim | Alterar | — |
| Procura | «Ainda à procura» | esperar ou cancelar | — | Tentar novamente | cancelar | não diz se pode fechar o browser |
| Cancelar | «Não foi possível cancelar» | tenta de novo | o motivo não foi visto a limpar-se | sim | — | não diz se a viagem continua |
| Avaliação | várias frases, uma com BETA | tenta de novo | INFERIDO | sim | Agora não | — |
| Pagamento | recusado ou estado desconhecido | instruções do banco num caso | — | INFERIDO | Continuar sem cartão noutro ramo | ramo real em PROD desconhecido |
| Reclamação | uma frase | não diz para repetir | descrição mantida no código | o botão continua | Cancelar | o sucesso aponta para reclamações que o menu não lista |
| SOS | falha ao carregar dados | não diz para ligar 112 na frase de erro; o título do painel já o disse | — | reabrir | Fechar | — |
| Conta | toast e texto | palavra-passe incorrecta é clara | INFERIDO | sim | — | alterar palavra-passe termina a sessão; isso está na frase de sucesso, OBSERVADO ANTES só no código da frase |

## V. Acessibilidade básica

- Recolha e destino: label visual ausente. INFERIDO.
- Confirmar palavra-passe na Conta: sem label visível. OBSERVADO ANTES.
- SOS: só três letras; o painel é que explica. INFERIDO.
- Estado do histórico: só cor do ponto na lista. INFERIDO.
- Gatilhos `sr-only` do motorista não são deste papel; no passageiro o header não tem ícone escondido que a pessoa deva encontrar.
- Alvos da barra: 52 px de altura. INFERIDO.
- Foco de teclado: não foi percorrido.
- A folha da Conta esconde conteúdo sem aviso. OBSERVADO ANTES.

## W. Desktop / mobile

OBSERVADO: a entrada no browser largo é um cartão estreito ao centro, com scroll da página se o cartão não couber. Nesta janela o Motorista coube até aos links legais.

INFERIDO para o passageiro com sessão:

- o mapa usa a largura toda; a barra inferior mantém-se
- a folha da conta é lateral, cerca de 85% da largura, também no largo; não passa a página inteira
- `ProfileButton` do admin usa diálogo ou sheet conforme a largura; o passageiro não monta esse ícone
- teclado no telemóvel: os campos de pesquisa pedem scroll ao focar (`scrollIntoView`); não foi visto
- Android: Google não usa a mesma página de regresso web; texto «Continuar com Google fica pendente nesta versão Android» existe se esse ramo correr. NÃO OBSERVADO no aparelho

## X. Findings UX-PAX

## UX-PAX-001 — A entrada anuncia beta mode

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO  
**O que uma pessoa vê:** `(beta mode)` junto à marca  
**Problema humano:** inglês e palavra de processo, não de serviço  
**Consequência provável:** achar que a app não é para usar a sério  
**Evidência:** ecrã de produção; chave `auth.betaMode`  
**Relacionado com:** UX-PAX-002

## UX-PAX-002 — Os quatro separadores não dizem que são portas de entrada

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO  
**O que uma pessoa vê:** Passageiro verde e três botões cinzentos, sem título  
**Problema humano:** não se percebe se está a escolher um serviço, um registo ou um login  
**Consequência provável:** tocar ao acaso ou achar que Motorista cria uma conta de motorista  
**Evidência:** grelha em `LoginScreen`; `aria-label` «Tipo de utilizador» invisível  
**Relacionado com:** UX-PAX-001

## UX-PAX-003 — A nota legal fala em criar conta no ecrã de entrar

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO  
**O que uma pessoa vê:** checkbox vazia e «Obrigatório para criar conta.» por cima de Entrar  
**Problema humano:** quem já tem conta não sabe se tem de marcar a caixa  
**Consequência provável:** marcar sem ler, ou achar que Entrar não vai funcionar  
**Evidência:** ecrã de produção; Entrar não fica inactivo com a caixa vazia  
**Relacionado com:** UX-PAX-004

## UX-PAX-004 — A palavra-passe já vem preenchida

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO  
**O que uma pessoa vê:** seis marcas no campo, antes de escrever  
**Problema humano:** não é um campo vazio; Entrar pode enviar um valor que a pessoa não escolheu  
**Consequência provável:** tentativa falhada, ou entrada inesperada se esse valor coincidir  
**Evidência:** ecrã de produção; estado inicial do campo no código  
**Relacionado com:** UX-PAX-005

## UX-PAX-005 — O telemóvel deste aparelho reaparece

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO neste browser; o valor não é o de uma pessoa nova  
**O que uma pessoa vê:** um número já escrito  
**Problema humano:** num telemóvel partilhado aparece o número de quem entrou antes  
**Consequência provável:** entrar na conta errada se a palavra-passe também estiver preenchida  
**Evidência:** campo Telemóvel nesta passagem; o código usa o último telemóvel guardado ou, se não houver, `+351`  
**Relacionado com:** UX-PAX-004

## UX-PAX-006 — Google diz v1 e só no Passageiro

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO  
**O que uma pessoa vê:** «Continuar com Google» e «Só para passageiro (v1).» no Passageiro; no Motorista o botão desaparece sem explicação  
**Problema humano:** «v1» não é linguagem de pessoa; a ausência no outro separador não é explicada  
**Consequência provável:** insistir no Google no Motorista e não o encontrar  
**Evidência:** dois ecrãs de produção  
**Relacionado com:** UX-PAX-002

## UX-PAX-007 — A versão mostra um código de build

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO  
**O que uma pessoa vê:** «Versão da aplicação», uma linha com versão e código, e texto a pedir esse identificador ao suporte  
**Problema humano:** o código não se explica sozinho  
**Consequência provável:** ignorar, ou copiar algo que não associa a um problema  
**Evidência:** rodapé do ecrã Motorista  
**Relacionado com:** —

## UX-PAX-008 — Há erros de entrada escritos para quem opera o sistema

**Superfície:** entrada, se a ligação falhar  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** frases com Alembic, migrações, `VITE_API_URL`, consola, token ou BETA  
**Problema humano:** não dizem o que fazer com o telemóvel  
**Consequência provável:** desistir ou repetir sem perceber  
**Evidência:** `auth.json`, `errors.json`, `apiErrors.ts`  
**Relacionado com:** UX-PAX-001

## UX-PAX-009 — Criar conta Google e ligar conta existente dependem de um ecrã que não foi visto

**Superfície:** onboarding Google  
**Observado/Inferred/Test:** INFERIDO; COBERTO POR TESTE  
**O que uma pessoa vê:** escolha «Criar nova conta» / «Ligar a uma conta VAMULÁ existente», depois nome e telemóvel  
**Problema humano:** o formulário de criar não mostra Voltar; fechar a janela Google não está explicado na app  
**Consequência provável:** não saber se a conta ficou criada  
**Evidência:** `GooglePassengerOnboarding.tsx`  
**Relacionado com:** UX-PAX-006

## UX-PAX-010 — Recolha e destino não têm label visível

**Superfície:** mapa do passageiro  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** placeholder «Recolha: …» e «Destino: …»  
**Problema humano:** o placeholder faz de nome do campo e desaparece ao escrever  
**Consequência provável:** não saber qual dos dois está a editar  
**Evidência:** `DestinationSearchField.tsx`; labels com classe de leitor de ecrã  
**Relacionado com:** UX-PAX-011

## UX-PAX-011 — A primeira acção da home não é uma frase de pedido

**Superfície:** mapa do passageiro  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** mapa, uma pesquisa e «Marcar recolha no mapa»  
**Problema humano:** «Pedir viagem» não é o primeiro botão  
**Consequência provável:** tocar no mapa sem perceber o passo  
**Evidência:** `PassengerDashboard` e textos `planner` / `search`  
**Relacionado com:** UX-PAX-010

## UX-PAX-012 — A procura mostra um pedaço de identificador

**Superfície:** à procura de motorista  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Pedido» e oito caracteres  
**Problema humano:** não é um número de pedido explicado  
**Consequência provável:** achar que é um código para decorar ou que algo correu mal  
**Evidência:** `TripPlannerPanel`, chave `planner.searchingTrip`  
**Relacionado com:** UX-PAX-016

## UX-PAX-013 — A espera não diz quanto falta nem se pode sair

**Superfície:** à procura de motorista  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «A procurar motorista…» e, mais tarde, que pode esperar ou cancelar  
**Problema humano:** no início não há prazo nem destino do botão de sair  
**Consequência provável:** fechar a app sem saber se o pedido continua  
**Evidência:** `statusCard` e `planner`  
**Relacionado com:** UX-PAX-012

## UX-PAX-014 — Motorista e viatura são frases genéricas

**Superfície:** viagem activa  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Motorista TVDE» e «Veículo TVDE»  
**Problema humano:** não há nome nem matrícula neste cartão  
**Consequência provável:** não saber que carro procurar  
**Evidência:** `PassengerStatusCard`; matrícula existe no painel SOS, não neste cartão  
**Relacionado com:** UX-PAX-015

## UX-PAX-015 — SOS é três letras até se abrir o painel

**Superfície:** viagem activa  
**Observado/Inferred/Test:** INFERIDO; COBERTO POR TESTE do painel  
**O que uma pessoa vê:** «SOS» pequeno; depois «Emergência» e a frase do 112  
**Problema humano:** em stress, o botão não diz ligar nem que a chamada não parte sozinha  
**Consequência provável:** não tocar, ou tocar à espera que ligue logo  
**Evidência:** `EmergencySosButton`, `EmergencySosPanel`  
**Relacionado com:** UX-PAX-014

## UX-PAX-016 — O histórico fala em coordenadas, estado cru e ID

**Superfície:** histórico e detalhe  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «38.72, -9.14» fora de duas zonas; no detalhe a palavra inglesa do estado, o estado de pagamento cru, e «ID» com o identificador completo  
**Problema humano:** não é morada nem estado em português  
**Consequência provável:** não reconhecer a viagem  
**Evidência:** `format.ts`, `PassengerHistoryDetailPanel` (`detail.status`, `payment_status`, `historyDetail.tripId`)  
**Relacionado com:** UX-PAX-012

## UX-PAX-017 — A lista de histórico não diz o estado por palavras

**Superfície:** histórico  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** um ponto colorido, um sítio e um preço ou «—»  
**Problema humano:** a cor não diz concluída ou cancelada  
**Consequência provável:** abrir todas as linhas para perceber  
**Evidência:** `PassengerSideMenu` lista  
**Relacionado com:** UX-PAX-016

## UX-PAX-018 — Reclamar está no fim do detalhe e o sucesso aponta para um sítio que o menu não tem

**Superfície:** detalhe do histórico  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** texto sublinhado só se a viagem está concluída ou cancelada; depois «Pode consultar o estado nas suas reclamações.»  
**Problema humano:** não há entrada Reclamações no menu; durante a viagem o caminho não aparece  
**Consequência provável:** não encontrar, ou guardar um código sem saber onde o ver  
**Evidência:** `PassengerHistoryDetailPanel`, `complaints.json`  
**Relacionado com:** UX-PAX-017

## UX-PAX-019 — Pagamento simulado e continuar sem cartão existem no código

**Superfície:** pagamento  
**Observado/Inferred/Test:** INFERIDO; NÃO VALIDADO VISUALMENTE em produção  
**O que uma pessoa vê:** se esse ramo abrir, «Pagamento simulado», «DEV», ou «Continuar sem cartão»  
**Problema humano:** parece teste, ou permite seguir sem perceber se vai pagar  
**Consequência provável:** desconfiança, ou achar que a viagem não se paga  
**Evidência:** `PassengerPaymentConfirmCard.tsx`  
**Relacionado com:** UX-PAX-020

## UX-PAX-020 — O preço explica-se com fórmula e taxa

**Superfície:** confirmação e detalhe  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Base … € + … €/km + … €/min», mínimo, ajuste, «Taxa de intermediação VAMULÁ»  
**Problema humano:** parece tabela interna  
**Consequência provável:** não saber qual número vai pagar  
**Evidência:** `priceFormula`, `intermediation`  
**Relacionado com:** UX-PAX-016

## UX-PAX-021 — Cancelar não diz se custa

**Superfície:** cancelamento  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** motivo e «Confirmar cancelamento»  
**Problema humano:** não há frase de custo nem de custo zero  
**Consequência provável:** medo de confirmar, ou confirmar sem saber  
**Evidência:** `cancelFlow` em `passenger.json`  
**Relacionado com:** —

## UX-PAX-022 — A caixa «Palavra-passe para confirmar» não parece um campo

**Superfície:** Conta, métodos de início de sessão  
**Observado/Inferred/Test:** OBSERVADO ANTES  
**O que uma pessoa vê:** uma faixa clara entre um aviso e o botão verde, sem nome ao lado  
**Problema humano:** o placeholder é a única pista e some ao escrever; o bordo é fino e o fundo é transparente  
**Consequência provável:** tocar em Adicionar Google sem preencher, ou não perceber que falta uma palavra-passe  
**Evidência:** passagem visual da barra Conta; `LoginMethodsSection` `Input` só com `placeholder`  
**Relacionado com:** UX-PAX-023

## UX-PAX-023 — Os métodos de entrada ficam abaixo da primeira vista da Conta

**Superfície:** Conta  
**Observado/Inferred/Test:** OBSERVADO ANTES  
**O que uma pessoa vê:** perfil e alterar palavra-passe; a secção seguinte cortada no fundo da folha  
**Problema humano:** nada diz que há mais por baixo  
**Consequência provável:** achar que a Conta acaba na palavra-passe  
**Evidência:** folha lateral em produção, antes do scroll  
**Relacionado com:** UX-PAX-022

## UX-PAX-024 — O email de teste parece copy, mas é dado da conta

**Superfície:** Conta da fixture  
**Observado/Inferred/Test:** OBSERVADO ANTES  
**O que uma pessoa vê:** `qa.identity.profile@example.com`  
**Problema humano:** neste caso o endereço é de laboratório  
**Consequência provável:** julgar que o produto mostra emails falsos; uma conta real veria o seu email no mesmo formato  
**Evidência:** passagem da fixture; o componente escreve o email que a conta tem  
**Relacionado com:** UX-PAX-022

## UX-PAX-025 — Menu repete a barra e esconde Partilhar e Definições

**Superfície:** menu  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** Histórico e Conta outra vez; QR e Definições só aqui  
**Problema humano:** duas entradas para o mesmo sítio; as outras não se descobrem pela barra  
**Consequência provável:** não encontrar o QR nem o aspecto  
**Evidência:** `PassengerSideMenu`, `PassengerBottomNav`  
**Relacionado com:** UX-PAX-026

## UX-PAX-026 — Definições incluem um tema chamado sandbox

**Superfície:** Definições  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Neon (sandbox)» e «só testes»  
**Problema humano:** opção de teste no mesmo sítio que os temas normais  
**Consequência provável:** activar um aspecto experimental sem querer  
**Evidência:** `ambianceMeta.ts`, `settings.json`  
**Relacionado com:** UX-PAX-025

## UX-PAX-027 — Modo da app não explica que é só o ecrã

**Superfície:** Definições, se a conta tiver mais do que um shell  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Modo da app» e botões com nomes de papéis  
**Problema humano:** pode achar que está a mudar quem é na conta  
**Consequência provável:** confusão ao voltar, ou à espera de funções que a conta não tem  
**Evidência:** `AppRouteModeSwitch`, `ContextSwitch`  
**Relacionado com:** UX-PAX-002

## UX-PAX-028 — A folha da viagem activa é baixa

**Superfície:** mapa com viagem  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** uma faixa no fundo, altura máxima cerca de 28% do ecrã; a procura ainda menos  
**Problema humano:** SOS, pagamento e texto podem ficar de fora sem aviso  
**Consequência provável:** não ver a acção que precisa  
**Evidência:** `MAP_SHEET_MAX_H_TRIP`, `MAP_SHEET_MAX_H_WAIT`  
**Relacionado com:** UX-PAX-015, UX-PAX-023

## UX-PAX-029 — O erro de avaliação fala em modo BETA

**Superfície:** avaliação  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** se esse erro ocorrer, uma frase sobre conta de motorista e BETA  
**Problema humano:** não ajuda a perceber a avaliação  
**Consequência provável:** achar que a app está em teste ou que fez algo errado  
**Evidência:** `passenger.json` `rating.errorForbidden`  
**Relacionado com:** UX-PAX-001

## UX-PAX-030 — Não há recuperação de palavra-passe à vista

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO que o ecrã não a mostra; INFERIDO que o código não a tem neste ecrã  
**O que uma pessoa vê:** Telemóvel, Palavra-passe, Entrar  
**Problema humano:** se erra a palavra-passe, só pode repetir  
**Consequência provável:** ficar fora  
**Evidência:** ecrã de produção; `LoginScreen`  
**Relacionado com:** UX-PAX-004
