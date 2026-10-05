# Manual do Motorista — VAMULÁ

**Versão:** 0.1  
**Data:** Outubro 2026  
**Estado:** Alinhado com a app actual · screenshots por capturar · algumas áreas ainda dependem de produção

> Este manual descreve o que a aplicação **faz hoje** para quem conduz (Motorista).  
> As marcações `[PENDENTE …]` e `[FUTURO …]` não são promessas: indicam o que ainda não está fechado em produção.

---

# Índice

1. Visão geral  
2. Entrar na app  
3. Conta e métodos de entrada  
4. Recuperar a palavra-passe  
5. Ecrã principal e menu  
6. O que precisas para trabalhar  
7. Disponibilidade  
8. Motivos de bloqueio  
9. Receber ofertas  
10. Aceitar uma viagem  
11. Deslocação para o passageiro  
12. Chegada ao local  
13. Iniciar viagem  
14. Durante a viagem  
15. Terminar viagem  
16. Navegação externa  
17. Cancelamentos e situações excepcionais  
18. Horas de condução e descanso  
19. Documentos  
20. Viatura  
21. Valores e rendimentos  
22. Notificações  
23. SOS — Emergência  
24. Histórico, caixa e actividade  
25. Problemas comuns  
26. Segurança  
27. O que ainda não está fechado  
28. Versão do manual  

---

# 1. Visão geral

Com a app VAMULÁ, o motorista pode:

- entrar com telemóvel e palavra-passe, ou com Google (se a conta já for de Motorista);
- gerir a Conta e os métodos de entrada;
- enviar e acompanhar documentos;
- ficar disponível ou indisponível;
- receber ofertas de viagem;
- aceitar, conduzir e concluir viagens;
- abrir navegação (Waze ou Google Maps);
- ver valores apresentados (preço, parte do motorista, comissão);
- consultar histórico e caixa de entrada da frota;
- usar o SOS em viagem activa, quando disponível.

[SCREENSHOT — Dashboard do Motorista]

---

# 2. Entrar na app

No ecrã de entrada, escolhe o tipo **Motorista**.

## 2.1 Com telemóvel e palavra-passe

1. Introduz o telemóvel.  
2. Introduz a palavra-passe.  
3. Carrega em **Entrar**.

A app pode pedir a aceitação dos Termos e da Privacidade quando for necessário.

[SCREENSHOT — Login do Motorista]

## 2.2 Com Google

Carrega em **Continuar com Google**.

- Se o Google já estiver ligado a uma conta **Motorista**, entras nessa conta.  
- Google **não transforma** uma conta nova em Motorista. Uma conta criada só com Google fica como Passageiro.  
- Para conduzir, a conta tem de ser Motorista (aprovação / processo da plataforma e da frota).

[SCREENSHOT — Continuar com Google]

---

# 3. Conta e métodos de entrada

Na área **Conta** (perfil / menu) podes ver e gerir, conforme a conta:

- nome;  
- telemóvel (alteração só pela operação);  
- papel **Motorista**;  
- métodos de início de sessão (palavra-passe e Google);  
- definir ou alterar a palavra-passe;  
- **Sair** (termina a sessão).

[SCREENSHOT — Conta do Motorista]  
[SCREENSHOT — Métodos de início de sessão]

---

# 4. Recuperar a palavra-passe

No login existe **Esqueci-me da palavra-passe**.

O fluxo é o mesmo dos outros papéis: pedir código para o telemóvel, validar, definir nova palavra-passe.

[PENDENTE — SMS REAL]

Em produção, o envio do código depende do SMS real. Enquanto estiver pendente, a app pode dizer que não consegue enviar o código.

[SCREENSHOT — Recuperar palavra-passe]

---

# 5. Ecrã principal e menu

O ecrã principal combina mapa e estado de disponibilidade.

Na barra / menu costumas ter acesso a:

| Entrada | Para quê |
|---------|----------|
| **Início** | Mapa, disponibilidade, ofertas e viagem activa |
| **Rendimentos** | Totais e valores apresentados |
| **Caixa** / **Caixa de entrada** | Mensagens da frota |
| **Menu** | Viagens, documentos, navegação, zonas, categorias, Conta, definições |

[SCREENSHOT — Menu do Motorista]

---

# 6. O que precisas para trabalhar

Para receber e aceitar viagens, a app e a frota esperam, em regra:

1. Conta de Motorista **aprovada** (não rejeitada / desactivada pela frota).  
2. **Documentos** pessoais obrigatórios **aprovados**.  
3. **Viatura activa** associada pela frota.  
4. Documentação da viatura em ordem, quando a frota/plataforma exige.  
5. **Disponibilidade** ligada (**Disponível**).  
6. **Localização** activa no telemóvel — sem posição recente, podes ficar online mas **não recebes** ofertas baseadas na tua zona.  
7. Sem viagem activa que impeça novas ofertas.

Se algo faltar, a app mostra o motivo e o próximo passo (ver secção 8).

---

# 7. Disponibilidade

## 7.1 Controlo

Podes passar entre:

- **Disponível**  
- **Indisponível** / **Offline**

Com botões ou toques no mapa, por exemplo:

- **Ficar disponível**  
- **Ficar indisponível**

O estado é guardado no servidor: se mudares de ecrã ou reabrires a app, a disponibilidade volta a sincronizar.

Ao ficares disponível, a app pode pedir permissão para notificações (no telemóvel com app instalada).

[SCREENSHOT — Motorista disponível]  
[SCREENSHOT — Motorista indisponível]

## 7.2 Quando estás disponível

- A app procura ofertas próximas (com localização).  
- Podes aceitar viagens, se as outras condições estiverem cumpridas.

## 7.3 Quando estás indisponível

- Não recebes novas ofertas.  
- Se já tiveres viagem activa, essa viagem continua a ser acompanhada no ecrã.

---

# 8. Motivos de bloqueio

A app impede ou avisa conforme o caso. Exemplos reais:

### Documentos

Mensagem típica: *Não podes ficar disponível porque há documentos … (em falta / por rever / recusados / expirados).*  
Próximo passo: *Vai a Documentos, no menu, para resolver o que falta.*

### Viatura

- *Não tens um veículo activo associado. Pede ao Partner…*  
- *O veículo associado está inactivo. Pede ao Partner…*  
- *O veículo tem documentação em falta, caducada ou rejeitada. Pede ao Partner…*

### Limite de condução / repouso

Ver secção 18. Hoje o **bloqueio automático** por horas **não está activo** por defeito: podes ver avisos e ainda assim poder trabalhar. Só com bloqueio activo a app impede ficar disponível / aceitar.

### Conta / frota

Se a frota te desactivar, deixas de operar como motorista dessa frota (ficas indisponível e as ofertas acabam).

[SCREENSHOT — Bloqueio por documentos]  
[SCREENSHOT — Bloqueio por viatura]

---

# 9. Receber ofertas

Quando estás disponível e elegível, pode aparecer um **pedido disponível**.

A oferta pode mostrar, entre outros:

- recolha e destino;  
- categoria;  
- **Preço estimado da viagem**;  
- tempo até expirar (por exemplo *Expira em … s*);  
- indicação de animal, se for o caso.

Acções possíveis na app de hoje:

| Acção | O que faz |
|-------|-----------|
| **ACEITAR** / **Aceitar** | Aceitas a viagem |
| **Recusar** | Recusas a oferta (em viagens com animal, a app pode pedir um motivo) |
| **Silenciar** | Escondes a oferta nesta sessão; **não** é o mesmo que recusar — a oferta pode continuar válida até expirar |

Se a oferta expirar, deixa de poder ser aceite.

[SCREENSHOT — Oferta de viagem]  
[SCREENSHOT — Oferta a expirar]

As notificações de nova oferta dependem do dispositivo e das permissões — ver secção 22.

---

# 10. Aceitar uma viagem

1. Abre a oferta.  
2. Carrega em **Aceitar** / **ACEITAR**.  
3. Se a aceitação for bem-sucedida, o estado passa a algo como **A caminho do passageiro**.  
4. A app pode abrir a navegação até à recolha (se a preferência «abrir ao aceitar» estiver activa).

Se a aceitação falhar (viatura, documentos, rede, etc.), a app mostra a mensagem correspondente.

[SCREENSHOT — Viagem aceite]

---

# 11. Deslocação para o passageiro

Estado típico: **A caminho do passageiro**.

Podes:

- usar **Navegar até à recolha**;  
- cancelar a viagem, enquanto a app ainda o permitir (ver secção 17);  
- quando chegares perto, preparar a confirmação de chegada ou o início.

[SCREENSHOT — Motorista a caminho]

---

# 12. Chegada ao local

Quando estiveres no ponto de recolha, carrega em **Cheguei**.

O estado passa a algo como **No local de recolha**.

[SCREENSHOT — Motorista a chegar / Cheguei]

---

# 13. Iniciar viagem

Carrega em **Iniciar viagem** quando o passageiro estiver contigo.

A app pode exigir que estejas **perto do ponto de recolha** (cerca de 70 metros). Se estiveres longe, aparece um aviso para te aproximares.

Em alguns casos, se já estiveres perto, podes iniciar a partir do estado «a caminho» sem um passo separado de «Cheguei».

[SCREENSHOT — Iniciar viagem]

---

# 14. Durante a viagem

Estado: **Em viagem**.

Podes:

- acompanhar o percurso;  
- usar **Navegar até ao destino**;  
- usar o **SOS** (secção 23).

Neste estado **não** há botão de cancelar pelo motorista na interface actual.

[SCREENSHOT — Viagem em curso]

---

# 15. Terminar viagem

No destino, carrega em **Terminar viagem**.

A viagem passa a **Viagem concluída**. Os valores finais podem aparecer no detalhe / histórico.

Depois, a disponibilidade é reavaliada (documentos, viatura, etc.).

[SCREENSHOT — Terminar viagem]  
[SCREENSHOT — Viagem concluída]

---

# 16. Navegação externa

Na configuração **Navegação** (menu) podes:

- escolher preferência **Waze** ou **Google Maps**;  
- activar ou desactivar **abrir a recolha ao aceitar** a viagem.

Comportamento actual:

- ao **aceitar**, a app pode abrir a navegação até à recolha (se a opção estiver activa);  
- **não** há segunda abertura automática ao iniciar a viagem;  
- podes **reabrir** manualmente: **Navegar até à recolha** ou **Navegar até ao destino**.

Se a app de mapas não abrir, confirma se está instalada e tenta de novo.

[SCREENSHOT — Preferência de navegação]  
[SCREENSHOT — Navegar até à recolha]

---

# 17. Cancelamentos e situações excepcionais

### Cancelar como motorista

Podes cancelar enquanto a viagem está atribuída, a caminho ou no local de recolha (não em viagem em curso).

1. Abre o cancelamento.  
2. Escolhe um motivo (por exemplo imprevisto, problema com o veículo, passageiro não compareceu, ou outro).  
3. Confirma.

Se a rede falhar, a app pode pedir para **verificares o estado da viagem** antes de tentares outra vez.

### Outras situações

- O **passageiro** pode cancelar — a viagem termina do teu lado.  
- A oferta pode **expirar** se ninguém aceitar a tempo.  
- A frota pode **desactivar** o motorista — ficas sem operar nessa frota.  
- Se a viagem já estiver cancelada ou inválida, a app actualiza o ecrã.

[SCREENSHOT — Cancelar viagem]  
[SCREENSHOT — Confirmar cancelamento]

---

# 18. Horas de condução e descanso

A app **acompanha** o tempo em viagem activa e **pode mostrar avisos**.

No ecrã podes ver, por exemplo:

- aviso de tempo acumulado;  
- mensagem de limite atingido;  
- indicação de repouso, quando existir.

### Estado actual importante

**O bloqueio automático por limite de horas ainda não está activo** (por defeito).

Isto significa:

- podes ver avisos e continuares a poder ficar disponível e aceitar viagens;  
- a app **não** deve ser descrita como a impedir automaticamente a condução só por atingir o limite, enquanto o bloqueio automático não estiver ligado.

Se no futuro o bloqueio for activado, a mensagem muda para impedir disponibilidade e novas aceitações até ao fim do repouso — e este manual será actualizado.

[SCREENSHOT — Horas de condução]  
[SCREENSHOT — Aviso de tempo de condução]

---

# 19. Documentos

Em **Menu → Documentos** vês os documentos exigidos, por exemplo:

- Carta TVDE  
- Certificado motorista TVDE  
- Seguro de responsabilidade civil  
- Inspeção da viatura  
- Cartão de cidadão  
- Registo criminal  

Estados que a app mostra:

| Estado | Significado simples |
|--------|---------------------|
| Em falta | Ainda não enviaste |
| Em revisão | À espera da frota |
| Aprovado | Aceite |
| Rejeitado / Recusado | Tens de corrigir e voltar a enviar |
| Expirado | Precisas de documento válido |

Podes enviar ficheiro (por exemplo PDF ou imagem, dentro dos limites da app) com **Enviar para revisão da frota**.

Se for **recusado**, a app pode mostrar o **motivo público**. Notas internas da frota ou da operação **não** te são mostradas.

[SCREENSHOT — Lista de documentos]  
[SCREENSHOT — Documento recusado com motivo]  
[SCREENSHOT — Enviar documento]

---

# 20. Viatura

A associação e activação da viatura são feitas pela **frota (Partner)**.

Tu vês o efeito no trabalho:

- sem viatura activa → não consegues ficar a operar / aceitar;  
- viatura inactiva ou com documentos em falta → a app pede para contactares o Partner.

Não assumes que podes trocar de viatura sozinho na app do Motorista, salvo se a frota te associar outra.

[SCREENSHOT — Mensagem sem viatura activa]

---

# 21. Valores e rendimentos

A app usa linguagem clara:

| Termo | Onde aparece |
|-------|----------------|
| **Preço estimado da viagem** | Na oferta |
| **Preço da viagem** | No detalhe / histórico |
| **Parte do motorista** | Quando o valor está disponível |
| **Comissão da plataforma** | Quando o valor está disponível |

Em **Rendimentos** podes ver totais e listas com estes valores, quando existirem.

[PENDENTE — PAGAMENTOS AUTOMÁTICOS]

Ver valores na app **não** significa que já exista transferência automática para a tua conta. O pagamento automático ao motorista (por exemplo via conta ligada) ainda não faz parte do dia a dia da app.

[SCREENSHOT — Oferta com preço estimado]  
[SCREENSHOT — Rendimentos]  
[SCREENSHOT — Detalhe com parte do motorista]

---

# 22. Notificações

As notificações estão disponíveis quando a aplicação está correctamente configurada e o dispositivo tem as permissões activas.

Não assumes que vais receber **sempre** um aviso: acompanha também o ecrã da app.

### Android

Podes receber avisos (por exemplo nova oferta) nas condições acima.

### iPhone

[PENDENTE — PUSH IOS]

As notificações no iPhone ainda não estão fechadas. Até lá, acompanha as ofertas e a viagem no ecrã.

---

# 23. SOS — Emergência

Em viagem activa (estados **a caminho**, **no local** ou **em viagem**), podes abrir:

**SOS — Emergência**

O painel deixa claro:

- em perigo imediato, **liga para o 112**;  
- **a chamada não é iniciada automaticamente**.

Acções reais na app:

1. **Ligar 112** — abre a chamada no telemóvel.  
2. **Partilhar dados da viagem** — partilha um texto com dados úteis da viagem (e localização no mapa, se estiver disponível).  
3. **Fechar**.

Não promete contacto automático com autoridades além do que tu fizeres ao ligar o 112.

[SCREENSHOT — SOS Motorista]  
[SCREENSHOT — Painel de emergência]

---

# 24. Histórico, caixa e actividade

### Viagens / histórico

Em **Viagens** vês viagens anteriores, estados e valores quando existirem.

### Caixa de entrada

Mensagens enviadas pela frota.

### Registo de actividade

Registo local de eventos da sessão (útil para suporte). Não é um diário legal oficial.

[SCREENSHOT — Histórico de viagens]  
[SCREENSHOT — Caixa de entrada]

---

# 25. Problemas comuns

### Não consigo ficar disponível

Verifica documentos, viatura com o Partner, e se a conta está activa na frota.

### Não recebo ofertas

Confirma: estás **Disponível**? Localização ligada? Há pedidos na zona? Documentos e viatura em ordem?

### Não consigo iniciar a viagem

Aproxima-te do ponto de recolha (cerca de 70 m) e tenta de novo.

### A navegação não abre

Confirma se o Waze ou o Google Maps está instalado e a preferência no menu Navegação.

### Não recebo o código de recuperação

[PENDENTE — SMS REAL]

### Não recebo notificações

Verifica permissões do telemóvel. No iPhone, push ainda está pendente.

---

# 26. Segurança

- Não partilhes palavra-passe nem códigos.  
- Usa o SOS e o 112 em emergência real.  
- Aceita Termos e Privacidade quando a app o pedir.  
- Se precisares de suporte, indica a **versão da aplicação** do ecrã de login.

---

# 27. O que ainda não está fechado

## [PENDENTE — SMS REAL]

Criação / recuperação por código em produção.

## [PENDENTE — STRIPE LIVE]

Cobrança real ao passageiro (impacto indirecto no fecho das viagens).

## [PENDENTE — PAGAMENTOS AUTOMÁTICOS]

Transferência automática da parte do motorista.

## [PENDENTE — PUSH IOS]

Notificações fiáveis no iPhone.

## Bloqueio automático por horas de condução

A medição e os avisos existem; o **enforcement** (impedir trabalhar ao atingir o limite) **ainda não está activo** por defeito.

---

# 28. Versão do manual

| Campo | Valor |
|-------|--------|
| Manual | Motorista |
| App | VAMULÁ |
| Versão do manual | 0.1 |
| Data | Outubro 2026 |
| Base | Comportamento da app após PR-UX-01 a PR-UX-28 e tip actual da `main` |

### Estado

- Fluxos principais: preenchidos e reconciliados com a app  
- Screenshots: pendentes  
- SMS / Stripe live / Push iOS / payouts automáticos: pendentes  
- Bloqueio automático por horas: não activo  

Actualizar este ficheiro quando o comportamento do Motorista mudar de forma visível.
