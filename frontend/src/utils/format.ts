import type { IProductItem } from '@/resources/product/models/ProductItem';

const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat('pt-BR');

/** 123456 -> "1.234,56" (sem o símbolo; a interface o mostra menor, em cinza). */
export const money = (cents: number) => brl.format(cents / 100);
// O espaço é o inseparável (\u00a0): "R$" nunca fica sozinho no fim da linha.
export const moneyFull = (cents: number) => `R$\u00a0${money(cents)}`;
export const count = (n: number) => int.format(n);
export const percent = (ratio: number) => `${brl.format(ratio * 100).replace(/,(\d)\d$/, ',$1')}%`;

/** "1.234,56" | "1234.56" | "89,9" -> centavos. Devolve NaN se não for número. */
export function parseMoney(text: string): number {
  const clean = text.trim().replace(/[R$\s]/g, '');
  if (!clean) return NaN;
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const full = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Hoje", "Ontem" ou "12 de nov." */
export function day(iso: string): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return dayMonth.format(d).replace('.', '');
}
export const hour = (iso: string) => time.format(new Date(iso));
export const shortDate = (iso: string | number) => dayMonth.format(new Date(iso)).replace('.', '');
export const longDate = (iso: string) => full.format(new Date(iso));


export const plural = (n: number, one: string, many: string) => `${count(n)} ${n === 1 ? one : many}`;

/** "2 × Lápis pastel, 1 × Bloco A4": a segunda linha de uma venda ou compra. */
export const itemsText = (items: IProductItem[]) => items.map((item) => `${item.qty} × ${item.name}`).join(', ');
