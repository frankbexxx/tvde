/// <reference types="vitest/config" />
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function readPackageVersion(): string {
  try {
    const raw = readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
    const pkg = JSON.parse(raw) as { version?: unknown }
    return typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version.trim() : '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function readGitShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'local'
  }
}

const appVersion = readPackageVersion()
const appGitSha = readGitShortSha()
const stagingWebProof = process.env.VAMULA_STAGING_WEB === '1'

function dropLayoutProbeForStagingWeb() {
  const inert = [
    'export function isDia23DebugEnabled() { return false }',
    'export function installDia23LayoutProbe() { return function () {} }',
  ].join('\n')
  return {
    name: 'staging-web-drop-layout-probe',
    enforce: 'pre' as const,
    resolveId(source: string) {
      if (source.includes('dia23LayoutProbe.inert')) return null
      if (source.endsWith('dia23LayoutProbe') || source.endsWith('dia23LayoutProbe.ts')) {
        return '\0staging-dia23-inert'
      }
      return null
    },
    load(id: string) {
      if (id === '\0staging-dia23-inert') return inert
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_GIT_SHA__: JSON.stringify(appGitSha),
  },
  plugins: [react(), ...(stagingWebProof ? [dropLayoutProbeForStagingWeb()] : [])],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.mjs'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        // 127.0.0.1 evita ::1 no Windows quando o uvicorn está só em IPv4
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
