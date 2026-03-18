#!/usr/bin/env node
/**
 * B004.1.5: Verifica que não há cores hardcoded e que os tokens existem.
 * Executar: node scripts/verify-tokens.js
 */
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const SRC = join(process.cwd(), 'src')
const HARDCODED_PATTERN = /\b(slate|emerald|amber|sky|orange|violet)-\d+/g
const REQUIRED_TOKENS = [
  '--color-success',
  '--color-success-foreground',
  '--color-warning',
  '--color-warning-foreground',
  '--color-info',
  '--color-info-foreground',
  '--color-surface-raised',
  '--color-surface-overlay',
]

function* walkTsx(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      yield* walkTsx(full)
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
      yield full
    }
  }
}

let hasErrors = false

// 1. Verificar ausência de cores hardcoded em TSX
console.log('Verificando cores hardcoded em componentes...')
for (const file of walkTsx(SRC)) {
  const content = readFileSync(file, 'utf-8')
  const matches = content.match(HARDCODED_PATTERN)
  if (matches) {
    const unique = [...new Set(matches)]
    console.error(`  ERRO: ${file.replace(process.cwd(), '')} contém: ${unique.join(', ')}`)
    hasErrors = true
  }
}
if (!hasErrors) console.log('  OK: Nenhuma cor hardcoded encontrada.')

// 2. Verificar tokens nos temas
console.log('\nVerificando tokens nos temas...')
const themesDir = join(SRC, 'design-system', 'themes')
const themeFiles = readdirSync(themesDir).filter((f) => f.endsWith('.css'))
for (const file of themeFiles) {
  const content = readFileSync(join(themesDir, file), 'utf-8')
  const missing = REQUIRED_TOKENS.filter((t) => !content.includes(t))
  if (missing.length > 0) {
    console.error(`  ERRO: ${file} falta: ${missing.join(', ')}`)
    hasErrors = true
  } else {
    console.log(`  OK: ${file}`)
  }
}

// 3. Verificar tailwind.config
console.log('\nVerificando tailwind.config.js...')
const tailwindPath = join(process.cwd(), 'tailwind.config.js')
const tailwindContent = readFileSync(tailwindPath, 'utf-8')
const tailwindTokens = ['success', 'warning', 'info', 'surface']
const missingTailwind = tailwindTokens.filter((t) => !tailwindContent.includes(`${t}:`))
if (missingTailwind.length > 0) {
  console.error(`  ERRO: tailwind.config.js falta: ${missingTailwind.join(', ')}`)
  hasErrors = true
} else {
  console.log('  OK: tailwind.config.js tem success, warning, info, surface.')
}

process.exit(hasErrors ? 1 : 0)
