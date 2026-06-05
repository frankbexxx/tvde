#!/usr/bin/env node
/**
 * Lote 3 docs audit: archive handoff files before truncate.
 * Run from repo root: node scripts/docs-audit-lote3.mjs
 */
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const ARCHIVE = 'C:/dev/_archives/APP/docs-2026-06/lote-3'

const files = [
  'TODOdoDIA.md',
  'docs/meta/PROXIMA_SESSAO.md',
  'docs/todo-em-curso.md',
]

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

for (const rel of files) {
  const src = path.join(ROOT, rel)
  if (!fs.existsSync(src)) {
    console.warn('skip (missing):', rel)
    continue
  }
  copyFile(src, path.join(ARCHIVE, rel.replace(/\\/g, '/')))
}

const manifest = files.filter((f) => fs.existsSync(path.join(ROOT, f)))
fs.writeFileSync(
  path.join(ARCHIVE, 'README_SNAPSHOT.txt'),
  `Docs audit Lote 3 — ${new Date().toISOString().slice(0, 10)}\n` +
    `Handoff histórico antes de truncar + remoção todo-em-curso.\n\n` +
    manifest.join('\n') + '\n',
)

console.log('Archived:', manifest.length, 'files to', ARCHIVE)
