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
| Situação (2026-09-16) | **ACTIVO em produção** — https://vamula.pt (HTTPS OK) · páginas legais **DEPLOYED / VALIDATED** |

**Histórico:** em 09/09/2026 o domínio estava bloqueado externamente no .PT (recuperação de contacto). Em 13/09/2026 o site institucional V1 já está publicado no domínio. Em 16/09/2026 as páginas legais públicas foram publicadas e validadas por smoke.

**Importante:** LRE link directo **configurado** 2026-09-22 — **não** bloqueia a APP.

---

## 8. Hosting / site institucional

| Campo | Estado (2026-09-16) |
|-------|---------------------|
| Alojamento | **Hostinger Premium** |
| Tipo | Site institucional estático (`site/` no repo) |
| Deploy | Manual para `public_html/` |
| Landing V1 | **DEPLOYED / PROD OK** — https://vamula.pt |
| Páginas legais públicas | **DEPLOYED / VALIDATED** — `/legal/` · `/privacidade/` · `/reclamacoes/` · `/ral/` · PR [#596](https://github.com/frankbexxx/tvde/pull/596) |
| HTTPS | OK |
| Smoke desktop/mobile | PASS (landing 13/09; legais 16/09) |
| `default.php` | Removido |
| `index.html.bak` | Mantido (backup) |
| Custo contrato | Ainda **TBD** no modelo económico A1 (não inventar valor) |

Fonte de deploy: [`docs/ops/VAMULA_LANDING_DEPLOY_2026-09-13.md`](../ops/VAMULA_LANDING_DEPLOY_2026-09-13.md).

---

## 9. Email profissional

| Campo | Estado (2026-09-16) |
|-------|---------------------|
| Email actual da empresa | `ventosferteis@gmail.com` (legado / fallback) |
| `geral@vamula.pt` | **ACTIVO** |
| `legal@vamula.pt` | **ACTIVO** |
| `suporte@vamula.pt` | **ACTIVO** (alias de `geral@`) |
| `reclamacoes@vamula.pt` | **ACTIVO** (alias de `legal@`) |
| `manel@vamula.pt` | **ACTIVO** (alias de `legal@`) · confirmado 2026-09-24 |
| `francisco@vamula.pt` | **ACTIVO** (alias de `geral@`) · confirmado 2026-09-24 |

Sem telefone público nesta fase.

---

## 10. LRE (Livro de Reclamações Electrónico)

| Campo | Decisão / estado |
|-------|------------------|
| Timing | Domínio e emails já activos |
| Gestor de Reclamações (O-L25-05) | **CONCLUÍDO** 2026-09-22 — titular **Manel Perez** (operação) · substituto **Francisco Bexiga** (supervisão/backup) · substituto assume na ausência do titular |
| Resposta / prazos | 15 dias úteis (página pública) · sem SLA adicional · ambos controlam o prazo |
| Acesso/credenciais | Registo backoffice **activo** (evidência 2026-09-22) |
| Página pública `/reclamacoes/` | Link **directo** da loja VAMULÁ |
| Link directo entidade | **CONFIGURADO** 2026-09-22 — `https://livroreclamacoes.pt/inicio/qrcode_operator?economicoperator=43122981&store=43187609` |
| Evidência | `docs/legal/sources/lre/vamula-lre-qrcode-2026-09-22.pdf` |
| Canal AMT (O-L25-06) | **CONCLUÍDO** 2026-09-22 — sector Táxis/TVDE activo · entidade reguladora AMT · screenshot em `docs/legal/sources/lre/` |
| RAL `/ral/` | **DEPLOYED / VALIDATED** — wording **provisório** (CACCL/CNIACC); sem ODR antiga; revisão jurídica futura |

O registo, o link directo LRE, o canal AMT (O-L25-06), o gestor de reclamações (O-L25-05) e a marca no registo (O-L25-03) estão fechados. O-L25-02 está **SUPERSEDED**: o LRE já não exige CAE; o sector Táxis/TVDE com AMT cobre a classificação. O CAE `52320-R4` fica na documentação societária e esta acta não conclui se está fiscalmente correcto. O-L25-09 está **CONCLUÍDO** (2026-09-24): acesso LRE do titular confirmado e dry-run interno na API Admin de STAGING, sem reclamação real no LRE. O-L25-04 está **CONCLUÍDO** (2026-09-24): notificações LRE em `legal@vamula.pt`, sugestões/elogios em `geral@vamula.pt`, aliases `reclamacoes@` e `manel@` testados até `legal@`, Francisco com acesso de backup, leitura pelo menos diária em dias úteis. **L-25 = FECHADO**. O endereço pessoal antigo é assunto separado e não pertence a este fecho.

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
- **Páginas legais públicas** = **DEPLOYED / VALIDATED** (2026-09-16 · PR #596)
- Emails institucionais `@vamula.pt` **activos** (`geral@` · `legal@` · aliases `suporte@` / `reclamacoes@` / `manel@` / `francisco@`)
- Sem banner cookies nesta fase

### Ainda pendentes

- Revisão jurídica do wording RAL
- Validação custos Hostinger no modelo A1 (valor contratado)

### Fechado depois desta acta

- **A1.4 DECIDIDA / CLOSED** (2026-09-18) — comissão **15% fixa**; tarifas GO/Comfort/XL + mínimos + Pet + cancel + tolls 0% + waiting/surge OFF + MB WAY Fase 2 + margem mínima aceite; variável 20%→15% **não** seleccionada. Ver [`A1_MODELO_ECONOMICO_SETEMBRO_2026.md`](A1_MODELO_ECONOMICO_SETEMBRO_2026.md) §6h.

### Dependências externas

- Contabilista (facturação/CAE fino) — Manel
- Revisão jurídica RAL (provisório publicado)
