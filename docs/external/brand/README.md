# Brand documental externa — VAMULÁ

Identidade visual para dossiers e documentos gerados **fora** da app (advogado, contabilista, reguladores, parceiros).

| Campo | Valor |
|-------|--------|
| **Versão** | v0 (2026-10-11) |
| **Especificação** | DOC-TOOL-1A (design spec) |
| **Audiência** | INTERNAL (equipa que gera documentos) |

---

## Ficheiros

| Ficheiro | Papel |
|----------|--------|
| [`reference.docx`](reference.docx) | **Contrato visual** Word/Pandoc — estilos, capa de referência, header/footer |
| [`tokens.yaml`](tokens.yaml) | Tokens de cor, tipo, página e paths de assets |
| [`assets/vamula-iconmark.png`](assets/vamula-iconmark.png) | Cópia para embebido no template (fonte canónica abaixo) |

---

## Asset canónico

- **Iconmark institucional (fonte no repo):** [`site/assets/vamula-iconmark.png`](../../../site/assets/vamula-iconmark.png)
- **Cópia nesta pasta:** usada pelo `reference.docx` e futura geração; manter alinhada com o site.
- **Wordmark:** [`web-app/public/brand/vamula-wordmark.png`](../../../web-app/public/brand/vamula-wordmark.png) — só se a capa exigir logótipo gráfico completo (v0 usa iconmark + tipografia).

Não editar estilos directamente nos DOCX/PDF **gerados** para envio; corrigir sempre `reference.docx` (ou source MD) e regenerar.

Alterações a branding ou `reference.docx` exigem **PR** revisto.

---

## Tipografia

- **Preferida:** Plus Jakarta Sans (400, 500, 600, 700) — alinhada à [landing](https://vamula.pt/).
- **Fallback (v0, sem embedding obrigatório):** Segoe UI → Calibri → sans-serif do sistema.
- Para PDF consistente entre máquinas, instalar Plus Jakarta Sans localmente ou activar embedding numa versão futura.

---

## Pipeline (futuro)

```text
Markdown/YAML (source) → Pandoc + reference.docx → DOCX → LibreOffice → PDF
```

Não implementado nesta fase (v0). Ver [`../README.md`](../README.md).

---

## Estilos custom e Pandoc

Estilos como `Q-EXT ID`, callouts e `Metadata Label` existem no `reference.docx`. O Pandoc **mapeia** por defeito `Title`, `Heading 1–3`, `Body Text`, tabelas e `Block Quote`. Estilos custom **não** são aplicados automaticamente sem atributos `custom-style` no Markdown ou filtro Lua (previsto para fase seguinte). Limitação documentada; não usar formatação manual nos outputs finais.

---

## Resposta Q-EXT

A secção «Resposta do destinatário» nos blocos `Q-EXT-*` é **opcional** no template (omitir quando o dossier é só consulta).
