# Auditoria profunda — Admin e transversal

Sem correcções. Sem ranking. Sem soluções.

## Método

| Marca | Significado |
|---|---|
| OBSERVADO | Visto nesta passagem, sem submeter e sem entrar |
| OBSERVADO ANTES | Visto nas passagens de entrada ou da Conta do passageiro |
| INFERIDO | Código e textos. Não é experiência validada |
| COBERTO POR TESTE | Teste de componente. Não substitui o ecrã |
| NÃO OBSERVADO | Não houve sessão dentro do painel |

Não houve login de administrador. Não houve aprovação, bloqueio, cron, exportação nem escrita.

---

## A. Admin — entrada

OBSERVADO nesta passagem, URL `/admin`.

A árvore de acessibilidade marca o separador **Administrador**. Não há botão Google. O resto do cartão é o mesmo dos outros papéis: `(beta mode)`, checkbox «Obrigatório para criar conta.», telemóvel já escrito neste browser, palavra-passe com seis marcas, versão `v1.0.0 · 735d005`, CACCL e CNIACC. Nada no cartão diz o que este papel faz, nem que não é para criar uma conta de cliente. A imagem do mesmo instante ainda mostra o botão **Parceiro** preenchido a verde; a árvore diz Administrador. Não se clicou em Entrar.

Erro de login: NÃO OBSERVADO. Textos de erro de sistema (Alembic, token, API) estão no código partilhado da entrada. INFERIDO. Ver UX-PAX-008.

## B. Admin — estrutura

NÃO OBSERVADO. INFERIDO. COBERTO POR TESTE em `adminNavGroups.test.ts` (mapa de grupos, não o ecrã).

Cinco grupos: Agora, Viagens, Pessoas, Frota, Sistema. Onze tabs: Agora; Viagens e Reclamações; Pendentes, Utilizadores e Documentos; Frota; Saúde, Operações, Métricas e Dados.

O grupo e a tab com o mesmo nome (Agora, Frota) parecem a mesma coisa. Pessoas abre por omissão em Pendentes, não em Utilizadores. Sistema abre em Saúde. O texto de Agora diz «Usa as tabs abaixo para agir», mas as tabs estão por baixo dos grupos, não por baixo desse texto de forma óbvia para quem não conhece a grelha.

A coluna do painel é estreita (`max-w-2xl`). Os botões fazem quebra de linha (`flex-wrap`), por isso o scroll horizontal não é o desenho; a altura sim. O ponto vermelho em Saúde não tem texto; o aviso está no `title` do rato. Em cinco segundos, no código, há dois andares de navegação e onze nomes. Não foi visto se cabem no primeiro ecrã de um telemóvel.

O header deste caminho é o completo: Conta e Definições no topo. Passageiro, Motorista e Parceiro usam o header compacto, sem esses ícones. INFERIDO a partir da rota.

## C. Admin — Agora

NÃO OBSERVADO. INFERIDO. COBERTO POR TESTE em `AdminTabAgora.rtl.test.tsx`.

Título «Estado agora». Botão «Atualizar». Sucesso: «Dados atualizados.» Erro: «Não foi possível atualizar.» sem dizer o que fazer a seguir, além do banner geral «Tentar novamente» do painel.

Números: viagens activas, pendentes de aprovação, motoristas disponíveis, em curso. Sem período no cartão, excepto o alerta «zero viagens criadas hoje (UTC)». «Saúde API» mostra o estado cru (`ok`, `degraded` ou um traço) e «linha(s) de anomalia». «Pagamentos presos (stuck)». Se houver linhas, o texto cita «SP-D». Os cartões levam a Viagens, Pendentes ou Métricas. Há também botões Ir para Viagens, Saúde, Operações, Documentos, Métricas. Não há nomes de pessoas neste ecrã. Há vocabulário de sistema.

## D. Admin — Viagens

NÃO OBSERVADO. INFERIDO. COBERTO POR TESTE em `AdminTabTrips.rtl.test.tsx`.

A lista mostra oito caracteres, reticências, e a palavra inglesa do estado (`accepted`, `arriving`, …). O detalhe mostra o identificador completo em mono. Acções: «Forçar arriving», «Forçar ongoing», atribuir, cancelar, «Alinhar pagamento (Stripe)», links «Stripe (test)» e «Stripe (live)», «PI mock/teste — sem link Stripe.», «Payment intent de teste/mock». O título de um botão explica o estado API. Pagamento usa um rótulo, não a chave crua, na linha «Pagamento:». Passageiro, motorista e parceiro neste mapa não foram lidos como nomes neste excerto; o identificador da viagem é o título. Reclamação relacionada: não há, neste excerto, um salto da viagem para a reclamação.

## E. Admin — Reclamações

NÃO OBSERVADO. INFERIDO.

Lista: referência em mono, e na mesma linha o estado, a categoria e a origem crus (`received`, `under_review`, `awaiting_info`, `resolved`, `closed`). Filtro «Estado» com esses valores. Detalhe: a mesma referência, selector do estado seguinte que mostra o estado actual cru, resolução em texto, «Guardar», procedimento com `from_status → to_status`. «Atribuição (UUID admin, opcional)». Formulário «Nova reclamação externa» com origem, referência, datas, nome, email, telefone, «Importar». Anexos só depois de criar. Erro: «Erro ao carregar ou actualizar.» Vazio de selecção: «Seleccione uma reclamação.»

Um operador vê uma referência e palavras inglesas. O problema (descrição) está no detalhe, não na linha. Quem está envolvido depende de campos preenchidos. O próximo passo é mudar um estado cujo nome não está em português. O que já foi feito está numa linha de procedimento com estados crus.

## F. Admin — Pendentes e Utilizadores

NÃO OBSERVADO. INFERIDO.

Pendentes: telefone e `requested_role` cru. Um botão «Aprovar» sem pergunta, sem motivo e sem rejeitar neste ecrã. Vazio: «Nenhum utilizador pendente.» Erro de aprovar: «Erro ao aprovar».

Utilizadores: filtro «Nome, telefone, papel…». Introdução: «SP-F», «Eliminar conta», «Bloquear seleccionados», «super_admin», «na BD», «motivo de auditoria (prompt ao confirmar)». Bloquear pede confirmação. Eliminar pede confirmação. «Palavra-passe (login BETA)»: «remove o hash», confirmar com a palavra `LIMPAR_SENHA` e um motivo de pelo menos dez caracteres. Papel que não é super_admin vê que não pode repor. Há promover, despromover, rasto de auditoria por pessoa. A consequência de eliminar está no nome do botão; o texto à volta é de base de dados.

## G. Admin — Documentos

NÃO OBSERVADO. INFERIDO. COBERTO POR TESTE em `AdminTabDocs.rtl.test.tsx`.

«Supervisão read-only dos documentos canónicos (Partner gere KYC). Sem aprovação, upload ou edição neste ecrã.»

Alertas em inglês: «Drivers docs expirados», «Drivers pending/rejected», «Vehicles docs expirados», «Vehicles a expirar», «Vehicles inactive». Filtros: «Drivers + Vehicles», «Pending», «Rejected», «Missing», «Approved/valid», rótulo «Partner». Cada documento mostra `doc_key` em mono e `stored_status` cru, mais data `AAAA-MM-DD` e selos «expirado» / «a expirar». O cartão do motorista mostra nome ou telefone, «status driver:» cru, e «Partner:» nome ou identificador. O da viatura mostra matrícula, «status:», «worst docs:».

Sabe-se de quem é, se houver nome. Não se vê por que foi rejeitado, nem quem decidiu, nem o que acontece a seguir: o ecrã diz que não se aprova aqui.

## H. Admin — Frota

NÃO OBSERVADO. INFERIDO.

Título «Frota (parceiros)». «Cria uma organização e depois o gestor que inicia sessão na app no separador Frota». O separador de entrada chama-se Parceiro, não Frota. Passo 2: «cola um UUID existente», label «ID da organização (partner_id)», placeholder de UUID, «Telefone (login OTP)» embora a entrada vista seja palavra-passe. Passo 3: «sem UUIDs manuais», e um botão «Modo manual» / «Modo select». Listas por nome e telefone quando o modo é select.

## I. Admin — Saúde

NÃO OBSERVADO. INFERIDO.

«Status:» com a palavra do sistema. Títulos «Viagens accepted há muito» e equivalentes em inglês de estado. Cada bloco pode expandir «O que é · O que fazer». Os três passos falam em `accepted`, `arriving`, `ongoing`, «Forçar arriving», cron, `/cron/jobs`, UUID, JSON, Stripe, webhook, PaymentIntent, «nota ops», «BD», `trip_id`, «logs», «fix no motor de preços». O botão diz «Ir para Operações (cron / recuperar)». É texto de diagnóstico para quem opera o sistema, com um verbo humano no meio.

## J. Admin — Operações

NÃO OBSERVADO. INFERIDO.

«Cron (admin-only)», «Correr cron agora». O resultado escreve `status=`, `duration_ms=`, `error_count=`, `request_id=` e, se falhar, um bloco JSON. «Requer sessão super_admin (mesma regra que na API).» «Validar .env», colar ficheiro, «Mostrar para editar». Reconciliar pagamentos, Stripe, fechar sem PaymentIntent, pré-visualização. «Recuperar motorista» com «UUID manual» e placeholder `driver_id (UUID)`. Repouso com «User ID do motorista (UUID)». Exportar. Fase 0 mostra `ENV=`, `ENVIRONMENT=`, `request_id=`, «STRIPE_WEBHOOK_SECRET set».

A linha do topo do painel, visível em qualquer tab com sessão: «Sessão (JWT):» e o papel; se não for super_admin, a frase sobre timeouts, CSV, cron e `.env`.

Não há, nestes rótulos, um desfazer. Há estados de «a correr». A confirmação de cada botão perigoso não foi lida como diálogo em todos; vários estão só desactivados sem ser super_admin, com o motivo no `title` do rato.

## K. Admin — Métricas e Dados

NÃO OBSERVADO. INFERIDO.

Métricas: viagens ativas, disponíveis, ocupados, à espera, em viagem, concluídas hoje, totais criadas/aceites/concluídas. «Hoje» aqui não repete «UTC»; em Agora, o zero de viagens diz UTC. «Weekly report» em inglês, semana em `AAAA-MM-DD`. «Carregar uso...». Sem export neste ecrã; o CSV está nas operações, condicionado a super_admin.

Dados: «IDs essenciais para operar o sistema — com botão de copiar.» Pesquisa «nome/telefone/UUID». Secções «Users» e «Partners». Cada linha: nome, telefone, `role` · `status` crus, identificador mono, «Copiar». Há aprovar e rejeitar motorista neste separador, além de Pendentes.

## L. Admin — Conta e Definições

NÃO OBSERVADO neste papel. O painel é o `AccountPanel` já visto no passageiro (OBSERVADO ANTES). No admin o gatilho está no header (botão Conta), não numa barra inferior nem em Menu → Perfil. Definições também estão no header. O painel do admin inclui ainda `AppRouteModeSwitch` («Modo da app») por cima dos grupos. Passageiro e motorista escondem o ícone de definições no header compacto e voltam a abri-lo pelo menu. Parceiro entra na Conta por Menu → Perfil. A mesma pessoa não vê o mesmo sítio nem o mesmo nome.

Logout: o `ProfileButton` do header inclui «Sair» quando o modo beta está activo. INFERIDO. Os outros papéis têm «Sair» no menu. A Conta canónica em si não tem botão de terminar sessão (isso ficou de fora de propósito no código; a pessoa pode vê-lo no header do admin e no menu dos outros).

Scroll dos métodos e a caixa «Palavra-passe para confirmar» sem label: iguais. Ver UX-PAX-022 e UX-PAX-023.

---

## M. Transversal — entrada

| | Passageiro | Motorista | Parceiro | Administrador |
|---|---|---|---|---|
| Cartão | OBSERVADO | OBSERVADO ANTES | OBSERVADO | OBSERVADO |
| `(beta mode)` | sim | sim | sim | sim |
| Google | sim, com «v1» | não | não | não |
| «Obrigatório para criar conta.» | sim | sim | sim | sim |
| Telemóvel e palavra-passe já escritos neste browser | sim | sim | sim | sim |
| Versão e código | sim | sim | sim | sim |
| Quem deve usar | não está escrito | idem | idem | idem |
| Erro de credenciais | NÃO OBSERVADO | NÃO OBSERVADO | NÃO OBSERVADO | NÃO OBSERVADO |
| Recuperar palavra-passe | não está no ecrã | não está | não está | não está |

Comum: UX-PAX-001 a 005, 007, 030. Específico: Google só no passageiro (UX-PAX-006). Administrador não se distingue no cartão (UX-ADM-001).

## N. Transversal — Conta

A mesma pessoa, se tiver mais do que um papel, entra por sítios diferentes: barra «Conta» (passageiro), Menu → Perfil → «Conta (detalhe)» (motorista), Menu → Perfil (parceiro), header «Conta» (admin). O miolo é o mesmo painel: nome, telefone só de leitura, papel, palavra-passe, métodos. O papel aparece como uma palavra. Não há uma frase «esta é a mesma conta nos outros ecrãs». O motorista ainda mostra um resumo e um código «Conta · » antes do detalhe. Métodos ficam abaixo da primeira vista da folha. Não há terminar sessão dentro do painel; há «Sair» noutros sítios, conforme o papel.

## O. Transversal — navegação

| Padrão | Onde |
|---|---|
| Barra inferior | Passageiro e Motorista. Parceiro tem barra Frota. Admin não tem |
| Menu lateral em folha | Passageiro, Motorista, Parceiro |
| Header com Conta e Definições | Só Admin (e qualquer rota que não seja os três shells) |
| Dois nomes para a mesma Conta | Conta, Perfil, Conta (detalhe) |
| Rendimentos e Caixa | Barra e menu do motorista |
| Frota | Barra, menu e hub do parceiro; grupo e tab do admin; o texto do admin diz «separador Frota» para o login, que se chama Parceiro |
| Voltar que não volta à lista | Detalhe de viagem do parceiro vai a `/partner` |
| Grupos e tabs | Só admin; o grupo escolhe uma tab por omissão |
| Troca de papel | «Modo da app» nas definições e no topo do admin |

## P. Transversal — formulários

| Padrão | Onde aparece | Papéis | IDs |
|---|---|---|---|
| Placeholder como única pista | Recolha e destino; viatura; avisos; pesquisa de motorista; confirmar palavra-passe | Passageiro, Motorista, Parceiro, e a Conta nos quatro | UX-PAX-010, UX-PAX-022, UX-PTN-007, UX-PTN-013, UX-DRV-010 |
| Campo que parece texto | Confirmar palavra-passe | Os quatro, no mesmo painel | UX-PAX-022 |
| Palavra-passe já preenchida | Entrada | Os quatro | UX-PAX-004 |
| Telemóvel lembrado | Entrada | Os quatro | UX-PAX-005 |
| Pedir um UUID | Frota admin, operações, zonas do motorista, adicionar motorista (para dizer que não se pede) | Motorista, Parceiro, Admin | UX-DRV-012, UX-PTN-003, UX-ADM-010, UX-ADM-012 |
| Estado cru num selector | Reclamações, documentos admin | Admin | UX-ADM-006, UX-ADM-009 |
| Aprovar sem confirmar | Pendentes | Admin | UX-ADM-007 |
| Confirmar com uma palavra de código | Limpar senha | Admin | UX-ADM-008 |
| Upload com regras de tipo | Documentos do motorista | Motorista | UX-DRV-016 |
| Label visível e campo | Nome da organização, gestor, telefone na frota admin; muitos filtros admin | Admin | — |

## Q. Transversal — CTAs

| Padrão | Onde aparece | Problema humano | IDs |
|---|---|---|---|
| Primário verde «Entrar» | Os quatro | Não diz o papel | UX-PAX-002, UX-ADM-001 |
| Dois gestos, uma função | Disponibilidade do motorista | Qual é o gesto | UX-DRV-001 |
| Pequeno e fácil de confundir com fechar | Silenciar oferta | Não é recusar | UX-DRV-005 |
| Três letras | SOS | Não diz emergência até abrir | UX-PAX-015 |
| Abaixo da faixa | Viagem activa | A acção seguinte pode não se ver | UX-PAX-028, UX-DRV-009 |
| Abaixo da folha | Métodos de entrada | Não há pista de que há mais | UX-PAX-023 |
| Destrutivo com pergunta | Remover da frota; bloquear e eliminar no admin | A pergunta do admin está em linguagem de BD | UX-PTN-010, UX-ADM-008 |
| Destrutivo sem pergunta | Aprovar pendente | Um toque decide | UX-ADM-007 |
| Verbo de sistema | Forçar arriving, cron, alinhar Stripe, importar | Não é a língua do resto da app | UX-ADM-005, UX-ADM-012 |
| Mesma função, outro nome | Conta / Perfil / Conta (detalhe) | Não parece o mesmo sítio | UX-DRV-010, UX-PTN-013 |

## R. Transversal — linguagem técnica

| Texto | Onde | Classe |
|---|---|---|
| `(beta mode)`, BETA no menu e na avaliação e na senha admin | Entrada OBSERVADO; resto INFERIDO | user-facing |
| `v1` no Google e nas zonas | Passageiro OBSERVADO no Google; zonas INFERIDO | user-facing |
| Código de build | Entrada, os quatro, OBSERVADO | user-facing |
| JWT, super_admin, API, .env, cron, BD, hash, LIMPAR_SENHA, SP-F, SP-D | Admin | user-facing inferido |
| UUID, partner_id, driver_id, trip_id, user id | Admin, parceiro, motorista, passageiro | user-facing inferido, excepto a entrada |
| payout, Stripe, PaymentIntent, webhook | Motorista, parceiro, admin | user-facing inferido |
| OSRM, fallback, custom, legacy, matching | Motorista | user-facing inferido |
| sandbox no tema Neon | Definições | user-facing inferido |
| UTF-8, CSV | Parceiro e admin (export) | user-facing inferido |
| stored_status, doc_key, requested_role, status inglês | Admin documentos, pendentes, viagens, reclamações | user-facing inferido |
| payment_status com rótulo «Pagamento:» | Admin viagens; passageiro no detalhe cru | user-facing inferido |
| Coordenadas | Histórico passageiro e motorista | user-facing inferido |
| DEV, Seed, Auto-trip | Documentos e definições em desenvolvimento | dev-only no interruptor; a frase «Abrir painel admin» é user-facing inferido no motorista |
| KYC, read-only, canónicos | Documentos admin | user-facing inferido |
| stuck, degraded, UTC | Agora | user-facing inferido |
| JSON de erros de cron | Operações | user-facing inferido |
| Token, Alembic, VITE_API_URL | Erros de entrada | user-facing inferido; não vistos a acontecer |

## S. Transversal — erros e recuperação

| Padrão | Onde | IDs |
|---|---|---|
| Diz o que falhou e pede para tentar outra vez, sem o passo | Atualizar Agora; caixa; upload; recusar oferta | UX-ADM-003, UX-DRV-005 |
| Retry visível | Banner do admin; vários «Atualizar» | UX-ADM-003 |
| Retry ausente ou só «recarrega a página» | Viagem do motorista; navegação externa | UX-DRV-008, UX-DRV-009 |
| Estado ambíguo depois da falha | Cancelar; silenciar; repouso com dois textos | UX-DRV-004, UX-DRV-017, UX-PAX-021 |
| Dados que podem ficar no campo | INFERIDO em formulários que não limpam no erro | — |
| Destrutivo sem confirmação | Aprovar pendente | UX-ADM-007 |
| Destrutivo com confirmação em código | Bloquear, eliminar, limpar senha, remover da frota | UX-ADM-008, UX-PTN-010 |
| Rede deixa dúvida | Cancelar e viagem | UX-DRV-017, UX-PAX-021 |
| Mensagem para quem opera o sistema | Saúde, operações, erros de entrada, documentos admin | UX-ADM-011, UX-ADM-012, UX-PAX-008 |
| Sem recuperação de palavra-passe na entrada | Os quatro | UX-PAX-030 |
| Próximo passo fora da app | Bloqueio de viatura: «pede ao Partner» | UX-DRV-002 |

## T. Transversal — primeira vista

Acções que o código coloca fora da primeira vista, sem uma frase «há mais em baixo»:

| Superfície | O que pode ficar fora |
|---|---|
| Conta | Métodos de entrada, Adicionar Google, confirmar palavra-passe |
| Viagem activa | Cheguei, Iniciar, Terminar, SOS |
| Pedido do passageiro | Confirmação na folha alta; a espera é uma faixa baixa |
| Documentos | Enviar, e no admin a lista depois dos filtros |
| Menus | Sair, Definições, zonas |
| Frota | Passos 2 e 3 do admin; fichas do parceiro |
| Admin | Tabs que quebram linha; playbooks fechados; resultado de cron |
| Definições | Temas abaixo; registo de atividade não parece este ecrã |

## U. Transversal — dados que a pessoa vê e tem de interpretar

Identificador completo ou oito caracteres: histórico do passageiro, viagem do motorista, listas e detalhe do parceiro, viagens e reclamações e dados do admin, «Conta · » no perfil do motorista. Coordenadas no histórico. Estados ingleses. `doc_key`. Papel cru. Códigos de build. Nomes Stripe, OSRM, JWT, partner_id. Não se decide aqui o que tirar.

## V. Transversal — duplicações

| Duplicação | Tipo |
|---|---|
| Conta no passageiro, Perfil + Conta (detalhe) no motorista, Perfil no parceiro, Conta no header do admin | Confusa: o mesmo painel, nomes e caminhos diferentes |
| Barra e menu com Histórico, Rendimentos, Caixa, Frota | Pode ser intencional (atalho); a pessoa vê duas entradas sem frase |
| Definições no header (admin) e no menu (outros); registo de atividade abre o mesmo diálogo | Confusa |
| Modo da app no admin e nas definições | Repetido |
| Palavra-passe na Conta e «repor palavra-passe BETA» nos utilizadores admin | Dois sítios, linguagens diferentes |
| Documentos no motorista, no parceiro e no admin | Três sítios; o admin diz que não decide |
| Aprovar em Pendentes e em Dados | Dois sítios no admin |
| Frota do parceiro e Frota do admin | Dois produtos com o mesmo nome |
| Estados de documento traduzidos no motorista e crus no admin | A mesma coisa, duas línguas |

## W. Transversal — língua

| Conceito | Termos encontrados | Papéis | Finding |
|---|---|---|---|
| Entrada na conta da pessoa | Conta, Perfil, Conta (detalhe) | Todos | UX-PAX-023, UX-DRV-010, UX-PTN-013, UX-ADM-015 |
| Organização | Parceiro, Partner, Frota, frota Default, plataforma | Parceiro, Admin, Motorista | UX-PTN-003, UX-PTN-010, UX-ADM-010 |
| Quem conduz | Motorista, Driver, driver | Todos no admin em inglês; pt nos outros | UX-ADM-009 |
| Dinheiro | Receita, preço final, parte motorista, payout, comissão, Stripe | Motorista, Parceiro, Admin | UX-DRV-007, UX-PTN-002, UX-ADM-005 |
| Serviço | Pedido, viagem, oferta | Todos | UX-PAX-012, UX-DRV-005 |
| Estado | Estado, status, accepted, pending, rejected | Admin sobretudo | UX-ADM-005, UX-ADM-006, UX-ADM-009 |
| Identificador | ID, UUID, referência, código de versão | Todos | UX-PAX-007, UX-PAX-016, UX-ADM-013 |

## X. Transversal — ecrã largo, estreito, Android

OBSERVADO: cartão de entrada estreito e centrado no browser largo, nos quatro papéis, com scroll da página até aos links legais.

INFERIDO: passageiro e motorista são mapa em largura toda e barra em baixo. Parceiro é coluna. Admin é coluna `max-w-2xl` dentro de um shell mais largo no desktop. Folhas laterais a 85% da largura, máximo 26 rem. Teclado: não percorrido. Google: botão web só no passageiro; o caminho nativo difere e não foi visto. Ficheiros: documentos do motorista. Navegação externa: Waze ou Maps ao aceitar, por omissão. Não houve aparelho Oppo nesta passagem.

## Y. Acessibilidade (admin e cruzamento)

- Ponto de Saúde sem texto, só cor e `title`.
- Silenciar com altura baixa (já em UX-DRV-005).
- Placeholders como label (tabela P).
- Resultados de cron em `pre` / JSON.
- Muitos botões de admin com altura mínima 44 px; o ponto e o silenciar não.
- Foco de teclado: não percorrido.

---

## Z. Findings Admin

## UX-ADM-001 — A entrada de Administrador é o mesmo cartão, sem dizer quem entra

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO  
**O que uma pessoa vê:** URL de admin, separador Administrador na árvore, sem Google, com `(beta mode)`, «criar conta», telemóvel e palavra-passe já escritos, código de versão  
**Problema humano:** nada distingue este papel de um cliente, além do nome do separador  
**Consequência provável:** um operador trata o ecrã como registo, ou um cliente escolhe Administrador  
**Evidência:** produção `/admin`; a imagem do mesmo instante ainda mostra o botão Parceiro preenchido  
**Relacionado com:** UX-PAX-001, UX-PAX-002, UX-PTN-001

## UX-ADM-002 — Dois andares de navegação e o texto aponta para «tabs abaixo»

**Superfície:** painel  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** Agora, Viagens, Pessoas, Frota, Sistema, e por baixo as tabs do grupo  
**Problema humano:** Agora e Frota existem nos dois andares; Pessoas não abre em Utilizadores; o texto de Agora fala em tabs  
**Consequência provável:** não saber em cinco segundos onde tratar uma reclamação ou um documento  
**Evidência:** `adminNavGroups.ts`, `AdminTabAgora` «Usa as tabs abaixo para agir»  
**Relacionado com:** UX-ADM-001

## UX-ADM-003 — A sessão anuncia JWT, super_admin, cron, CSV e .env

**Superfície:** topo de qualquer tab  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Sessão (JWT):» e o papel; se não for super_admin, a lista de acções exigidas  
**Problema humano:** é a primeira frase de sistema depois de entrar  
**Consequência provável:** achar que o painel não é para si, ou ignorar o aviso e carregar em botões mortos  
**Evidência:** `AdminDashboard.tsx` linha da sessão  
**Relacionado com:** UX-ADM-012

## UX-ADM-004 — Os números de Agora vêm com API, stuck, UTC e SP-D

**Superfície:** Agora  
**Observado/Inferred/Test:** INFERIDO; COBERTO POR TESTE do bloco  
**O que uma pessoa vê:** «Saúde API», estado cru, «linha(s) de anomalia», «Pagamentos presos (stuck)», «hoje (UTC)», «SP-D»  
**Problema humano:** o número não diz o período de forma estável, e o alerta não está em língua de operação  
**Consequência provável:** abrir Saúde sem saber o que o número mediu  
**Evidência:** `AdminTabAgora.tsx`  
**Relacionado com:** UX-ADM-011, UX-PTN-002

## UX-ADM-005 — A viagem mostra o estado em inglês e ferramentas Stripe

**Superfície:** Viagens  
**Observado/Inferred/Test:** INFERIDO; COBERTO POR TESTE do detalhe  
**O que uma pessoa vê:** oito caracteres e `accepted`, identificador completo, «Forçar arriving», «Stripe (test)», «PI mock/teste»  
**Problema humano:** o estado e o pagamento pedem vocabulário de implementação  
**Consequência provável:** forçar um passo ou abrir o dashboard errado  
**Evidência:** `AdminTabTrips.tsx`  
**Relacionado com:** UX-PAX-016, UX-PTN-004

## UX-ADM-006 — A reclamação lista estados crus e pede um UUID de admin

**Superfície:** Reclamações  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** referência mono, `received` / `under_review`, «Atribuição (UUID admin, opcional)», procedimento `from → to`  
**Problema humano:** a linha não diz o problema em português; o próximo estado é uma palavra inglesa  
**Consequência provável:** guardar um estado sem perceber o que a pessoa que reclamou passa a ver  
**Evidência:** `AdminTabComplaints.tsx`, `complaints.json` `assignHint`  
**Relacionado com:** UX-PAX-018

## UX-ADM-007 — Aprovar um pendente é um toque, com o papel em inglês

**Superfície:** Pendentes  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** telefone, `requested_role`, botão «Aprovar»  
**Problema humano:** não há nome, não há pergunta, não há rejeitar neste ecrã  
**Consequência provável:** aprovar a pessoa errada  
**Evidência:** `AdminTabPending.tsx`, `handleApprove`  
**Relacionado com:** UX-ADM-008

## UX-ADM-008 — Eliminar e repor senha falam em BD, hash e uma palavra de código

**Superfície:** Utilizadores  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «SP-F», «super_admin», «na BD», «login BETA», «remove o hash», `LIMPAR_SENHA`  
**Problema humano:** a confirmação existe, mas está escrita para quem mexe na base  
**Consequência provável:** não perceber o que a pessoa fica sem conseguir fazer amanhã  
**Evidência:** `AdminTabUsers.tsx`  
**Relacionado com:** UX-ADM-003, UX-PAX-030

## UX-ADM-009 — Documentos estão em inglês e dizem que aqui não se decide

**Superfície:** Documentos  
**Observado/Inferred/Test:** INFERIDO; COBERTO POR TESTE da lista  
**O que uma pessoa vê:** «Drivers pending/rejected», «Approved/valid», `doc_key`, `stored_status`, «Partner gere KYC», «read-only»  
**Problema humano:** não há motivo, nem quem decidiu, nem botão seguinte  
**Consequência provável:** sair à procura do parceiro sem saber qual documento falhou  
**Evidência:** `AdminTabDocs.tsx`  
**Relacionado com:** UX-DRV-003, UX-PTN-008

## UX-ADM-010 — Criar frota pede UUID e chama Parceiro de «separador Frota»

**Superfície:** Frota  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «ID da organização (partner_id)», placeholder de UUID, «login OTP», «separador Frota»  
**Problema humano:** o login visto chama-se Parceiro e pede palavra-passe, não OTP  
**Consequência provável:** colar um identificador ou indicar o separador errado ao gestor  
**Evidência:** `AdminTabFrota.tsx`  
**Relacionado com:** UX-PTN-003, UX-ADM-001

## UX-ADM-011 — Saúde explica o que fazer em linguagem de cron, JSON e BD

**Superfície:** Saúde  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «O que é · O que fazer (3 passos)» com accepted, cron, UUID, webhook, «não alteres a BD»  
**Problema humano:** o guião é de diagnóstico técnico  
**Consequência provável:** seguir um passo que aponta para outro ecrã cheio dos mesmos termos  
**Evidência:** `adminHealthAnomalyPlaybooks.ts`  
**Relacionado com:** UX-ADM-004, UX-ADM-012

## UX-ADM-012 — Operações devolve status, milissegundos e JSON

**Superfície:** Operações  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Correr cron agora», `duration_ms`, `request_id`, `.env`, «UUID manual», Stripe  
**Problema humano:** o resultado não é uma frase do que mudou para as pessoas na rua  
**Consequência provável:** não saber se a viagem ou o motorista ficaram diferentes  
**Evidência:** `AdminTabOps.tsx`  
**Relacionado com:** UX-ADM-003, UX-ADM-011

## UX-ADM-013 — Dados apresenta-se como lista de IDs para copiar

**Superfície:** Dados  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «IDs essenciais», pesquisa por UUID, `role` · `status`, identificador mono, «Copiar», secções «Users» e «Partners»  
**Problema humano:** a pessoa é um identificador  
**Consequência provável:** copiar o código errado para a frota  
**Evidência:** `AdminTabDados.tsx`  
**Relacionado com:** UX-ADM-010, UX-PTN-004

## UX-ADM-014 — «Hoje» e «Weekly report» não dizem o mesmo relógio

**Superfície:** Métricas e Agora  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Concluídas hoje» sem fuso; noutro cartão «hoje (UTC)»; tabela «Weekly report»  
**Problema humano:** o período não está na mesma língua nem no mesmo relógio  
**Consequência provável:** comparar dois números que não são o mesmo dia  
**Evidência:** `AdminTabMetrics.tsx`, alerta UTC em Agora  
**Relacionado com:** UX-ADM-004, UX-PTN-002

## UX-ADM-015 — Conta e Definições do admin estão no header; nos outros papéis não

**Superfície:** header e Conta  
**Observado/Inferred/Test:** INFERIDO no admin; o painel foi OBSERVADO ANTES no passageiro  
**O que uma pessoa vê:** ícones no topo neste papel; nos outros, menu ou barra, com nomes Conta ou Perfil  
**Problema humano:** a mesma conta não tem o mesmo caminho nem o mesmo nome  
**Consequência provável:** procurar métodos de entrada no sítio do outro papel e não os achar  
**Evidência:** `routes/index.tsx` variante `default` vs `userCompact`; `AccountPanel`  
**Relacionado com:** UX-PAX-023, UX-DRV-010, UX-PTN-013

## UX-ADM-016 — O aviso de Saúde é um ponto sem palavra

**Superfície:** tab Saúde  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** um círculo vermelho; a frase está no título do rato  
**Problema humano:** no telemóvel não há rato; a cor é o estado  
**Consequência provável:** não abrir Saúde  
**Evidência:** `AdminDashboard.tsx` `healthDot`, `aria-hidden`  
**Relacionado com:** UX-ADM-004
