#!/usr/bin/env node
/**
 * Auditoria estática dia 23 — grep de violações vs plano pseudo-code.
 * Uso: node web-app/scripts/dia23-static-audit.mjs
 * Não altera ficheiros; só reporta.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..', 'src')
const MAP_PATHS = ['features/passenger', 'features/driver', 'components/layout', 'components/cards']

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts)$/.test(name)) acc.push(p)
  }
  return acc
}

const files = walk(ROOT).filter((f) =>
  MAP_PATHS.some((seg) => relative(ROOT, f).replace(/\\/g, '/').includes(seg))
)

const patterns = [
  { id: 'A', re: /max-h-\[min\(55/g, label: 'sheet idle antiga (55dvh)' },
  { id: 'A2', re: /max-h-\[min\(42dvh,360px\)/g, label: 'driver step1 lista alta' },
  { id: 'E', re: /min-h-\[52px\]/g, label: 'botão 52px (não compact)' },
  { id: 'P1', re: /rounded-(xl|lg|2xl)/g, label: 'rounded solto (P1-global)' },
  { id: 'C', re: /DriverShellTopChips/g, label: 'Estatuto chip referência' },
]

const hits = {}
for (const p of patterns) hits[p.id] = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const rel = relative(join(__dirname, '..'), file).replace(/\\/g, '/')
  for (const p of patterns) {
    const m = text.match(p.re)
    if (m) hits[p.id].push({ file: rel, count: m.length })
  }
}

console.log('\n=== Dia 23 static audit ===\n')
for (const p of patterns) {
  const list = hits[p.id]
  const total = list.reduce((s, x) => s + x.count, 0)
  console.log(`[${p.id}] ${p.label}: ${total} hit(s) in ${list.length} file(s)`)
  list.slice(0, 8).forEach((x) => console.log(`    ${x.count}x  ${x.file}`))
  if (list.length > 8) console.log(`    ... +${list.length - 8} files`)
  console.log('')
}

const p1Total = hits.P1?.reduce((s, x) => s + x.count, 0) ?? 0
console.log(
  p1Total > 15
    ? 'FAIL P1-global: >15 rounded soltos nos paths mapa'
    : 'OK P1-global: rounded soltos dentro do limiar (15)'
)
console.log('(Auditoria estática — confirmar no browser com ?dia23debug=1)\n')
