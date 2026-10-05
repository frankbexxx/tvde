# Manual do Parceiro / Frota — VAMULÁ

**Versão:** 0.1  
**Data:** Outubro 2026  
**Estado:** Alinhado com a app actual · screenshots por capturar · algumas áreas ainda dependem de produção

> Este manual descreve o que a aplicação **faz hoje** para quem gere uma frota (Parceiro).  
> As marcações `[PENDENTE …]` e `[FUTURO …]` não são promessas: indicam o que ainda não está fechado em produção.

---

# Índice

1. Visão geral  
2. Parceiro vs Frota  
3. Entrar na app  
4. Conta e métodos de entrada  
5. Recuperar a palavra-passe  
6. Menu e navegação  
7. Dashboard / visão geral  
8. Frota — lista e mapa  
9. Associar motorista à frota  
10. Detalhe do motorista  
11. Aprovar / activar / desactivar  
12. Disponibilidade forçada (online / offline)  
13. Documentos do motorista  
14. Motivo público vs nota interna  
15. Remover motorista da frota  
16. Viaturas  
17. Criar, activar e desactivar viatura  
18. Associar viatura a motorista  
19. Documentos da viatura  
20. Viagens  
21. Detalhe da viagem e reatribuição  
22. Cancelamentos  
23. Valores e rendimentos  
24. Pagamentos automáticos — estado actual  
25. Caixa e comunicação com motoristas  
26. Relatórios e exportação  
27. Zonas (orçamento e extensão)  
28. Horas de condução  
29. Notificações  
30. Conta  
31. Problemas comuns  
32. Segurança  
33. O que ainda não está fechado  
34. Versão do manual  

---

# 1. Visão geral

Com a app VAMULÁ, o Parceiro (gestor de frota) pode:

- entrar com telemóvel e palavra-passe (e Google, se a conta já for de Parceiro);
- ver o resumo operacional da frota e alertas;
- associar motoristas já existentes à frota;
- activar ou desactivar motoristas na frota;
- rever documentos do motorista (aprovar / rejeitar);
- gerir viaturas e os seus documentos;
- associar ou desassociar viatura a motorista;
- acompanhar viagens e reatribuir uma viagem ainda «por aceitar»;
- enviar avisos a um motorista ou a toda a frota;
- receber mensagens dos motoristas na Caixa;
- exportar viagens (CSV);
- gerir a Conta e sair da sessão.

Não podes, na app de hoje:

- criar uma conta de Parceiro pelo ecrã público de registo;
- cancelar uma viagem pelo papel Parceiro;
- gerir horas de condução do motorista neste ecrã;
- receber transferências automáticas (pagamentos automáticos ainda pendentes).

[SCREENSHOT — Dashboard do Parceiro]

---

# 2. Parceiro vs Frota

Neste manual:

| Termo | Significado |
|-------|-------------|
| **Parceiro** | A pessoa com conta de gestor que entra na app |
| **Frota** | A organização / conjunto de motoristas e viaturas que esse Parceiro gere |

O Parceiro gere a frota. A frota não é uma segunda conta de login: é o âmbito de dados a que a tua sessão tem acesso.

---

# 3. Entrar na app

No ecrã de entrada, escolhe o tipo **Parceiro**.

## 3.1 Com telemóvel e palavra-passe

1. Introduz o telemóvel.  
2. Introduz a palavra-passe.  
3. Carrega em **Entrar**.

A conta tem de ser de **Parceiro** e estar ligada a uma frota. Se entrares com uma conta de outro tipo, a app indica que não tens acesso de Parceiro.

A criação da conta de Parceiro é feita pela operação da plataforma (não pelo registo público da app).

[SCREENSHOT — Login do Parceiro]

## 3.2 Com Google

Se o botão **Continuar com Google** estiver disponível e a conta Google estiver ligada a um Parceiro, entras nessa conta.

Google autentica; **não promove** automaticamente uma conta nova a Parceiro.

[SCREENSHOT — Continuar com Google]

---

# 4. Conta e métodos de entrada

Em **Menu → Conta** podes ver e gerir, conforme a conta:

- nome;  
- papel **Parceiro**;  
- métodos de início de sessão (palavra-passe e Google);  
- definir ou alterar a palavra-passe;  
- **Sair** (também no menu lateral).

[SCREENSHOT — Conta do Parceiro]  
[SCREENSHOT — Métodos de início de sessão]

---

# 5. Recuperar a palavra-passe

No login existe **Esqueci-me da palavra-passe**.

O fluxo pede um código para o telemóvel, valida e permite definir nova palavra-passe.

[PENDENTE — SMS REAL]

Em produção, o envio do código depende do SMS real. Enquanto estiver pendente, a app pode dizer que não consegue enviar o código.

[SCREENSHOT — Recuperar palavra-passe]

---

# 6. Menu e navegação

## Barra inferior

| Entrada | Para quê |
|---------|----------|
| **Início** | Resumo, alertas, viagens activas |
| **Frota** | Motoristas, mapa, associar, viaturas |
| **Caixa** | Mensagens (com contador de não lidas, quando existir) |
| **Menu** | Abre o menu lateral |

## Menu lateral (Operação / Conta / App)

- **Frota** · **Viagens** · **Relatórios** · **Caixa de entrada**  
- **Conta** · **Definições**  
- **Sair**

[SCREENSHOT — Menu do Parceiro]

---

# 7. Dashboard / visão geral

No **Início** podes ver:

### Viagens activas

Cartão com o número de viagens activas e atalho **Acompanhar**.

### Resumo operacional

Indicadores reais na app, por exemplo:

- Viagens hoje  
- Total viagens  
- Concluídas / Canceladas  
- Motoristas activos (GPS)  
- Total motoristas  
- Concluídas hoje  
- **Valor das viagens hoje (€)** — soma do preço das viagens concluídas hoje (preço final, ou estimativa se o final ainda não existir)

Este valor é o **preço das viagens** somado. **Não** é transferência para a frota nem pagamento automático.

### Alertas operacionais

Avisos sobre documentos de motorista, documentos de viatura, GPS antigo ou viagens problemáticas. Podes abrir o detalhe a partir do alerta.

[SCREENSHOT — Dashboard do Parceiro]  
[SCREENSHOT — Alertas operacionais]

---

# 8. Frota — lista e mapa

Em **Frota** tens atalhos para:

| Acção | O que faz |
|-------|-----------|
| **Lista motoristas** | Frota completa, filtros e detalhe |
| **Mapa live** | Onde estão os motoristas (e recolhas de viagens em curso) |
| **Associar à frota** | Procurar motorista com conta e associar |
| **Viaturas** | Criar, editar e associar |

### Filtros da lista

Todos · Ativos · Online · Offline · Em viagem

Podes pesquisar por nome ou telefone.

[SCREENSHOT — Lista de motoristas]  
[SCREENSHOT — Mapa live da frota]

---

# 9. Associar motorista à frota

Em **Associar à frota**:

1. Procura por **nome ou telefone**.  
2. Só aparecem motoristas **já aprovados** que **ainda não** estão na tua frota.  
3. Carrega em **Associar à frota**.

A app **não cria** uma conta nova. Se ninguém corresponder, a mensagem explica que só aparecem contas já existentes e aprovadas.

[SCREENSHOT — Associar motorista à frota]

---

# 10. Detalhe do motorista

No detalhe vês, entre outros:

- telefone;  
- estado na frota (Aprovado / Rejeitado / Pendente);  
- disponibilidade na app;  
- localização recente (se existir);  
- viatura associada;  
- viagem activa (atalho para o detalhe);  
- contagens de viagens da frota (concluídas / canceladas);  
- documentos do motorista;  
- envio de aviso;  
- (quando aplicável) orçamento de zona e pedidos de extensão.

[SCREENSHOT — Detalhe do motorista]

---

# 11. Aprovar / activar / desactivar

No detalhe existe **Ativar / desativar na frota**:

- **Ativar** — o motorista fica activo na frota (estado aprovado).  
- **Desativar** — o motorista fica rejeitado na frota: deixa de operar; a app força-o offline e as ofertas em aberto deixam de ser válidas para ele.

Isto **não** é o mesmo que **Remover da frota** (secção 15).

Um motorista ainda **pendente** de aprovação inicial da plataforma não é «aprovado» por este interruptor da mesma forma que um fluxo administrativo completo — se a app não deixar alterar, respeita a mensagem mostrada.

[SCREENSHOT — Ativar / desativar motorista]

---

# 12. Disponibilidade forçada (online / offline)

Podes **Colocar online** ou **Colocar offline** um motorista da frota.

Para colocar **online**, a app pode bloquear se:

- o motorista tem viagem activa;  
- não há viatura activa associada;  
- a viatura está inactiva;  
- a documentação da viatura está em falta, caducada ou rejeitada.

Nesse caso, a app mostra o motivo e, quando fizer sentido, um atalho para as viaturas.

[SCREENSHOT — Forçar online / offline]

---

# 13. Documentos do motorista

No detalhe, secção **Motorista (documentos)**.

Documentos típicos (os mesmos que o motorista envia):

- Carta TVDE  
- Certificado motorista TVDE  
- Seguro de responsabilidade civil  
- Inspeção da viatura  
- Cartão de cidadão  
- Registo criminal  

Estados que a app mostra: em falta, em revisão, aprovado, rejeitado, expirado.

Podes:

- ver o ficheiro enviado;  
- **Aprovar** ou **Rejeitar**;  
- guardar **validade** e notas;  
- distinguir **motivo para o motorista** e **nota interna** (secção 14).

Para aprovar, o ficheiro tem de estar carregado. Se estiver em falta, a app pede o envio pelo motorista.

[SCREENSHOT — Documento do motorista]

---

# 14. Motivo público vs nota interna

Ao rejeitar ou gerir um documento, a app separa dois campos:

| Campo na app | Quem vê |
|--------------|---------|
| **Motivo para o motorista** | O motorista vê este texto na app dele |
| **Nota interna** | Só a equipa (Parceiro / operação) — o motorista **não** vê |

Usa o motivo público para explicar ao motorista o que corrigir.  
Usa a nota interna para contexto da frota (não partilhar com o motorista).

[SCREENSHOT — Motivo público e nota interna]

---

# 15. Remover motorista da frota

Acção correcta na app: **Remover da frota**.

Não uses a ideia de «eliminar motorista»: a conta **não é apagada**.

### O que acontece

1. Confirmas no diálogo **Remover este motorista da frota?**  
2. O motorista deixa de estar associado a **esta** frota e passa para a frota por defeito da plataforma.  
3. A **viatura activa**, se existir, **deixa de estar associada**.  
4. A **conta** do motorista **mantém-se**.  
5. O histórico de viagens já registadas **não é apagado**.

### Quando a app impede

Se o motorista tem **viagem activa**, a app pede para concluir ou cancelar a viagem antes de remover.

[SCREENSHOT — Remover motorista da frota]

---

# 16. Viaturas

Em **Frota → Viaturas** vês a lista da frota: matrícula, estado (activa / inactiva), motorista associado (ou sem motorista), categorias, lugares, e estado dos documentos.

[SCREENSHOT — Lista de viaturas]

---

# 17. Criar, activar e desactivar viatura

### Criar

**Nova viatura** — preenche pelo menos:

- matrícula;  
- marca;  
- modelo;  
- categorias de serviço;  
- lugares de passageiros (1 a 8).

Ano e cor são opcionais. A matrícula tem de ser única na plataforma.

### Activar / desactivar

Ao editar, podes deixar a viatura **Activa** ou **Inactiva**.

Uma viatura inactiva impede o motorista associado de ser colocado online (e afecta a capacidade de operar).

[SCREENSHOT — Criar / editar viatura]

---

# 18. Associar viatura a motorista

Na ficha da viatura:

1. Em **Associar motorista**, escolhe um motorista da frota.  
2. Carrega em **Associar**.  
3. Para retirar: **Desassociar**.

Regras reais:

- uma viatura só pode estar associada a **um** motorista de cada vez;  
- se o motorista já tiver outra viatura, a associação anterior é substituída;  
- se a viatura já estiver noutro motorista, a app mostra erro.

A associação / troca é feita **pelo Parceiro**, não pelo Motorista na app dele.

[SCREENSHOT — Associar viatura]

---

# 19. Documentos da viatura

Em cada viatura, **Documentos**. Tipos previstos:

- DUA / Certificado de Matrícula  
- Seguro TVDE  
- Inspeção Periódica Obrigatória  
- Dístico TVDE / Identificação TVDE  

Podes adicionar, editar, enviar ficheiro (PDF, JPG ou PNG, até 5 MB), descarregar e remover.

Estados úteis: em falta, pendente, válido, a expirar, expirado, rejeitado.

Há um campo de **Notas** (para a frota). Não é o mesmo par «motivo para o motorista / nota interna» dos documentos pessoais do motorista.

Documentação em falta, caducada ou rejeitada pode bloquear colocar o motorista online.

[SCREENSHOT — Documento da viatura]

---

# 20. Viagens

Em **Viagens** tens:

- **Resumo** — totais do conjunto carregado;  
- **Lista** — até **500** viagens mais recentes, com filtros;  
- **Exportar** — ficheiro CSV (histórico completo ou filtrado).

### Filtros da lista

Todas · Em curso · Concluídas · Canceladas · Falhadas · Por aceitar

Podes filtrar por motorista, datas e pesquisar por motorista ou referência.

[SCREENSHOT — Lista de viagens]

---

# 21. Detalhe da viagem e reatribuição

No detalhe podes ver, entre outros:

- estado;  
- **Preço** (final ou estimativa);  
- motorista e referência do passageiro;  
- recolha e destino (abrir no mapa);  
- viatura;  
- animal / portagens / detalhe de tarifa, quando existirem;  
- datas (criada, início, concluída);  
- recusas de oferta;  
- dados de cancelamento, se a viagem foi cancelada.

### Reatribuir

Se a viagem está **Por aceitar** (atribuída, ainda sem aceite), podes **Reatribuir viagem** a outro motorista **aprovado** da frota.

Se a viagem já passou desse estado, a reatribuição deixa de estar disponível.

O Parceiro **não** altera manualmente o estado para «concluída» ou «cancelada» neste ecrã.

[SCREENSHOT — Detalhe da viagem]  
[SCREENSHOT — Reatribuir viagem]

---

# 22. Cancelamentos

O Parceiro **vê** cancelamentos no detalhe da viagem (motivo, quem cancelou, detalhe quando existir).

O Parceiro **não cancela** a viagem pela interface actual.

### Piloto — taxa de cancelamento

Em certos cancelamentos do passageiro (depois de aceite), a app pode **registar** uma taxa de **3,00 €**.

No **piloto actual**, essa taxa **não é cobrada**. Isto não é a política definitiva: quando a cobrança real estiver activa, os manuais devem ser actualizados.

[PENDENTE — STRIPE LIVE]

[SCREENSHOT — Detalhe de viagem cancelada]

---

# 23. Valores e rendimentos

O que o Parceiro vê hoje:

| Onde | O que aparece |
|------|----------------|
| Detalhe da viagem | **Preço** (final ou estimativa) e, quando existir, detalhe (subtotal, portagens, suplementos, total) |
| Início / Relatórios | **Valor das viagens hoje (€)** — soma dos preços das viagens concluídas hoje |

A app do Parceiro **não mostra**, neste momento, os campos separados **Parte do motorista** e **Comissão da plataforma** (esses termos aparecem noutros papéis / ecrãs quando os valores existem).

Não interpretamos o «valor das viagens» como receita líquida da frota nem como dinheiro já transferido.

[SCREENSHOT — Valores da viagem]  
[SCREENSHOT — Valor das viagens hoje]

---

# 24. Pagamentos automáticos — estado actual

[PENDENTE — PAGAMENTOS AUTOMÁTICOS]

Ver preços e totais na app **não** significa que a frota ou o motorista recebam transferências automáticas.

Enquanto os pagamentos automáticos não estiverem fechados, a gestão de liquidação continua fora deste fluxo da app (ou por processo operacional à parte).

---

# 25. Caixa e comunicação com motoristas

### O que existe

- **Caixa de entrada** — mensagens enviadas pelos motoristas à frota; podes marcar como lidas; há contador de não lidas na barra.  
- **Aviso a um motorista** — no detalhe do motorista: título, mensagem, prioridade normal ou alta.  
- **Aviso a toda a frota** — na área de mensagens: envio em massa aos motoristas da frota.

### O que não é

Não é um chat com threads, confirmações de leitura garantidas ou respostas encadeadas como numa conversa de mensagens instantâneas. São **avisos / mensagens** com lista de entrada e envio.

As notificações push para o Parceiro **não** estão fechadas como produto neste ecrã — acompanha a Caixa na app.

[SCREENSHOT — Caixa / comunicação]

---

# 26. Relatórios e exportação

Em **Relatórios** (e em Viagens → Exportar):

- resumo da frota (viagens, taxa de conclusão aproximada, valor das viagens hoje, etc.);  
- **Descarregar viagens (CSV)** — histórico completo ou só o conjunto filtrado.

A lista no ecrã mostra no máximo 500 viagens recentes; o CSV pode ir além dessa amostra.

[SCREENSHOT — Relatórios e exportação CSV]

---

# 27. Zonas (orçamento e extensão)

No detalhe do motorista, quando existirem dados de zona:

- vês mudanças de zona usadas / máximas no dia;  
- podes autorizar **+1 mudança** para o dia actual;  
- podes **aprovar extensão** de prazo (minutos extra) se houver pedido.

Se a secção não tiver dados, a app indica que o orçamento não está disponível.

[SCREENSHOT — Orçamento de zona do motorista]

---

# 28. Horas de condução

Na app do **Parceiro**, **não** existe ecrã para gerir ou bloquear horas de condução.

Do lado do Motorista, a app pode acompanhar tempos e mostrar avisos. O **bloqueio automático** por limite de horas **ainda não está activo** por defeito.

Não assumes que a frota impede automaticamente a condução só por um limite de horas neste papel.

---

# 29. Notificações

As notificações estão disponíveis quando a aplicação está correctamente configurada e o dispositivo tem as permissões activas — e só para os papéis / eventos em que estão ligadas.

Para o Parceiro, o acompanhamento principal é **na app** (Início, alertas, Caixa com mensagens por ler).

### Android

Não assumes que vais receber sempre um aviso push enquanto geres a frota.

### iPhone

[PENDENTE — PUSH IOS]

---

# 30. Conta

Em **Conta**:

- perfil do gestor de frota;  
- métodos de entrada;  
- alteração de palavra-passe;  
- saída da sessão.

Em **Definições**, a app actual oferece sobretudo actualizar a vista; Conta e sessão ficam em Conta.

[SCREENSHOT — Conta do Parceiro]

---

# 31. Problemas comuns

### Não consigo entrar como Parceiro

Confirma o tipo **Parceiro** no login e que a conta foi criada pela operação com acesso a uma frota.

### Não encontro o motorista para associar

Só aparecem motoristas **já aprovados** e **ainda fora** da tua frota. A app não cria contas neste ecrã.

### Não consigo colocar o motorista online

Verifica viagem activa, viatura activa associada e documentos da viatura.

### Não consigo remover da frota

Se há viagem activa, conclui ou trata o cancelamento da viagem primeiro (pelo fluxo normal da viagem — o Parceiro não cancela no detalhe).

### Não vejo parte do motorista / comissão

Esses campos separados **não** estão no ecrã do Parceiro hoje. Vês preço da viagem e totais brutos.

### Não recebo o código de recuperação

[PENDENTE — SMS REAL]

---

# 32. Segurança

- Não partilhes palavra-passe nem códigos.  
- Notas internas de documentos não devem ser partilhadas com o motorista.  
- Usa **Motivo para o motorista** só com informação que ele pode ver.  
- Ao sair, usa **Sair** no menu.  
- Se precisares de suporte, indica a **versão da aplicação** do ecrã de login.

---

# 33. O que ainda não está fechado

## [PENDENTE — SMS REAL]

Códigos de recuperação / OTP em produção.

## [PENDENTE — STRIPE LIVE]

Cobrança real ao passageiro (impacto em taxas e fecho financeiro).

## [PENDENTE — PAGAMENTOS AUTOMÁTICOS]

Transferências automáticas para frota / motorista.

## [PENDENTE — PUSH IOS]

Notificações no iPhone.

## Horas de condução (bloqueio)

Avisos podem existir no Motorista; **enforcement** OFF; o Parceiro não gere este tema na app.

## Conta de Parceiro

Criação / onboarding continua a ser processo operacional da plataforma, não registo público.

---

# 34. Versão do manual

| Campo | Valor |
|-------|--------|
| Manual | Parceiro / Frota |
| App | VAMULÁ |
| Versão do manual | 0.1 |
| Data | Outubro 2026 |
| Base | Comportamento da app após PR-UX-01 a PR-UX-28 e tip da `main` com Manual do Motorista |

### Estado

- Fluxos principais: preenchidos e reconciliados com a app  
- Screenshots: pendentes  
- SMS / Stripe live / Push iOS / pagamentos automáticos: pendentes  
- Comissão e parte do motorista no ecrã Parceiro: não apresentados hoje  
- Cancelamento de viagem pelo Parceiro: não existe  

Actualizar este ficheiro quando o comportamento do Parceiro / Frota mudar de forma visível.
