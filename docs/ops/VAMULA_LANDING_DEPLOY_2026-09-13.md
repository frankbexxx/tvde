# VAMULÁ Landing V1 — Deploy produção

**Estado landing:** **DEPLOYED / PROD OK**  
**Estado páginas legais públicas:** **DEPLOYED / VALIDATED** (2026-09-16)  
**URL:** https://vamula.pt  

| Campo | Valor |
|-------|--------|
| Hosting | Hostinger Premium |
| Deploy | Manual → `public_html/` |
| Código fonte | `site/` no repo |
| Landing merge | `main` · PR **#585** / **#586** · 2026-09-13 |
| Legais merge | `main` · PR **#596** · `b513d6c` · 2026-09-16 |
| HTTPS | OK |
| Smoke landing desktop / mobile | **PASS** (2026-09-13) |
| Smoke páginas legais (público) | **PASS** (2026-09-16) — home + `/legal/` + `/privacidade/` + `/reclamacoes/` + `/ral/` · CSS/JS/logo 200 · nova versão detectada · cache não bloqueante |
| `default.php` | Removido |
| `index.html.bak` | Mantido em `public_html` (backup do teste anterior) |
| Upload Hostinger | **Manual por Francisco** (não automatizado no Cursor) |

## Páginas legais públicas (2026-09-16)

| Página | Estado | Notas |
|--------|--------|--------|
| `/` (landing) | **VALIDATED** | Sem morada completa; `Oeiras, Portugal`; emails `geral@` + `suporte@`; links legais |
| `/legal/` | **VALIDATED** | Sede completa; `legal@vamula.pt`; licença IMT **354/2026** |
| `/privacidade/` | **VALIDATED** | Sem morada completa; link para `/legal/`; `legal@vamula.pt` |
| `/reclamacoes/` | **VALIDATED** | `reclamacoes@vamula.pt`; link LRE **directo** (2026-09-22); prazo 15 dias úteis |
| `/ral/` | **VALIDATED** | CACCL + CNIACC; wording **provisório** (revisão jurídica futura); **sem** ODR antiga |

**Política desta fase:** sem telefone público · sem banner cookies.

## Emails institucionais

| Endereço | Estado |
|----------|--------|
| `geral@vamula.pt` | **ACTIVO** |
| `legal@vamula.pt` | **ACTIVO** |
| `suporte@vamula.pt` | **ACTIVO** (alias de `geral@`) |
| `reclamacoes@vamula.pt` | **ACTIVO** (alias de `legal@`) |

## Ainda pendente (site / ops)

- Revisão jurídica do wording RAL (provisório)
- Banner cookies (fase posterior)
- Formulário / tracking (fora de scope V1)

**Relacionado:** acta [`VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md`](../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) §7–10 · status [`TVDE_STATUS_SETEMBRO_2026.md`](../TVDE_STATUS_SETEMBRO_2026.md) · roadmap [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md).
