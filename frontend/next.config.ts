import type { NextConfig } from 'next';

/*
 * Dois modos:
 *
 *  - `next dev` (o container local): o próprio Next repassa /api para o
 *    backend Go (razonete-api:8080 dentro do compose, via API_URL), então o
 *    navegador nunca precisa de CORS nem de URL absoluta.
 *  - `next build` (produção): exportação estática para ./out. Nenhum servidor
 *    Node em produção: o nginx serve os arquivos e repassa /api (ver
 *    configs/docker/nginx/default.conf), como já fazia com o build do Vite.
 */
const dev = process.env.NODE_ENV !== 'production';
const api = process.env.API_URL ?? 'http://localhost:8088';

const config: NextConfig = {
  reactStrictMode: true,
  // Sem gzip no servidor de dev: comprimir segura o Server-Sent Events
  // (/api/events) até juntar um bloco, e o "ao vivo" deixa de ser ao vivo.
  compress: false,
  devIndicators: false,
  // O Next 16 gera um AGENTS.md no projeto a cada `next dev`; não queremos o arquivo aqui.
  agentRules: false,
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@tabler/icons-react'],
  },
  ...(dev
    ? {
        async rewrites() {
          return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
        },
      }
    : { output: 'export' as const, images: { unoptimized: true } }),
};

export default config;
