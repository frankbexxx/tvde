# L-25 — Livro de Reclamações / RAL (checklist operacional)

**Estado técnico:** `PARCIAL — foundation técnica implementada; registo externo LRE ainda pendente`  
**Data:** 2026-09-07  
**Não é:** parecer jurídico · prova de registo no portal LRE

## Decisões fechadas (produto / jurídico)

| Tema | Decisão |
|------|---------|
| LRE | Obrigatório; link oficial `https://www.livroreclamacoes.pt/` suficiente (sem API/webhook) |
| Livro físico | **NÃO APLICÁVEL** enquanto a VAMULÁ não mantiver estabelecimento com atendimento presencial ao público. Se futuramente existir atendimento presencial, **reavaliar** obrigação. |
| RAL | Publicar CACCL + CNIACC com formulação prudente («conforme competência aplicável»). Não afirmar adesão nem competência universal. |

## Checklist externo (não-código)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| O-L25-01 | Registo Ventos Férteis, Lda. no portal LRE | Por iniciar | NIPC 516344439 |
| O-L25-02 | CAE confirmado no registo | Por iniciar | Contabilista / jurídico |
| O-L25-03 | Marca VAMULÁ alinhada | Por iniciar | INPI 734136 |
| O-L25-04 | Email de notificações LRE operativo | Por iniciar | Inbox dedicada + monitorização |
| O-L25-05 | Nomear Gestor de Reclamações | Por iniciar | Titular + backup |
| O-L25-06 | Canal AMT / competência confirmado | Por iniciar | Ecossistema mobilidade |
| O-L25-07 | Entidades RAL (copy) | Concluído | CACCL + CNIACC + consumidor.gov.pt |
| O-L25-08 | Livro físico | Concluído | NÃO APLICÁVEL (sem atendimento presencial) |
| O-L25-09 | Processo humano 15 dias úteis | Por iniciar | Due date Admin manual; sem SLA engine |

## Superfícies na app

| Superfície | Login | Conteúdo |
|------------|-------|----------|
| Settings (Passenger / Driver) | Com login | LRE + secção RAL completa |
| Login footer | Sem login | Links compactos LRE / CACCL / CNIACC |
| `/download` landing | Sem login | Idem compacto |
| Reclamação interna | Com login | «Fazer reclamação» no histórico — **não** substituído |
