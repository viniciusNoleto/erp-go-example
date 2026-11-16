import { spawnSync } from 'node:child_process';
import path from 'node:path';

const FILE = path.join(__dirname, 'docker-compose.yml');

/** Roda `docker compose` com o arquivo da stack de demonstração; falha com a saída do comando. */
export function compose(...args: string[]) {
  const result = spawnSync('docker', ['compose', '-f', FILE, ...args], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`docker compose ${args.join(' ')} falhou:\n${result.stderr || result.stdout}`);
}
