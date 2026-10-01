# Mapa geral da aplicação

Inventário da experiência. Sem avaliação de qualidade e sem correcções.
Fonte: código das rotas, shells, menus e textos pt. Não é uma passagem visual nova.

Rotas autenticadas: `/passenger`, `/driver`, `/partner`, `/partner/drivers/:userId`, `/partner/trips/:tripId`, `/admin` (`?tab=`).
Sem sessão, o mesmo URL mostra o ecrã de entrada com o separador do papel correspondente.
`/passenger`, `/driver` e `/partner` usam header compacto (marca, hora, dica). O ícone de Conta e o de Definições do header só estão no header de `/admin`.

---

## Passenger

Landing: mapa em `/passenger`, barra inferior Início · Histórico · Conta · Menu.
Histórico, Conta, Menu, partilha, definições e detalhe de viagem abrem uma folha lateral, não uma rota nova.
Pedido de viagem, viagem activa, pagamento, cancelamento, avaliação e SOS ficam sobre o mapa.

## Driver

Landing: mapa em `/driver`, barra inferior Início · Rendimentos · Caixa · Menu.
Disponibilidade é um controlo no mapa.
O menu lateral tem Operação, Conta e Configuração, com subecrãs (zonas, documentos, navegação, categorias, preços, viagens, caixa, rendimentos).
«Conta (detalhe)» abre o mesmo painel de Conta, através de um gatilho que não está visível no header.

## Partner

Landing: painel Início em `/partner`, barra inferior Início · Frota · Caixa · Menu.
Frota e Caixa abrem a folha do menu. O menu também abre viagens, relatórios, perfil e definições.
Detalhe de motorista e de viagem são rotas próprias. Ao entrar nelas o menu fecha. A barra continua visível.

## Admin

Landing: `/admin`, grupo Agora, separador Agora.
Cinco grupos horizontais: Agora, Viagens, Pessoas, Frota, Sistema.
Onze separadores: Agora, Viagens, Reclamações, Pendentes, Utilizadores, Documentos, Frota, Saúde, Operações, Métricas, Dados.
Não há barra inferior nem menu lateral. Conta e Definições estão no header.

---

## B. Inventário de navegação

| Papel | Entrada visível | Acção | Destino | Componente | Reachable no fluxo real? |
|---|---|---|---|---|---|
| Público | Separadores Passageiro, Motorista, Parceiro, Administrador | Escolher papel de entrada | Login desse papel | `LoginScreen` | sim |
| Público | Entrar | Telefone + palavra-passe | Shell do papel | `LoginScreen` | sim |
| Público | Continuar com Google | OAuth | Callback ou onboarding | `LoginScreen` / `GoogleOAuthCallback` | sim no separador Passageiro |
| Passageiro | Barra Início | Fechar folha e voltar ao mapa | Mapa | `PassengerBottomNav` | sim |
| Passageiro | Barra Histórico | Abrir folha | Lista de viagens | `PassengerSideMenu` | sim |
| Passageiro | Barra Conta | Abrir folha | Conta canónica | `AccountPanel` | sim |
| Passageiro | Barra Menu | Abrir ou fechar folha | Menu raiz | `PassengerSideMenu` | sim |
| Passageiro | Menu Histórico | Abrir lista | Histórico | `PassengerSideMenu` | sim |
| Passageiro | Linha do histórico | Abrir detalhe | Detalhe da viagem | `PassengerHistoryDetailPanel` | sim |
| Passageiro | Menu Partilhar QR | Abrir QR | Ligação e copiar | `PassengerSideMenu` | sim |
| Passageiro | Menu Conta | Abrir conta | `AccountPanel` | `PassengerSideMenu` | sim |
| Passageiro | Menu Definições | Aparência e modo | Folha | `AppAppearanceSettings` + `AppRouteModeSwitch` | sim |
| Passageiro | Menu Sair | Terminar sessão | Login | `AppMenuLogoutRow` | sim |
| Passageiro | Pesquisa recolha / destino | Escrever ou tocar no mapa | Folha de planeamento | `DestinationSearchField` / `TripPlannerPanel` | sim |
| Passageiro | Confirmar viagem / Pedir viagem | Enviar pedido | Estados de procura | `PassengerDashboard` | sim |
| Passageiro | Cancelar viagem | Motivo | Viagem cancelada | folha de cancelamento | sim, com viagem |
| Passageiro | Autorizar cartão / Continuar | Pagamento | Viagem ou erro | painel de pagamento | sim, conforme ambiente |
| Passageiro | Avaliação | Estrelas | Fim da viagem | `PassengerTripRatingPanel` | sim, viagem concluída |
| Passageiro | SOS | Abrir painel | Chamada / partilha | `EmergencySosPanel` | sim, em viagem |
| Passageiro | Reclamação | Formulário no detalhe | Envio | `ComplaintReportForm` | sim, no detalhe do histórico |
| Motorista | Barra Início | Mapa | Mapa e ofertas | `DriverDashboard` | sim |
| Motorista | Barra Rendimentos | Abrir menu nesse ecrã | Rendimentos | menu `earnings` | sim |
| Motorista | Barra Caixa | Abrir caixa | Mensagens | `DriverInboxPanel` | sim |
| Motorista | Barra Menu | Abrir ou fechar | Menu raiz | `DriverSideMenu` | sim |
| Motorista | Disponível / Offline | Mudar disponibilidade | Mapa | micro-toggle | sim |
| Motorista | Menu Rendimentos, Viagens, Caixa | Subecrãs | Folha | `DriverSideMenu` | sim |
| Motorista | Menu Registo de atividade | Abrir diálogo | Registo | `SettingsButton` (gatilho oculto) | sim, pelo menu; o ícone não se vê |
| Motorista | Menu Perfil | Resumo | Nome, telefone, papel | `DriverSideMenu` | sim |
| Motorista | Conta (detalhe) | Abrir Conta | `AccountPanel` | `ProfileButton` oculto | sim, a partir de Perfil |
| Motorista | Menu Documentos | Estado dos documentos | Folha | menu `docs` | sim |
| Motorista | Menu Zonas e subecrãs | Orçamento, sessão, pedido | Folha | menu zonas | sim |
| Motorista | Menu Navegação | Escolher app | Preferência | menu `nav` | sim |
| Motorista | Menu Categorias | Activar categorias | Folha | menu `categories` | sim |
| Motorista | Menu Como funciona a estimativa | Texto | Folha | menu `pricing` | sim |
| Motorista | Menu Definições | Aparência e modo | Folha | `driver-settings-screen` | sim |
| Motorista | Menu Sair | Terminar sessão | Login | `AppMenuLogoutRow` | sim |
| Motorista | Aceitar / Cheguei / Iniciar / Terminar | Acções da viagem | Estado seguinte | `ActiveTripActions` | sim, com viagem |
| Motorista | Navegar até à recolha / destino | App externa | Waze ou Maps | acção de navegação | sim, com viagem |
| Motorista | Cancelar viagem | Motivo | Viagem cancelada | `ActiveTripActions` | sim, com viagem |
| Motorista | SOS | Painel | Chamada / partilha | `EmergencySosPanel` | sim, em viagem |
| Parceiro | Barra Início | Fechar menu | Painel inicial | `PartnerHomeDashboard` | sim |
| Parceiro | Barra Frota | Abrir folha | Hub Frota | `PartnerFleetHubScreen` | sim |
| Parceiro | Barra Caixa | Abrir folha | Caixa | `PartnerInboxScreen` | sim |
| Parceiro | Barra Menu | Abrir ou fechar | Menu raiz | `PartnerSideMenu` | sim |
| Parceiro | Frota → lista, mapa, adicionar, viaturas | Subecrãs | Folha | ecrãs `fleet_*` | sim |
| Parceiro | Viagens → resumo, lista, exportar | Subecrãs | Folha | ecrãs `trips_*` | sim |
| Parceiro | Relatórios | KPIs e CSV | Folha | `PartnerReportsMenuScreen` | sim |
| Parceiro | Perfil | Conta canónica | `AccountPanel` | `PartnerProfileScreen` | sim |
| Parceiro | Definições | Aparência e modo | Folha | `PartnerSettingsMenuScreen` | sim |
| Parceiro | Sair | Terminar sessão | Login | `AppMenuLogoutRow` | sim |
| Parceiro | Linha de motorista | Abrir ficha | `/partner/drivers/:userId` | `PartnerDriverDetail` | sim |
| Parceiro | Linha de viagem | Abrir ficha | `/partner/trips/:tripId` | `PartnerTripDetail` | sim |
| Parceiro | Alertas no Início | Ir ao detalhe | Viaturas ou viagem | `PartnerHomeDashboard` | sim, quando há alerta |
| Admin | Grupos Agora, Viagens, Pessoas, Frota, Sistema | Mudar área | Separador por omissão | `AdminDashboard` | sim |
| Admin | Separadores (11) | Mudar ecrã | `?tab=` | tabs admin | sim |
| Admin | Ícone Conta | Abrir Conta | `AccountPanel` | `ProfileButton` | sim |
| Admin | Ícone Definições | Aparência, modo, registo | Diálogo ou sheet | `SettingsButton` | sim |
| Admin | Viagem na lista | Detalhe | `?tab=trips&tripId=` | `AdminTabTrips` | sim |
| Todos os papéis com shell | Modo da app em Definições | Trocar shell permitido | Outro papel | `ContextSwitch` | sim, só shells da sessão |
| Público | `/download`, `/dl`, `/app` | Página ou redirect | Loja / app | landing | sim, sem sessão |
| Dev | `/debug/map` | Mapa de diagnóstico | Página | `DebugMapPage` | não em produção |

---

## C. Inventário de formulários

| Papel | Ecrã | Campo | Label visível | Placeholder | Obrigatório? | Acção associada |
|---|---|---|---|---|---|---|
| Público | Entrada | Telemóvel | Telemóvel | +351… | sim | Entrar |
| Público | Entrada | Palavra-passe | Palavra-passe | — | sim | Entrar |
| Público | Entrada | Termos | Aceito os Termos… | — | no registo | criar conta / OTP |
| Público | Entrada | Código OTP | código | — | quando OTP está ligado | Verificar |
| Passageiro Google | Onboarding | Email, nome, telefone, palavra-passe | labels do ecrã | — | sim, conforme o passo | concluir conta |
| Todos | Conta | Nome visível | Nome visível | — | não | Guardar nome |
| Todos | Conta | Telemóvel | Telemóvel | — | leitura | nenhuma |
| Todos | Conta | Papel | Papel | — | leitura | nenhuma |
| Todos | Conta, com palavra-passe | Actual, nova, confirmar | labels do formulário | — | sim para alterar | Actualizar palavra-passe |
| Todos | Conta, sem palavra-passe | Nova e confirmar | Definir palavra-passe | — | sim | definir |
| Todos | Métodos de login | Palavra-passe para confirmar | label da secção | Palavra-passe para confirmar | para Adicionar Google e acções | confirmar acção |
| Passageiro | Mapa | Recolha | label só para leitor de ecrã | Recolha: rua… | para pedir | pesquisa / mapa |
| Passageiro | Mapa | Destino | label só para leitor de ecrã | Destino: rua… | para pedir | pesquisa / mapa |
| Passageiro | Pedido | Animal / opções | checkboxes do painel animal | — | não | incluir no pedido |
| Passageiro | Cancelar | Motivo | Escolha rápida | texto livre opcional | motivo | Confirmar cancelamento |
| Passageiro | Fim | Estrelas | Como correu a viagem? | — | não | Enviar avaliação |
| Passageiro | Histórico detalhe | Reclamação | formulário de reclamação | — | campos do form | enviar |
| Motorista | Cancelar | Motivo | Escolha rápida | texto livre opcional | motivo | Confirmar cancelamento |
| Motorista | Caixa | Assunto e corpo | placeholders da caixa | assunto / mensagem | para enviar | enviar mensagem |
| Motorista | Zonas | Motivo e identificador | labels de zona | placeholders de zona | conforme o pedido | pedir mudança |
| Motorista | Documentos | Estado por documento | lista de documentos | — | para ficar disponível | actualizar estado |
| Motorista | Navegação | App preferida | escolha | — | não | guardar preferência |
| Motorista | Categorias | Interruptores | categorias do veículo | — | não | activar categoria |
| Parceiro | Listas | Pesquisa | label só para leitor de ecrã | pesquisa da lista | não | filtrar |
| Parceiro | Adicionar à frota | Pesquisa de pessoa | — | texto de descoberta | para adicionar | adicionar |
| Parceiro | Viaturas | Matrícula, marca, modelo, ano, cor, lugares | placeholders dos campos | os próprios nomes | para criar | guardar viatura |
| Parceiro | Documentos da viatura | Número, emissor, notas, ficheiro, datas | labels do painel | placeholders | para submeter | enviar documento |
| Parceiro | Caixa / ficha | Título e mensagem | placeholders | título / mensagem | para enviar | enviar |
| Parceiro | Viagens | Pesquisa | — | pesquisa | não | filtrar |
| Admin | Frota | Nome da organização, parceiro, gestor, telefone | labels `frota-*` | — | para criar | criar / atribuir |
| Admin | Dados | Pesquisa | label de pesquisa | — | não | filtrar |
| Admin | Operações | Motorista e data de repouso | labels do formulário | — | para a acção | registar repouso |
| Admin | Vários separadores | Pesquisa, selects, notas, anexos | dentro de Utilizadores, Documentos, Reclamações, Viagens | — | conforme a acção | aprovar, resolver, filtrar |

---

## D. Inventário de botões

| Papel | Ecrã | Texto/ícone | Acção | Estado normal | Disabled possível? |
|---|---|---|---|---|---|
| Público | Entrada | Entrar | login | primário | sim, a entrar |
| Público | Entrada | Continuar com Google | OAuth | secundário | sim |
| Público | Entrada | Português / English | idioma | secundário | não |
| Passageiro | Barra | Início, Histórico, Conta, Menu | navegação | um activo | não |
| Passageiro | Mapa | Marcar recolha no mapa | escolher ponto | secundário | não |
| Passageiro | Folha | Confirmar recolha / destino / viagem | avançar pedido | primário | sim, pontos inválidos ou a confirmar |
| Passageiro | Folha | Repor, Alterar, Limpar | corrigir pontos | secundário | não |
| Passageiro | Viagem | Pedir viagem, Cancelar viagem, Tentar novamente | ciclo da viagem | primário ou secundário | sim, a processar |
| Passageiro | Pagamento | Autorizar cartão, Continuar sem cartão, Continuar (simulado) | pagamento | primário | sim |
| Passageiro | Avaliação | Estrelas, Enviar avaliação, Agora não | avaliar | primário / texto | sim, a enviar |
| Passageiro | Menu | linhas e Sair | navegar ou sair | linha / destrutivo | não |
| Passageiro | Partilha | Copiar ligação | copiar URL | secundário | não |
| Passageiro | Conta | Guardar nome, Actualizar palavra-passe, Adicionar Google | conta | primário / secundário | sim, sem alteração ou sem confirmação |
| Passageiro / Motorista | Viagem | SOS | emergência | flutuante | não |
| Motorista | Mapa | Disponível / Offline | disponibilidade | toggle | sim, documentos, viatura, repouso |
| Motorista | Viagem | Aceitar, Cheguei, Iniciar viagem, Terminar viagem | estados | primário | sim, longe do pickup ou sem viatura |
| Motorista | Viagem | Navegação / Abrir navegação | app externa | secundário | sim, sem coordenadas |
| Motorista | Viagem | Cancelar viagem | cancelar | destrutivo | sim |
| Motorista | Menu | linhas, Conta (detalhe), Sair, Ficar disponível | navegar | linha | Ficar disponível só se offline e sem viagem |
| Motorista | Conta | os mesmos da Conta canónica | conta | — | sim |
| Parceiro | Barra e menu | Início, Frota, Caixa, Menu, linhas | navegar | um activo | não |
| Parceiro | Início | Acompanhar, Ver viaturas | ir ao detalhe | secundário | quando vazio, não há acção |
| Parceiro | Viaturas / documentos | Guardar, enviar ficheiro | frota | primário | sim, campos em falta |
| Parceiro | Viagens | Exportar | CSV | secundário | sim, em erro |
| Parceiro | Fichas | mensagens e estados do motorista | operar | secundário | sim |
| Admin | Header | ícone Conta, ícone Definições | abrir painéis | icon-only | não |
| Admin | Grupos e separadores | 5 grupos, 11 tabs | mudar ecrã | tab | não |
| Admin | Operações e pessoas | aprovar, recusar, reconciliar, pesquisar | acções de backoffice | primário / destrutivo | sim, papel que não é super_admin |
| Vários | Folhas | Voltar, Fechar | fechar navegação | secundário | não |
| Vários | Definições | Passageiro, Motorista, Parceiro, Admin | trocar shell | um activo | só os shells permitidos aparecem |

---

## E. Estados de UI

| Papel | Ecrã | Estado | Como aparece ao utilizador |
|---|---|---|---|
| Todos | Arranque | loading | «A iniciar serviço…» e texto de espera |
| Todos | Arranque | error | mensagem e «Tentar novamente» |
| Passageiro | Mapa | sem GPS / posição aproximada | aviso e retry, quando a localização falha |
| Passageiro | Pedido | loading | «A pedir viagem…», «A calcular percurso…», «A confirmar…» |
| Passageiro | Procura | pending | «A procurar motorista…» e fallback para esperar ou cancelar |
| Passageiro | Viagem | accepted / a caminho / em curso / concluída | cartão de estado com frases próprias |
| Passageiro | Pagamento | sucesso, recusado, indisponível, simulado | títulos do painel de pagamento |
| Passageiro | Histórico | loading, vazio, erro de actualização | lista ou detalhe |
| Passageiro | Cancelamento | a cancelar / falhou | texto de estado |
| Motorista | Mapa | online / offline | o próprio botão de disponibilidade |
| Motorista | Mapa | documentos em falta, repouso, viatura inactiva, sem viatura, documentos da viatura | faixas no mapa |
| Motorista | Mapa | sem GPS | aviso de localização e erro de reporte |
| Motorista | Oferta / viagem | a processar, sem rede, sincronizar | textos em `actions` |
| Motorista | Caixa | por ler | badge numérico |
| Parceiro | Início | vazio | «Nenhuma viagem ativa» |
| Parceiro | Início | alerta | documentos rejeitados, expirados, em falta, a expirar, pendentes |
| Parceiro | Listas | loading / erro de exportação | texto no ecrã |
| Admin | Separadores | loading, vazio, erro | por separador; «A atualizar…» / «Dados atualizados» em Agora |
| Admin | Pessoas | pending, approved, rejected | filas e acções |
| Admin | Documentos | em falta, em revisão, rejeitado, expirado | lista de documentos |
| Vários | Conta | a carregar | «A carregar dados da conta…» / «A carregar métodos…» |
| Vários | Botões | disabled | opacidade ou botão inactivo enquanto grava |

---

## F. Feedback

| Papel | Acção | Feedback visível | Tipo |
|---|---|---|---|
| Todos | Falha ao arrancar | texto + Tentar novamente | ecrã de erro |
| Passageiro | Pedir, procurar, pagar, cancelar, avaliar | frases no cartão ou na folha | inline / mudança de cartão |
| Passageiro | Erro de rede na avaliação ou cancelamento | frase de erro | inline |
| Motorista | Aceitar, chegar, iniciar, terminar | «Viagem iniciada» e equivalentes | inline no painel da viagem |
| Motorista | Falha de rede ou navegação | frase de erro | inline |
| Motorista / Passageiro | SOS | painel com estado de localização | modal / painel |
| Parceiro | Exportar CSV | sucesso ou erro visível | inline |
| Admin | Actualizar Agora | «A atualizar…» depois «Dados atualizados» | inline |
| Conta | Gravar palavra-passe | toast e fim de sessão | toast |
| Conta | Erro ao gravar | texto e toast | inline + toast |
| Vários | Acção destrutiva de cancelamento | ecrã de motivo antes de confirmar | confirmação |
| Header | Dicas rotativas | linha de texto que muda | banner |

Não foi feito um inventário de cada `toast` do repositório. Os toasts vistos no fluxo de Conta estão registados. Outros toasts ficam para a auditoria profunda.

---

## G. Dados visíveis

Presença apenas.

- Nome, telefone e papel: menu de Passageiro, Motorista e Parceiro; Conta canónica; Perfil do motorista (resumo separado).
- Email: métodos de início de sessão, no formato «Email · …».
- Identificador curto da conta: header quando o header mostra identidade; Perfil do motorista («Conta · …», últimos caracteres do identificador de sessão).
- Data e hora: header.
- Estados de viagem em linguagem de ecrã: cartões do passageiro e acções do motorista. Também há linha «Estado do pagamento: …» que pode mostrar o valor vindo do sistema.
- IDs: «Pedido {{id}}…» na procura; `tripId` na URL de admin e de parceiro; referência de conta no motorista.
- Dinheiro: estimativa, preço final, receita hoje no parceiro (com nota de que não é payout).
- Documentos: estados em falta, rejeitado, expirado, pendente, a expirar.
- Mensagens de erro de API: várias frases próprias; algumas passam o detalhe do pedido quando não há frase dedicada.
- Códigos de build: «Versão da aplicação» no ecrã de entrada.
- Badge BETA: identidade do menu do motorista.
- Placeholders técnicos de exemplo: telemóvel de exemplo no login.

---

## H. Fluxos críticos

### Passenger

Entrada → telemóvel e palavra-passe, ou Google → `/passenger`.

Pedido → recolha → destino → confirmar viagem → procurar motorista → motorista encontrado → viagem → concluída → avaliação ou saltar.

Cancelamento → motivo → confirmar → viagem cancelada.

Pagamento → autorização, simulado, ou continuar sem cartão, conforme o ambiente → viagem segue ou mostra recusa.

Histórico → barra Histórico → lista → detalhe → reclamação possível.

Conta → barra Conta → perfil, palavra-passe, métodos de início de sessão.

### Driver

Entrada → separador Motorista → `/driver`.

Disponibilidade → toque em Disponível / Offline → faixas se documentos, viatura ou repouso bloqueiam.

Oferta → Aceitar → aproximar → Cheguei → Iniciar viagem → Terminar viagem.

Navegação → abrir app externa para recolha ou destino.

Conta → Menu → Perfil → Conta (detalhe) → painel canónico.

Documentos → Menu → Documentos.

### Partner

Entrada → separador Parceiro → `/partner`.

Frota → barra Frota → hub → lista, mapa, adicionar ou viaturas → ficha `/partner/drivers/:userId` ou documentos da viatura.

Viagens → Menu → Viagens → resumo, lista ou exportar → ficha `/partner/trips/:tripId`.

Conta → Menu → Perfil → painel canónico.

Operação → Início com alertas e viagens activas → Acompanhar ou Ver viaturas.

### Admin

Entrada → separador Administrador → `/admin`.

Painel → grupo e separador.

Utilizadores → Pessoas → Pendentes ou Utilizadores.

Motoristas e documentos → Pessoas → Documentos.

Parceiros → Frota.

Viagens → Viagens → lista → detalhe na query.

Pagamentos e operações → Operações; reclamações no grupo Viagens.

Compliance → Documentos, Saúde, Dados.

Conta → ícone no header.

---

## I. Componentes partilhados

| Componente/superfície | Passenger | Driver | Partner | Admin |
|---|---|---|---|---|
| `AccountPanel` | barra Conta e menu | Perfil → Conta (detalhe) | Perfil | ícone do header |
| `LoginScreen` | sim | sim | sim | sim |
| `GoogleOAuthCallback` / onboarding | sim | não no botão de entrada | não | não |
| `AppHeaderBar` compacto | sim | sim | sim | não; header completo |
| `ProfileButton` visível | não | não; diálogo via evento | não | sim |
| `SettingsButton` visível | não | diálogo via Registo de atividade | não | sim |
| `AppAppearanceSettings` | menu Definições | menu Definições | menu Definições | Definições do header |
| `ContextSwitch` | menu Definições | menu Definições | menu Definições | header e também no corpo do painel |
| `LegalAcceptance` | entrada / gate | entrada / gate | entrada / gate | entrada / gate |
| Mapa | sim | sim | mapa live da frota | não como shell |
| SOS | sim | sim | não | não |
| Reclamação | detalhe do histórico | viagem | não neste mapa | separador Reclamações |
| Upload de ficheiro | anexos de reclamação | — | documentos de viatura | documentos / reclamações |
| Toasts | Conta e outros | Conta e viagem | exportação | acções |
| Pagamento | sim | não cobra | vê valores | operações |

---

## J. Duplicações aparentes

- Conta canónica única (`AccountPanel`) e, no motorista, um cartão de perfil anterior com nome, telefone e papel, mais o botão «Conta (detalhe)».
- Nome, telefone e papel também no cartão de identidade de cada menu lateral.
- `BetaAccountPanel` ainda existe como invólucro e não é montado por nenhum ecrã.
- Palavra-passe: formulário de alteração na Conta, e outro bloco «Definir palavra-passe» quando ainda não há palavra-passe. Não aparecem os dois ao mesmo tempo. Há ainda o campo «Palavra-passe para confirmar» nas acções de identidade.
- Definições: ecrã do menu em Passageiro, Motorista e Parceiro; diálogo de Definições no header só em Admin; no motorista o mesmo diálogo abre pelo Registo de atividade, com o ícone escondido.
- Header compacto e header completo.
- Caixa de entrada no motorista e no parceiro, com formulário de mensagem parecido.
- `ContextSwitch` no menu de cada papel e outra vez no corpo do painel admin.

---

## K. UI não reachable

`UI TECHNICALLY PRESENT, USER NOT REACHABLE`

- `BetaAccountPanel`: ficheiro sem importação. A pessoa não o abre.
- Ícone `ProfileButton` no header de Passageiro, Motorista e Parceiro: o header compacto não o monta.
- Ícone `SettingsButton` no header de Passageiro e Parceiro: não montado.
- Gatilho visível de `ProfileButton` e `SettingsButton` no motorista: estão em `sr-only` e `aria-hidden`. O diálogo abre por eventos do menu, não por um ícone que se veja.
- `/debug/map`: só em desenvolvimento. Em produção redirecciona.
- Passo 1 antigo da home do motorista: `isDriverHomeTwoStepEnabled()` devolve sempre falso.
- `DevTools` dentro de Definições: só em desenvolvimento.
- `/admin/login`: redirecciona para `/admin`. Não é um ecrã.

---

## L. Divergências docs/código

- `docs/ux/navigation-inventory.md`, resumo do Passageiro, diz que o histórico é só leitura e não tem detalhe. A matriz do mesmo ficheiro e o código (`history_detail`) abrem o detalhe.
- O mesmo doc lista 10 separadores de admin e omite Reclamações. O código tem 11: inclui `complaints`.
- O resumo do Parceiro diz que a barra Frota salta o hub e abre a lista. O código abre o ecrã `fleet` (hub). A matriz do mesmo doc diz hub.
- A Conta canónica descrita nos docs de arquitectura e de navegação coincide com o código actual: `AccountPanel` nos quatro papéis, por entradas diferentes.
- `BetaAccountPanel` deixou de ser a Conta do passageiro. O doc de navegação já fala em `AccountPanel`. O ficheiro antigo permanece sem uso.

---

## M. Zonas que precisam auditoria profunda

- Pedido de viagem do passageiro, do primeiro toque até ao preço e ao pagamento.
- Viagem activa do passageiro e do motorista, incluindo cancelar, GPS e SOS.
- Disponibilidade do motorista e bloqueios por documentos, viatura e repouso.
- Conta canónica nos quatro papéis, incluindo métodos de início de sessão e o caminho «Conta (detalhe)».
- Frota do parceiro: viaturas, documentos, adicionar motorista, fichas.
- Admin: Pessoas, Documentos, Viagens, Reclamações, Operações.
- Textos que mostram identificadores, estados técnicos ou mensagens vindas do servidor.
- Diferença entre o que está no primeiro ecrã e o que só aparece depois de scroll ou dentro de uma folha.
- Entrada Google e onboarding.
- O que muda entre browser largo, browser estreito e app Android.

---

## A. Inventário por papel

Contagens de superfícies distinguíveis neste mapa (ecrãs, folhas, diálogos e overlays, não cada botão).

- Passageiro: cerca de 18 (entrada, mapa, 4 destinos da barra, menu, histórico, detalhe, partilha, definições, conta, planeamento, pagamento, cancelamento, avaliação, SOS, reclamação).
- Motorista: cerca de 24 (entrada, mapa, disponibilidade, 4 destinos da barra, menu e subecrãs de operação, perfil, conta, documentos, zonas, navegação, categorias, preços, definições, acções de viagem, cancelamento, SOS, registo).
- Parceiro: cerca de 18 (entrada, início, 4 destinos da barra, hubs e folhas de frota e viagens, relatórios, caixa, perfil, definições, duas fichas de rota).
- Admin: cerca de 14 (entrada, 5 grupos, 11 separadores contados como uma superfície de navegação mais os ecrãs de trabalho, conta, definições, detalhe de viagem).

## Desktop e mobile

- O header compacto depende da rota, não da largura. Passageiro, Motorista e Parceiro não ganham ícones de Conta ao alargar a janela.
- Passageiro e Motorista ocupam a largura toda por causa do mapa. Parceiro e Admin ficam numa coluna limitada (`max-w-lg` / `max-w-md` a `max-w-5xl`).
- `ProfileButton` e `SettingsButton`, quando montados, usam diálogo no ecrã largo e sheet abaixo de 639 px.
- A barra inferior dos três papéis operacionais mantém-se; não há uma navegação lateral alternativa no desktop.
- Android / Capacitor, só diferença estrutural já vista no código: Google no aparelho não usa o mesmo regresso web; navegação externa e escolha de ficheiro têm caminho nativo. Auditoria do aparelho fica para depois.
