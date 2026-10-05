# Manual de Admin — VAMULÁ

**Versão:** 0.1  
**Data:** Outubro 2026  
**Estado:** Alinhado com a app actual · screenshots por capturar · algumas áreas ainda dependem de produção

> Este manual descreve o que o painel **Admin** faz hoje.  
> Serve para operação, suporte e recuperação — **não** substitui o dia a dia do Parceiro/Frota nem o dispatcher automático.  
> As marcações `[PENDENTE …]` e `[FUTURO …]` não são promessas.

---

# Índice

1. Visão geral  
2. Administrador vs administrador principal  
3. Entrar na app  
4. Conta e métodos de entrada  
5. Navegação do painel  
6. Agora (dashboard)  
7. Utilizadores pendentes  
8. Aprovar utilizador  
9. Utilizadores  
10. Acções sensíveis sobre utilizadores  
11. Documentos (supervisão KYC)  
12. Motivo público vs nota interna  
13. Frota — criar e gerir  
14. Criar frota e responsável  
15. Associar motorista a frota  
16. Dados — motoristas  
17. Viaturas (o que o Admin vê)  
18. Viagens  
19. Estados da viagem  
20. Reatribuição e recuperação  
21. Operações excepcionais / mudança de estado  
22. Cancelamentos  
23. Reclamações  
24. Valores e pagamentos  
25. Saúde do sistema  
26. Operações e tarefas de sistema  
27. Métricas  
28. Horas de condução  
29. Notificações  
30. Segurança e auditoria  
31. Problemas comuns  
32. O que ainda não está fechado  
33. Versão do manual  

---

# 1. Visão geral

O painel Admin da VAMULÁ permite à operação:

- ver o estado actual da plataforma;  
- aprovar contas pendentes;  
- gerir utilizadores (bloquear, editar, e — com poderes alargados — eliminar ou retirar palavra-passe);  
- criar frotas e gestores de frota;  
- associar motoristas a frotas;  
- **ver** documentos (KYC) sem decidir no lugar da frota;  
- consultar e intervir em viagens de forma **excepcional**;  
- tratar reclamações;  
- acompanhar saúde do sistema, métricas e algumas operações técnicas.

### O que o Admin não é

- Não é o ecrã diário do motorista nem do passageiro.  
- Não substitui a gestão operacional da frota (documentos, viaturas, disponibilidade).  
- Não deve usar ferramentas de emergência (mudança forçada de estado, cancelamento Admin, cron) como rotina.

[SCREENSHOT — Dashboard Admin]

---

# 2. Administrador vs administrador principal

Existem dois níveis de sessão:

| Papel na app | Significado simples |
|--------------|---------------------|
| **Administrador** | Opera o painel: pendentes, bloqueios, viagens (consulta e algumas recuperações), saúde, reclamações, supervisão de documentos |
| **Administrador principal** | Tudo o anterior **mais** acções sensíveis: eliminar conta, retirar palavra-passe, bloquear em massa, promover/despromover motorista, criar frota/gestor, associar frota, tarefas de sistema (cron, timeouts, exportações, reconciliação de pagamentos, diagnóstico avançado de viagem) |

Se a tua sessão não for de administrador principal, a app esconde ou bloqueia essas acções (por exemplo: «Só um administrador principal pode retirar a palavra-passe»).

---

# 3. Entrar na app

Abre o painel Admin (rota de administração).

1. Introduz o telemóvel.  
2. Introduz a palavra-passe.  
3. Carrega em **Entrar**.

A conta tem de ser **Administrador** ou **Administrador principal**. Contas de Passageiro, Motorista ou Parceiro não entram neste painel.

### Google

Se **Continuar com Google** estiver disponível e a conta Google já for de staff, entras nessa conta. Google **não transforma** uma conta nova em Admin.

### Recuperar palavra-passe

Existe **Esqueci-me da palavra-passe** no ecrã de entrada.

[PENDENTE — SMS REAL]

[SCREENSHOT — Login Admin]

---

# 4. Conta e métodos de entrada

Na Conta (perfil) podes:

- ver o teu papel;  
- gerir métodos de início de sessão;  
- alterar a tua palavra-passe;  
- **Sair**.

[SCREENSHOT — Conta Admin]

---

# 5. Navegação do painel

O painel organiza-se em **cinco áreas**:

| Área | Secções |
|------|---------|
| **Agora** | Estado actual |
| **Viagens** | Viagens · Reclamações |
| **Pessoas** | Pendentes · Utilizadores · Documentos |
| **Frota** | Frota (parceiros) |
| **Sistema** | Saúde · Operações · Métricas · Dados |

[SCREENSHOT — Navegação Admin]

---

# 6. Agora (dashboard)

Em **Agora** vês um resumo operacional, por exemplo:

- indicadores de saúde e pagamentos bloqueados;  
- viagens activas;  
- utilizadores pendentes;  
- motoristas disponíveis;  
- viagens em curso;  
- alertas (por exemplo nenhum motorista disponível, ou zero viagens hoje).

Podes actualizar os dados. Os cartões servem para ir às áreas relevantes — as acções ficam nas outras secções.

[SCREENSHOT — Dashboard Admin]

---

# 7. Utilizadores pendentes

Em **Pessoas → Pendentes** vês contas à espera de aprovação (telemóvel e papel pedido).

Papéis que a interface reconhece nos rótulos: Passageiro, Motorista, Parceiro, Administrador — mas o efeito da aprovação segue as regras do servidor (ver secção 8).

[SCREENSHOT — Utilizadores pendentes]

---

# 8. Aprovar utilizador

1. Escolhe a conta pendente.  
2. Confirma no diálogo **Aprovar esta conta?**  
3. A app indica o telemóvel e o papel.  
4. Carrega em **Aprovar**.

### Efeitos reais

- A conta deixa de estar pendente e fica activa.  
- Se o papel pedido for **Motorista**, a plataforma cria o perfil de motorista associado à frota por defeito (aprovado para operar nesse contexto inicial).  
- Aprovar **não** transforma, por este fluxo, uma conta em Parceiro ou Admin com poderes de frota/staff — esses caminhos usam outras ferramentas (Frota / criação operacional).

### Limitações

- Contas em onboarding Google de passageiro podem **não** ser aprováveis por este ecrã.  
- Se o piloto tiver limite de utilizadores, a aprovação pode falhar com mensagem de capacidade.

[SCREENSHOT — Aprovar utilizador]

---

# 9. Utilizadores

Em **Pessoas → Utilizadores** podes:

- pesquisar, ordenar e percorrer a lista;  
- ver papel e estado;  
- editar nome (com confirmação);  
- alterar telemóvel (confirmação tipada e motivo);  
- **bloquear** / **desbloquear** (com motivo);  
- ver registo de acções sobre essa conta (auditoria).

Contas de staff (Admin) têm protecções: não as trates como contas beta normais para eliminar ou bloquear.

[SCREENSHOT — Lista de utilizadores]

---

# 10. Acções sensíveis sobre utilizadores

Estas acções são de **suporte / emergência**. Exigem motivo (texto com comprimento mínimo) e, em vários casos, **administrador principal**.

### Bloquear / desbloquear

- Uso: impedir ou repor o acesso.  
- Pedem motivo.  
- Não apagam a conta.

### Retirar a palavra-passe *(administrador principal)*

Diálogo: **Retirar a palavra-passe?**

- A palavra-passe actual deixa de servir para entrar.  
- **Não** é criada uma palavra-passe nova.  
- A entrada com Google, se existir, **não muda**.  
- As sessões já abertas **continuam válidas** até expirarem ou a pessoa sair.

[SCREENSHOT — Limpar palavra-passe]

### Eliminar conta *(administrador principal)*

Diálogo: **Eliminar esta conta?**

- A conta deixa de existir.  
- A acção **não pode ser desfeita**.  
- Pode falhar se existirem restrições (por exemplo histórico de viagens como passageiro).  
- Não uses isto como limpeza rotineira.

[SCREENSHOT — Eliminar utilizador]

### Bloquear em massa *(administrador principal)*

Exige confirmação tipada. Só para operações excepcionais.

### Promover / despromover motorista *(administrador principal)*

Altera o papel relacionado com motorista. Confirma sempre o efeito antes de aplicar.

---

# 11. Documentos (supervisão KYC)

Em **Pessoas → Documentos**:

> Aqui só vês os documentos. Quem decide é a frota. Neste ecrã não há aprovação, envio nem edição.

Vês alertas (documentos expirados, por rever, rejeitados — motoristas e viaturas) e podes abrir o detalhe para supervisão.

### Relação Admin vs Parceiro

| Quem | O que faz |
|------|-----------|
| **Parceiro / Frota** | Gere no dia a dia: aprovar, rejeitar, validade, associação de viatura |
| **Admin** | Supervisa globalmente; vê estados e motivos; **não** substitui a decisão da frota neste ecrã |

[SCREENSHOT — Documentos Admin / KYC]

---

# 12. Motivo público vs nota interna

Nos documentos, a app mostra (quando existirem):

| Campo | Quem vê |
|-------|---------|
| **Motivo para o motorista** | O motorista (texto público da rejeição) |
| **Nota interna** | Equipa (Parceiro / Admin) — o motorista não vê |

O Admin vê estes campos em supervisão. A decisão de rejeitar com motivo continua a ser feita na frota (ou noutros fluxos onde a app o permitir).

[SCREENSHOT — Motivo público e nota interna]

---

# 13. Frota — criar e gerir

Em **Frota** (área Frota), o **administrador principal** gere a estrutura:

1. criar frota (organização);  
2. criar gestor / responsável (Parceiro);  
3. associar ou retirar motoristas da frota.

Estas acções pedem motivo de governação e confirmação.

O caminho normal usa listas e selecção — **sem** colar identificadores técnicos. Existe um modo manual técnico separado; evita-o no dia a dia.

[SCREENSHOT — Lista de frotas]

---

# 14. Criar frota e responsável

### Criar frota

Indica o **nome** da frota e confirma. A frota passa a existir para associação de motoristas e gestores.

[SCREENSHOT — Criar frota]

### Criar responsável (gestor)

Indica **nome** e **telemóvel** do gestor. A conta fica preparada para entrar no shell **Parceiro** e gerir essa frota.

Não há registo público de Parceiro: a criação é esta (operação Admin).

[SCREENSHOT — Criar responsável]

---

# 15. Associar motorista a frota

1. Escolhe a frota e o motorista nas listas.  
2. Confirma **Atribuir este motorista a esta frota?**  
3. Para retirar: confirma **Remover este motorista da frota?**

### Depois de remover

O motorista deixa de operar nessa frota e passa para a **frota por defeito da plataforma** (comportamento alinhado com a remoção feita pelo Parceiro). A conta **não** é apagada. A viatura activa pode deixar de estar associada, conforme as regras da associação.

[SCREENSHOT — Associar motorista a frota]

---

# 16. Dados — motoristas

Em **Sistema → Dados** há visibilidade técnica / operacional de motoristas, incluindo:

- lista e estado;  
- **aprovar** ou **rejeitar** o perfil de motorista (com confirmação).

A rejeição pede **Motivo da rejeição** (mínimo 10 caracteres). O motivo fica no registo de auditoria da acção. Isto é distinto do motivo público nos **documentos** geridos pela frota — o Motorista continua a ver sobretudo os motivos de rejeição documental na app dele.

Isto **não** substitui a revisão documental da frota.

[SCREENSHOT — Lista de motoristas]  
[SCREENSHOT — Aprovar / rejeitar motorista (Dados)]

---

# 17. Viaturas (o que o Admin vê)

No ecrã de Documentos (KYC), o Admin vê informação de viaturas e dos seus documentos (incluindo matrícula, estado documental, motorista associado quando existir).

**Não** há, no painel Admin actual, ciclo completo de criar / activar / associar viatura — isso é da **Frota (Parceiro)**.

[SCREENSHOT — Lista de viaturas (supervisão)]

---

# 18. Viagens

Em **Viagens** podes:

- ver viagens activas e histórico recente;  
- abrir o **detalhe** de suporte;  
- actualizar dados;  
- usar acções excepcionais quando necessário (secções seguintes).

No detalhe vês, entre outros:

- estado legível;  
- passageiro e motorista;  
- viatura (quando existir);  
- **Preço** (estimativa / final) e detalhe de tarifa / portagens / suplementos;  
- estado de pagamento;  
- informações de cancelamento;  
- recusas de oferta;  
- linha do tempo de acções Admin relevantes.

[SCREENSHOT — Lista de viagens]  
[SCREENSHOT — Detalhe da viagem]

---

# 19. Estados da viagem

Estados apresentados de forma legível, por exemplo:

Pedido · Motorista atribuído · Aceite · Motorista a chegar · Em viagem · Concluída · Cancelada · Falhou · Em fila

Usa estes nomes no suporte. Não forces mudanças de estado sem necessidade (secção 21).

---

# 20. Reatribuição e recuperação

### Parceiro

Na frota, o Parceiro pode reatribuir uma viagem ainda **por aceitar** a outro motorista da **sua** frota.

### Admin — atribuição de recuperação

No detalhe Admin existe **Atribuir (recuperação)**.

Uso: **excepcional**, para desbloquear situações. O despacho normal é automático / frota — não uses isto como atribuição diária.

[SCREENSHOT — Reatribuir viagem / Atribuir recuperação]

---

# 21. Operações excepcionais / mudança de estado

Ferramentas de suporte no detalhe da viagem (não são o fluxo normal):

| Acção | Quando |
|-------|--------|
| Mudança de estado controlada | Por exemplo de aceite → a chegar, ou a chegar → em viagem — só nos casos que a app permitir |
| Nota operacional de pagamento | Regista contexto; **não** altera o pagamento sozinha |
| Reconciliação / alinhamento de pagamento | Administrador principal — alinha estado com o processador de pagamentos |
| Diagnóstico avançado de viagem | Administrador principal |

Regras importantes:

- **Não** há, neste painel, fechar ou cancelar uma viagem que já está **em viagem** como operação normal.  
- Confirma sempre; indica motivo quando pedido.  
- Cada intervenção fica registada para auditoria.

[SCREENSHOT — Force transition]  
[SCREENSHOT — Dados Admin / auditoria da viagem]

---

# 22. Cancelamentos

### Cancelamento normal

Feito pelo **passageiro** ou pelo **motorista** nos estados em que a app o permite (ver manuais respectivos).

### Cancelamento operacional Admin

O Admin pode cancelar em estados iniciais (por exemplo pedido, atribuída, aceite — conforme a app permitir), com:

- motivo com comprimento mínimo;  
- confirmação tipada;  
- registo de «Cancelado por: Admin».

Isto é **recuperação / suporte**, não o botão do dia a dia.

### Taxa de 3,00 € (piloto)

Em certos cancelamentos do **passageiro** após aceite, a app pode **registar** uma taxa de **3,00 €**.

No **piloto actual**, essa taxa **não é cobrada**. O cancelamento Admin **não** é o fluxo que define essa taxa.

[PENDENTE — STRIPE LIVE]

[SCREENSHOT — Cancelamento Admin]

---

# 23. Reclamações

Em **Viagens → Reclamações**:

- lista e filtros;  
- detalhe;  
- anexos, quando existirem;  
- estado e resolução;  
- ligação à viagem, quando existir;  
- importação de reclamações externas, se a ferramenta estiver disponível no ecrã.

Não há prazos automáticos nem respostas automáticas garantidas neste manual — trata cada caso com a informação apresentada.

[SCREENSHOT — Reclamações]

---

# 24. Valores e pagamentos

### O que o Admin vê na viagem

- **Preço da viagem** (estimativa e/ou final);  
- detalhe de tarifa, portagens e suplementos, quando existir;  
- **estado de pagamento**;  
- ligações ou indicação do ambiente de pagamento (teste / real / simulado), quando a app as mostra;  
- notas e reconciliação (administrador principal).

### O que o Admin **não** gere neste ecrã

- Campos separados **Parte do motorista** e **Comissão da plataforma** como ecrã de edição.  
- Transferências automáticas para motorista ou frota.  
- Reembolsos como fluxo completo de produto no painel.

[PENDENTE — STRIPE LIVE]  
[PENDENTE — PAGAMENTOS AUTOMÁTICOS]

[SCREENSHOT — Valores da viagem]

---

# 25. Saúde do sistema

Em **Sistema → Saúde**:

- indicadores e anomalias;  
- textos de orientação (playbooks) para diagnóstico;  
- atalhos para viagens relacionadas, quando existirem.

Usa isto para **diagnosticar**, não para «consertar» à força sem perceber o impacto.

[SCREENSHOT — System Health]

---

# 26. Operações e tarefas de sistema

Em **Sistema → Operações** encontras ferramentas técnicas. Muitas exigem **administrador principal**.

Exemplos reais:

- correr tarefas agendadas (com confirmação);  
- ajustar timeouts / expiração de ofertas;  
- recuperar estado de motorista;  
- definir ou limpar um **repouso** administrativo de condução (data/hora) — não é um painel completo de horas;  
- exportar registos;  
- validar configuração do ambiente;  
- reconciliação de pagamentos / fechos excepcionais sem intenção de pagamento.

Trata tudo isto como **ferramenta de suporte**. Confirma sempre. Prefere o fluxo normal da app sempre que existir.

[SCREENSHOT — Operações Admin]

---

# 27. Métricas

Em **Sistema → Métricas** vês contadores e relatórios de utilização (viagens activas, concluídas, motoristas, etc.).

É **consulta**. Não altera o estado das viagens.

[SCREENSHOT — Métricas Admin]

---

# 28. Horas de condução

Não existe um painel Admin de «horas de condução TVDE» com avisos e limites.

Existe apenas, em Operações, a possibilidade de ajustar um **repouso** administrativo pontual.

Do lado do Motorista, a app pode mostrar avisos. O **bloqueio automático** por limite de horas **ainda não está activo** por defeito.

Não assumes que o Admin gere o cumprimento diário de horas neste ecrã.

---

# 29. Notificações

O painel Admin **não** tem um centro de notificações push para a operação.

As notificações aos utilizadores finais (Android / iPhone) dependem da configuração da app e das permissões do dispositivo.

[PENDENTE — PUSH IOS]

Não assumes entrega garantida de avisos.

---

# 30. Segurança e auditoria

- Acções sensíveis pedem **motivo** (fica no registo).  
- Confirmações tipadas protegem eliminações e cancelamentos.  
- Administrador principal tem poderes extra — usa só quando necessário.  
- Intervenções em viagens e pagamentos aparecem na linha do tempo / auditoria.  
- Não partilhes palavras-passe nem códigos.  
- Notas internas de documentos não são para o motorista.

---

# 31. Problemas comuns

### Não entro no painel Admin

Confirma que a conta é Administrador ou Administrador principal.

### Não vejo «Eliminar» ou «Retirar palavra-passe»

Precisas de sessão de **administrador principal**.

### Não consigo aprovar documentos no Admin

Correcto: em Documentos só **vês**. A frota decide.

### Não consigo cancelar uma viagem em curso

O painel não oferece cancelamento Admin em viagem em curso como operação normal.

### A taxa de 3 € aparece mas ninguém foi cobrado

No piloto actual a taxa pode ser **registada** sem cobrança. Ver `[PENDENTE — STRIPE LIVE]`.

### Não recebo o código de recuperação

[PENDENTE — SMS REAL]

---

# 32. O que ainda não está fechado

## [PENDENTE — SMS REAL]

Códigos de recuperação / OTP em produção.

## [PENDENTE — STRIPE LIVE]

Cobrança real, captura de taxas e ambiente de pagamento em produção.

## [PENDENTE — PAGAMENTOS AUTOMÁTICOS]

Transferências automáticas para motorista / frota.

## [PENDENTE — PUSH IOS]

Notificações no iPhone.

## Fora deste painel (por desenho ou incompleto)

- Decisão KYC no lugar da frota  
- Gestão completa de viaturas pelo Admin  
- Centro de notificações Admin  
- Painel completo de horas de condução  
- Algumas operações de pagamento só existem no servidor sem botão no ecrã  

---

# 33. Versão do manual

| Campo | Valor |
|-------|--------|
| Manual | Admin |
| App | VAMULÁ |
| Versão do manual | 0.1 |
| Data | Outubro 2026 |
| Base | Comportamento da app após PR-UX-01 a PR-UX-28 e tip da `main` com manuais Passageiro, Motorista e Parceiro/Frota |

### Estado

- Fluxos principais: preenchidos e reconciliados com a app  
- Screenshots: pendentes  
- SMS / Stripe live / Push iOS / pagamentos automáticos: pendentes  
- KYC Admin: supervisão (sem decisão neste ecrã)  
- Ferramentas excepcionais: documentadas como não-rotina  

Actualizar este ficheiro quando o comportamento do Admin mudar de forma visível.
