#!/usr/bin/env node
/**
 * Lote 4 docs audit: archive meta Alpha, inventários Maio, test book EN, relatórios.
 * Run from repo root: node scripts/docs-audit-lote4.mjs
 */
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const ARCHIVE = 'C:/dev/_archives/APP/docs-2026-06/lote-4'

const files = [
  // Alpha Abril
  'docs/meta/ALPHA_2026-04-25.md',
  'docs/meta/ALPHA_2026-04-25_ONDA0_RUNBOOK.md',
  'docs/meta/ALPHA_2026-04-25_RELATO.md',
  'docs/meta/ALPHA_2026-04-25_RETRO.md',
  'docs/meta/PILOTO_2026-04-25_ROTEIRO_CAMPO.md',
  'docs/meta/PILOTO_2026-04-25_TUTORIAL_CAPTIONS.md',
  'docs/meta/PILOTO_2026-04-25_TUTORIAL_1PAGINA.md',
  'docs/meta/PARCEIRO_ESTADO_VS_FALTA_2026-04-25.md',
  'docs/meta/MARKETING_IDEIA_APP_2026-04-25.md',
  'docs/meta/PILOTO_2026-04-25_QUESTOES_ISSUES.md',
  // Auditorias Abril
  'docs/meta/AUDIT_DEEP_2026-04-21.md',
  'docs/meta/AUDIT_STATUS_2026-04-23.md',
  'docs/meta/CRUISE_AUDIT_REPORT_2026-04-28.md',
  'docs/meta/CRUISE_AUDIT_CHECKLIST_2026-04-28.md',
  'docs/meta/CONSULTA_OBRIGATORIA_SESSAO_2026-04-09.md',
  // Planos executados
  'docs/meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md',
  // Inventários UI Maio (superseded by navigation-inventory)
  'docs/audit/INVENTARIO_UI_PASSENGER_2026-05.md',
  'docs/audit/INVENTARIO_UI_DRIVER_2026-05.md',
  'docs/audit/INVENTARIO_UI_PARTNER_2026-05.md',
  'docs/audit/INVENTARIO_UI_ADMIN_2026-05.md',
  'docs/audit/INVENTARIO_UI_MATRIZ_2026-05.md',
  // Test book EN
  'docs/testing/1_HUMAN_TESTING_PROTOCOL.md',
  'docs/testing/2_TESTING_RULES.md',
  'docs/testing/3_PRE_TEST_VERIFICATION.md',
  'docs/testing/4_TEST_ENVIRONMENT_SETUP.md',
  'docs/testing/5_TEST_STATE_DEFINITION.md',
  'docs/testing/6_TEST_NAVIGATION_MAP.md',
  'docs/testing/7_TEST_BOOK_PASSENGER.md',
  'docs/testing/8_TEST_BOOK_DRIVER.md',
  'docs/testing/9_TEST_BOOK_SIMULATOR.md',
  'docs/testing/10_TEST_BOOK_FULL_SYSTEM.md',
  'docs/testing/11_TEST_FAILURE_PROTOCOL.md',
  // Relatórios / RFC
  'docs/IMPLEMENTATION_REPORT_C009_K007.md',
  'docs/CODE_AUDIT_RFC.md',
  'docs/PARTNER_MULTITENANT_IMPLEMENTATION_REPORT.md',
  'docs/partner/MANUEL_DRIVER_QA_2026-04-29.md',
  'docs/BATCH_TESTING_PLAN_STAGING.md',
  'docs/BATCH_TESTING_RESULTS_TEMPLATE.md',
  'docs/dia23-gate-checklist.md',
  'docs/ops/W2_RUNBOOK_UI_DESIGN.md',
]

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

const existing = files.filter((f) => fs.existsSync(path.join(ROOT, f)))
for (const rel of existing) {
  copyFile(path.join(ROOT, rel), path.join(ARCHIVE, rel))
}

fs.writeFileSync(
  path.join(ARCHIVE, 'README_SNAPSHOT.txt'),
  `Docs audit Lote 4 — ${new Date().toISOString().slice(0, 10)}\n` +
    `Files: ${existing.length}\n` +
    `Canónico UI nav: docs/ux/navigation-inventory.md\n` +
    `Canónico testes PT: docs/testing/GUIA_TESTES.md\n\n` +
    existing.join('\n') + '\n',
)

fs.writeFileSync(path.join(ROOT, 'scripts/.lote4-rm-list.txt'), existing.join('\n'))
console.log('Archived:', existing.length)
