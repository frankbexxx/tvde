# Resumo para Manel Perez — estado da plataforma e próximos passos

**Data:** 7 de Agosto de 2026  
**Destinatário:** Manel Perez  
**Natureza:** documento de alinhamento produto/comercial — **não** é contrato, cronograma rígido nem lista de garantias  
**Base:** inputs que nos enviou (pagamentos + funcionalidades da app Motorista) + estado actual da plataforma

---

## Em uma frase

A plataforma já permite demonstrar o ciclo completo de uma viagem com os quatro papéis (passageiro, motorista, parceiro e administração). Os seus inputs sobre pagamentos e app Motorista foram organizados como prioridades a discutir e validar — **antes** de os transformar em desenvolvimento fechado.

---

## 1. O que a plataforma já tem hoje

O que se pode mostrar e usar com confiança no dia a dia de demonstração:

| Área | Situação actual (linguagem de produto) |
|------|----------------------------------------|
| **Pedido de viagem** | O passageiro pede; o motorista recebe a oferta e pode aceitar ou recusar. |
| **Viagem completa** | Do aceite até ao fim da viagem, com estados coerentes entre passageiro e motorista. |
| **Navegação do motorista** | Base de navegação externa já trabalhada; Waze/Google Maps e preferência do motorista ficam como prioridade de afinação. |
| **Parceiro (frota)** | Visão de frota, viagens e indicadores operacionais; mapa em evolução (útil, mas ainda não “tracking perfeito”). |
| **Administração** | Leitura e ferramentas de excepção — não substitui o papel do parceiro no dia a dia. |
| **Demo anterior** | A primeira demonstração consigo (carro/telefone reais) ficou **completa** no essencial: o fluxo essencial ficou validado. |

**Importante sobre pagamentos neste momento:** a demonstração e o uso actual **não** passam por cobrança real ao cliente nem por transferências automáticas ao motorista/parceiro. O dinheiro “de verdade” (cartão, MB WAY, divisão de comissão, payouts) é tema da **próxima fase**, depois de validação financeira e jurídica.

---

## 2. O que está em preparação para a próxima fase

Sem datas fechadas — horizonte de trabalho após alinhamento e após o próximo período de validação e planeamento:

| Tema | Intenção |
|------|----------|
| **Demo alargada consigo** | Guião preparado para **Setembro**: viagem completa +, se houver tempo, recusar oferta e visão do parceiro. |
| **App Motorista mais “de negócio”** | Reforçar o que o motorista vê no dia a dia: informação da viagem, preço líquido, menu, rendimentos, documentos, historial. |
| **Pagamentos reais (caminho recomendado)** | Desenhar e validar o fluxo: autorização no pedido → cobrança no fim → divisão plataforma / motorista (ou parceiro) → pagamentos periódicos. |
| **Documentos e conformidade** | Avisos de validade e regras de operação — **suspensão automática** só se for validada operacional e legalmente. |
| **Frota e categorias** | Continuar a alinhar veículos do parceiro e quais categorias entram no piloto (não necessariamente todas de uma vez). |

Nada disto está “prometido para uma data”. São as frentes naturais a seguir ao alinhamento consigo.

---

## 3. Prioridade para a app Motorista

Organização a partir do PDF e dos seus inputs. Ordem = importância para demo / piloto próximo, **não** lista fechada de entregas.

### Prioridade alta (útil já para a próxima demonstração / piloto)

- Informação completa da viagem, incluindo **preço líquido para o motorista** (fórmula a fechar consigo).
- Navegação Waze / Google Maps alinhada com o que espera ver.
- Menu do motorista coerente (identidade, avaliação, cancelamentos — fechar o que ainda falte face ao PDF).

### Prioridade seguinte (pré-piloto comercial)

- Rendimentos (visão clara do que ganhou / o que espera receber).
- Historial de viagens e forma de **reportar ocorrência**.
- Documentos com datas e avisos (quem valida: parceiro, administração, ou misto — a decidir).
- Veículos associados ao parceiro.
- Privacidade e definições da app.
- Preferências de categorias (quais ligar/desligar) — **lista exacta do MVP a validar**.
- GPS próprio simples: mapa / posição de recurso — **não** assumir navegação completa tipo Waze até decidir.

### Mais tarde (maturidade / versão seguinte)

- Destino preferido até 2 vezes por dia (obrigatório no piloto? a confirmar).
- Caixa de mensagens (inbox).
- Telefone temporário / contacto mascarado (requisito ou nice-to-have? a confirmar).
- Campanhas para motoristas.
- Suspensão automática por documento expirado (**só após validação legal/operacional**).

---

## 4. Abordagem recomendada para pagamentos

### Opção recomendada para um primeiro MVP (sujeita a validação)

**Stripe Connect** (ou equivalente no mesmo modelo de “marketplace”):

- cobrança ao passageiro;
- retenção da comissão da plataforma;
- transferência do restante para a conta do motorista ou do parceiro (modelo a fechar);
- apoio a cancelamentos, reembolsos e ferramentas de backoffice ao longo do tempo.

Isto é a **direcção recomendada para começar**, não uma decisão final fechada. Depende de validação **financeira** e **jurídica** (quem é o responsável perante o cliente, KYC, contratos, fiscalidade).

### Portugal — importante, a validar

**MB WAY, Multibanco e o ecossistema SIBS** são relevantes para o mercado português.  
Pergunta aberta: entram no **primeiro** MVP, ou numa fase logo a seguir (quando o fluxo de cartão/marketplace já estiver estável)?

### Outras plataformas (Adyen, Checkout.com, Mangopay, PayPal, Worldpay, Viva.com, …)

Ficam como **alternativas futuras** ou de escala — não como decisão imediata.

### Capacidades de pagamento a desenhar por fases

| Capacidade | Fase sugerida |
|------------|----------------|
| Autorizar no pedido e cobrar no fim da viagem | Próxima fase (núcleo) |
| Dividir comissão plataforma / motorista (ou parceiro) | Próxima fase (núcleo) — **% a decidir** |
| Identificação / onboarding de contas pagáveis (KYC) | Próxima fase (núcleo) |
| Política de cancelamentos / no-show | Próxima fase |
| Pagamentos periódicos (diário / semanal / outro) | A calibrar consigo |
| Reembolsos, gorjetas, promoções, facturação | Maturidade operacional |
| Carteira (wallet), antifraude avançado, BI profundo | Versão futura / escala |

### Comissão da plataforma

Nos materiais aparecem exemplos (por exemplo 15%, 12% ou 20%).  
**Nenhum destes valores está fixado.** A percentagem real, e a quem é paga a parte do motorista (motorista directo vs parceiro), é decisão de negócio a fechar consigo e com o modelo financeiro.

---

## 5. O que fica para versão 2.0 / fase futura

Salvo decisão sua em contrário, ficam para mais tarde:

- Telefone temporário / mascarado  
- Carteira (wallet) / saldo na app  
- Campanhas avançadas para motoristas  
- Antifraude avançado e scoring complexo  
- BI / relatórios analíticos profundos  
- Alternativas de pagamento enterprise (Adyen, Mangopay, etc.) além do caminho MVP  
- Navegação GPS própria completa (turn-by-turn), se o Waze/Google Maps cobrirem o dia a dia  
- Destino 2×/dia e inbox — se não forem obrigatórios no piloto  

---

## 6. Pontos que precisamos validar consigo

Respostas curtas bastam para desbloquear prioridades:

1. **Comissão:** há um alvo real (ex. 15% / 12% / 20%) ou eram só exemplos?  
2. **MB WAY / Multibanco:** obrigatório no primeiro MVP em Portugal, ou pode vir na fase seguinte?  
3. **Pagamentos ao motorista/parceiro:** diários, semanais, ou outro ritmo? Quem recebe — motorista ou parceiro?  
4. **Documentos:** quem valida (parceiro, administração, automático)?  
5. **Suspensão por documento caducado:** pode ser automática neste modelo, do ponto de vista operacional e legal?  
6. **Categorias no MVP:** quais entram no piloto (X, XL, Pet, Comfort, Black, Elétrico, Van — todas ou um subconjunto)?  
7. **Telefone temporário:** requisito ou nice-to-have?  
8. **Destino até 2 vezes/dia:** obrigatório no piloto?  
9. **GPS próprio:** basta mapa/posição de recurso, ou quer navegação completa dentro da app?  
10. **Preço líquido do motorista:** o que entra e o que sai da conta (comissão, portagens, gorjetas, promoções)?  

---

## 7. Próximos passos (propostos)

1. **Rever este resumo consigo** (e com Francisco) e fechar as respostas da secção 6 — pelo menos as de comissão, MB WAY, payouts e líquido do motorista.  
2. **Manter o foco da próxima demonstração (Setembro)** no que já está sólido: viagem completa nos quatro papéis; extras só se houver tempo.  
3. **Escolher 1–2 melhorias de alto impacto** na app Motorista para o piloto (ex.: informação da viagem + preço líquido), sem tentar fazer o PDF inteiro de uma vez.  
4. **Desenhar o caminho de pagamentos** (recomendação: Stripe Connect + validação PT para MB WAY/SIBS) com apoio financeiro/jurídico — **sem** activar cobrança real até essa validação.  
5. **Adiar conscientemente** wallet, campanhas, telefone temporário e antifraude avançado para a versão seguinte, salvo se alguma destas for requisito legal ou comercial inadiável.

---

## Nota final

Os seus documentos e o PDF da app Motorista foram **lidos e organizados** como backlog de produto.  
Não transformámos percentagens de exemplo, listas de plataformas nem ideias de suspensão automática em regras fechadas.

Quando validarmos os pontos da secção 6, a equipa consegue transformar isto em planos de entrega concretos — por fases, sem prometer o universo na primeira versão.

Obrigado pelo material — ajuda a construir na direcção certa para o mercado português.
