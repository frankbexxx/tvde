# Revisão crítica dos 77 findings

Não corrige. Não redesenha. Não renumerou IDs.

Os ficheiros citados no pedido como `01_PASSENGER_FINDINGS.md`, `02_DRIVER_FINDINGS.md` e `03_PARTNER_FINDINGS.md` não estão na pasta. Os 77 IDs foram lidos em:

- `02_PASSENGER_SHARED.md`
- `03_DRIVER_PARTNER.md`
- `04_ADMIN_CROSSCUTTING.md`
- `05_MASTER_FINDINGS.md`

O código foi relido onde a formulação parecia forte demais. Um teste não passa a observação.

## 1. Resumo

| Classificação | Quantidade |
|---|---:|
| KEEP | 55 |
| MERGE | 5 |
| REFINE | 14 |
| VISUAL_VALIDATE | 3 |
| DROP | 0 |
| TOTAL | 77 |

## 2. Passageiro

```text
ID: UX-PAX-001
Classificação: KEEP
Marca actual: OBSERVADO
Finding actual: A entrada anuncia beta mode.
Análise: O texto está no ecrã, junto à marca. É um problema de linguagem, distinto da palavra-passe, do telemóvel e do código de versão.
Evidência: Entrada em produção; auth.betaMode "(beta mode)".
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-002
Classificação: KEEP
Marca actual: OBSERVADO
Finding actual: Os quatro separadores não dizem que são portas de entrada.
Análise: Os nomes vêem-se. Não há frase sobre o que cada papel faz. Não é o mesmo que o "(beta mode)": uma pessoa pode perceber a marca de teste e ainda assim não saber qual separador carregar.
Evidência: Separadores Passageiro, Motorista, Parceiro, Administrador na entrada.
Acção nesta auditoria: Mantém. Recebe, no merge, a repetição deste vazio no Administrador (UX-ADM-001).
```

```text
ID: UX-PAX-003
Classificação: KEEP
Marca actual: OBSERVADO
Finding actual: A nota legal fala em criar conta no ecrã de entrar.
Análise: A checkbox e a frase "Obrigatório para criar conta." estão por cima de Entrar. Quem já tem conta lê uma instrução de criação.
Evidência: Entrada em produção.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-004
Classificação: KEEP
Marca actual: OBSERVADO
Finding actual: A palavra-passe já vem preenchida.
Análise: Seis marcas antes de escrever. O valor inicial está no estado do ecrã de login, não só na memória deste browser. Não se repete o valor.
Evidência: Campo Palavra-passe na entrada; estado inicial no LoginScreen.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-005
Classificação: KEEP
Marca actual: OBSERVADO neste browser
Finding actual: O telemóvel deste aparelho reaparece.
Análise: O número visível é o da última sessão guardada, não o de uma pessoa nova. É outro mecanismo que o da palavra-passe.
Evidência: Campo Telemóvel com +351900000683; a chave de último telemóvel no cliente.
Acção nesta auditoria: Mantém, com a marca limitada a este browser.
```

```text
ID: UX-PAX-006
Classificação: KEEP
Marca actual: OBSERVADO
Finding actual: Google diz v1 e só no Passageiro.
Análise: O botão e a frase "Só para passageiro (v1)." aparecem no Passageiro e não nos outros separadores. O ecrã seguinte não foi aberto; isso é o UX-PAX-009, não este.
Evidência: Entrada Passageiro e Motorista na passagem anterior; Parceiro e Administrador nesta série, sem o botão.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-007
Classificação: KEEP
Marca actual: OBSERVADO
Finding actual: A versão mostra um código de build.
Análise: "v1.0.0 · 735d005" e o texto a pedir esse identificador ao suporte estão no rodapé. É dado de compilação, não um nome de versão que uma pessoa reconheça.
Evidência: Rodapé da entrada nos quatro papéis.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-008
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Há erros de entrada escritos para quem opera o sistema.
Análise: Inferência forte. As frases não estão no ecrã em repouso. Se esses erros ocorrerem, o texto mostrado inclui Alembic, migrações, VITE_API_URL, token ou BETA. Não foi visto a acontecer.
Evidência: errors.json e apiErrors no cliente de login.
Acção nesta auditoria: Mantém como inferência forte, não como ecrã observado.
```

```text
ID: UX-PAX-009
Classificação: VISUAL_VALIDATE
Marca actual: INFERIDO; COBERTO POR TESTE
Finding actual: Criar conta Google e ligar conta existente dependem de um ecrã que não foi visto.
Análise: O código tem os modos escolha, criar e ligar. O teste não abre o ecrã. O finding, como está, descreve uma lacuna da auditoria mais do que um problema já visto. Há pistas no código (sem botão de voltar no criar; "formas de entrada"), mas a clareza só se confirma ao percorrer o fluxo.
Evidência: GooglePassengerOnboarding; não houve clique em Continuar com Google.
Acção nesta auditoria: Não tratar ainda como problema confirmado.
Validar visualmente: No Passageiro, Continuar com Google até à escolha, a criar conta e a ligar conta. Ver se há volta, se as duas opções se distinguem, e se alguma palavra técnica aparece. Não concluir a criação nem a ligação.
```

```text
ID: UX-PAX-010
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Recolha e destino não têm label visível.
Análise: Inferência forte. O nome do campo é o placeholder. Não depende de densidade: não há label fora da caixa. A percepção de "parece texto" é outro finding, o da palavra-passe de confirmação, e esse foi visto.
Evidência: Campos de recolha e destino do passageiro.
Acção nesta auditoria: Mantém. Recebe o mesmo padrão nas viaturas (UX-PTN-007).
```

```text
ID: UX-PAX-011
Classificação: VISUAL_VALIDATE
Marca actual: INFERIDO
Finding actual: A primeira acção da home não é uma frase de pedido.
Análise: O código monta mapa e pesquisa. Se a primeira coisa que a pessoa percebe é "pedir viagem" depende do que cabe no ecrã e da frase visível. Não foi aberto.
Evidência: Home do passageiro no código; NÃO OBSERVADO.
Acção nesta auditoria: Hipótese até se ver a home.
Validar visualmente: Abrir a home do passageiro, sem pedir viagem. Registar a primeira frase e o primeiro controlo visíveis, em browser largo e estreito.
```

```text
ID: UX-PAX-012
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: A procura mostra um pedaço de identificador.
Análise: Inferência forte. A linha é "Pedido" mais oito caracteres do identificador. Não é um nome de sítio nem um número explicado.
Evidência: Texto do estado de procura no passageiro.
Acção nesta auditoria: Mantém. Não funde com o histórico: aqui a pessoa ainda está à espera.
```

```text
ID: UX-PAX-013
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: A espera não diz quanto falta nem se pode sair.
Análise: A frase principal encontrada é "À procura de motorista" / "A procurar…". Não há duração nessa frase. O finding junta isso com "mais tarde pode esperar ou cancelar", o que mistura dois momentos. A ausência de tempo está sustentada. O que a pessoa pode fazer a seguir não ficou fechado nesta releitura.
Evidência: passenger.json, chaves searching.
Acção nesta auditoria: Estreitar o finding.
Formulação revista: Durante a procura, a frase visível não diz quanto tempo falta. Se existe cancelar, e se está à vista, não ficou demonstrado por essa frase.
```

```text
ID: UX-PAX-014
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Motorista e viatura são frases genéricas.
Análise: Inferência forte. O texto previsto é "Motorista TVDE" e "Veículo TVDE", não o nome nem a matrícula. Só aparece se a viagem chegar a esse estado; o texto em si não depende do layout.
Evidência: Cópias do estado de viagem do passageiro.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-015
Classificação: REFINE
Marca actual: INFERIDO; COBERTO POR TESTE do painel
Finding actual: SOS é três letras até se abrir o painel.
Análise: O rótulo do botão é "SOS". Isso está no código e no teste do painel, que explica 112 depois de abrir. A palavra "pequeno" e o alvo de toque não foram medidos no ecrã. O problema sustentado é o rótulo, não o tamanho.
Evidência: Botão SOS nos estados assigned, accepted, arriving, ongoing.
Acção nesta auditoria: Tirar a afirmação de tamanho.
Formulação revista: Até abrir, o controlo chama-se SOS. O painel é que diz Emergência e que o 112 não é automático. O tamanho do botão não foi visto.
```

```text
ID: UX-PAX-016
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: O histórico fala em coordenadas, estado cru e ID.
Análise: Inferência forte no detalhe. Fora de duas zonas, a função devolve latitude e longitude com duas casas. O detalhe mostra a palavra inglesa do estado, o estado de pagamento e o identificador completo. É outro sítio que a lista (UX-PAX-017).
Evidência: formatPickup / formatDestination; PassengerHistoryDetailPanel.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-017
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: A lista de histórico não diz o estado por palavras.
Análise: Inferência forte. A linha do menu usa um ponto de cor e não o nome do estado. A cor não é a única informação da linha (há sítio e preço), mas o estado em si não está escrito.
Evidência: PassengerSideMenu, historyStatusDotColor, sem rótulo de estado na linha.
Acção nesta auditoria: Mantém, separado do detalhe.
```

```text
ID: UX-PAX-018
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Reclamar está no fim do detalhe e o sucesso aponta para um sítio que o menu não tem.
Análise: Inferência forte. O link só entra se a viagem está concluída ou cancelada. A frase de sucesso manda consultar as reclamações. O menu do passageiro não tem essa lista.
Evidência: Detalhe do histórico; entradas do menu do passageiro.
Acção nesta auditoria: Mantém. O admin que mostra estados crus da reclamação é outro problema (UX-ADM-006).
```

```text
ID: UX-PAX-019
Classificação: REFINE
Marca actual: INFERIDO; NÃO VALIDADO VISUALMENTE
Finding actual: Pagamento simulado e continuar sem cartão existem no código.
Análise: Existem, mas não como ecrã único. "Pagamento simulado" entra se o segredo termina em _secret_mock ou se VITE_STRIPE_MOCK é verdadeiro. "Continuar sem cartão" entra se não há chave publicável. Não há evidência de que a produção actual caia num destes ramos.
Evidência: PassengerPaymentConfirmCard.
Acção nesta auditoria: Deixar de os tratar como o que a pessoa vê por omissão.
Formulação revista: Há ramos que mostram pagamento simulado ou continuar sem cartão. Só aparecem com segredo de teste ou sem chave Stripe. Não está demonstrado que a produção os mostre.
```

```text
ID: UX-PAX-020
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: O preço explica-se com fórmula e taxa.
Análise: Inferência forte. A pessoa vê base, valor por km, valor por minuto e a taxa de intermediação. É linguagem de cálculo, não um total só.
Evidência: Textos de preço do passageiro.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-021
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Cancelar não diz se custa.
Análise: Inferência forte. Há motivo e confirmar. Não há frase de custo nem do que fica da viagem. O motorista tem o mesmo vazio, noutro papel; entra aqui por merge, sem apagar a frase de rede desse lado.
Evidência: Textos de cancelamento do passageiro.
Acção nesta auditoria: Mantém. Recebe UX-DRV-017.
```

```text
ID: UX-PAX-022
Classificação: KEEP
Marca actual: OBSERVADO ANTES
Finding actual: A caixa "Palavra-passe para confirmar" não parece um campo.
Análise: Foi vista na Conta do passageiro: faixa sem label, só placeholder. Não é o mesmo problema que os métodos ficarem abaixo (UX-PAX-023): uma coisa é a caixa não se reconhecer; a outra é não se ver que há mais conteúdo.
Evidência: LoginMethodsSection; fumo visual anterior da Conta.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-023
Classificação: KEEP
Marca actual: OBSERVADO ANTES
Finding actual: Os métodos de entrada ficam abaixo da primeira vista da Conta.
Análise: Na folha do passageiro, o perfil e a palavra-passe cabiam; a secção seguinte ficava cortada, sem pista. O nome do caminho nos outros papéis é outro finding.
Evidência: Fumo visual da Conta pelo menu do passageiro.
Acção nesta auditoria: Mantém. Recebe a repetição do scroll no parceiro (UX-PTN-013), guardando à parte o nome "Perfil".
```

```text
ID: UX-PAX-024
Classificação: KEEP
Marca actual: OBSERVADO ANTES
Finding actual: O email de teste parece copy, mas é dado da conta.
Análise: O endereço visto é o da conta de teste usada nesse fumo, não uma frase do produto. Continua válido como aviso de leitura: aquele ecrã mostrava um email que parece de laboratório porque a conta é de laboratório.
Evidência: Conta do passageiro no fumo anterior.
Acção nesta auditoria: Mantém com essa limitação. Não generalizar a todas as contas.
```

```text
ID: UX-PAX-025
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: Menu repete a barra e esconde Partilhar e Definições.
Análise: Histórico e Conta estão na barra e no menu. Partilhar e Definições estão no menu. "Esconde" é forte: estão um nível abaixo, não ausentes. Se a pessoa descobre o menu não foi visto.
Evidência: Barra e PassengerSideMenu.
Acção nesta auditoria: Corrigir o verbo.
Formulação revista: Histórico e Conta aparecem na barra e outra vez no menu. Partilhar e Definições só estão no menu. Não está visto se o menu se descobre sem indicação.
```

```text
ID: UX-PAX-026
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Definições incluem um tema chamado sandbox.
Análise: Inferência forte. A opção visível inclui "Neon (sandbox)" e a nota de testes. Está na lista de temas dos papéis que abrem aparência.
Evidência: AMBIANCE_THEME_OPTIONS; textos de aparência.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PAX-027
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Modo da app não explica que é só o ecrã.
Análise: Inferência forte. O título é "Modo da app" e os botões são nomes de papéis. O código diz que a troca não altera User.role. Essa frase não está no ecrã. O bloco só monta se a sessão tem mais do que um shell.
Evidência: AppRouteModeSwitch; comentário em ContextSwitch.
Acção nesta auditoria: Mantém. Não é o mesmo que os caminhos diferentes da Conta.
```

```text
ID: UX-PAX-028
Classificação: VISUAL_VALIDATE
Marca actual: INFERIDO
Finding actual: A folha da viagem activa é baixa.
Análise: Existe um tecto de altura, cerca de 28% do ecrã. Isso não prova que a acção seguinte fica fora. Depende do conteúdo e da altura da janela.
Evidência: MAP_SHEET_MAX_H_TRIP. A viagem não foi aberta.
Acção nesta auditoria: Hipótese de layout. Cobre também a faixa do motorista (UX-DRV-009).
Validar visualmente: Com uma viagem activa de passageiro e outra de motorista, ver se a acção principal e o SOS cabem na primeira vista, sem scroll, em janela alta e em janela baixa. Não avançar a viagem.
```

```text
ID: UX-PAX-029
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: O erro de avaliação fala em modo BETA.
Análise: Inferência forte quanto ao texto, fraca quanto à frequência. A frase existe para esse erro. Não está no ecrã em repouso. Não foi disparada.
Evidência: Texto de erro de avaliação no passageiro.
Acção nesta auditoria: Mantém como texto que a pessoa pode receber, não como ecrã visto.
```

```text
ID: UX-PAX-030
Classificação: KEEP
Marca actual: OBSERVADO que o ecrã não a mostra
Finding actual: Não há recuperação de palavra-passe à vista.
Análise: Na entrada não há link de recuperação. A procura no cliente não achou "esqueci" nem "recuperar palavra-passe" no login. O "recuperar" do admin é recuperar motorista, outra acção.
Evidência: Entrada dos quatro papéis; ausência no ecrã de login.
Acção nesta auditoria: Mantém.
```

## 3. Motorista

```text
ID: UX-DRV-001
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: A home tem dois gestos para ficar disponível.
Análise: O problema existe, mas o que a pessoa vê foi descrito pelo botão longo "Offline — tocar para disponível". No layout que está activo (barra inferior sempre ligada, mapa em palco), esse botão longo não é o controlo do mapa. Há um botão redondo com a palavra visível "offline" e, por cima, a pastilha "Toca no mapa para ficares disponível". Os dois disparam a mesma ida a disponível. A pastilha está marcada aria-hidden. O comentário no código que diz que a pílula longa fica só em mock não corresponde aos dois ramos, que devolvem a mesma pílula; essa pílula longa está noutros ramos, não no palco actual.
Evidência: isDriverBottomNavEnabled true; isDriverHomeTwoStepEnabled false; DriverMapAvailabilityMicroToggle; mapTapHint; DriverDashboard por volta das linhas 1826 e 1998.
Acção nesta auditoria: Reescrever o que está no ecrã.
Formulação revista: No mapa do motorista, offline, há um botão redondo com a palavra "offline" e uma pastilha "Toca no mapa para ficares disponível". Os dois tornam a pessoa disponível. A frase completa do estado está no nome acessível do botão, não como texto visível do controlo longo.
```

```text
ID: UX-DRV-002
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Vários bloqueios não têm passo dentro da app.
Análise: Inferência forte. Viatura inactiva, sem viatura e documentos da viatura dizem para pedir ao parceiro. Não há botão para essa pessoa. Distinto de UX-DRV-003, que é o caminho dos documentos do próprio motorista.
Evidência: Textos availability / mapHome no driver.json.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-DRV-003
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Documentos em falta apontam para o menu; a viatura não separa o problema.
Análise: Inferência forte. "Menu → Documentos" é um passo. A frase da viatura junta em falta, caducada ou rejeitada. A pessoa não fica a saber qual dos três.
Evidência: docsMissingBody e vehicleDocumentsBlocked.
Acção nesta auditoria: Mantém, separado do "pede ao parceiro".
```

```text
ID: UX-DRV-004
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: O repouso tanto bloqueia como diz que não bloqueia.
Análise: Os dois textos não aparecem juntos. Se blocked, a frase impede ficar disponível. Se não, e limit_reached, a frase diz que se pode continuar e que o bloqueio automático está desligado até validação legal. Há ainda um terceiro ramo, de aviso, com duração. Tratar isto como contradição no mesmo ecrã é excessivo. O ramo de limite continua com linguagem de enforcement e validação legal. Essa frase está escrita como estado do produto, não como erro de dois blocos sobrepostos.
Evidência: DriverDashboard, condição drivingCompliance.blocked e depois limit_reached; driver.json drivingHoursBlockedBody e drivingHoursLimitBody.
Acção nesta auditoria: Separar os ramos.
Formulação revista: O repouso bloqueado e o limite são ecrãs alternativos. No limite, a pessoa lê que pode continuar e que o bloqueio automático está desligado até validação legal. Não há evidência de as duas frases aparecerem ao mesmo tempo.
```

```text
ID: UX-DRV-005
Classificação: KEEP
Marca actual: INFERIDO; COBERTO POR TESTE do botão
Finding actual: Silenciar não diz que a oferta continua noutro sítio.
Análise: Inferência forte no significado. O botão diz "Silenciar". Recusar é outra acção, com motivo. Silenciar tira a oferta da vista e guarda-a em Ofertas silenciadas. O teste confirma o botão, não o ecrã. O tamanho (cerca de 28 px no código) não foi visto; não é preciso para o problema da palavra.
Evidência: RequestCard; requestCard.silence; menu de ofertas silenciadas.
Acção nesta auditoria: Mantém o problema da palavra. Não afirmar o tamanho como visto.
```

```text
ID: UX-DRV-006
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: A oferta mistura estimativa, payout e um relógio.
Análise: Estimativa indicativa e "Expira em Ns" estão no cartão. "Parte motorista (payout)" só entra se a linha de dinheiro a enviar. Dizer que os três aparecem sempre é forte demais. A palavra payout, quando aparece, continua a ser o problema.
Evidência: requestCard.estimate, expiresIn; historyMoney.driverPayout condicional.
Acção nesta auditoria: Separar o que é certo do que é condicional.
Formulação revista: A oferta mostra uma estimativa marcada como indicativa e um tempo a expirar. A parte do motorista, com a palavra payout, só entra quando esses dados vêm. Não está demonstrado que os três estejam sempre visíveis.
```

```text
ID: UX-DRV-007
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Rendimentos avisam que a parte do motorista pode não vir.
Análise: Inferência forte. A introdução soma o preço final e diz que a parte do motorista aparece "quando a API envia payout". Preço da viagem e dinheiro da pessoa ficam na mesma explicação, com a palavra API.
Evidência: opsMenu.earnings.intro.
Acção nesta auditoria: Mantém. A estimativa curta do menu é outro ecrã (UX-DRV-014).
```

```text
ID: UX-DRV-008
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: A navegação pode abrir outra app sozinha.
Análise: A preferência diz que abrir a app ao aceitar é a omissão. O erro, se a app não abre, manda confirmar que está instalada. Não há frase de como voltar. A consequência "perder o passo Cheguei" não está demonstrada: depende de a app externa abrir e de a pessoa não regressar. Isso é fluxo, não texto.
Evidência: opsMenu.nav; actions.navOpenFailed.
Acção nesta auditoria: Ficar no que o texto diz.
Formulação revista: A preferência diz que a app de mapas pode abrir ao aceitar. Se não abre, a mensagem pede para confirmar que está instalada. Não há frase sobre voltar a esta app. Não está visto se isso acontece nem se o passo seguinte se perde.
```

```text
ID: UX-DRV-009
Classificação: MERGE
Marca actual: INFERIDO
Finding actual: A faixa da viagem é baixa para as acções.
Análise: É o mesmo tecto de altura e a mesma hipótese de a acção ficar fora da primeira vista. O papel muda; o problema humano não. SOS e Cheguei continuam a ser o que há a procurar na validação do finding principal.
Evidência: O mesmo MAP_SHEET_MAX_H_TRIP.
Acção nesta auditoria: Fundir.
Fundir com: UX-PAX-028
```

```text
ID: UX-DRV-010
Classificação: KEEP
Marca actual: INFERIDO; o painel de detalhe foi OBSERVADO ANTES no passageiro
Finding actual: Perfil e Conta (detalhe) mostram a mesma pessoa duas vezes.
Análise: Inferência forte no caminho do motorista. O resumo mostra nome, telemóvel e papel. O botão abre o mesmo painel de Conta. São dois sítios. O scroll dos métodos já está em UX-PAX-023 e não é este problema.
Evidência: Ecrã Perfil do menu do motorista; AccountPanel.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-DRV-011
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: O código da conta no perfil não é um nome.
Análise: Inferência forte. "Conta · " e oito caracteres do identificador de sessão. Não explica para que serve. É outra linha que a duplicação dos ecrãs.
Evidência: accountRef no menu do motorista.
Acção nesta auditoria: Mantém, separado de UX-DRV-010.
```

```text
ID: UX-DRV-012
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Zonas falam em v1, ID, custom e OSRM.
Análise: Inferência forte. O título é "Mudança de zona (v1)". Há "Escreve ID manual", "zona custom", "OSRM" e "Fallback". Não depende de se ver a quebra de linha.
Evidência: opsMenu.zones.
Acção nesta auditoria: Mantém. Categorias são outro texto (UX-DRV-013).
```

```text
ID: UX-DRV-013
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Categorias explicam o servidor, não o que a pessoa deixa de ver.
Análise: Inferência forte. A introdução diz que sincroniza com o servidor, fala em "pet" legacy e em matching. Não diz, em linguagem de pedidos, o que deixa de aparecer.
Evidência: opsMenu.categories.intro.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-DRV-014
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: A estimativa não diz o que o motorista recebe.
Análise: Inferência forte. O corpo são duas frases: estimativa para o passageiro e preço final no fim. Não fala da parte do motorista. UX-DRV-007 é o ecrã de rendimentos, que fala e fá-lo com "API".
Evidência: opsMenu.pricing.body.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-DRV-015
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Registo de atividade não parece definições.
Análise: Inferência forte. A linha do menu e a da caixa disparam o diálogo de definições. O ícone desse diálogo no header está em sr-only neste shell. O destino não tem o nome Definições.
Evidência: DRIVER_OPEN_ACTIVITY_LOG_EVENT; SettingsButton no contentor sr-only.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-DRV-016
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: Documentos prometem um painel admin e um interruptor de diagnóstico.
Análise: "Abrir painel admin" só monta se a sessão é admin. O interruptor e "Só visível em DEV" só montam com import.meta.env.DEV. Um motorista em produção não vê esses dois. Vê a frase de que os documentos são validados no servidor. O finding atribui à produção controlos que o código esconde.
Evidência: DriverDashboard, blocos isAdmin e import.meta.env.DEV; gateProdHint.
Acção nesta auditoria: Limitar ao que a produção monta.
Formulação revista: Em produção, para quem não é admin, Documentos não mostra o interruptor nem "Abrir painel admin". Mostra que os documentos obrigatórios são validados no servidor antes de ficar disponível.
```

```text
ID: UX-DRV-017
Classificação: MERGE
Marca actual: INFERIDO
Finding actual: Cancelar não diz o efeito.
Análise: É o mesmo vazio do passageiro: motivo e confirmar, sem custo e sem o que fica da viagem. A frase de rede "tenta de novo" não diz se a viagem continua; essa frase fica registada no merge, não desaparece.
Evidência: actions.cancelTitle e actions.networkError no motorista.
Acção nesta auditoria: Fundir.
Fundir com: UX-PAX-021
```

## 4. Parceiro / Frota

```text
ID: UX-PTN-001
Classificação: MERGE
Marca actual: OBSERVADO
Finding actual: A entrada do Parceiro repete o cartão de laboratório.
Análise: É o mesmo cartão já registado: beta mode, criar conta, telemóvel, palavra-passe, versão. Não acrescenta um problema humano novo. A ausência de explicação do papel já está em UX-PAX-002. A ausência de Google já está em UX-PAX-006.
Evidência: Entrada /partner nesta série.
Acção nesta auditoria: Fundir.
Fundir com: UX-PAX-001
```

```text
ID: UX-PTN-002
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: A receita avisa que não é payout Stripe.
Análise: Inferência forte. A frase está na home e nos relatórios. Stripe e payout não dizem o que o euro é. Não é o mesmo ecrã que os rendimentos do motorista.
Evidência: home.dashboard.revenueHint e reports.revenueHint.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PTN-003
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Adicionar motorista fala em frota Default e UUIDs.
Análise: Inferência forte. O texto diz associar alguém da frota Default e "sem UUIDs manuais". Não diz criar nem convidar. O admin que pede um UUID para criar frota é outro formulário (UX-ADM-010).
Evidência: fleet.discoverHint e fleet.discoverSearchHint.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PTN-004
Classificação: KEEP
Marca actual: INFERIDO; COBERTO POR TESTE de estrutura
Finding actual: A ficha da viagem mostra identificadores em vez de nomes.
Análise: Inferência forte. O título é o identificador completo. Passageiro e motorista saem em mono. O teste não substitui ver a página; o que é escrito não depende do layout.
Evidência: PartnerTripDetail, trip.trip_id, passenger_id, driver_id.
Acção nesta auditoria: Mantém. A lista de oito caracteres é o finding seguinte, não este.
```

```text
ID: UX-PTN-005
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: A lista de viagens abre com oito caracteres.
Análise: Inferência forte. A linha é o prefixo e um estado traduzido. O estado em português não torna o código reconhecível. É a lista, não a ficha.
Evidência: PartnerTripsSection e PartnerTripsSummaryScreen.
Acção nesta auditoria: Mantém, separado de UX-PTN-004.
```

```text
ID: UX-PTN-006
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: O mapa explica a legenda como implementação.
Análise: Inferência forte. "número = link detalhe" e "GPS antigo (>15 min)" descrevem o mecanismo. Não depende de se a legenda cabe no ecrã: o texto é esse.
Evidência: fleet.legendPickup e fleet.legendOfflineStale.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PTN-007
Classificação: MERGE
Marca actual: INFERIDO
Finding actual: Os campos da viatura usam o placeholder como nome.
Análise: É o mesmo problema de UX-PAX-010: o nome está dentro da caixa e sai ao escrever. Os campos são matrícula, marca, modelo, ano, cor e lugares. Fundir não apaga essa lista.
Evidência: Placeholders em PartnerVehiclesScreen.
Acção nesta auditoria: Fundir.
Fundir com: UX-PAX-010
```

```text
ID: UX-PTN-008
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Rejeitar documento não mostra um motivo para a outra pessoa.
Análise: Inferência forte. O parceiro tem Aprovar, Rejeitar e uma nota marcada como interna. Do lado do motorista, o estado é "Rejeitado" e o passo é contactar a frota. Não há campo de motivo visível para o motorista neste mapa. O admin que não decide é outro ecrã (UX-ADM-009).
Evidência: driverDetail.internalNote; estado rejected no motorista.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PTN-009
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: O alerta manda a viaturas, não à matrícula.
Análise: Inferência forte. Há contagem e "Ver viaturas". Há um passo. Não há matrícula na frase curta. Não é "só diz que há problema": diz o tipo e o sítio, e omite qual viatura.
Evidência: home.vehicleDocsAlert.
Acção nesta auditoria: Mantém, mais estreito do que o título antigo sugeria, mas o texto do finding já dizia isto.
```

```text
ID: UX-PTN-010
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Remover da frota fala na frota por defeito da plataforma.
Análise: Inferência forte. A pergunta de confirmação existe. Diz que a pessoa volta para a frota por defeito da plataforma. Não diz o que isso muda no trabalho do dia seguinte.
Evidência: driverDetail.removeConfirm.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PTN-011
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Exportar fala em CSV, UTF-8 e colunas.
Análise: Inferência forte. O botão e as notas usam CSV, UTF-8 e "colunas". É o vocabulário do ficheiro, não do resumo que está no ecrã.
Evidência: trips.exportHint e reports.csvColumnsPrefix.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PTN-012
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Voltar da viagem não volta à lista.
Análise: Inferência forte de navegação. O link de voltar aponta para /partner. Não é uma hipótese de scroll.
Evidência: PartnerTripDetail, Link to="/partner".
Acção nesta auditoria: Mantém.
```

```text
ID: UX-PTN-013
Classificação: REFINE
Marca actual: INFERIDO no caminho; painel OBSERVADO ANTES no passageiro
Finding actual: A Conta do parceiro é a mesma folha já vista, com o mesmo scroll.
Análise: O scroll e a caixa sem label já estão em UX-PAX-023 e UX-PAX-022. Repeti-los como finding do parceiro duplica o problema. O que é próprio deste papel é a entrada se chamar Perfil. O cartão duplicado de nome foi retirado deste ecrã no código; o finding não deve continuar a tratar o parceiro como o duplo ecrã do motorista.
Evidência: PartnerProfileScreen; menu Perfil.
Acção nesta auditoria: Deixar aqui só o nome do caminho. O scroll fica no finding já visto.
Formulação revista: No parceiro, a Conta abre por uma entrada chamada Perfil. Não há, neste ecrã, o resumo e o botão "Conta (detalhe)" do motorista. O scroll dos métodos é o já visto no passageiro.
```

```text
ID: UX-PTN-014
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: A caixa não diz se a mensagem é para um motorista ou para todos.
Análise: O botão é "Aviso à frota", o envio é "Enviar à frota" e o sucesso é "Aviso enviado a toda a frota." O envio manda driver_user_id nulo. O aviso a uma pessoa está na ficha, com outro botão. A consequência "avisar a pessoa errada" não está sustentada por um formulário sem destinatário: o destinatário escrito é a frota. "Toda" só aparece depois do envio.
Evidência: PartnerMessagesSection; partner.json messages.fleetNotice, sendToFleet, broadcastSent.
Acção nesta auditoria: Tirar a ambiguidade que o texto já fecha, e ficar no que só aparece no sucesso.
Formulação revista: Na caixa, antes de enviar, os controlos dizem "à frota". "Toda a frota" aparece na frase de sucesso. Não há neste formulário escolha de um motorista; essa escolha está na ficha.
```

## 5. Admin

```text
ID: UX-ADM-001
Classificação: MERGE
Marca actual: OBSERVADO
Finding actual: A entrada de Administrador é o mesmo cartão, sem dizer quem entra.
Análise: O cartão é o de UX-PAX-001. "Quem entra" é o de UX-PAX-002. Não há problema humano adicional no texto. A discrepância entre a árvore (Administrador seleccionado) e a imagem (Parceiro ainda verde) fica nas inconsistências, não como finding próprio: não se concluiu que o produto tenha o separador errado.
Evidência: Entrada /admin; auth igual à dos outros papéis.
Acção nesta auditoria: Fundir.
Fundir com: UX-PAX-001
```

```text
ID: UX-ADM-002
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: Dois andares de navegação e o texto aponta para "tabs abaixo".
Análise: Os dois andares existem: cinco grupos e as tabs do grupo. Pessoas abre em Pendentes. Agora e Frota repetem o nome nos dois andares. "Em cinco segundos não sabe" não está sustentado sem ver o ecrã. A frase "Usa as tabs abaixo para agir" está no código de Agora e é imprecisa em relação aos dois andares.
Evidência: adminNavGroups.ts; AdminTabAgora.
Acção nesta auditoria: Ficar na estrutura e na frase, sem o teste dos cinco segundos.
Formulação revista: O painel tem grupos e, por baixo, as tabs desse grupo. Agora e Frota usam o mesmo nome nos dois níveis. Pessoas abre em Pendentes. O texto de Agora diz para usar as tabs abaixo.
```

```text
ID: UX-ADM-003
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: A sessão anuncia JWT, super_admin, cron, CSV e .env.
Análise: Inferência forte. Com sessão, a linha "Sessão (JWT):" está acima das tabs. Se o papel não é super_admin, a frase seguinte lista timeouts, CSV, cron e .env.
Evidência: AdminDashboard, bloco do token.
Acção nesta auditoria: Mantém. O resultado do cron é outro ecrã (UX-ADM-012).
```

```text
ID: UX-ADM-004
Classificação: KEEP
Marca actual: INFERIDO; COBERTO POR TESTE do bloco
Finding actual: Os números de Agora vêm com API, stuck, UTC e SP-D.
Análise: Inferência forte. "Saúde API", o estado cru, "stuck", "hoje (UTC)" e "SP-D" estão no JSX. O teste não os torna vistos. O relógio diferente das métricas é o UX-ADM-014, depois de revisto.
Evidência: AdminTabAgora.tsx.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-ADM-005
Classificação: KEEP
Marca actual: INFERIDO; COBERTO POR TESTE do detalhe
Finding actual: A viagem mostra o estado em inglês e ferramentas Stripe.
Análise: Inferência forte. A lista escreve o estado cru. Há "Forçar arriving", links Stripe test/live e "PI mock/teste". Não é o mesmo que o cartão de Agora.
Evidência: AdminTabTrips.tsx.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-ADM-006
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: A reclamação lista estados crus e pede um UUID de admin.
Análise: Inferência forte. A linha mostra a referência e received / under_review / awaiting_info / resolved / closed. Há "Atribuição (UUID admin, opcional)". O procedimento mostra from_status e to_status. O passageiro não achar a lista é UX-PAX-018.
Evidência: AdminTabComplaints.tsx; complaints.json assignHint.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-ADM-007
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Aprovar um pendente é um toque, com o papel em inglês.
Análise: Inferência forte. A linha tem telefone e requested_role. O botão Aprovar chama a acção sem diálogo neste componente. Não há Rejeitar neste ecrã. Utilizadores, com confirmação, é outro finding.
Evidência: AdminTabPending.tsx; handleApprove.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-ADM-008
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Eliminar e repor senha falam em BD, hash e uma palavra de código.
Análise: Inferência forte. O texto cita SP-F, super_admin, BD, hash e LIMPAR_SENHA. Há confirmação. A confirmação é que está escrita para quem mexe na base. Não é o toque único dos pendentes.
Evidência: AdminTabUsers.tsx.
Acção nesta auditoria: Mantém, separado de UX-ADM-007.
```

```text
ID: UX-ADM-009
Classificação: KEEP
Marca actual: INFERIDO; COBERTO POR TESTE da lista
Finding actual: Documentos estão em inglês e dizem que aqui não se decide.
Análise: Inferência forte. "Drivers pending/rejected", "Approved/valid", doc_key, stored_status e a frase read-only / KYC estão no ecrã. Não há aprovar aqui. O parceiro é quem rejeita; isso fica em UX-PTN-008.
Evidência: AdminTabDocs.tsx.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-ADM-010
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Criar frota pede UUID e chama Parceiro de "separador Frota".
Análise: Inferência forte. O passo 2 pede partner_id e um UUID. O telefone diz "login OTP". A introdução diz que o gestor entra no separador Frota. A entrada vista chama-se Parceiro e pede palavra-passe. Não é o texto "sem UUIDs" do parceiro.
Evidência: AdminTabFrota.tsx.
Acção nesta auditoria: Mantém, separado de UX-PTN-003.
```

```text
ID: UX-ADM-011
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Saúde explica o que fazer em linguagem de cron, JSON e BD.
Análise: Inferência forte. Os três passos citam estados ingleses, cron, UUID, JSON, Stripe, webhook e base de dados. É o guião, não o resultado de carregar em cron.
Evidência: adminHealthAnomalyPlaybooks.ts.
Acção nesta auditoria: Mantém, separado de UX-ADM-012.
```

```text
ID: UX-ADM-012
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Operações devolve status, milissegundos e JSON.
Análise: Inferência forte. Depois de correr o cron, a linha é status, duration_ms, error_count, request_id, e um JSON se houver erros. Há também .env e UUID manual. Não diz, nessa linha, o que mudou para uma viagem ou um motorista.
Evidência: AdminTabOps.tsx.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-ADM-013
Classificação: KEEP
Marca actual: INFERIDO
Finding actual: Dados apresenta-se como lista de IDs para copiar.
Análise: Inferência forte. O parágrafo diz "IDs essenciais" e a pesquisa diz UUID. Cada linha mostra role, status e o identificador, com Copiar. Secções "Users" e "Partners".
Evidência: AdminTabDados.tsx.
Acção nesta auditoria: Mantém. Não funde com a criação de frota: aqui a pessoa é apresentada como identificador.
```

```text
ID: UX-ADM-014
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: "Hoje" e "Weekly report" não dizem o mesmo relógio.
Análise: Os rótulos diferem: Agora diz "hoje (UTC)"; Métricas diz "Concluídas hoje" sem fuso; a tabela chama-se "Weekly report". Não foi verificado se os números usam fusos diferentes. Afirmar que não são o mesmo dia é mais do que os rótulos provam.
Evidência: AdminTabAgora; AdminTabMetrics.
Acção nesta auditoria: Ficar nos rótulos.
Formulação revista: Um aviso diz "hoje (UTC)", as métricas dizem "Concluídas hoje" sem fuso, e a tabela chama-se "Weekly report". Não está demonstrado que os cálculos usem relógios diferentes.
```

```text
ID: UX-ADM-015
Classificação: KEEP
Marca actual: INFERIDO no admin; painel OBSERVADO ANTES no passageiro
Finding actual: Conta e Definições do admin estão no header; nos outros papéis não.
Análise: Inferência forte no caminho. A rota admin usa o header completo, com Conta e Definições. Passageiro, motorista e parceiro usam o header compacto, sem esses ícones. A Conta do passageiro está na barra; a do motorista em Perfil e depois Conta (detalhe); a do parceiro em Perfil. Não é o problema do scroll, já visto. A ausência de terminar sessão dentro do painel foi deixada de fora de propósito no código da Conta; este finding não a trata como defeito.
Evidência: routes/index.tsx, variante default contra userCompact.
Acção nesta auditoria: Mantém.
```

```text
ID: UX-ADM-016
Classificação: REFINE
Marca actual: INFERIDO
Finding actual: O aviso de Saúde é um ponto sem palavra.
Análise: A tab já se chama Saúde. O ponto extra não tem texto e está aria-hidden. A frase "Há anomalias ou avisos na Saúde" está no title do rato. Dizer que não há palavra nenhuma é excessivo. Dizer que a anomalia, por si, só tem cor, está no código. Se isso se percebe no telemóvel não foi visto; a ausência de texto no ponto não depende disso.
Evidência: AdminDashboard, healthDot.
Acção nesta auditoria: Não dizer que a tab está muda.
Formulação revista: A tab chama-se Saúde. O sinal de anomalia é um ponto vermelho sem texto. A frase está no title do rato, não no ponto.
```

## 6. Merges propostos

| Finding principal | Findings a fundir | Razão |
|---|---|---|
| UX-PAX-001 | UX-PTN-001, UX-ADM-001 | O mesmo cartão de entrada. A explicação em falta dos papéis fica em UX-PAX-002. O Google fica em UX-PAX-006. |
| UX-PAX-010 | UX-PTN-007 | O nome do campo é o placeholder. Inclui recolha e destino, e na viatura matrícula, marca, modelo, ano, cor e lugares. |
| UX-PAX-021 | UX-DRV-017 | Cancelar pede motivo e confirmar, sem dizer custo nem o que fica. No motorista, o erro de rede também não diz se a viagem continua. |
| UX-PAX-023 | UX-PTN-013, só a parte do scroll | Os métodos abaixo da primeira vista já foram vistos na Conta. No parceiro fica, revisto, apenas a entrada chamada Perfil. |
| UX-PAX-028 | UX-DRV-009 | O mesmo tecto de altura da folha. A validação visual tem de incluir os dois papéis. |

UX-PTN-013 não desaparece por inteiro: a classificação é REFINE, e só a parte do scroll se considera já coberta. Não entra na coluna "a fundir" como ID extinto.

## 7. Findings que exigem validação visual

| ID | Papel | Superfície | O que temos de verificar visualmente |
|---|---|---|---|
| UX-PAX-009 | Passageiro | Continuar com Google | Escolha, criar e ligar: se há volta, se as opções se distinguem, se aparece linguagem técnica. Não concluir. |
| UX-PAX-011 | Passageiro | Home | Primeira frase e primeiro controlo, em janela larga e estreita, sem pedir viagem. |
| UX-PAX-028 | Passageiro e motorista | Viagem activa | Se a acção principal e o SOS cabem sem scroll. Inclui o que estava em UX-DRV-009. Não avançar a viagem. |

São 3 IDs com esta classificação. Os REFINE não entram nesta tabela.

## 8. Findings que poderiam desaparecer

Nenhum finding tem evidência suficiente para ser eliminado nesta passagem.

Os que estavam fortes demais foram estreitos, não retirados. O caso mais perto de cair foi UX-PTN-014: os botões já dizem frota. Sobrou uma diferença real entre "à frota" antes de enviar e "toda a frota" só no sucesso.

## 9. Controlo final

- Foram analisados os 77 IDs, de UX-PAX-001 a 030, UX-DRV-001 a 017, UX-PTN-001 a 014 e UX-ADM-001 a 016.
- Nenhum ID ficou sem classificação.
- 55 + 5 + 14 + 3 + 0 = 77.
- Nenhum ficheiro do produto foi alterado.
- Nenhum dos relatórios 00 a 05 foi modificado.
- Não foram propostas soluções de UI.
- Não foi feita implementação.
- Repo alterado: NÃO.

### Discrepâncias registadas, não corrigidas

- O pedido nomeia `01_PASSENGER_FINDINGS.md`, `02_DRIVER_FINDINGS.md` e `03_PARTNER_FINDINGS.md`. Na pasta estão `02_PASSENGER_SHARED.md` e `03_DRIVER_PARTNER.md`. Os IDs coincidem com o consolidado de `05_MASTER_FINDINGS.md`.
- Na entrada `/admin`, a árvore de acessibilidade marcava Administrador e a imagem do mesmo instante ainda mostrava Parceiro preenchido. Não se clicou. Não se criou finding novo.
- UX-DRV-001 descrevia o botão longo. No palco activo o controlo visível é o botão redondo e a pastilha. O comentário no código sobre a pílula "só em mock" não corresponde aos dois ramos da função, que devolvem a mesma pílula.
- UX-DRV-004 tratava dois ramos exclusivos como se estivessem no mesmo ecrã.
- UX-DRV-016 atribuía a um motorista de produção o interruptor DEV e "Abrir painel admin", que o código não monta nesse caso.
- UX-PTN-014 dizia que a caixa não indicava o destinatário. Os controlos dizem "à frota".
