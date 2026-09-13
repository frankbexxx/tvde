# VAMULÁ — Decisões operacionais / negócio (2026-09-09)

**Tipo:** acta de decisões de negócio/operação  
**Data da sessão:** 09/09/2026  
**Participantes:** responsável da Ventos Férteis (Manel) + Francisco  
**Estado:** canónico para as decisões abaixo — **não** é implementação técnica nem parecer jurídico  

**Fontes relacionadas:**

- Societário: [`docs/legal/sources/empresa/`](../legal/sources/empresa/)
- Registo oficial IMT/marca: [`docs/legal/VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md`](../legal/VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md)
- Modelo económico A1: [`A1_MODELO_ECONOMICO_SETEMBRO_2026.md`](A1_MODELO_ECONOMICO_SETEMBRO_2026.md)
- Roadmap: [`docs/ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md)
- Status: [`docs/TVDE_STATUS_SETEMBRO_2026.md`](../TVDE_STATUS_SETEMBRO_2026.md)

---

## 1. Empresa / marca

| Campo | Decisão |
|-------|---------|
| Empresa | Ventos Férteis, Lda. |
| Marca | VAMULÁ |
| CAE principal | `52320-R4` |
| Dados societários oficiais | Remeter a [`docs/legal/sources/empresa/`](../legal/sources/empresa/) (Certidão Permanente = referência actual) |

Não duplicar dados pessoais desnecessários neste documento.

---

## 2. Governação operacional inicial

No arranque, **Manel + Francisco** formam o núcleo principal de operação/decisão.

| Tema | Responsável inicial |
|------|---------------------|
| Decisões legais/contratuais | Manel + Francisco |
| Publicação de informação legal/comercial | Manel + Francisco |
| Alterações futuras de preços | Manel + Francisco |
| Aprovação de textos/imagens do site | Manel + Francisco |
| Contacto interno Driver/Partner | Manel + Francisco |
| Contacto interno Passenger | Manel + Francisco |
| Decisão final sobre funcionalidades/regras VAMULÁ | Manel + Francisco |
| Relação com contabilista / CAE / facturação | Manel |

**Nota:** isto **não** é RBAC técnico da APP — é governação humana do arranque.

---

## 3. Comissão

| Campo | Decisão |
|-------|---------|
| Comissão plataforma (piloto) | **15%** |

Confirmado na sessão 09/09/2026 (alinha e **fecha** a publicação de A2.3 / `S-BIZ-02` no eixo %).  
**Não** altera código de pricing nesta acta.

---

## 4. Pricing (tarifário)

| Campo | Estado |
|-------|--------|
| Tabela final de preços | **PENDENTE — decisão comercial posterior** |

Quando o roadmap chegar ao bloco pricing/comercial: analisar primeiro implementação existente, grelha actual e alternativas. **Não** inventar tabela neste documento.

---

## 5. Acertos Partner / Frota (settlement)

| Campo | Decisão |
|-------|---------|
| Periodicidade | **Semanal** |
| Dia previsto | **Segunda-feira** |
| Processo | **Manual** inicialmente (salvo decisão futura diferente) |
| Conta de pagamentos reais | **Manel** |

Política operacional fechada; **implementação técnica** de settlement automático **não** está concluída por esta decisão.

---

## 6. Apoio / operação

| Campo | Decisão |
|-------|---------|
| Horário humano inicial | **09:00–17:00, segunda a sexta** |
| Telefone público de apoio | **NÃO PREVISTO NA FASE INICIAL** |
| Modelo inicial | Email + formulário/contacto digital |

Telefone público **não** é gap obrigatório nesta fase.

---

## 7. Domínio VAMULÁ

| Campo | Decisão / estado |
|-------|------------------|
| Domínio escolhido | **`vamula.pt`** |
| Titular | Ventos Férteis, Lda. |
| Variantes adicionais | **Não** comprar neste momento |
| Gestão/acesso | Manel + Francisco |
| Situação (2026-09-13) | **ACTIVO em produção** — https://vamula.pt (HTTPS OK) |

**Histórico:** em 09/09/2026 o domínio estava bloqueado externamente no .PT (recuperação de contacto). Em 13/09/2026 o site institucional V1 já está publicado no domínio.

**Importante:** emails `@vamula.pt` e LRE continuam pendentes — **não** bloqueiam a APP.

---

## 8. Hosting / site institucional

| Campo | Estado (2026-09-13) |
|-------|---------------------|
| Alojamento | **Hostinger Premium** |
| Tipo | Site institucional estático (`site/` no repo) |
| Deploy | Manual para `public_html/` |
| Landing V1 | **DEPLOYED / PROD OK** — https://vamula.pt |
| HTTPS | OK |
| Smoke desktop/mobile | PASS |
| `default.php` | Removido |
| `index.html.bak` | Mantido (backup) |
| Custo contrato | Ainda **TBD** no modelo económico A1 (não inventar valor) |

Fonte de deploy: [`docs/ops/VAMULA_LANDING_DEPLOY_2026-09-13.md`](../ops/VAMULA_LANDING_DEPLOY_2026-09-13.md).

---

## 9. Email profissional

| Campo | Estado |
|-------|--------|
| Email actual da empresa | `ventosferteis@gmail.com` |
| Email(s) no domínio VAMULÁ | **PENDENTE DO DOMÍNIO** |

Inclui (quando o domínio estiver sob controlo): email geral, email de reclamações, outros contactos institucionais necessários. **Não** inventar endereços finais aqui.

---

## 10. LRE (Livro de Reclamações Electrónico)

| Campo | Decisão / estado |
|-------|------------------|
| Timing | Depois de concluído/desbloqueado o domínio |
| Responsáveis iniciais | Manel + Francisco |
| Resposta / prazos | Manel + Francisco |
| Acesso/credenciais | Disponíveis a ambos |
| Estado | **PENDENTE — executar após domínio** |

Obrigatório operacionalmente, mas **NÃO** bloqueia o desenvolvimento actual da APP.  
Não fechar L-25 globalmente enquanto O-L25-01… permanecerem pendentes.

---

## 11. Itens fechados vs pendentes (esta sessão)

### Fechados / confirmados

- Comissão **15%**
- Settlement Partner: **semanal / segunda-feira / manual**
- Núcleo operacional inicial Manel + Francisco
- Sem telefone público na fase inicial
- Domínio alvo `vamula.pt` (titular Ventos Férteis)
- G-KYC-P0-04 permanece **CLOSED** (fora desta acta; já fechado)
- **Landing institucional V1** em https://vamula.pt (**Hostinger Premium** · deploy manual · 2026-09-13)

### Ainda pendentes

- Tabela de preços final / acta A1.4
- Emails `@vamula.pt`
- Registo/ops LRE
- Validação custos Hostinger no modelo A1 (valor contratado)
- Páginas legais no site (Privacidade, Termos, LRE, RAL)

### Dependências externas

- **.PT** — recuperação/alteração de contacto do domínio
- Contabilista (facturação/CAE fino) — Manel
- Portal LRE — após domínio
