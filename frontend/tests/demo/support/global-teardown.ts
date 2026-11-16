import { compose } from './compose';

/** Apaga a stack do vídeo e os dados dela. DEMO_KEEP_STACK=1 deixa no ar, para inspecionar. */
export default function globalTeardown() {
  if (process.env['DEMO_KEEP_STACK']) return;
  compose('down', '-v', '--remove-orphans');
}
