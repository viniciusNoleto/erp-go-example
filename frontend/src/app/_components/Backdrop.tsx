'use client';

import { useEffect, useRef } from 'react';

/**
 * O fundo da página de apresentação (só dela: as telas de trabalho ficam no
 * papel claro, sem efeito): uma gravação em guilhoché, a trama de linhas finas que
 * protege cédulas, cheques, ações e apólices (e que enfeita mostradores de
 * relógio). Num ERP com livro-razão, é o papel-moeda por trás dos números.
 *
 * Por que linhas finas: o vidro líquido só é vidro se houver algo atrás para
 * ele entortar. Linhas paralelas são o que mais denuncia uma lente: cada fio
 * se curva ao passar pela borda e se espaça no miolo ampliado.
 *
 * Duas camadas, ambas desenhadas UMA vez em <canvas> (nada é redesenhado
 * por quadro):
 *  - o campo: as ondas horizontais de segurança de um cheque, paradas, do
 *    tamanho da janela;
 *  - a roseta: faixas concêntricas de curvas entrelaçadas, centrada um pouco
 *    à direita, girando muito devagar em torno do próprio centro, como o
 *    torno que grava a matriz.
 *
 * O giro é um transform: rotate() na roseta, e o ângulo vem do relógio
 * (Date.now), então recarregar não faz o desenho "pular". Ele anda em passos
 * de 8 por segundo, não 60: cada passo move a borda menos de um pixel, e o
 * vidro (que recalcula a lente quando o fundo muda) trabalha 8 vezes por
 * segundo em vez de 60.
 */

/** Uma volta inteira da roseta, em segundos (40 minutos). */
const PERIOD = 40 * 60;
/** Intervalo entre um passo do giro e o próximo, em ms. */
const STEP = 125;

/** O centro da roseta, em fração da janela. */
const CX = 0.62;
const CY = 0.44;

/* O papel e as duas tintas da gravação: champanhe e prata. */
const GROUND = '#0b0c0e';
const GOLD = '214,194,150';
const SILVER = '186,192,202';

/** O campo: ondas horizontais finas, duas frequências somadas. */
function paintField(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = `rgba(${SILVER},0.05)`;
  let i = 0;
  for (let y = -12; y < h + 12; y += 7, i++) {
    const phase = i * 0.19;
    ctx.beginPath();
    for (let x = 0; x <= w + 8; x += 8) {
      const yy = y + 4.5 * Math.sin(x * 0.009 + phase) + 1.8 * Math.sin(x * 0.031 - phase * 1.6);
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

interface Band {
  /** Raio do meio da faixa, em fração do raio da roseta. */
  r: number;
  /** Amplitude da onda, idem. */
  a: number;
  /** Quantas ondas por volta. */
  n: number;
  /** Quantas curvas defasadas formam a trama. */
  k: number;
  tone: string;
  alpha: number;
}

/*
 * Cada faixa é a trama clássica do torno de guilhoché: k curvas fechadas
 * r(θ) = R + a·sen(nθ + φ), cada uma com a fase φ um pouco adiante da
 * anterior. Elas se cruzam e formam o "tecido" de losangos das cédulas.
 */
const BANDS: Band[] = [
  { r: 0.1, a: 0.03, n: 9, k: 60, tone: GOLD, alpha: 0.075 },
  { r: 0.22, a: 0.045, n: 15, k: 84, tone: SILVER, alpha: 0.045 },
  { r: 0.39, a: 0.06, n: 21, k: 110, tone: GOLD, alpha: 0.042 },
  { r: 0.6, a: 0.075, n: 29, k: 130, tone: SILVER, alpha: 0.03 },
  { r: 0.85, a: 0.085, n: 37, k: 150, tone: GOLD, alpha: 0.032 },
];

function paintRosette(ctx: CanvasRenderingContext2D, S: number) {
  const R = S / 2;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.translate(R, R);
  ctx.lineWidth = 0.8;
  for (const b of BANDS) {
    ctx.strokeStyle = `rgba(${b.tone},${b.alpha})`;
    const mid = b.r * R;
    const amp = b.a * R;
    // Um ponto a cada ~3px da circunferência: a curva fica lisa.
    const steps = Math.max(240, Math.round((2 * Math.PI * mid) / 3));
    for (let j = 0; j < b.k; j++) {
      const phi = (j / b.k) * Math.PI * 2;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = (s / steps) * Math.PI * 2;
        // Uma segunda onda, três vezes mais curta, dá o desenho em pétala.
        const rr = mid + amp * Math.sin(b.n * t + phi) + amp * 0.22 * Math.sin(b.n * 3 * t - phi * 2);
        const x = Math.cos(t) * rr;
        const y = Math.sin(t) * rr;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // O filete que fecha cada faixa por fora, como na gravação.
    ctx.beginPath();
    ctx.arc(0, 0, mid + amp * 1.35, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${b.tone},${b.alpha * 2.4})`;
    ctx.stroke();
  }
  ctx.restore();
}

function angleNow() {
  return ((Date.now() / 1000 / PERIOD) * 360) % 360;
}

export function Backdrop() {
  const fieldRef = useRef<HTMLCanvasElement>(null);
  const rosetteRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const rosette = rosetteRef.current;
    if (!field || !rosette) return;
    let size = 0;

    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // O campo acompanha a janela, na densidade da tela (até 2×).
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      field.width = Math.round(w * dpr);
      field.height = Math.round(h * dpr);
      field.style.width = `${w}px`;
      field.style.height = `${h}px`;
      const fctx = field.getContext('2d', { alpha: false });
      if (fctx) {
        fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintField(fctx, w, h);
      }

      // A roseta alcança o canto mais distante do centro; só é refeita
      // quando a janela cresce além dela.
      const reach = Math.hypot(Math.max(CX, 1 - CX) * w, Math.max(CY, 1 - CY) * h);
      const need = Math.ceil((reach * 2) / 128) * 128 + 128;
      rosette.style.left = `${CX * 100}%`;
      rosette.style.top = `${CY * 100}%`;
      if (need <= size) return;
      size = need;
      // Densidade limitada para o canvas não passar de ~4096px de lado.
      const rdpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 4096 / size));
      rosette.width = Math.round(size * rdpr);
      rosette.height = Math.round(size * rdpr);
      rosette.style.width = `${size}px`;
      rosette.style.height = `${size}px`;
      const rctx = rosette.getContext('2d');
      if (rctx) {
        rctx.setTransform(rdpr, 0, 0, rdpr, 0, 0);
        paintRosette(rctx, size);
      }
    };

    const turn = () => {
      rosette.style.transform = `translate(-50%, -50%) rotate(${angleNow().toFixed(4)}deg)`;
    };

    fit();
    turn();

    let resizing = 0;
    const onResize = () => {
      clearTimeout(resizing);
      resizing = window.setTimeout(fit, 200);
    };
    window.addEventListener('resize', onResize);

    // Quem pede menos movimento ganha a gravação parada.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = 0;
    const start = () => {
      clearInterval(timer);
      if (!still.matches) timer = window.setInterval(turn, STEP);
    };
    start();
    still.addEventListener('change', start);

    return () => {
      window.removeEventListener('resize', onResize);
      still.removeEventListener('change', start);
      clearTimeout(resizing);
      clearInterval(timer);
    };
  }, []);

  return (
    <div
      className="backdrop"
      aria-hidden="true"
    >
      <canvas
        ref={fieldRef}
        className="backdrop-field"
      />

      <canvas
        ref={rosetteRef}
        className="backdrop-rosette"
      />
    </div>
  );
}
