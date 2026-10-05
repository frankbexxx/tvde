# Manual do Passageiro — VAMULÁ

**Versão:** 0.2  
**Data:** Outubro 2026  
**Estado:** Alinhado com a app actual · screenshots por capturar · algumas áreas ainda dependem de produção

> Este manual descreve o que a aplicação **faz hoje** para quem pede viagens (Passageiro).  
> As marcações `[PENDENTE …]` e `[FUTURO …]` não são promessas: indicam o que ainda não está fechado em produção.

---

# Índice

1. Visão geral  
2. Entrar na app  
3. Criar conta  
4. Recuperar a palavra-passe  
5. Ecrã principal e navegação  
6. Pedir uma viagem  
7. Aguardar motorista  
8. Motorista a caminho e a chegar  
9. Durante a viagem  
10. Viagem concluída  
11. Preço e pagamento  
12. Cancelar uma viagem  
13. Histórico  
14. Reclamações  
15. Conta  
16. Entrar com Google  
17. Notificações  
18. SOS — Emergência  
19. Problemas comuns  
20. Segurança e privacidade  
21. O que ainda não está fechado  
22. Versão do manual  

---

# 1. Visão geral

Com a app VAMULÁ, o passageiro pode:

- entrar com telemóvel e palavra-passe, ou com Google;
- pedir uma viagem (recolha, destino, categoria, opção de viajar com animal);
- acompanhar o estado da viagem em português claro;
- ver o motorista e a viatura quando estiverem disponíveis;
- consultar o preço estimado e o detalhe;
- cancelar quando a app o permitir;
- ver o histórico de viagens;
- apresentar uma reclamação a partir do detalhe de uma viagem;
- gerir a Conta (perfil, palavra-passe, métodos de entrada);
- usar o botão de emergência SOS, quando disponível no ecrã.

[SCREENSHOT — Ecrã principal do Passageiro]

---

# 2. Entrar na app

No ecrã de entrada, escolhe o tipo **Passageiro**.

## 2.1 Com telemóvel e palavra-passe

1. Introduz o telemóvel (formato português, por exemplo +351…).  
2. Introduz a palavra-passe.  
3. Carrega em **Entrar**.

Se for a primeira utilização após aceitar documentos legais, a app pode pedir a confirmação dos Termos e da Privacidade.

[SCREENSHOT — Login do Passageiro]

## 2.2 Com Google

Carrega em **Continuar com Google** e segue as instruções do Google.

- Se a conta Google já estiver ligada a uma conta VAMULÁ, entras nessa conta.  
- Se for a primeira vez, a app pode pedir nome, telemóvel e aceitação dos Termos — ver secção 3 e 16.

[SCREENSHOT — Continuar com Google]

---

# 3. Criar conta

Há dois caminhos principais.

## 3.1 Criar conta com Google (disponível)

1. Em **Passageiro**, carrega em **Continuar com Google**.  
2. Se o Google ainda não estiver ligado a nenhuma conta, escolhe **Criar nova conta**.  
3. Confirma o nome e o telemóvel português.  
4. Aceita os Termos e a Privacidade.  
5. Conclui o registo.

A conta criada desta forma fica como **Passageiro**. Entrar com Google noutro tipo de ecrã (Motorista, Parceiro, Admin) **não** transforma a conta nesse papel.

[SCREENSHOT — Concluir registo Google]

## 3.2 Criar conta com telemóvel e código

A app tem o fluxo de pedir um código para o telemóvel.

[PENDENTE — SMS REAL]

Em produção, o envio do código por SMS ainda não está activo. Enquanto isto não estiver resolvido, este caminho pode não funcionar fora de ambientes de teste.

Quando o SMS estiver activo, o fluxo esperado será:

1. pedir o código para o telemóvel;  
2. receber o SMS;  
3. introduzir o código;  
4. concluir os dados e criar a conta.

[SCREENSHOT — Criar conta com código (quando o SMS estiver activo)]

---

# 4. Recuperar a palavra-passe

No ecrã de login existe:

**Esqueci-me da palavra-passe**

Fluxo na app:

1. Abrir **Recuperar palavra-passe**.  
2. Introduzir o telemóvel.  
3. Carregar em **Enviar código**.  
4. A app mostra uma mensagem genérica: se existir conta associada, receberás um código (não revela se o número existe ou não).  
5. Introduzir o código.  
6. Definir a nova palavra-passe (mínimo 8 caracteres) e repetir.  
7. Guardar.  
8. Voltar ao início de sessão — a mensagem de sucesso diz que já podes iniciar sessão.

[PENDENTE — SMS REAL]

Em produção, o envio do código depende do SMS real. Enquanto estiver pendente, podes ver que «neste momento não conseguimos enviar o código».

[SCREENSHOT — Recuperar palavra-passe]

---

# 5. Ecrã principal e navegação

Na barra inferior tens, em regra:

| Separador | Para quê |
|-----------|----------|
| **Início** | Pedir e acompanhar a viagem |
| **Histórico** | Viagens anteriores |
| **Conta** | Perfil, palavra-passe e métodos de entrada |
| **Menu** | Atalhos (incluindo partilhar a app e outras opções) |

No **Início**, consoante o momento, vês pedido novo, procura de motorista, viagem activa ou viagem concluída.

[SCREENSHOT — Home Passageiro sem viagem]  
[SCREENSHOT — Home Passageiro com viagem activa]

---

# 6. Pedir uma viagem

## 6.1 Passos principais

1. Indica o ponto de **recolha** (texto, mapa ou localização).  
2. Indica o **destino**.  
3. Escolhe a **categoria** da viagem quando a app a apresentar (por exemplo GO, Comfort ou XL).  
4. Se viajares com animal, usa a opção **Viajo com animal** e responde às perguntas (porte, forma de transporte, se ocupa lugar no banco). Animal de assistência tem regras próprias na app.  
5. Consulta o **preço estimado** (total em primeiro plano; podes abrir o detalhe).  
6. Carrega em **Confirmar viagem**.

A app começa a procura de um motorista disponível.

Não inventamos um tempo de chegada fictício enquanto não houver motorista: a mensagem é factual, por exemplo «À procura de motorista disponível».

[SCREENSHOT — Pedido de viagem]  
[SCREENSHOT — Preço antes de confirmar]  
[SCREENSHOT — Opção viajar com animal]

## 6.2 O que a confirmação não faz (hoje)

Durante o piloto, confirmar a viagem **não cobra já** o valor completo da viagem. A mensagem na app deixa isso claro. A cobrança real em produção depende de Stripe live — ver secção 11.

---

# 7. Aguardar motorista

Depois de confirmar, o estado típico é:

**À procura de motorista**

Enquanto não houver motorista:

- a informação não promete minutos inventados;  
- podes cancelar sem taxa (ver secção 12);  
- se ninguém aceitar, a viagem pode falhar ou ficar cancelada — a app mostra o estado.

Quando um motorista aceita, o ecrã actualiza sozinho.

[SCREENSHOT — À procura de motorista]

---

# 8. Motorista a caminho e a chegar

Os estados que o passageiro vê em português incluem, entre outros:

| Estado na app | Significado simples |
|---------------|---------------------|
| Motorista atribuído | Já há motorista associado ao pedido |
| Motorista a caminho | O motorista aceitou e segue para a recolha |
| Motorista quase a chegar | Está perto / a chegar ao ponto de recolha |

Quando a informação estiver disponível, podes ver:

- nome do motorista;  
- dados da viatura;  
- matrícula;  
- posição no mapa, se a localização do motorista estiver a chegar.

[SCREENSHOT — Motorista a caminho]  
[SCREENSHOT — Motorista quase a chegar · identidade e viatura]

---

# 9. Durante a viagem

Quando a viagem arranca, o estado passa a:

**Viagem em curso**

Podes continuar a acompanhar o mapa e o estado até o motorista concluir a viagem. A localização depende do motorista e da ligação à Internet.

[SCREENSHOT — Viagem em curso]

---

# 10. Viagem concluída

Quando o motorista termina:

- o estado passa a **Viagem concluída**;  
- o preço final fica disponível quando a app o tiver;  
- a viagem entra no **Histórico**.

O estado do pagamento (por exemplo «A confirmar pagamento…» ou «Pagamento concluído») pode aparecer à parte do estado da viagem.

[SCREENSHOT — Viagem concluída]

---

# 11. Preço e pagamento

## 11.1 Preço

A app mostra primeiro o **total** da viagem.

Podes abrir o **detalhe** (informação expansível), que pode incluir, conforme o caso:

- base e componentes da tarifa;  
- distância e tempo;  
- mínimo da categoria;  
- suplemento de animal;  
- portagens, quando aplicáveis.

Os valores finais podem diferir ligeiramente da estimativa inicial (por exemplo portagens ou o percurso real).

[SCREENSHOT — Total da viagem]  
[SCREENSHOT — Detalhe do preço expandido]

## 11.2 Pagamento

[PENDENTE — STRIPE LIVE]

Em produção, a cobrança real com cartão ainda não está activa para operação comercial.

Durante o piloto / testes:

- a app deixa claro que **não há cobrança** ou que não é pedido cartão neste passo;  
- o fluxo de pagamento está preparado no sistema, mas o dinheiro real depende da activação Stripe live.

Não uses MB WAY neste manual: ainda não faz parte do primeiro piloto.

[FUTURO — MB WAY]

[SCREENSHOT — Pagamento (quando a cobrança real estiver activa)]

---

# 12. Cancelar uma viagem

Podes cancelar enquanto a app o permitir. Antes de confirmar, a app mostra um aviso claro.

### Sem taxa

Se a viagem ainda estiver a **procurar motorista** ou só com **motorista atribuído** (ainda sem aceitação efectiva):

- mensagem típica: *Podes cancelar esta viagem sem taxa.*

### Com taxa registada (piloto)

Se o motorista já aceitou e a viagem está **a caminho**, **quase a chegar** ou **em curso**:

- a regra regista uma taxa de **3,00 €**;  
- durante o **piloto**, a app indica que **este valor não é cobrado**.

Depois de confirmar o cancelamento, o estado passa a **Viagem cancelada**.

[SCREENSHOT — Cancelar viagem]  
[SCREENSHOT — Confirmação de cancelamento]

---

# 13. Histórico

No separador **Histórico** (também acessível pelo menu) vês viagens anteriores.

Em cada viagem podes ver, quando existir:

- recolha e destino;  
- data;  
- estado (por exemplo concluída ou cancelada);  
- preço;  
- indicação de animal, se aplicável;  
- motorista / viatura no detalhe, quando a app os tiver.

Abre o detalhe de uma viagem para mais informação ou para apresentar uma reclamação.

[SCREENSHOT — Histórico de viagens]  
[SCREENSHOT — Detalhe de uma viagem no histórico]

---

# 14. Reclamações

A partir do **detalhe de uma viagem** no Histórico, podes apresentar uma reclamação.

Podes:

- descrever a situação;  
- anexar ficheiros quando a app o permitir (por exemplo imagens ou PDF, dentro dos limites definidos).

O acompanhamento da reclamação é feito pelos canais da operação (por exemplo email de suporte). Esta versão da app **não** promete um painel separado de «estado da minha reclamação» para o passageiro.

[SCREENSHOT — Nova reclamação]

---

# 15. Conta

O separador **Conta** é o sítio para gerir a tua conta VAMULÁ.

Podes encontrar, conforme o que a conta tiver:

- dados do perfil (nome; o telemóvel só é alterado pela operação);  
- **métodos de início de sessão** (telemóvel / palavra-passe e Google);  
- definir ou alterar a palavra-passe;  
- adicionar ou gerir o Google, quando aplicável (pode pedir confirmação da palavra-passe).

[SCREENSHOT — Conta]  
[SCREENSHOT — Métodos de início de sessão]

---

# 16. Entrar com Google

Resumo das regras reais:

- Google serve para **entrar** ou **ligar** uma identidade à conta;  
- Google **não muda** o papel da conta (Passageiro continua Passageiro);  
- uma conta **nova** criada só com Google fica como Passageiro;  
- se o Google já estiver noutra conta VAMULÁ, a app não o liga a uma segunda conta;  
- podes ligar Google a uma conta existente (com palavra-passe), quando a app o pedir.

Na Conta podes gerir os métodos de entrada depois de teres sessão.

[SCREENSHOT — Escolher criar conta ou ligar conta existente]

---

# 17. Notificações

A app pode enviar avisos sobre a viagem (por exemplo quando o motorista aceita ou o estado muda), **quando as notificações estiverem activas no dispositivo**.

### Android

Há suporte para notificações no telemóvel Android (quando a app e as permissões estiverem correctamente configuradas).

### iPhone

[PENDENTE — PUSH IOS]

As notificações no iPhone ainda não estão fechadas. Até lá, não assumes que recebes avisos push no iOS: acompanha a viagem no ecrã da app.

---

# 18. SOS — Emergência

Quando estiveres numa viagem activa, a app pode mostrar o botão:

**SOS — Emergência**

Serve para situações de emergência: partilha informação útil de localização / contacto conforme o fluxo da app. Usa-o só em caso real de emergência e contacta também as autoridades quando for necessário.

[SCREENSHOT — Botão SOS]

---

# 19. Problemas comuns

### Não recebo o código

[PENDENTE — SMS REAL]

Em produção isto depende do envio real de SMS. Se a app disser que não consegue enviar o código, tenta mais tarde ou contacta o suporte.

### Não encontro motorista

Possíveis motivos:

- não há motoristas disponíveis na zona;  
- motoristas ocupados ou fora da área;  
- problemas temporários de rede ou localização.

Podes cancelar e tentar de novo mais tarde.

### A localização não actualiza

Verifica:

- localização ligada no telemóvel;  
- permissões da app / browser;  
- ligação à Internet.

### O pagamento «não funciona»

[PENDENTE — STRIPE LIVE]

Enquanto a cobrança real não estiver activa, não esperes um pagamento com cartão como num serviço comercial já em live. Segue as mensagens da app e o suporte.

### Erro ao cancelar

Se a rede falhar no momento do cancelamento, a app pode pedir para **verificares o estado da viagem** antes de tentares outra vez — não assumes sozinho se ficou cancelada ou não.

---

# 20. Segurança e privacidade

- Usa só a tua conta.  
- Não partilhes palavra-passe nem códigos de verificação.  
- Aceita os Termos e a Privacidade quando a app o pedir.  
- A app não deve mostrar ao passageiro códigos internos de sistema; se vires algo estranho, contacta o suporte e indica a **versão da aplicação** que aparece no ecrã de login.

Documentos públicos (quando publicados):

- Termos de utilização  
- Política de Privacidade  

(ligações na app / site VAMULÁ)

---

# 21. O que ainda não está fechado

## [PENDENTE — SMS REAL]

Necessário para:

- criação de conta por telemóvel com código, em produção;  
- recuperação de palavra-passe com código, em produção.

## [PENDENTE — STRIPE LIVE]

Necessário para:

- cobrança real ao passageiro em produção.

## [PENDENTE — PUSH IOS]

Necessário para:

- notificações fiáveis no iPhone.

## [FUTURO — MB WAY]

Não faz parte do primeiro piloto. Não está disponível na app de hoje.

---

# 22. Versão do manual

| Campo | Valor |
|-------|--------|
| Manual | Passageiro |
| App | VAMULÁ |
| Versão do manual | 0.2 |
| Data | Outubro 2026 |
| Base | Comportamento da app após PR-UX-01 a PR-UX-28 |

### Estado

- Estrutura e fluxos: preenchidos e reconciliados com a app  
- Screenshots: pendentes (marcações `[SCREENSHOT — …]` no texto)  
- SMS em produção: pendente  
- Cobrança Stripe live: pendente  
- Push iOS: pendente  

Actualizar este ficheiro sempre que o comportamento do Passageiro mudar de forma visível para o utilizador.
