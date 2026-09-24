# L-25 — Livro de Reclamações / RAL (checklist operacional)

**Estado L-25:** `FECHADO — checklist operacional concluído em 2026-09-24`  
**Data:** 2026-09-07  
**Não é:** parecer jurídico · prova de registo no portal LRE

## Estado técnico

| Item | Resultado |
|------|-----------|
| Foundation técnica | Implementada |
| Validação em produção | Sim |
| Commit deployado | `474a242` |
| Admin external import | PASS |
| Duplicate protection | PASS |
| ComplaintHistory | PASS |
| AuditEvent | PASS |
| Passenger LRE/RAL | PASS |
| Driver LRE/RAL | PASS |
| Público sem login | PASS |
| RBAC | PASS |
| Regressões | Nenhuma |

## Decisões fechadas (produto / jurídico)

| Tema | Decisão |
|------|---------|
| LRE | Obrigatório; link directo oficial da loja VAMULÁ (sem API/webhook): `https://livroreclamacoes.pt/inicio/qrcode_operator?economicoperator=43122981&store=43187609` · evidência `docs/legal/sources/lre/` · validado 2026-09-22 |
| Livro físico | **NÃO APLICÁVEL** enquanto a VAMULÁ não mantiver estabelecimento com atendimento presencial ao público. Se futuramente existir atendimento presencial, **reavaliar** obrigação. |
| RAL | Publicar CACCL + CNIACC com formulação prudente («conforme competência aplicável»). Não afirmar adesão nem competência universal. |

## Checklist operacional

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| O-L25-01 | Registo LRE Ventos Férteis | Concluído | 2026-09-22 · NIPC 516344439 · VAMULÁ · sector TVDE · loja activa · PDF `docs/legal/sources/lre/vamula-lre-qrcode-2026-09-22.pdf` · link directo no site e na app |
| O-L25-02 | CAE correcto | SUPERSEDED | 2026-09-22 · o LRE deixou de exigir CAE no registo do operador; a actividade associa-se só pelo Setor de Atividade · sector Táxis/TVDE + AMT já comprovados em O-L25-06 · `52320-R4` permanece na documentação societária e não é pendência LRE · screenshot do aviso do portal não arquivado (opcional) |
| O-L25-03 | Marca no registo | Concluído | 2026-09-22 · LRE `docs/legal/sources/lre/vamula-lre-qrcode-2026-09-22.pdf` (VENTOS FÉRTEIS - LDA · VAMULÁ · NIPC 516344439) · IMT `docs/legal/sources/imt-operadores-plataformas-tvde-licenciados-2026-05-14.pdf` (Vamulá · 354/2026 · 06/01/2026) · INPI 734136 · titular Ventos Férteis, Lda. · classe 39 · PDF de síntese INPI continua opcional e não bloqueia |
| O-L25-04 | Email notificações | Concluído | 2026-09-24 · loja LRE: notificações de reclamações `legal@vamula.pt` (recebe notificações activo) · sugestões/elogios `geral@vamula.pt` · caixa real `legal@` · aliases `reclamacoes@` e `manel@` entregam em `legal@` · smoke manual: os três endereços chegaram a `legal@` · Francisco abriu `legal@` e viu os testes · Manel titular, Francisco substituto · leitura pelo menos diária em dias úteis · reclamações seguem O-L25-09 · `frankbexxx@gmail.com` é assunto pessoal separado (o LRE confirmou que já não está ligado à VAMULÁ/Ventos Férteis) e não pertence a este item |
| O-L25-05 | Gestor de Reclamações | Concluído | 2026-09-22 · titular **Manel Perez** · substituto **Francisco Bexiga** · ambos consultam, respondem e controlam o prazo · substituto assume na ausência do titular |
| O-L25-06 | Canal AMT | Concluído | 2026-09-22 · sector Táxis/TVDE activo · entidade reguladora AMT · `docs/legal/sources/lre/vamula-lre-amt-sector-association-2026-09-22.png` |
| O-L25-07 | RAL | Concluído | CACCL + CNIACC + copy prudente |
| O-L25-08 | Livro físico | Concluído | NÃO APLICÁVEL sem estabelecimento presencial |
| O-L25-09 | Processo 15 DU humano | Concluído | 2026-09-24 · dry-run interno em STAGING `tvde-staging-api` · sem reclamação real no LRE · `CMP-2026-82CD8B85` / `SIMULACAO-OL25-09-20260924` · `received` → `under_review` → `resolved` → `closed` · Admin existente atribuído · duplicado 409 · retenção `submitted_at + 2 anos civis` · histórico e audit de estado preservados · `external_responded_at` sem writer (não escrito na BD) · resposta oficial no LRE continua fora da app |

## Gestor de Reclamações (O-L25-05)

Decisão interna de **2026-09-22**. O prazo continua o já publicado: **15 dias úteis**. Sem SLA adicional.

| Papel | Pessoa | Função |
|-------|--------|--------|
| Titular | **Manel Perez** | Gestor operacional principal (Partner) |
| Substituto | **Francisco Bexiga** | Supervisão, backup e substituição (Admin VAMULÁ) |

Ambos são responsáveis por garantir a consulta, a resposta e o controlo do prazo. O processo tem de continuar na ausência do titular. Ambos têm de conseguir cumprir os prazos e aceder à informação necessária.

Partner/Manel é a gestão operacional primária. Admin/VAMULÁ/Francisco é supervisão e intervenção quando o titular não está disponível. Não há dependência exclusiva de uma só pessoa.

### Titular

- Consulta regularmente o backoffice LRE
- Valida novas reclamações recebidas
- Coordena a recolha de informação
- Prepara e valida a resposta
- Controla o prazo aplicável
- Encerra e acompanha o processo

### Substituto

- Tem capacidade operacional equivalente
- Assume o processo quando o titular está indisponível
- Verifica pendências e prazos
- Pode responder e fechar quando necessário

## Procedimento O-L25-09 (15 dias úteis — humano)

O-L25-09 está **CONCLUÍDO** em 2026-09-24. O acesso do titular ao LRE foi confirmado manualmente (Manel Perez, utilizador próprio, área `Consulta & Tratamento -> Reclamações`). O processo interno foi demonstrado na API Admin de STAGING, com dados fictícios e sem reclamação real no LRE: `CMP-2026-82CD8B85`, referência `SIMULACAO-OL25-09-20260924`. O campo `external_responded_at` existe no modelo e não tem writer na API; não foi escrito na base de dados. A resposta oficial continua no LRE, fora da app.

1. Reclamação chega por LRE  
2. Gestor recebe notificação  
3. Criar Complaint em VAMULÁ (Admin → Nova reclamação externa)  
4. `source = livro_reclamacoes`  
5. Guardar `external_reference`  
6. Usar `submitted_at` original  
7. Preencher contacto mínimo  
8. Registar prazo manualmente conforme LRE/processo (`external_response_due_at` opcional)  
9. Passar para `under_review`  
10. Preparar resposta  
11. Responder no canal oficial  
12. Guardar data efectiva de resposta (`external_responded_at` quando aplicável)  
13. Actualizar Complaint  
14. Fechar quando o procedimento terminar  

**Notas:** sem cálculo automático de dias úteis nesta fase · sem SLA engine · sem API/webhook LRE.

## Regra de fecho

Marcar **`L-25 = FECHADO`** apenas quando estiverem concluídos:

- O-L25-01  
- O-L25-03  
- O-L25-04  
- O-L25-05  
- O-L25-06  
- O-L25-09  

O-L25-02 está **SUPERSEDED** e não bloqueia o fecho. O-L25-01, O-L25-03, O-L25-04, O-L25-05, O-L25-06, O-L25-07, O-L25-08 e O-L25-09 estão concluídos. **L-25 = FECHADO** em 2026-09-24. Não reabrem este fecho: a revisão jurídica futura do wording RAL (O-L25-07 já concluído com copy prudente) e a ausência de writer de `external_responded_at` na API.

## Superfícies na app

| Superfície | Login | Conteúdo |
|------------|-------|----------|
| Settings (Passenger / Driver) | Com login | LRE + secção RAL completa |
| Login footer | Sem login | Links compactos LRE / CACCL / CNIACC |
| `/download` landing | Sem login | Idem compacto |
| Reclamação interna | Com login | «Fazer reclamação» no histórico — **não** substituído |
