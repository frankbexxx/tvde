# Auditoria profunda — Motorista e Parceiro

Sem correcções. Sem ranking.

## Método

| Marca | Significado |
|---|---|
| OBSERVADO | Visto nesta passagem, sem submeter formulários e sem entrar |
| OBSERVADO ANTES | Visto na passagem da entrada Motorista, no mesmo endereço de produção |
| INFERIDO | Código e textos pt. Não é experiência validada |
| COBERTO POR TESTE | Teste de componente. Não substitui o ecrã |
| NÃO OBSERVADO | Não houve sessão dentro do shell |

Não houve login. Não houve viagem, pagamento, disponibilidade, upload nem mensagem.

---

## A. Driver entrada / home

Entrada Motorista: OBSERVADO ANTES. Igual à entrada Passageiro, sem o botão Google. `(beta mode)`, checkbox «Obrigatório para criar conta.», telemóvel já preenchido neste browser, palavra-passe com seis marcas, versão com código, CACCL e CNIACC. Ver `02_PASSENGER_SHARED.md` (UX-PAX-001 a 007 e 030).

Home do motorista: NÃO OBSERVADO. INFERIDO.

O código monta mapa, header compacto (marca, hora, dica), barra Início · Rendimentos · Caixa · Menu, e um controlo Disponível / Offline. Textos de espera: «Estás offline.» / «Ativa a disponibilidade para receber viagens.» e, noutro sítio, «Toca no mapa para ficares disponível». Há dois gestos possíveis para a mesma coisa. Em três segundos, no código, o estado online/offline está no próprio botão («Disponível — tocar para offline» / «Offline — tocar para disponível»). Não foi visto se esse botão está no primeiro olhar ou dentro do mapa.

Badge «BETA» no cartão do menu. INFERIDO.

## B. Driver disponibilidade

NÃO OBSERVADO. INFERIDO dos textos `mapHome` e `availability`.

| Estado | O que aparece | A pessoa percebe a causa? | Percebe como resolver? | Observação |
|---|---|---|---|---|
| Documentos em falta | «Documentos em falta» e «Completa em Menu → Documentos» | sim | sim, há caminho | INFERIDO |
| Viatura inactiva | pede ao Partner para activar | sim | não há botão; depende de outra pessoa | INFERIDO |
| Sem viatura | pede ao Partner para associar | sim | idem | INFERIDO |
| Documentos da viatura | em falta, caducados ou rejeitados; pede ao Partner | a causa está junta numa frase | não separa qual dos três | INFERIDO |
| Conformidade desconhecida | «Não foi possível confirmar» | pouco | «tenta novamente» | INFERIDO |
| Aviso a expirar | «podes continuar disponível» | sim | não pede acção | INFERIDO |
| Repouso / limite | dois textos: um bloqueia; outro diz que o bloqueio automático está desligado e que se pode continuar | contraditório se os dois existirem | «dia civil, Lisboa» | INFERIDO; qual dos dois está activo em produção NÃO VALIDADO |
| Sem GPS | «Localização indisponível — a usar posição aproximada.» e «Tentar outra vez» | parcial | retry | INFERIDO |
| Sem internet | pede para recarregar a página | sim | recarregar | INFERIDO |

«Gates de conformidade de viatura desactivados (só diagnóstico).» existe no texto de disponibilidade. INFERIDO que só aparece num ramo de diagnóstico.

## C. Driver ofertas

NÃO OBSERVADO. INFERIDO. COBERTO POR TESTE em `RequestCard.rtl.test.tsx`.

O cartão tem recolha, destino, «Estimativa (indicativa)», categoria, «Expira em Ns», «Oferta expirada». Aceitar é «Deslizar para aceitar» ou o texto «ACEITAR», conforme o modo. Recusar abre motivo e «Confirmar recusa». Silenciar é um botão pequeno «Silenciar», não «Rejeitar». Silenciar tira a oferta da vista e guarda-a em Menu → Viagens → Ofertas silenciadas, com «Voltar a mostrar». Não é a mesma acção que recusar. Isso não está escrito no botão.

«Parte motorista (payout)» e «Comissão plataforma» podem aparecer na linha de dinheiro. A palavra payout está no texto.

Não foi visto som. Não foi visto se fechar o painel (há botão de fechar no painel do mapa) é silenciar, recusar ou só esconder.

## D. Driver viagem activa

NÃO OBSERVADO. INFERIDO de `ActiveTripActions` e textos `actions`.

| Momento | O que deve fazer | CTA principal | Seguinte | Se corre mal |
|---|---|---|---|---|
| Oferta aceite | ir à recolha | «Navegar até à recolha» se a preferência abrir a app | «Cheguei» | «Sem coordenadas» ou «Não foi possível abrir a navegação» |
| A caminho | confirmar no ponto | «Cheguei» | «Iniciar viagem» | se estiver longe: «Aproxima-te do ponto de recolha» |
| No ponto | começar | «Iniciar viagem» | navegação ao destino | distância em metros |
| Em viagem | seguir e fechar | «Navegar até ao destino» / «Terminar viagem» | concluída | rede: «Sem ligação…» |
| Concluída | «Viagem concluída» e continuar | continuar | — | se pagamento falhou: «Pagamento recusado — segue instruções da plataforma.» |

A preferência de navegação diz que a app externa pode abrir sozinha ao aceitar. Voltar à app não está explicado. «A sincronizar estado da viagem… Se persistir, recarrega a página.» é recuperação por recarregar.

A folha da viagem tem altura limitada (cerca de 28% do ecrã no mapa). INFERIDO que Cheguei, Iniciar e SOS podem ficar fora da primeira vista.

## E. Driver cancelamento / SOS

Cancelamento: NÃO OBSERVADO. INFERIDO. «Cancelar viagem», motivo rápido, texto opcional, «Confirmar cancelamento». Sem frase de custo ou de efeito na conta. Erro: «Sem ligação… tenta de novo.» Não diz se a viagem continua.

SOS: igual ao do passageiro na palavra «SOS» e no painel «Emergência» / 112. INFERIDO. No motorista o botão aparece em accepted, arriving e ongoing, não no estado assigned. NÃO OBSERVADO.

## F. Driver rendimentos / caixa

NÃO OBSERVADO. INFERIDO.

Rendimentos: «Hoje», «Este mês», «Semana actual», «Semana anterior». Introdução: soma do preço final da semana. «A linha «Parte motorista» aparece quando a API envia payout por viagem.» Vazio: «Sem viagens concluídas a contar para já». Há também «Parte motorista (payout)» e «Comissão plataforma» na linha da viagem. Três números possíveis: preço final, parte do motorista, comissão. A frase diz que a parte pode não aparecer. Não há «pendente» nem data de pagamento à pessoa.

Caixa: separadores Recebidas, Enviadas, Pedir ajuda. Placeholders «Assunto» e «Descreve o que precisas da frota». Botão «Enviar à frota». Sucesso: «Pedido enviado à frota.» Vazio: «Sem avisos da frota.» A pessoa percebe que o destino é a frota, não um suporte genérico nem o passageiro. Prioridade normal / alta. Erro pede para tentar outra vez. INFERIDO que o texto escrito se mantém.

Há ainda «Ver registo de atividade» dentro da caixa. Isso abre o diálogo de definições, não uma mensagem.

## G. Driver menu / perfil / conta

NÃO OBSERVADO nesta passagem. INFERIDO. A Conta canónica foi OBSERVADO ANTES no passageiro; o mesmo componente abre aqui por outro caminho.

Menu: Operação (Rendimentos, Viagens, Caixa, Registo de atividade), Conta (Perfil, Documentos), Configuração (Zonas, Navegação, Categorias, Como funciona a estimativa, Definições), Sair. Rendimentos e Caixa também estão na barra.

Perfil mostra nome, telemóvel, papel e «Conta · » mais oito caracteres do identificador de sessão. Depois dois botões: «Conta (detalhe)» e «Definições». «Conta (detalhe)» abre o painel canónico (nome editável, palavra-passe, métodos). O resumo não edita nada. Não há frase a dizer por que existem os dois. O cartão do menu já mostrou nome, telemóvel e papel uma vez.

Badge BETA no cartão do menu.

## H. Driver documentos / zonas / navegação / categorias

NÃO OBSERVADO. INFERIDO.

Documentos: nomes humanos (Carta TVDE, certificado, seguro, inspeção, cartão de cidadão, registo criminal). Estados: Aprovado, Em revisão, Rejeitado, Expirado, Em falta. Validade com data e dias. Acções: escolher ficheiro, enviar para revisão da frota. A intro diz que a aprovação é no painel da frota. «Aprovados: N / total» e «Pronto para disponibilidade». Há «Abrir painel admin» e um interruptor «Bloquear disponibilidade…» com «Só visível em DEV». Em produção o texto diz que o servidor valida. Quem rejeitou não aparece como nome; o estado é «Rejeitado».

Zonas: título «Mudança de zona (v1)». Subecrãs orçamento, sessão, pedido. «Contador diário (meia-noite Lisboa).» «Zona-alvo · catálogo v1». Campo «Escreve ID manual (ex.: lisboa-norte)». «Guardar zona custom». ETA com «OSRM» e «Fallback» e «linha reta». «Cheguei à zona» explica GPS e quilómetros ao centro. Orçamento esgotado manda contactar «a operação / frota pelo canal habitual».

Navegação: «Navegação (preferência)». Waze / Maps são a escolha da app. «Abrir recolha ao aceitar» activo por omissão. Se a app não abre: «Confirma que a app está instalada». Não explica segundo ecrã nem como voltar.

Categorias: «Sincroniza com o servidor e filtra os pedidos». «Preferência «pet» legacy, se existir nos dados, não filtra matching.» Interruptor «Aceito viagens com animais» e «Elétrico». GO, Comfort e XL aparecem como categorias de tarifa noutros textos, não como nomes explicados neste ecrã.

Preços: o menu chama-se «Como funciona a estimativa». O corpo são duas frases: estimativa no pedido, preço final no fim. Não diz o que o motorista recebe. A fórmula €/km está noutros ecrãs (histórico), não neste texto curto.

## I. Driver definições

NÃO OBSERVADO. INFERIDO.

Definições do menu: aspecto (inclui «Neon (sandbox)») e «Modo da app» se houver mais do que um shell. O ícone de definições do header não está neste shell. «Registo de atividade» no menu dispara o diálogo cujo gatilho está escondido (`sr-only`). A pessoa vê a entrada no menu; não vê um ícone no header. O diálogo inclui tema, modo e, em desenvolvimento, ferramentas com «Seed», «Auto-trip», «Export logs». Esse bloco é dev-only.

---

## J. Partner home

Entrada Parceiro: OBSERVADO nesta passagem. Separador Parceiro verde. Sem Google. O resto do cartão é o mesmo da entrada: `(beta mode)`, checkbox de criar conta, telemóvel deste browser, palavra-passe com seis marcas, versão, CACCL, CNIACC.

Home do parceiro: NÃO OBSERVADO. INFERIDO.

Título «Início». Alertas «Documentos, GPS, viagens bloqueadas — clique para ir ao detalhe.» Cartões de documentos com contagem e «Ver viaturas». Viagens ativas com «Acompanhar» ou «Nenhuma viagem ativa». Resumo: viagens hoje, total, concluídas, canceladas, motoristas com GPS, receita hoje. A receita diz «Soma bruta da app (final ou estimativa); não é payout Stripe.» Em cinco segundos, no código, o bloco de alertas está antes do resumo. Não foi visto se cabe no primeiro ecrã.

## K. Partner frota

NÃO OBSERVADO. INFERIDO.

Barra Frota abre o hub «Frota agora» (totais e acções), não a lista directa. Acções: lista, mapa live, adicionar, viaturas. Voltar é a seta da folha. No detalhe de viagem o link diz voltar e vai a `/partner`, não à lista. Mapa vazio: «Sem posições GPS recentes…». Legenda: «Recolha viagem activa (número = link detalhe)» e «Offline / GPS antigo (>15 min)».

## L. Partner motoristas

NÃO OBSERVADO. INFERIDO.

Adicionar: «Descobrir e associar motorista». «Só aparecem motoristas da frota Default aprovados». «Pesquisa por nome ou telefone e adiciona com um clique (sem UUIDs manuais).» Não diz criar nem convidar. Diz associar alguém que já existe. «Já pertence à tua frota.» Se a pesquisa não acha, o vazio depende da lista; não foi lida uma frase «pessoa não encontrada» dedicada além da lista vazia.

Ficha: telefone, «Estado na frota», localização, viagens concluídas e canceladas, documentos do motorista e da viatura, «Enviar aviso», «Remover este motorista da frota? Volta para a frota por defeito da plataforma.» «Nota interna (frota)». Aprovar, Revisão, Rejeitar, Expirado, Em falta. Badge «Em viagem»; o estado mais fino está no título do rato (`title`), não como frase principal.

## M. Partner viaturas

NÃO OBSERVADO. INFERIDO.

Campos com placeholder igual ao nome: matrícula, marca, modelo, ano, cor, lugares. INFERIDO que o placeholder faz de label, como na recolha do passageiro. Estado da viatura e associação a motorista estão no mesmo ecrã de frota. Erros de documento: «Erro ao guardar validade/nota.»

## N. Partner documentos

NÃO OBSERVADO. INFERIDO.

Na ficha: validade (data), nota interna, ver documento, «Sem ficheiro carregado pelo motorista.», «Aguarda upload do motorista», Aprovar / Rejeitar. O motorista é quem envia o ficheiro; o parceiro marca o estado. Não há, neste texto, o motivo da rejeição visível para o motorista além da palavra Rejeitado. Reenvio é «Substituir ficheiro» no lado do motorista, não um botão com esse nome no parceiro.

Alertas da home: rejeitados, expirados, em falta, a expirar, pendentes, com «Ver viaturas». O alerta diz o tipo e manda às viaturas. Não nomeia a matrícula na frase curta da home; a contagem é o que se vê primeiro.

## O. Partner viagens

NÃO OBSERVADO. INFERIDO. COBERTO POR TESTE de detalhe em `PartnerTripDetail.rtl.test.tsx`.

Lista e resumo: oito caracteres do identificador, reticências, e um estado traduzido (Pedido, Aceite, Em curso, …). Detalhe: o título é o identificador completo em mono. Passageiro e motorista aparecem como identificadores mono, não como nome, nas linhas «Passageiro:» e o id do motorista. Preço final ou estimativa. Fórmula de preço pode aparecer. Estado de viagem na ficha usa rótulo traduzido. Exportar fala em CSV e UTF-8.

## P. Partner relatórios

NÃO OBSERVADO. INFERIDO.

«Resumo operacional» e o mesmo aviso «não é payout Stripe.» «Descarregar CSV (filtros actuais)». «Colunas do CSV». Sucesso: «CSV descarregado.» Falha: «Exportação CSV falhou.» «Hoje» está nos KPIs da home; o CSV diz filtros actuais, não um período com nome próprio neste texto.

## Q. Partner caixa

NÃO OBSERVADO. INFERIDO. Paralela à do motorista: recebidas, enviadas, compor. Na ficha do motorista o envio é «Enviar aviso a este motorista». Na caixa geral o destino é a frota / motoristas, não o passageiro. Não foi lido um rótulo «suporte».

## R. Partner conta / definições

NÃO OBSERVADO neste papel. O painel é o `AccountPanel` já visto no passageiro (OBSERVADO ANTES): perfil, palavra-passe, métodos, scroll para Adicionar Google, caixa «Palavra-passe para confirmar» sem label. Entrada: Menu → Perfil. O ecrã de perfil do parceiro ficou só com a introdução e esse painel (o cartão duplicado de nome foi retirado do código). Definições: aspecto, incluindo Neon sandbox, e modo da app se a sessão tiver mais shells.

---

## S. Sheets / scroll

| Superfície | Primeira vista | Requer scroll? | É óbvio que há mais? | CTA permanece visível? |
|---|---|---|---|---|
| Entrada Motorista / Parceiro | cartão centrado | nesta janela coube até aos links | scrollbar da página se o cartão for mais alto | Entrar visível |
| Menu motorista | folha 85% / 26 rem | sim, muitas secções | só se a barra do browser aparecer | Sair pode ficar abaixo |
| Conta (detalhe) | igual à Conta já vista | sim, métodos abaixo | não havia aviso | Adicionar Google só depois |
| Documentos | lista longa | INFERIDO | não | Enviar para revisão pode ficar abaixo |
| Zonas | três subecrãs e formulário de ID | sim | não | — |
| Oferta no mapa | cartão sobre o mapa | INFERIDO | silenciar é pequeno no canto | deslizar para aceitar |
| Viagem activa | faixa baixa | INFERIDO | não | CTA seguinte pode ficar fora |
| Hub frota | totais e quatro acções | INFERIDO | — | as acções são a lista |
| Viaturas / documentos | formulário | sim | não | guardar pode ficar abaixo |
| Ficha de viagem | identificador no topo | sim, até passageiro/motorista | não | — |
| Definições | temas | sim | não | — |

## T. Formulários

| Papel | Ecrã | Campo | Parece campo? | Label clara? | Erro claro? | Observação |
|---|---|---|---|---|---|---|
| Ambos | Entrada | Telemóvel, palavra-passe | sim, OBSERVADO | sim | NÃO OBSERVADO | já preenchidos neste browser |
| Motorista | Caixa | Assunto, corpo | INFERIDO | só placeholder | «Tenta outra vez» | destino é a frota no botão |
| Motorista | Zonas | ID, motivo, ETA, margem | INFERIDO | mistura label e exemplo técnico | toasts com «ID», «custom», «servidor» | |
| Motorista | Documentos | ficheiro | INFERIDO | «Escolher ficheiro» | tipo e 5 MB | |
| Motorista | Cancelar | motivo | INFERIDO | sim | rede | sem custo |
| Motorista | Conta | confirmar palavra-passe | não, na passagem anterior | só placeholder | depois da acção | igual ao passageiro |
| Parceiro | Adicionar | pesquisa | INFERIDO | placeholder «Nome ou telefone…» | lista vazia | texto fala em Default e UUID |
| Parceiro | Viaturas | matrícula, marca, modelo, ano, cor, lugares | INFERIDO | placeholder com o nome do campo | NÃO OBSERVADO | |
| Parceiro | Documentos | número, emissor, notas, data | INFERIDO | placeholders | «Erro ao guardar» | |
| Parceiro | Aviso | título, mensagem | INFERIDO | só placeholder | «Erro ao enviar aviso.» | |
| Parceiro | Conta | os da Conta canónica | misto | ver passageiro | — | |

## U. CTAs

| Papel | Ecrã | CTA | Intenção perceptível? | Hierarquia clara? | Problema |
|---|---|---|---|---|---|
| Motorista | Mapa | Disponível / Offline | o texto do botão diz o estado | é o controlo principal | também há «toca no mapa» |
| Motorista | Oferta | Deslizar para aceitar | sim, se se vir o trilho | forte | silenciar é pequeno e não diz que não é recusar |
| Motorista | Oferta | Recusar | sim | secundário | — |
| Motorista | Viagem | Cheguei, Iniciar, Terminar | os verbos dizem a acção | um de cada vez | podem ficar sob a faixa |
| Motorista | Viagem | SOS | três letras | fraca | igual ao passageiro |
| Motorista | Perfil | Conta (detalhe) | «detalhe» não diz o que há lá | secundário | o resumo já mostrou os dados |
| Motorista | Menu | Registo de atividade | parece um ecrã | linha do menu | abre definições |
| Parceiro | Home | Ver viaturas / Acompanhar | sim | dentro do alerta | — |
| Parceiro | Frota | quatro acções do hub | os subtítulos ajudam | lista | a barra e o menu abrem o mesmo hub |
| Parceiro | Adicionar | Adicionar à frota | parece criar | primário | o texto diz associar existente |
| Parceiro | Ficha | Remover da frota | a pergunta explica o defeito da plataforma | destrutivo | — |
| Parceiro | Documentos | Aprovar / Rejeitar | sim | pares | rejeitar não pede motivo visível neste mapa |
| Parceiro | Viagens | Exportar CSV | a sigla é de ficheiro | secundário | UTF-8 e colunas são linguagem de ficheiro |

## V. Linguagem técnica

User-facing no código:

| Texto | Onde | Tipo |
|---|---|---|
| `(beta mode)`, `v1` da entrada, código de build | entrada, OBSERVADO / ANTES | user-facing |
| BETA no cartão do menu | motorista | user-facing, INFERIDO |
| payout, «quando a API envia» | rendimentos | user-facing |
| «Parte motorista (payout)» | linha de viagem | user-facing |
| «não é payout Stripe» | home e relatórios do parceiro | user-facing |
| ID manual, `lisboa-norte`, custom, catálogo v1, OSRM, Fallback | zonas | user-facing |
| «pet» legacy, matching, sincroniza com o servidor | categorias | user-facing |
| «Só visível em DEV», «Abrir painel admin» | documentos | DEV no texto; o interruptor é dev-only |
| Seed, Auto-trip, Export logs | definições | dev-only |
| Neon (sandbox) | aspecto | user-facing nos dois |
| JWT de motorista | texto de settings | pode aparecer ao trocar modo; NÃO VALIDADO |
| frota Default, «sem UUIDs manuais» | adicionar motorista | user-facing |
| identificador completo da viagem | detalhe motorista e título do detalhe parceiro | user-facing |
| `passenger_id` e `driver_id` em mono | ficha de viagem do parceiro | user-facing |
| oito caracteres na lista | viagens do parceiro e do motorista | user-facing |
| coordenadas | histórico do motorista, mesma função do passageiro | user-facing |
| CSV, UTF-8 | exportar | user-facing |
| «número = link detalhe», «>15 min» | legenda do mapa | user-facing |
| «dia civil, Lisboa», enforcement | repouso | user-facing |
| «Pagamento recusado — segue instruções da plataforma.» | fim da viagem do motorista | user-facing |

## W. Erros / recuperação

| Fluxo | Diz o que aconteceu? | Diz o que fazer? | Mantém dados? | Retry | Estado ambíguo |
|---|---|---|---|---|---|
| Ficar disponível | frases de documentos e viatura | Menu → Documentos, ou falar com o Partner | — | tentar outra vez na conformidade desconhecida | dois textos de repouso contradizem-se |
| Oferta | «Não foi possível recusar» | — | INFERIDO | sim | silenciar não explica o destino |
| Navegação | app não abriu | confirmar que está instalada | — | tentar outra vez | não diz como voltar |
| Viagem | sem ligação, sincronizar | recarregar a página | — | automático nalguns avisos | — |
| Cancelar | não foi possível | tenta de novo | INFERIDO | sim | não diz se a viagem segue |
| Upload | falha, tipo, tamanho | usar PDF, JPG, PNG | INFERIDO | sim | — |
| Zonas | muitos toasts | alguns dizem esperar GPS | o ID fica no campo, INFERIDO | Actualizar | «canal habitual» não é um sítio na app |
| Caixa | não enviou | tenta outra vez | INFERIDO | sim | — |
| Adicionar motorista | já na frota | — | a pesquisa fica | sim | não achar alguém não diz «criar» |
| Remover motorista | viagem activa impede | conclui ou cancela primeiro | — | — | «frota por defeito da plataforma» |
| CSV | falhou | — | filtros, INFERIDO | sim | — |
| Conta | igual ao passageiro | — | — | — | scroll |

## X. Acessibilidade

- Silenciar: altura mínima cerca de 28 px e texto 10 px. INFERIDO. Abaixo do alvo da barra (52 px).
- Estado do histórico do motorista: ponto de cor mais texto de estado na lista de viagens do menu (há rótulo). No mapa, disponibilidade é texto, não só cor.
- Placeholders como única label: viaturas, avisos, pesquisa de motorista, confirmação de palavra-passe.
- Identificadores em mono, fáceis de não ler.
- Registo de atividade: a pessoa usa uma linha do menu; o componente que abre está escondido. A entrada visível existe.
- Foco de teclado: não percorrido.

## Y. Desktop / mobile

OBSERVADO: entrada Parceiro no browser largo, cartão estreito, scroll da página até aos links.

INFERIDO: motorista é mapa em largura toda e barra inferior, como o passageiro. Parceiro é coluna `max-w-lg`. Folhas laterais iguais nos dois. Detalhe de motorista e de viagem são páginas, não folhas; a barra do parceiro mantém-se. Android: navegação externa e ficheiros têm caminho nativo; não foi visto no aparelho. Google não está na entrada Motorista nem Parceiro.

---

## Z. Findings Driver

## UX-DRV-001 — A home tem dois gestos para ficar disponível

**Superfície:** mapa do motorista  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** um botão Disponível/Offline e, noutro texto, «Toca no mapa para ficares disponível»  
**Problema humano:** não fica claro qual dos dois é a acção  
**Consequência provável:** tocar no mapa à espera de um pedido e não mudar o estado, ou o contrário  
**Evidência:** `mapHome.mapTapHint`, `availability`, `shellOfflineBody`  
**Relacionado com:** UX-DRV-002

## UX-DRV-002 — Vários bloqueios não têm passo dentro da app

**Superfície:** disponibilidade  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** viatura inactiva, sem viatura, ou documentos da viatura, e a frase «pede ao Partner»  
**Problema humano:** a causa está escrita; o próximo toque não existe  
**Consequência provável:** ficar offline sem saber a quem falar dentro da app  
**Evidência:** `availability` em `driver.json`  
**Relacionado com:** UX-DRV-003

## UX-DRV-003 — Documentos em falta apontam para o menu; a viatura não separa o problema

**Superfície:** disponibilidade  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Menu → Documentos» num caso; noutro, «em falta, caducada ou rejeitada» na mesma frase  
**Problema humano:** não sabe qual documento da viatura falhou  
**Consequência provável:** abrir Documentos do motorista e não achar o da viatura  
**Evidência:** `mapHome.docsMissingBody`, `vehicleDocumentsBlocked`  
**Relacionado com:** UX-DRV-002

## UX-DRV-004 — O repouso tanto bloqueia como diz que não bloqueia

**Superfície:** mapa  
**Observado/Inferred/Test:** INFERIDO; qual texto está activo em produção NÃO VALIDADO  
**O que uma pessoa vê:** ou não pode ficar disponível, ou «podes continuar» porque o bloqueio automático está desligado  
**Problema humano:** as duas frases contradizem-se  
**Consequência provável:** não saber se pode aceitar  
**Evidência:** `drivingHoursBlockedBody` e `drivingHoursLimitBody`  
**Relacionado com:** UX-DRV-001

## UX-DRV-005 — Silenciar não diz que a oferta continua noutro sítio

**Superfície:** oferta  
**Observado/Inferred/Test:** INFERIDO; COBERTO POR TESTE do botão  
**O que uma pessoa vê:** «Silenciar», pequeno; «Recusar» é outra acção  
**Problema humano:** parece fechar; a oferta vai para Ofertas silenciadas  
**Consequência provável:** achar que rejeitou o serviço  
**Evidência:** `RequestCard`, `requestCard.silence`, menu `trips_silenced`  
**Relacionado com:** UX-DRV-006

## UX-DRV-006 — A oferta mistura estimativa, payout e um relógio

**Superfície:** oferta  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Estimativa (indicativa)», por vezes «Parte motorista (payout)», e «Expira em Ns»  
**Problema humano:** não é óbvio qual número vai receber; payout é palavra interna  
**Consequência provável:** aceitar o preço errado ou deixar expirar  
**Evidência:** `requestCard`, `historyMoney.driverPayout`  
**Relacionado com:** UX-DRV-007

## UX-DRV-007 — Rendimentos avisam que a parte do motorista pode não vir

**Superfície:** Rendimentos  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** soma do preço final, e a frase de que a parte do motorista aparece «quando a API envia payout»  
**Problema humano:** preço da viagem e dinheiro da pessoa não estão separados com clareza; «API» não é linguagem de pessoa  
**Consequência provável:** contar o preço final como ordenado  
**Evidência:** `opsMenu.earnings.intro`  
**Relacionado com:** UX-DRV-006

## UX-DRV-008 — A navegação pode abrir outra app sozinha

**Superfície:** aceitar viagem  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** depois de aceitar, a app de mapas; o texto da preferência diz que isso é omissão  
**Problema humano:** não explica como voltar nem o que fazer se a app não está instalada, até ao erro  
**Consequência provável:** perder o passo «Cheguei»  
**Evidência:** `opsMenu.nav`, `actions.navOpenFailed`  
**Relacionado com:** UX-DRV-009

## UX-DRV-009 — A faixa da viagem é baixa para as acções

**Superfície:** viagem activa  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** uma folha com altura máxima cerca de 28% do ecrã  
**Problema humano:** a acção seguinte e o SOS podem ficar fora sem aviso  
**Consequência provável:** não iniciar ou não terminar à primeira  
**Evidência:** `MAP_SHEET_MAX_H_TRIP`, `ActiveTripActions`  
**Relacionado com:** UX-PAX-015

## UX-DRV-010 — Perfil e Conta (detalhe) mostram a mesma pessoa duas vezes

**Superfície:** menu → Perfil  
**Observado/Inferred/Test:** INFERIDO; o painel de detalhe é o já visto no passageiro  
**O que uma pessoa vê:** cartão com nome, telefone, papel e um código «Conta · …»; depois um botão «Conta (detalhe)»  
**Problema humano:** não se percebe por que o detalhe é outro ecrã  
**Consequência provável:** ficar no resumo e não chegar aos métodos de entrada  
**Evidência:** `DriverSideMenu` perfil; `AccountPanel`  
**Relacionado com:** UX-PAX-022, UX-PAX-023

## UX-DRV-011 — O código da conta no perfil não é um nome

**Superfície:** Perfil  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Conta · » e oito caracteres  
**Problema humano:** parece uma referência interna  
**Consequência provável:** ignorar ou copiar sem saber para quê  
**Evidência:** `accountRef` em `DriverSideMenu`  
**Relacionado com:** UX-DRV-010

## UX-DRV-012 — Zonas falam em v1, ID, custom e OSRM

**Superfície:** Menu → Zonas  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Mudança de zona (v1)», «Escreve ID manual», «zona custom», «OSRM», «Fallback»  
**Problema humano:** parece ferramenta interna  
**Consequência provável:** não pedir a zona, ou escrever um código ao acaso  
**Evidência:** `opsMenu.zones`  
**Relacionado com:** UX-DRV-013

## UX-DRV-013 — Categorias explicam o servidor, não o que a pessoa deixa de ver

**Superfície:** Menu → Categorias  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Sincroniza com o servidor», «pet legacy», «não filtra matching»  
**Problema humano:** não diz em linguagem simples que pedidos deixam de aparecer  
**Consequência provável:** desligar uma categoria sem perceber o efeito  
**Evidência:** `opsMenu.categories.intro`  
**Relacionado com:** UX-DRV-012

## UX-DRV-014 — A estimativa não diz o que o motorista recebe

**Superfície:** Menu → Como funciona a estimativa  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** estimativa para o passageiro e preço final no fim  
**Problema humano:** não fala da parte do motorista nem da comissão  
**Consequência provável:** achar que o valor do pedido é o que vai receber  
**Evidência:** `opsMenu.pricing.body`  
**Relacionado com:** UX-DRV-007

## UX-DRV-015 — Registo de atividade não parece definições

**Superfície:** menu e caixa  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** uma linha «Registo de atividade»  
**Problema humano:** abre o diálogo de configurações, cujo ícone não está no header  
**Consequência provável:** não perceber onde ficou  
**Evidência:** `DRIVER_OPEN_ACTIVITY_LOG_EVENT`, `SettingsButton` em `sr-only`  
**Relacionado com:** UX-DRV-010

## UX-DRV-016 — Documentos prometem um painel admin e um interruptor de diagnóstico

**Superfície:** Documentos  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Abrir painel admin» e, em desenvolvimento, um interruptor com «Só visível em DEV»  
**Problema humano:** admin e DEV não são o passo de enviar o ficheiro  
**Consequência provável:** sair dos documentos à procura de outro painel  
**Evidência:** `opsMenu.docs.openAdmin`, `gateDevHint`  
**Relacionado com:** UX-DRV-003

## UX-DRV-017 — Cancelar não diz o efeito

**Superfície:** viagem  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** motivo e confirmar  
**Problema humano:** sem custo, sem «a viagem acaba», sem o que acontece se a rede falhar  
**Consequência provável:** confirmar com medo ou achar que cancelou quando o pedido falhou  
**Evidência:** `actions.cancelTitle`, `actions.networkError`  
**Relacionado com:** UX-PAX-021

## AA. Findings Partner

## UX-PTN-001 — A entrada do Parceiro repete o cartão de laboratório

**Superfície:** entrada  
**Observado/Inferred/Test:** OBSERVADO  
**O que uma pessoa vê:** Parceiro seleccionado, `(beta mode)`, checkbox de criar conta, telemóvel e palavra-passe já preenchidos neste browser, código de versão  
**Problema humano:** igual ao do passageiro; nada diz o que o papel Parceiro faz  
**Consequência provável:** entrar no sítio errado ou achar que a app é um teste  
**Evidência:** ecrã de produção `/partner`  
**Relacionado com:** UX-PAX-001, UX-PAX-002, UX-PAX-004

## UX-PTN-002 — A receita avisa que não é payout Stripe

**Superfície:** Início e Relatórios  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Receita hoje (€)» e «não é payout Stripe»  
**Problema humano:** Stripe e payout não dizem o que aquele euro é  
**Consequência provável:** tratar o número como dinheiro a receber  
**Evidência:** `home.dashboard.revenueHint`, `reports.revenueHint`  
**Relacionado com:** UX-DRV-007

## UX-PTN-003 — Adicionar motorista fala em frota Default e UUIDs

**Superfície:** Frota → Adicionar  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «frota Default», «sem UUIDs manuais», «associar»  
**Problema humano:** não se percebe se está a criar, a convidar ou a procurar alguém que já existe  
**Consequência provável:** procurar um nome que a app não mostra e achar que a pessoa não pode ser motorista  
**Evidência:** `fleet.discoverHint`, `fleet.discoverSearchHint`  
**Relacionado com:** UX-PTN-004

## UX-PTN-004 — A ficha da viagem mostra identificadores em vez de nomes

**Superfície:** detalhe da viagem  
**Observado/Inferred/Test:** INFERIDO; COBERTO POR TESTE de estrutura  
**O que uma pessoa vê:** o identificador completo como título, e passageiro e motorista em mono  
**Problema humano:** não lê um nome  
**Consequência provável:** não saber de que viagem se trata  
**Evidência:** `PartnerTripDetail` título e `passenger_id` / `driver_id`  
**Relacionado com:** UX-PTN-005

## UX-PTN-005 — A lista de viagens abre com oito caracteres

**Superfície:** lista e resumo  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** `xxxxxxxx… · Em curso`  
**Problema humano:** o código não é um número de viagem explicado; o estado, esse, está em português  
**Consequência provável:** abrir várias até reconhecer o sítio  
**Evidência:** `PartnerTripsSection`, `PartnerTripsSummaryScreen`  
**Relacionado com:** UX-PTN-004

## UX-PTN-006 — O mapa explica a legenda como implementação

**Superfície:** mapa da frota  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «número = link detalhe» e «GPS antigo (>15 min)»  
**Problema humano:** a legenda descreve o mecanismo, não o que fazer  
**Consequência provável:** não perceber que o número abre a viagem  
**Evidência:** `fleet.legendPickup`, `fleet.legendOfflineStale`  
**Relacionado com:** UX-PTN-005

## UX-PTN-007 — Os campos da viatura usam o placeholder como nome

**Superfície:** Viaturas  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** caixas cuja pista é «matrícula», «marca», «modelo» dentro do campo  
**Problema humano:** ao escrever, o nome desaparece  
**Consequência provável:** trocar marca e modelo  
**Evidência:** `PartnerVehiclesScreen` placeholders `vehicles.fields`  
**Relacionado com:** UX-PAX-010

## UX-PTN-008 — Rejeitar documento não mostra um motivo para a outra pessoa

**Superfície:** documentos na ficha  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** Aprovar, Rejeitar, Expirado, Em falta; nota interna  
**Problema humano:** a nota diz «interna»; o motorista, no texto dele, vê «Rejeitado» e «contacta a tua frota»  
**Consequência provável:** o gestor rejeita sem deixar razão visível  
**Evidência:** `driverDetail.internalNote`, `documents.status.rejected`  
**Relacionado com:** UX-DRV-003

## UX-PTN-009 — O alerta manda a viaturas, não à matrícula

**Superfície:** Início  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «N viaturas com documentos rejeitados» e «Ver viaturas»  
**Problema humano:** diz o tipo de problema e o sítio; não diz qual viatura na frase  
**Consequência provável:** abrir a lista e procurar  
**Evidência:** `home.vehicleDocsAlert`  
**Relacionado com:** UX-PTN-008

## UX-PTN-010 — Remover da frota fala na frota por defeito da plataforma

**Superfície:** ficha do motorista  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Volta para a frota por defeito da plataforma.»  
**Problema humano:** «plataforma» e «defeito» não dizem o que acontece ao motorista amanhã  
**Consequência provável:** remover sem perceber se a pessoa deixa de trabalhar  
**Evidência:** `driverDetail.removeConfirm`  
**Relacionado com:** UX-PTN-003

## UX-PTN-011 — Exportar fala em CSV, UTF-8 e colunas

**Superfície:** Viagens e Relatórios  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** «Exportar CSV», «UTF-8», «Colunas do CSV»  
**Problema humano:** é linguagem de ficheiro  
**Consequência provável:** não saber se o ficheiro é o resumo do ecrã  
**Evidência:** `trips.exportHint`, `reports.csvColumnsPrefix`  
**Relacionado com:** UX-PTN-002

## UX-PTN-012 — Voltar da viagem não volta à lista

**Superfície:** detalhe da viagem  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** um link de voltar  
**Problema humano:** o destino no código é `/partner`, a home, não a lista de onde veio  
**Consequência provável:** perder o filtro e o sítio na lista  
**Evidência:** `PartnerTripDetail` `Link to="/partner"`  
**Relacionado com:** UX-PTN-005

## UX-PTN-013 — A Conta do parceiro é a mesma folha já vista, com o mesmo scroll

**Superfície:** Menu → Perfil  
**Observado/Inferred/Test:** INFERIDO no caminho; o painel foi OBSERVADO ANTES no passageiro  
**O que uma pessoa vê:** perfil, palavra-passe, e métodos só depois de scroll; a caixa de confirmar não parece campo  
**Problema humano:** igual ao passageiro; aqui a entrada chama-se Perfil, não Conta  
**Consequência provável:** não chegar aos métodos de entrada  
**Evidência:** `PartnerProfileScreen`, `AccountPanel`, UX-PAX-022 e UX-PAX-023  
**Relacionado com:** UX-DRV-010

## UX-PTN-014 — A caixa não diz se a mensagem é para um motorista ou para todos

**Superfície:** Caixa  
**Observado/Inferred/Test:** INFERIDO  
**O que uma pessoa vê:** assunto, corpo, enviar; na ficha, «Enviar aviso a este motorista»  
**Problema humano:** na caixa geral o destinatário não está tão explícito como na ficha  
**Consequência provável:** avisar a pessoa errada  
**Evidência:** `PartnerInboxScreen` / `PartnerMessagesSection` e `driverDetail.sendNoticeBtn`  
**Relacionado com:** UX-DRV-015
