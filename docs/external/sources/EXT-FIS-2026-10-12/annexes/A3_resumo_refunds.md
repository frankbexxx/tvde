# Anexo A3 — Resumo: reembolsos (refunds) e chargebacks (piloto)

**Dossier:** EXT-FIS-2026-10-12  
**Audiência:** Contabilista / TOC  
**Confidencialidade:** EXTERNAL-CONFIDENTIAL  
**Fonte operacional interna (não anexada):** runbook de refund manual piloto V1

Este anexo descreve o **estado operacional actual** e limitações, para apoio à **Q-EXT-FIS-005** (tratamento contabilístico e deveres documentais). **Não** substitui procedimento interno completo nem conclui tratamento fiscal.

---

## 1. Quando pode ocorrer um refund (reembolso)

Situações previstas no runbook interno (piloto):

- Pedido de reembolso **justificado** após cobrança ao passageiro.
- Cobrança **indevida** ou **valor errado** confirmado pela operação.
- Incidente de suporte com pagamento já **concluído com sucesso** e acordo de reembolso.

**Âmbito:** fase piloto comercial V1.

---

## 2. Como funciona no piloto (refund)

| Aspecto | Estado actual |
|---------|----------------|
| Canal na aplicação | **Não** existe funcionalidade de refund na app |
| Execução | **Manual** no painel do prestador de pagamentos (Stripe Dashboard), ambiente Test ou Live conforme fase |
| Quem executa | Operação / administração com acesso autorizado ao Dashboard (conta pessoal autorizada; **sem** partilha de chaves) |
| Identificação | Viagem na consola interna de administração → valor cobrado → pagamento correspondente no Dashboard |
| Registo | Motivo no Dashboard + registo no canal interno de suporte (referência da viagem, motivo, valor) |
| Passageiro | Informação via canal de suporte após o estorno |

---

## 3. Refund vs chargeback (distinção simples)

| | **Refund (reembolso)** | **Chargeback (contestação)** |
|---|------------------------|------------------------------|
| Iniciativa | Operador / plataforma (ou acordo após pedido) | Passageiro via banco/emissor do cartão |
| Canal típico | Dashboard prestador pagamentos | Rede cartões / disputa Stripe |
| Controlo operacional | Relativamente **directo** no piloto (refund manual) | **Menos** controlado; prazos e evidências |
| Documentação interna piloto | Descrita no runbook de **refund** | **Não** descrita em detalhe no mesmo runbook |

**Lacuna explícita:** o processo específico de **chargeback** **não está fechado** neste runbook e permanece **lacuna operacional** (incl. responsabilidade operacional O6 em lista interna de pendências). **Não** se inventa fluxo aqui.

---

## 4. Limitações técnicas actuais (impacto nos registos)

| Limitação | Consequência |
|-----------|--------------|
| Webhook / integração | A aplicação **não** trata hoje um evento dedicado de refund para actualizar automaticamente o estado interno do pagamento |
| Estado interno após refund | O pagamento pode continuar registado como **sucesso** na base de dados mesmo após estorno no Stripe |
| Correcção manual BD | **Não** corrigir à mão sem procedimento formal — incidente e nota operacional |
| Connect / payouts automáticos | **Fora** do piloto — não aplicável |

Estas limitações **não** prejudicam formular a pergunta fiscal; condicionam **implementação** e **prova documental** até processo fechado.

---

## 5. Estado do processo (resumo)

| Tema | Estado |
|------|--------|
| Refund manual piloto | **Documentado** internamente (runbook) |
| Refund na app | **Não** previsto nesta fase |
| Sincronização contabilística / BD | **Em definição** — depende de resposta contabilística + desenho processo |
| Chargebacks | **Lacuna operacional** — sem runbook dedicado fechado |
| Rectificações / documentos ao passageiro | **Objecto Q-EXT-FIS-005** — validar com contabilista |

---

## 6. Impacto documental / contabilístico (a validar)

Pontos para orientação do contabilista (sem antecipar conclusões):

- Momento de registo de **receita** vs **estorno** quando refund parcial ou total.
- Necessidade de **nota de crédito** ou documento equivalente ao passageiro.
- Tratamento de **comissão** e **IVA** já reconhecidos quando o preço final é reembolsado.
- **Chargebacks:** registos, provas e diferenças face a refund voluntário — **pendente** procedimento interno.
- Reconciliação com **acerto semanal** ao parceiro (lacuna O5 no comprovativo).

---

## 7. Exclusões deliberadas deste anexo

- Chaves API, tokens, URLs secretas
- Identificadores reais de pagamentos ou viagens
- Emails, nomes, IBAN, NIF
- Passos técnicos de webhook, reconciliação PI ou capturas
- Runbook integral (permanece interno)

---

*Documento de apoio ao dossier EXT-FIS-2026-10-12. Estado dossier: REVIEW — não enviado.*
