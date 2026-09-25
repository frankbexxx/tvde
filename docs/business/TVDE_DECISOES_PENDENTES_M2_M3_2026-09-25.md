# TVDE — Documento de Decisões Pendentes
## M2 → Piloto Real → M3

**Data:** 2026-09-25  
**Estado base:** `main` alinhada com `origin/main` em `49bdd2a20804e0be2643289ccd029bd3e2218fe2`

Relacionado: [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) · [`TVDE_STATUS_SETEMBRO_2026.md`](../TVDE_STATUS_SETEMBRO_2026.md) · [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) · [`VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md`](VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md)

## Objectivo

Concentrar num único documento as decisões humanas ainda pendentes, separando:

- problema / variável;
- decisão a tomar;
- opções;
- impacto de cada opção;
- razão para decidir;
- momento recomendado;
- quem decide;
- dependências externas;
- próxima acção.

A ideia é não deixar itens eternamente marcados como “bloqueados”. Quando a decisão for interna, deve ser fechada. Quando depender de terceiros, deve ser transformada numa pergunta ou acção concreta.

# A. Decisões imediatas — fechar antes de avançar muito mais no M2

## A1. Android / packaging do piloto — `S-MOB-01`

### Problema / variável

Hoje a aplicação está funcional como web/PWA. O M2 prevê um package Android e testes reais em dispositivo.

Esta decisão desbloqueia directamente:

- `S-MOB-02` — testes em Android real;
- `S-QA-02` — testes em telemóvel;
- `S-NOTIF-01` — push notifications;
- futura publicação/distribuição.

### Decisão a tomar

Escolher o veículo de distribuição Android para o piloto.

### Opções

#### Opção A — Capacitor

A web-app actual é empacotada numa shell Android, mantendo React/Vite como base.

**Vantagens**
- maior reaproveitamento da aplicação actual;
- acesso a APIs nativas quando necessário;
- caminho natural para push, permissões, GPS/background e Play Store;
- evita reescrever a app.

**Desvantagens**
- introduz projecto Android e ciclo adicional de build;
- obriga a validar plugins/permissões;
- exige testes de lifecycle/background.

**Quando faz sentido**
- quando queremos continuar com a aplicação web como produto principal, mas precisamos de integração móvel real.

#### Opção B — wrapper/WebView mínimo

Empacotar a aplicação com a menor camada nativa possível.

**Vantagens**
- implementação inicial potencialmente mais curta;
- pouca alteração da app actual.

**Desvantagens**
- pode tornar-se limitativo quando entrarmos em push, GPS/background e integrações nativas;
- risco de termos de migrar depois para uma solução mais completa.

**Quando faz sentido**
- apenas se o package servir essencialmente para distribuição e as necessidades nativas forem mínimas.

#### Opção C — PWA instalável

Continuar apenas com a PWA instalada no Android.

**Vantagens**
- quase zero trabalho adicional;
- mantém uma única aplicação.

**Desvantagens**
- não satisfaz necessariamente o objectivo já definido de package Android;
- limita integração nativa, background e push;
- testes e distribuição ficam dependentes das capacidades do browser.

**Quando faz sentido**
- se redefinirmos explicitamente o M2 para aceitar PWA como entrega móvel.

### Decisão tomada — 2026-09-25

**DECIDIDO: Capacitor.**

- usar Capacitor;
- manter React/Vite como base;
- não fazer rewrite native;
- Capacitor é o veículo Android do piloto.

Objectivos seguintes, ainda por implementar: package Android, permissões, GPS/background conforme necessário, push, testes em device real, Play Store depois.

### Quem decide

Francisco + Manel. Decisão fechada.

### Próxima acção

**S-MOB-01 = BOOTSTRAP + DEVICE SMOKE PASS.** `appId` `pt.vamula.app`. APK debug no Oppo Reno 13 5G: app abre, `/config` responde, login de teste entra. A API PROD passou a incluir `https://localhost` em `CORS_ALLOWED_ORIGINS`, junto de `https://tvde-app-j51f.onrender.com` e `http://localhost:5173`.

**S-MOB-02 = PARTIAL** (2026-09-25). No mesmo Oppo: o login cabe em retrato, a localização foreground obtém posição, e o mapa desenha ruas. Google OAuth nativo, push, GPS background, Waze/Maps, file picker e Play Store continuam abertos.

---

## A2. Provider SMS / OTP — `S-AUTH-01`

### Problema / variável

O OTP existe tecnicamente em non-prod, mas está deliberadamente inactivo em produção. Não existe provider SMS real.

`L-SEC-12` = **CLOSED** (consumo OTP atómico, PR #659). OTP em PROD continua desactivado. O provider SMS continua pendente. Activar no futuro exige provider + smoke.

### Decisão a tomar

Escolher o fornecedor de SMS para Portugal.

### Variáveis a comparar

- custo por SMS;
- cobertura em Portugal;
- sender ID;
- entrega para números portugueses;
- API;
- callbacks de delivery;
- rate limits;
- facilidade de integração;
- suporte;
- RGPD / tratamento de dados;
- faturação empresarial;
- ambiente de teste;
- possibilidade de mudar de fornecedor mais tarde.

### Opções

#### Opção A — fornecedor internacional generalista

**Vantagens**
- documentação e tooling normalmente melhores;
- integração rápida;
- maior facilidade de desenvolvimento.

**Desvantagens**
- preço pode não ser o melhor para Portugal;
- sender e regras locais podem ser menos favoráveis.

#### Opção B — fornecedor europeu / português

**Vantagens**
- potencialmente melhor adequação local;
- suporte e faturação UE;
- possibilidade de melhores condições nacionais.

**Desvantagens**
- API/ecossistema pode ser mais limitado.

### Decisão

Não escolher pelo preço unitário apenas. O critério deve ser: **fiabilidade + integração + custo previsível no volume inicial**.

### Quem decide

Francisco.

### Dependência técnica

`L-SEC-12` = **CLOSED**. A activação continua à espera do provider SMS e de um smoke; o OTP em PROD não foi ligado.

### Próxima acção

Preparar shortlist de providers e custos para Portugal.

---

## A3. Aceitação de Termos e Privacidade — `M2.11`

### Problema / variável

As páginas públicas existem, mas a aplicação ainda não regista formalmente a aceitação pelo utilizador.

### Decisão a tomar

Definir **quando** e **como** a aceitação é recolhida.

### Opções

#### Opção A — no registo

Checkbox obrigatório antes de criar a conta.

**Vantagens**
- simples;
- existe prova desde a criação da conta.

**Desvantagens**
- utilizadores já existentes precisam de tratamento;
- futuras alterações dos termos exigem novo mecanismo.

#### Opção B — no primeiro login

Após autenticação, bloquear o acesso até aceitar.

**Vantagens**
- cobre contas existentes;
- facilita nova aceitação quando os termos mudarem.

**Desvantagens**
- ligeiramente mais lógica de estado.

#### Opção C — registo + primeiro login quando necessário

No registo para novos utilizadores; mecanismo de reaceitação no login quando a versão muda.

**Vantagens**
- mais robusto;
- resolve contas novas e existentes;
- permite versionamento futuro.

**Desvantagens**
- implementação um pouco maior.

### Variáveis que devem ficar registadas

- utilizador;
- versão dos Termos;
- versão da Política de Privacidade;
- timestamp;
- origem/fluxo da aceitação.

### Decisão tomada — 2026-09-25

**DECIDIDO: Opção C, registo + reaceitação versionada.**

- novos utilizadores aceitam Termos e Privacidade no registo;
- contas existentes não são forçadas a aceitar em todos os logins;
- pedir reaceitação no login apenas quando não existe aceitação registada, ou quando a versão dos Termos mudou, ou quando a versão da Política de Privacidade mudou;
- guardar utilizador, versão dos Termos, versão da Privacidade, timestamp e contexto/origem;
- não mostrar aceitação duplicada.

### Quem decide

Francisco. Decisão fechada.

### Próxima acção

**M2.11 = CLOSED.** Registo (Google e OTP non-prod), gate no login e na sessão restaurada, versionamento e testes estão no mesmo fluxo. OTP em PROD continua desligado (`503`). Sem backfill.

---

## A4. Documentos pessoais do motorista / go-online — `S-COMP-03`

### Problema / variável

A plataforma já tem gates de documentos de viatura, mas a política sobre documentos pessoais do motorista ainda não está fechada.

A futura validação IMT é uma questão separada.

### Decisão a tomar

Um motorista com documentos pessoais incompletos/expirados pode ficar online?

### Opções

#### Opção A — bloqueio total

Sem documentação válida, não fica online.

**Vantagens**
- política forte e simples;
- reduz operação não conforme.

**Desvantagens**
- exige grande confiança na qualidade dos dados e datas;
- risco de falso bloqueio.

#### Opção B — aviso apenas

O sistema avisa, mas permite ficar online.

**Vantagens**
- menor risco operacional durante o piloto.

**Desvantagens**
- menor força de compliance.

#### Opção C — bloqueio selectivo

Documentos críticos bloqueiam; outros apenas avisam.

**Vantagens**
- equilíbrio entre operação e compliance.

**Desvantagens**
- exige definir exactamente quais documentos são críticos.

### Quem decide

Francisco + Manel, idealmente depois de cruzar com o parecer jurídico/IMT.

### Próxima acção

Inventariar os documentos actuais e classificá-los em:
- obrigatório para bloquear;
- obrigatório com grace period;
- apenas informativo.

---

## A5. GPS simulado em produção — `S-HYG-01`

### Problema / variável

Existe funcionalidade de GPS demo/simulação que pode ser usada em produção.

É útil para demonstrações, mas indesejável num piloto real se ficar acessível sem controlo.

### Decisão a tomar

O que acontece ao modo simulado antes do piloto?

### Opções

#### Opção A — remover de PROD

**Vantagens**
- elimina completamente o risco.

**Desvantagens**
- dificulta demonstrações controladas.

#### Opção B — manter apenas atrás de autorização Admin/demo

**Vantagens**
- preserva capacidade de demo;
- reduz exposição ao utilizador comum.

**Desvantagens**
- exige gate real e auditável.

#### Opção C — manter como está

**Vantagens**
- zero trabalho.

**Desvantagens**
- não é aconselhável num piloto real.

### Direcção provável

**Opção B** é a mais equilibrada, desde que exista um gate real e não apenas um parâmetro facilmente activável.

### Quem decide

Francisco.

### Próxima acção

Pedir ao Cursor uma auditoria curta do mecanismo actual antes da decisão final.

---

## A6. Backup dos uploads / Persistent Disk

### Problema / variável

O restore do PostgreSQL já foi provado. Mas documentos e anexos guardados no Persistent Disk não são restaurados por esse processo.

### Decisão a tomar

Qual o nível de protecção necessário para os ficheiros no piloto?

### Opções

#### Opção A — Persistent Disk apenas

**Vantagens**
- já existe;
- simples;
- sem nova infra.

**Desvantagens**
- persistência não equivale a backup externo;
- um incidente no disco pode perder ficheiros.

#### Opção B — cópia periódica externa

Copiar os uploads para outro destino.

**Vantagens**
- separa persistência de backup;
- implementação potencialmente simples.

**Desvantagens**
- é preciso escolher destino, retenção e automatização.

#### Opção C — object storage

Mover ou replicar ficheiros para armazenamento object-based.

**Vantagens**
- abordagem mais robusta e escalável;
- melhor para lifecycle/backup.

**Desvantagens**
- nova infra, custo e código;
- pode ser excessivo para o piloto.

### Questões a decidir

- tolerância a perda;
- frequência de backup;
- retenção;
- encriptação;
- custo;
- recuperação;
- se o piloto justifica já object storage.

### Quem decide

Francisco.

### Próxima acção

Comparar custo/complexidade de “cópia externa periódica” vs “object storage”.

# B. Decisões já tomadas mas que condicionam o plano

## B1. Stripe live — `S-PAY-01`

### Decisão tomada

**Não activar agora.**

Stripe live entra **imediatamente antes do piloto real**, quando o restante M2 estiver praticamente fechado.

### Porquê

Activar live demasiado cedo introduz:

- custos de processamento;
- movimentos financeiros reais;
- obrigações contabilísticas/fiscais;
- risco de misturar testes funcionais com dinheiro real.

### Estratégia

Antes de live:

- testar tudo em mock/test mode;
- fechar fluxos Passenger/Driver/Partner/Admin;
- testar cancelamentos;
- testar webhooks;
- testar reconciliação;
- testar erros;
- fechar mobile;
- fechar SMS;
- fechar os restantes blockers M2.

Depois:

1. activar Stripe live;
2. testes reais controlados;
3. validar cobrança/cancelamento/refund/webhook;
4. confirmar reconciliação;
5. se PASS → piloto real.

### Nota

Connect e payouts automáticos continuam fora do M2 porque o piloto usa settlement manual.

# C. Decisões externas que temos de provocar

## C1. IMT — `L-01…L-06`, `L-08`, `L-29`

### Problema

Sem saber o canal/processo oficial, não conseguimos fechar validação de operador, motorista e veículo.

### Precisamos perguntar

- existe API?
- existe canal alternativo?
- que identificadores usar?
- periodicidade de validação;
- comportamento quando o serviço está indisponível;
- operador, motorista e veículo;
- existe informação de tempos cross-platform?
- que comunicações periódicas devem ser enviadas?

### Próxima acção

Enviar um único pedido técnico consolidado ao IMT.

---

## C2. Advogado / jurídico

### Decisões externas necessárias

#### 10h / 24h — `L-07`, `L-10`

Precisamos saber:

- que estados contam como tempo de condução/trabalho;
- quando começa e termina a contagem;
- o que fazer se o limite for atingido durante uma viagem;
- se uma viagem já iniciada pode terminar.

#### Emergência — `L-19…L-22`

A app já tem:

- SOS;
- `tel:112`;
- snapshot;
- partilha de localização.

Precisamos saber se isto é suficiente ou se é exigido:

- PSAP;
- URL pública;
- outra integração.

#### Capacidade tecnológica — `L-27`

Precisamos de checklist objectiva do art. 17.º-A contra aquilo que a plataforma já implementa.

#### Contratos — `L-23`, `L-24`

Precisamos:

- minuta;
- versionamento;
- prova de aceitação/disponibilização;
- eventual envio/comunicação à AMT.

---

## C3. Contabilista

### Questões a fechar

#### Comissão de 15% — `L-13`

Como interpretar exactamente a base **sem IVA**?

#### Contribuição de 5% — `L-18`

Qual a base de cálculo e tratamento contabilístico?

#### Factura electrónica — `L-16`

- quem emite;
- em nome de quem;
- software/emissor;
- conteúdo obrigatório;
- integração necessária.

#### Portagens

Confirmar tratamento contabilístico das portagens que:

- são pagas pelo passageiro;
- ficam fora da comissão VAMULÁ.

### Próxima acção

Preparar uma nota de uma página com o modelo comercial já decidido e perguntas fechadas.

---

## C4. AMT — `L-17`, `L-23`, `L-29`

### Precisamos obter

- formulário/modelo mensal vigente;
- canal de submissão;
- formato;
- periodicidade;
- requisitos de comunicação dos contratos.

### Regra

Não implementar um export “inventado” antes de obter o modelo oficial.

# D. Decisões importantes, mas não prioritárias para o piloto

## D1. Fórmula do líquido do motorista — `S-DRV-01`

Decidir exactamente o que aparece como rendimento líquido estimado ao motorista.

Depende de Manel.

---

## D2. Gaps do PDF do Driver — `S-DRV-03`

Manel deve decidir quais dos gaps ainda são necessários:
- para piloto;
- para M3;
- futuros.

---

## D3. Logo de produção — `S-BRD-01`

Importante para M3, mas não bloqueia o piloto técnico.

---

## D4. Titularidade / IP — `S-IP-01`, `S-IP-02`

Fechar:
- código;
- domínio;
- contas;
- logos;
- licenças.

É trabalho M3, não precisa atrasar M2.

---

## D5. Next-trip / B2

Decisão actual: não activar.

Só reabrir quando houver motivo operacional claro.

---

## D6. HERE / `S-TOLLS-P2`

V1 já aceite.

Só autorizar novas chamadas de diagnóstico quando:
- custo/quota estiver claro;
- houver ganho concreto em continuar a investigação.

Não bloqueia piloto.

# E. Ordem recomendada das decisões

## Agora

1. Android / packaging.
2. Provider SMS.
3. Aceitação Termos/Privacidade.
4. Política dos documentos do motorista.
5. GPS simulado em PROD.
6. Backup dos uploads.

## Em paralelo

1. Pedido IMT.
2. Dossier advogado.
3. Nota contabilista.
4. Pedido AMT.

## Imediatamente antes do piloto

1. Stripe live.
2. Testes reais de cartão.
3. Webhook live.
4. cancelamento/refund;
5. reconciliação;
6. validação financeira;
7. smoke final;
8. acta de piloto.

## Depois / M3

1. Connect/payouts se necessários.
2. líquido do motorista.
3. gaps avançados Driver/Partner.
4. logo/IP.
5. lojas/iOS.
6. B2.
7. MB WAY.

# F. Quadro de decisão

| ID | Decisão | Quem | Quando | Estado |
|---|---|---|---|---|
| S-MOB-01 | Capacitor / wrapper / PWA | Francisco + Manel | Agora | BOOTSTRAP + DEVICE SMOKE PASS (`pt.vamula.app`) |
| S-AUTH-01 | Provider SMS | Francisco | Agora | PENDENTE |
| M2.11 | Momento e versão da aceitação | Francisco | Agora | CLOSED: REGISTO + REACEITAÇÃO VERSIONADA |
| S-COMP-03 | Docs pessoais bloqueiam online? | Francisco + Manel | Agora | PENDENTE |
| S-HYG-01 | GPS simulado em PROD | Francisco | Agora | PENDENTE |
| Uploads | Estratégia de backup dos ficheiros | Francisco | Agora | PENDENTE |
| S-PAY-01 | Stripe live | Francisco + Manel | Pré-piloto | DECIDIDO: ADIADO |
| L-01…L-06 | Canal/validação IMT | IMT | Já contactar | EXTERNO |
| L-07/L-10 | Regra das 10h | Jurídico | Já contactar | EXTERNO |
| L-19…L-22 | Emergência suficiente? | Jurídico | Já contactar | EXTERNO |
| L-13/L-16/L-18 | IVA/factura/contribuição | Contabilista | Já contactar | EXTERNO |
| L-17/L-29 | Reporting/comunicações | AMT | Já contactar | EXTERNO |
| S-DRV-01 | Fórmula líquido Driver | Manel | Depois | PENDENTE |
| S-BRD-01 | Logo | Francisco + Manel | M3 | PENDENTE |
| S-IP-01/02 | Titularidade/licenças | Francisco | M3 | PENDENTE |
| S-B2-01 | Activar next-trip | Francisco | Pós-M2 | DECIDIDO: NÃO AGORA |
| S-TOLLS-P2 | Autorizar diagnóstico HERE | Francisco | Sem urgência | BLOQUEADO / NÃO CRÍTICO |

# G. Regra de trabalho

A partir daqui, cada item deve sair de “bloqueado” para um destes estados:

- **DECIDIDO → Cursor pode implementar**
- **PERGUNTA ENVIADA → aguardamos terceiro**
- **ADIADO DELIBERADAMENTE → não é blocker actual**
- **ACEITE COMO RISCO → documentar para M2.12**
- **FECHADO**

Evitar manter itens apenas como “pendentes” sem uma próxima acção concreta.
