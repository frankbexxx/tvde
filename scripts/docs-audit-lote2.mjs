#!/usr/bin/env node
/**
 * Lote 2 docs audit: copy to archive, list files to git rm.
 * Run from repo root: node scripts/docs-audit-lote2.mjs
 */
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const ARCHIVE = 'C:/dev/_archives/APP/docs-2026-06/lote-2'

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (ent.name.endsWith('.md')) acc.push(p)
  }
  return acc
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

const extra = walk(path.join(ROOT, 'docs/prompts')).filter((f) =>
  path.basename(f).startsWith('EXTRA-2026-05-13'),
)
const ambiance = walk(path.join(ROOT, 'docs/prompts/ambiance'))
const passengerFrota = walk(path.join(ROOT, 'docs/prompts/passenger-frota-2026-05-06'))
const manelLegal = walk(path.join(ROOT, 'docs/prompts/manel-legal-extra-2026-05'))

const singles = [
  'docs/prompts/CRUISE_PROMPTS_2026-04-28.md',
  'docs/prompts/UX_MINI_ROADMAP_E_PROMPTS.md',
  'docs/prompts/PROMPT_ZONES_V1_BUDGET_EXTRA_AND_GEO.md',
].map((f) => path.join(ROOT, f))

const i18nDir = path.join(ROOT, 'docs/prompts/i18n-v2')
const i18nKeep = new Set(['PROMPT_I18N_INDEX.md', 'PROMPT_I18N_X3_LEGAL_POLICY.md'])
const i18nArchive = walk(i18nDir).filter((f) => !i18nKeep.has(path.basename(f)))

const toArchive = [...extra, ...ambiance, ...passengerFrota, ...manelLegal, ...singles, ...i18nArchive].filter(
  (f) => fs.existsSync(f),
)

for (const src of toArchive) {
  const rel = path.relative(ROOT, src).replace(/\\/g, '/')
  copyFile(src, path.join(ARCHIVE, rel))
}

const manifest = toArchive.map((f) => path.relative(ROOT, f).replace(/\\/g, '/')).sort()
fs.writeFileSync(
  path.join(ARCHIVE, 'README_SNAPSHOT.txt'),
  `Docs audit Lote 2 — ${new Date().toISOString().slice(0, 10)}\n` +
    `Files: ${manifest.length}\n\n` +
    manifest.join('\n') + '\n',
)

fs.writeFileSync(path.join(ROOT, 'scripts/.lote2-rm-list.txt'), manifest.join('\n'))

console.log('Archived:', manifest.length)
console.log('Kept i18n-v2:', [...i18nKeep].join(', '))
