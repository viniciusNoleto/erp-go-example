'use client';

import { motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react';

import { money, shortDate } from '@/utils/format';
import { UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { colors, palettes } from '@/tokens';

const { ink } = palettes;

export interface ChartPoint {
  t: number; // milissegundos
  v: number; // centavos
}

const M = { top: 16, right: 4, bottom: 28, left: 60 };

/** Passo "redondo" (1, 2 ou 5 × 10ⁿ) para quatro intervalos no eixo. */
function niceStep(range: number): number {
  const raw = range / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / pow;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * pow;
}

function axisLabel(cents: number): string {
  const reais = cents / 100;
  if (Math.abs(reais) >= 1000) return `${(reais / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/**
 * Saldo de uma conta ao longo do tempo, em degraus: o saldo só muda quando há
 * um lançamento, então a linha fica reta entre um e outro (nada de curva
 * inventando valores que nunca existiram).
 *
 * A linha é a única cor da tela, o ouro da moeda. Ao passar o cursor, o trecho
 * depois dele fica cinza: o que se lê é o saldo naquele dia.
 */
export function ChartLine({ points, height = 220, label }: { points: ChartPoint[]; height?: number; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const clip = useId().replace(/:/g, '');
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (!width || points.length === 0) return null;
    const t0 = points[0].t;
    const t1 = Math.max(Date.now(), points[points.length - 1].t);
    const values = points.map((p) => p.v);
    let lo = Math.min(0, ...values);
    let hi = Math.max(...values);
    if (lo === hi) hi = lo + 10_000;
    const step = niceStep(hi - lo);
    const y0 = Math.floor(lo / step) * step;
    // O último traço do eixo fica acima do máximo: a linha nunca encosta no topo.
    const y1 = Math.ceil((hi + step * 0.1) / step) * step;
    const ticks: number[] = [];
    for (let v = y0; v <= y1 + 1; v += step) ticks.push(v);

    const w = width - M.left - M.right;
    const h = height - M.top - M.bottom;
    const x = (t: number) => M.left + ((t - t0) / (t1 - t0 || 1)) * w;
    const y = (v: number) => M.top + h - ((v - y0) / (y1 - y0)) * h;

    let d = `M${x(points[0].t)} ${y(points[0].v)}`;
    for (let i = 1; i < points.length; i++) d += ` H${x(points[i].t)} V${y(points[i].v)}`;
    d += ` H${x(t1)}`;

    const days = width < 520 ? 3 : 5;
    const xTicks = Array.from({ length: days }, (_, i) => t0 + ((t1 - t0) * i) / (days - 1));
    return { x, y, d, ticks, xTicks, t0, t1, w, h };
  }, [points, width, height]);

  const onMove = (event: PointerEvent) => {
    if (!geo || !box.current) return;
    const px = event.clientX - box.current.getBoundingClientRect().left;
    const t = geo.t0 + ((px - M.left) / geo.w) * (geo.t1 - geo.t0);
    // O ponto vigente em t é o último lançamento que aconteceu antes dele.
    let index = 0;
    for (let i = 0; i < points.length; i++) if (points[i].t <= t) index = i;
    setHover(index);
  };

  const hovered = hover !== null && geo ? points[Math.min(hover, points.length - 1)] : null;
  const cut = hovered && geo ? geo.x(hovered.t) : width;

  return (
    <div
      className="relative touch-pan-y"
      ref={box}
      style={{ height }}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <UtilsIf condition={geo}>
        {() => (
          <svg
            height={height}
            role="img"
            aria-label={label}
            className="block w-full overflow-visible fill-muted text-12 tabular-nums"
          >
            <defs>
              <clipPath id={`${clip}-a`}>
                <rect
                  x={0}
                  y={0}
                  width={Math.max(0, cut)}
                  height={height}
                />
              </clipPath>

              <clipPath id={`${clip}-b`}>
                <rect
                  x={cut}
                  y={0}
                  width={Math.max(0, width - cut)}
                  height={height}
                />
              </clipPath>
            </defs>

            <UtilsFor
              each={geo!.ticks}
              eachKey={({ item: tick }) => tick}
            >
              {({ item: tick, index }) => (
                <g>
                  <line
                    x1={M.left}
                    x2={width - M.right}
                    y1={geo!.y(tick)}
                    y2={geo!.y(tick)}
                    stroke={index === 0 ? colors.control : colors.rule}
                  />

                  <text
                    x={M.left - 12}
                    y={geo!.y(tick) + 4}
                    textAnchor="end"
                  >
                    {axisLabel(tick)}
                  </text>
                </g>
              )}
            </UtilsFor>

            <UtilsFor
              each={geo!.xTicks}
              eachKey={({ item: tick }) => tick}
            >
              {({ item: tick, index }) => (
                <text
                  x={geo!.x(tick)}
                  y={height - 6}
                  textAnchor={index === 0 ? 'start' : index === geo!.xTicks.length - 1 ? 'end' : 'middle'}
                >
                  {index === geo!.xTicks.length - 1 ? 'Hoje' : shortDate(tick)}
                </text>
              )}
            </UtilsFor>

            <motion.path
              key={label}
              d={geo!.d}
              fill="none"
              stroke={colors.data}
              strokeWidth={2}
              strokeLinejoin="round"
              clipPath={`url(#${clip}-a)`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />

            <UtilsIf condition={hovered}>
              {() => (
                <>
                  <path
                    d={geo!.d}
                    fill="none"
                    stroke={ink[3]}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    clipPath={`url(#${clip}-b)`}
                  />

                  <line
                    x1={cut}
                    x2={cut}
                    y1={M.top}
                    y2={height - M.bottom}
                    stroke={ink[4]}
                    strokeDasharray="3 3"
                  />

                  <circle
                    cx={cut}
                    cy={geo!.y(hovered!.v)}
                    r={4}
                    fill={colors.surface}
                    stroke={colors.data}
                    strokeWidth={2}
                  />
                </>
              )}
            </UtilsIf>
          </svg>
        )}
      </UtilsIf>

      <UtilsIf condition={geo && hovered}>
        {() => (
          <div
            className="pointer-events-none absolute -top-1.5 -translate-x-1/2 rounded-sm bg-ink px-2 py-1 text-12 whitespace-nowrap text-white tabular-nums"
            style={{ left: Math.min(Math.max(cut, 90), width - 90) }}
          >
            {`${shortDate(hovered!.t)} · R$ ${money(hovered!.v)}`}
          </div>
        )}
      </UtilsIf>
    </div>
  );
}
