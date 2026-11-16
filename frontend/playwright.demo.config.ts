import { defineConfig, devices } from '@playwright/test';

/**
 * Vídeo de apresentação: um único teste longo que passa por todas as funcionalidades e grava a tela com o
 * `recordVideo` do Playwright. Roda isolado do ambiente de desenvolvimento (`make up`):
 *
 * - API: uma stack própria do compose (projeto `gomoney-demo`: API, Postgres e TigerBeetle, sem volumes),
 *   recriada do zero a cada gravação, na porta DEMO_API_PORT (tests/demo/support/docker-compose.yml).
 * - Web: o build de produção (a exportação estática em ./out) servido na porta DEMO_PORT, com /api
 *   repassado para a API acima (tests/demo/support/serve.mjs), como o nginx faz em produção.
 *
 *   npm run demo:video                     compila, sobe a stack e o web e grava em videos/
 *   DEMO_SKIP_BUILD=1 npm run demo:video   reaproveita o último build (./out)
 *   DEMO_KEEP_STACK=1 npm run demo:video   deixa a stack de demonstração no ar no fim
 *
 * Precisa de Docker e, no host, de Node e do Chromium do Playwright (`npx playwright install chromium`).
 * Com ffmpeg no host, o vídeo sai cortado em mp4; sem ele, fica o webm cru.
 */
const PORT = Number(process.env['DEMO_PORT'] ?? 3200);
const API_PORT = Number(process.env['DEMO_API_PORT'] ?? 8099);
const BASE_URL = `http://localhost:${PORT}`;

const build = process.env['DEMO_SKIP_BUILD'] ? '' : 'npx next build && ';

export default defineConfig({
  testDir: 'tests/demo',
  testMatch: '**/*.demo.ts',
  outputDir: 'test-results-demo',
  globalSetup: './tests/demo/support/global-setup.ts',
  globalTeardown: './tests/demo/support/global-teardown.ts',
  // A gravação inteira é um teste só.
  timeout: 20 * 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'light',
    // Cada ação um pouco mais lenta, para ser acompanhada no vídeo.
    launchOptions: { slowMo: 60 },
    // Nenhuma ação espera para sempre: falha rápido e guarda a tela.
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `${build}node tests/demo/support/serve.mjs`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      DEMO_PORT: String(PORT),
      API_URL: `http://localhost:${API_PORT}`,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
