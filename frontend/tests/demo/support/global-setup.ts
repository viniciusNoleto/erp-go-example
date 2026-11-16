import { compose } from './compose';

const API_PORT = Number(process.env['DEMO_API_PORT'] ?? 8099);

/**
 * Sobe a stack do vídeo do zero: derruba o que tiver sobrado de uma gravação anterior (com os dados) e
 * recompila a API. A API só responde depois de carregar a loja de demonstração, então o /api/health no ar
 * já quer dizer "dados prontos".
 */
export default async function globalSetup() {
  compose('down', '-v', '--remove-orphans');
  compose('up', '-d', '--build');

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${API_PORT}/api/health`);
      if (response.ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`a API de demonstração não respondeu em http://localhost:${API_PORT}/api/health`);
}
