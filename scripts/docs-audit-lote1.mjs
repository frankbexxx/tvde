#!/usr/bin/env node
/**
 * Lote 1 docs audit: copy to archive, generate index, list files to git rm.
 * Run from repo root: node scripts/docs-audit-lote1.mjs
 */
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const ARCHIVE = 'C:/dev/_archives/APP/docs-2026-06/lote-1'
const PLACEHOLDER = 'aguardando redac'

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

const stubs = [
  'docs/LOGS_E_TESTES_SINTESE.md',
  'docs/ROADMAP_TVDE_ATE_PRODUCAO.md',
  'docs/meta/RELATORIO_PROJETO_ROADMAP.md',
  'docs/ops/OPERATION_CHECKLIST.md',
  'docs/DOCUMENTATION_INVENTORY_2026-03-27.md',
]

const buildFiles = walk(path.join(ROOT, 'docs/build'))
const snapshotFiles = [
  'docs/snapshots/SNAPSHOT_2026-04-19.md',
  'docs/snapshots/SNAPSHOT_2026-04-20.md',
].map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f))

const pcDir = path.join(ROOT, 'docs/prompts/pilot-commercial')
const allPc = walk(pcDir).filter((f) => path.basename(f).startsWith('PROMPT_'))
const placeholders = allPc.filter((f) => fs.readFileSync(f, 'utf8').includes(PLACEHOLDER))
const kept = allPc.filter((f) => !placeholders.includes(f))

const toArchive = [...placeholders, ...buildFiles, ...stubs.map((s) => path.join(ROOT, s)), ...snapshotFiles]
  .filter((f) => fs.existsSync(f))

// Copy to archive
for (const src of toArchive) {
  const rel = path.relative(ROOT, src).replace(/\\/g, '/')
  const dest = path.join(ARCHIVE, rel)
  copyFile(src, dest)
}

const manifest = toArchive.map((f) => path.relative(ROOT, f).replace(/\\/g, '/')).sort()
fs.writeFileSync(
  path.join(ARCHIVE, 'README_SNAPSHOT.txt'),
  `Docs audit Lote 1 — ${new Date().toISOString().slice(0, 10)}\n` +
    `Files: ${manifest.length}\n\n` +
    manifest.join('\n') + '\n',
)

// Generate index markdown
const rows = placeholders.map((f) => {
  const rel = path.relative(pcDir, f).replace(/\\/g, '/')
  const phase = rel.split('/')[0] || 'root'
  const id = path.basename(f, '.md').replace('PROMPT_', '')
  return `| ${id} | ${phase} | Arquivo L1 | placeholder — ver arquivo |`
})
const indexMd = `# Índice — placeholders pilot-commercial (arquivados Lote 1)

**Arquivo:** \`C:\\\\dev\\\\_archives\\\\APP\\\\docs-2026-06\\\\lote-1\\\\docs\\\\prompts\\\\pilot-commercial\\\\\`

Prompts **com conteúdo** mantidos no Git (${kept.length}): ${kept.map((f) => path.basename(f)).join(', ')}

| ID | Fase | Estado | Notas |
|----|------|--------|-------|
${rows.join('\n')}
`
fs.writeFileSync(path.join(ROOT, 'docs/prompts/pilot-commercial/PILOT_COMMERCIAL_PLACEHOLDER_INDEX.md'), indexMd)

// Write rm list for shell
const rmRel = manifest.map((m) => m.replace(/\//g, path.sep))
fs.writeFileSync(path.join(ROOT, 'scripts/.lote1-rm-list.txt'), rmRel.join('\n'))

console.log('Archived:', manifest.length)
console.log('Kept pilot-commercial:', kept.length)
console.log('Index written: PILOT_COMMERCIAL_PLACEHOLDER_INDEX.md')
