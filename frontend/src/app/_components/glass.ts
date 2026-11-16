/**
 * Vidro líquido: uma lente de verdade sobre o que está atrás.
 *
 * Um vidro comum (blur + tom translúcido) só embaça. O vidro líquido tem
 * espessura, e a luz entorta em toda a superfície, não só na borda:
 *
 *  - no miolo, a placa funciona como uma lente de aumento fraca: o fundo
 *    aparece ampliado e escorrega mais devagar do que o resto da tela;
 *  - por cima disso, uma ondulação leve e larga, como num vidro soprado,
 *    faz as linhas da gravação tremerem ao passar por baixo;
 *  - perto da borda a superfície curva e a distorção cresce em curva até a
 *    aresta: o fundo é puxado para dentro, comprimido.
 *
 * Como é montado (por superfície .glass):
 *
 *   .glass            o tom e o reflexo da borda; SEM backdrop-filter
 *     span.lens       camada de trás (z-index −1), recortada no raio
 *       i.lens-core   a superfície toda: desfoque leve + o filtro SVG da
 *                     lente (feDisplacementMap) + realce de cor
 *
 * Por que o pai não tem backdrop-filter: um elemento com backdrop-filter (ou
 * opacity < 1, filter, mask…) vira "raiz de fundo" — os filhos passam a ver
 * só o que está dentro dele, e a lente não enxergaria o fundo.
 *
 * A lente usa um MAPA DE DESLOCAMENTO desenhado num <canvas>: o vermelho
 * guarda quanto puxar em x, o verde em y (128 = não mexe). O mapa é suave,
 * então é desenhado na metade da resolução e o filtro o estica: 4× menos
 * pixels para calcular quando um painel muda de tamanho.
 *
 * Custo: o filtro roda a cada vez que o fundo muda por trás do vidro (ao
 * rolar e a cada passo do giro do fundo). Por isso a roseta gira em passos
 * de 8 por segundo (ver Backdrop.tsx), e não a 60.
 *
 * Só o Chromium aplica filtros SVG em backdrop-filter. Nos outros navegadores
 * a superfície fica com o vidro fosco do CSS (o fallback em app.css).
 */

export interface LensPreset {
  /** Largura da faixa curva da borda, em px. */
  bezel: number;
  /** Deslocamento máximo, na aresta, em px. */
  depth: number;
  /** Aumento do miolo: fração da distância ao centro que a lente puxa. */
  zoom: number;
  /** Amplitude da ondulação do vidro, em px. */
  ripple: number;
}

export const PRESETS: Record<string, LensPreset> = {
  panel: { bezel: 58, depth: 84, zoom: 0.07, ripple: 4 },
  bar: { bezel: 50, depth: 72, zoom: 0.07, ripple: 3.5 },
  float: { bezel: 58, depth: 88, zoom: 0.06, ripple: 4 },
  pill: { bezel: 26, depth: 34, zoom: 0.1, ripple: 2 },
};

/** O mapa é desenhado em 1/Q da resolução da superfície. */
const Q = 2;

export const lensSupported =
  typeof window !== 'undefined' &&
  typeof CSS !== 'undefined' &&
  CSS.supports('backdrop-filter', 'url(#a)') &&
  // Firefox e Safari dizem "sim" para a sintaxe mas não desenham o filtro.
  /Chrome\//.test(navigator.userAgent);

const SVG_NS = 'http://www.w3.org/2000/svg';
let defs: SVGDefsElement | null = null;

function ensureDefs(): SVGDefsElement {
  if (defs) return defs;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  defs = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return defs;
}

/**
 * O mapa de deslocamento de um retângulo arredondado w × h, raio r, faixa B.
 * Para cada pixel: o aumento do miolo (puxa para o centro, proporcional à
 * distância), a ondulação e, na faixa da borda, o puxão para dentro medido
 * pela forma arredondada (não pela caixa).
 */
function displacementMap(w: number, h: number, r: number, B: number, p: LensPreset): string {
  const mw = Math.max(1, Math.ceil(w / Q));
  const mh = Math.max(1, Math.ceil(h / Q));
  const canvas = document.createElement('canvas');
  canvas.width = mw;
  canvas.height = mh;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(mw, mh);
  const d = img.data;
  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, hw, hh);
  const max = p.depth;
  // O aumento nunca passa de 45% do deslocamento máximo: sobra espaço
  // para a borda curvar por cima dele.
  const zoomCap = max * 0.45;

  for (let j = 0; j < mh; j++) {
    for (let i = 0; i < mw; i++) {
      const k = (j * mw + i) * 4;
      d[k + 2] = 128;
      d[k + 3] = 255;

      const px = (i + 0.5) * Q - hw;
      const py = (j + 0.5) * Q - hh;
      const ax = Math.abs(px);
      const ay = Math.abs(py);
      const qx = ax - (hw - rad);
      const qy = ay - (hh - rad);

      let dist: number;
      let nx: number;
      let ny: number;
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy) || 1;
        dist = rad - len;
        nx = -(qx / len) * Math.sign(px);
        ny = -(qy / len) * Math.sign(py);
      } else if (hw - ax < hh - ay) {
        dist = hw - ax;
        nx = -Math.sign(px);
        ny = 0;
      } else {
        dist = hh - ay;
        nx = 0;
        ny = -Math.sign(py);
      }

      // O miolo: lente de aumento (busca o pixel mais perto do centro).
      let dx = Math.max(-zoomCap, Math.min(zoomCap, -px * p.zoom));
      let dy = Math.max(-zoomCap, Math.min(zoomCap, -py * p.zoom));

      // A ondulação: duas ondas largas e cruzadas, como vidro soprado.
      dx += p.ripple * Math.sin(py * 0.023 + px * 0.007);
      dy += p.ripple * Math.cos(px * 0.019 - py * 0.006);

      // A borda: quase nada no começo da faixa, forte na aresta.
      if (dist >= 0 && dist < B) {
        const t = 1 - dist / B;
        const m = t * t * (0.3 + 0.7 * t);
        dx += nx * m * max;
        dy += ny * m * max;
      }

      d[k] = 128 + (Math.max(-max, Math.min(max, dx)) / max) * 127;
      d[k + 1] = 128 + (Math.max(-max, Math.min(max, dy)) / max) * 127;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

function makeFilter(id: string, map: string, sw: number, sh: number, p: LensPreset) {
  // feDisplacementMap desloca (escala × (canal/255 − 0,5)): a escala é o
  // dobro do deslocamento máximo.
  const scale = p.depth * 2;
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('x', '0');
  filter.setAttribute('y', '0');
  filter.setAttribute('width', String(sw));
  filter.setAttribute('height', String(sh));
  filter.setAttribute('filterUnits', 'userSpaceOnUse');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  // Um deslocamento só: a versão com três (um por canal, para separar as
  // cores) custava o triplo de CPU a cada quadro e quase não se via.
  filter.innerHTML = `
    <feImage href="${map}" x="0" y="0" width="${sw}" height="${sh}" preserveAspectRatio="none" result="map"/>
    <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`;
  ensureDefs().appendChild(filter);
}

interface Lens {
  key: string;
  id: string;
  users: number;
}

const lenses = new Map<string, Lens>();
let counter = 0;

/** Cria (ou reaproveita) o filtro da lente para este tamanho. */
function acquire(w: number, h: number, r: number, presetName: string): Lens {
  const key = `${presetName}:${w}x${h}:${r}`;
  const found = lenses.get(key);
  if (found) {
    found.users++;
    return found;
  }
  const p = PRESETS[presetName] ?? PRESETS.panel;
  // A faixa nunca passa de um terço do lado menor (cápsulas, botões).
  const B = Math.max(4, Math.round(Math.min(p.bezel, w / 3, h / 3)));
  const id = `lens-${++counter}`;
  makeFilter(id, displacementMap(w, h, r, B, p), w, h, p);
  const lens = { key, id, users: 1 };
  lenses.set(key, lens);
  return lens;
}

function release(lens: Lens) {
  if (--lens.users > 0) return;
  lenses.delete(lens.key);
  document.getElementById(lens.id)?.remove();
}

/** Monta (uma vez) a camada da lente dentro da superfície. */
function layerOf(el: HTMLElement): HTMLElement {
  let layer = el.querySelector<HTMLElement>(':scope > .lens');
  if (layer) return layer;
  layer = document.createElement('span');
  layer.className = 'lens';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<i class="lens-core"></i>';
  el.prepend(layer);
  return layer;
}

/** O CSS do .lens-core monta o backdrop-filter com esta variável. */
function paint(el: HTMLElement, lens: Lens) {
  layerOf(el).style.setProperty('--lens', `url(#${lens.id})`);
}

/**
 * Liga a lente em todo elemento com a classe `.glass`, agora e no futuro.
 * Um ResizeObserver refaz a lente quando a superfície muda de tamanho (uma
 * tabela que carregou, a janela que encolheu). O preset vem de data-lens.
 */
export function startLenses(root: HTMLElement = document.body): () => void {
  if (!lensSupported) return () => {};
  document.documentElement.classList.add('lens-on');

  const current = new Map<HTMLElement, Lens>();
  const pending = new Set<HTMLElement>();
  let frame = 0;

  const apply = () => {
    frame = 0;
    for (const el of pending) {
      if (!el.isConnected) continue;
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 8 || h < 8) continue;
      const r = Math.round(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0);
      const old = current.get(el);
      const lens = acquire(w, h, r, el.dataset.lens ?? 'panel');
      paint(el, lens);
      current.set(el, lens);
      if (old) release(old);
    }
    pending.clear();
  };

  const schedule = (el: HTMLElement) => {
    pending.add(el);
    if (!frame) frame = requestAnimationFrame(apply);
  };

  const sizes = new ResizeObserver((entries) => entries.forEach((e) => schedule(e.target as HTMLElement)));

  const scan = () => {
    root.querySelectorAll<HTMLElement>('.glass').forEach((el) => {
      if (current.has(el) || pending.has(el)) return;
      sizes.observe(el);
      schedule(el);
    });
    for (const [el, lens] of current) {
      if (el.isConnected) continue;
      sizes.unobserve(el);
      current.delete(el);
      release(lens);
    }
  };

  // Só mudanças na lista de filhos importam; a própria camada .lens que
  // inserimos também dispara isto, mas o scan ignora quem já tem lente.
  const mutations = new MutationObserver(scan);
  mutations.observe(root, { childList: true, subtree: true });
  scan();

  return () => {
    mutations.disconnect();
    sizes.disconnect();
    for (const lens of current.values()) release(lens);
    current.clear();
  };
}
