# L-25 — Livro de Reclamações / RAL (checklist operacional)

**Estado L-25:** `PARCIAL — foundation técnica validada em produção; pendências externas/operacionais`  
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
| LRE | Obrigatório; link oficial `https://www.livroreclamacoes.pt/` suficiente (sem API/webhook) |
| Livro físico | **NÃO APLICÁVEL** enquanto a VAMULÁ não mantiver estabelecimento com atendimento presencial ao público. Se futuramente existir atendimento presencial, **reavaliar** obrigação. |
| RAL | Publicar CACCL + CNIACC com formulação prudente («conforme competência aplicável»). Não afirmar adesão nem competência universal. |

## Checklist operacional

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| O-L25-01 | Registo LRE Ventos Férteis | Por iniciar | NIPC 516344439 · VAMULÁ · AMT · guardar confirmação/data/ID/evidência |
| O-L25-02 | CAE correcto | Por iniciar | Só contabilista/docs oficiais — não inventar |
| O-L25-03 | Marca no registo | Por iniciar | VAMULÁ + Ventos Férteis · IMT 354/2026 · INPI 734136 |
| O-L25-04 | Email notificações | Por iniciar | Inbox partilhada · monitorização · backup · não email pessoal isolado |
| O-L25-05 | Gestor de Reclamações | Por iniciar | Titular + substituto · quem consulta/cria/responde/controla prazo |
| O-L25-06 | Canal AMT | Por iniciar | Confirmar no registo LRE · evidência oficial |
| O-L25-07 | RAL | Concluído | CACCL + CNIACC + copy prudente |
| O-L25-08 | Livro físico | Concluído | NÃO APLICÁVEL sem estabelecimento presencial |
| O-L25-09 | Processo 15 DU humano | Por iniciar | LRE → import VAMULÁ → due manual → responder → fechar |

## Procedimento O-L25-09 (15 dias úteis — humano)

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
- O-L25-02  
- O-L25-03  
- O-L25-04  
- O-L25-05  
- O-L25-06  
- O-L25-09  

O-L25-07 e O-L25-08 já estão concluídos.

## Superfícies na app

| Superfície | Login | Conteúdo |
|------------|-------|----------|
| Settings (Passenger / Driver) | Com login | LRE + secção RAL completa |
| Login footer | Sem login | Links compactos LRE / CACCL / CNIACC |
| `/download` landing | Sem login | Idem compacto |
| Reclamação interna | Com login | «Fazer reclamação» no histórico — **não** substituído |
