'use client';

import { ActionIcon, Button, Input, NumberInput, Select } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import { UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import type { IProduct } from '@/resources/product/models/Product';
import { cn } from '@/utils/cn';
import { money } from '@/utils/format';
import { useNotFirstEffect } from '@/utils/hooks';

import { FormMoneyInput } from './MoneyInput';
import type { FormInputPropsOnValidate } from './types';

/** Uma linha de item no formulário de venda ou compra. */
export type FormItemLine = {
  productId: number;
  qty: number;
  /** Custo unitário em centavos: só nas compras. */
  cost: number | null;
};

export const emptyItemLine = (products: IProduct[] | undefined): FormItemLine => ({
  productId: products?.[0]?.id ?? 0,
  qty: 1,
  cost: null,
});

type FormItemLinesProps = FormInputPropsOnValidate & {
  value?: FormItemLine[];
  onChange?: (value: FormItemLine[]) => void;
  error?: string;
  products: IProduct[];
  /** Liga a coluna de custo unitário (compras). */
  withCost?: boolean;
  className?: string;
};

/** As linhas de itens de uma venda ou compra. */
export function FormItemLines({ value = [], onChange, onValidate, error, products, withCost, className }: FormItemLinesProps) {
  useNotFirstEffect(() => {
    onValidate?.();
  }, [value]);

  const patch = (index: number, change: Partial<FormItemLine>) =>
    onChange?.(value.map((line, i) => (i === index ? { ...line, ...change } : line)));

  const options = products.map((product) => ({ value: String(product.id), label: product.name }));
  const productOf = (id: number) => products.find((product) => product.id === id);
  const columns = withCost ? 'grid-cols-[1fr_76px_120px_36px]' : 'grid-cols-[1fr_76px_36px]';

  return (
    <fieldset className={cn('m-0 min-w-0 border-0 p-0', className)}>
      <legend className="mb-1.5 p-0 text-14 font-medium">
        Itens
      </legend>

      <div
        className={cn('mb-1 grid gap-2 text-12 text-muted', columns)}
        aria-hidden="true"
      >
        <span>
          Produto
        </span>

        <span className="text-right">
          Qtd.
        </span>

        <UtilsIf condition={withCost}>
          {() => (
            <span className="text-right">
              Custo un.
            </span>
          )}
        </UtilsIf>
      </div>

      <div className="grid gap-2">
        <UtilsFor each={value}>
          {({ item: line, index }) => (
            <div>
              <div className={cn('grid items-start gap-2', columns)}>
                <Select
                  aria-label={`Produto do item ${index + 1}`}
                  data={options}
                  value={String(line.productId)}
                  onChange={(next) => next && patch(index, { productId: Number(next) })}
                  searchable
                  nothingFoundMessage="Nenhum produto com esse nome"
                />

                <NumberInput
                  aria-label={`Quantidade do item ${index + 1}`}
                  value={line.qty}
                  onChange={(next) => patch(index, { qty: Math.max(0, Math.round(Number(next) || 0)) })}
                  min={1}
                  allowDecimal={false}
                  allowNegative={false}
                  hideControls
                  classNames={{ input: 'text-right tabular-nums' }}
                />

                <UtilsIf condition={withCost}>
                  {() => (
                    <FormMoneyInput
                      aria-label={`Custo unitário do item ${index + 1}`}
                      value={line.cost}
                      onChange={(cost) => patch(index, { cost })}
                      placeholder="0,00"
                    />
                  )}
                </UtilsIf>

                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size={36}
                  aria-label={`Remover item ${index + 1}`}
                  disabled={value.length === 1}
                  onClick={() => onChange?.(value.filter((_, i) => i !== index))}
                >
                  <IconTrash
                    size={16}
                    stroke={1.5}
                  />
                </ActionIcon>
              </div>

              <ProductHint product={productOf(line.productId)} />
            </div>
          )}
        </UtilsFor>
      </div>

      <UtilsIf condition={error}>
        {() => (
          <Input.Error mt={6}>
            {error}
          </Input.Error>
        )}
      </UtilsIf>

      <Button
        variant="subtle"
        color="ink"
        size="xs"
        mt={10}
        ml={-8}
        leftSection={<IconPlus size={14} />}
        onClick={() => onChange?.([...value, emptyItemLine(products)])}
      >
        Adicionar item
      </Button>
    </fieldset>
  );
}

/** Embaixo de cada linha: o estoque, o preço e o custo médio do produto escolhido. */
function ProductHint({ product }: { product?: IProduct }) {
  return (
    <UtilsIf condition={product}>
      {() => (
        <div className="mt-1 text-12 text-muted tabular-nums">
          {`${product!.stock} un. em estoque · preço R$ ${money(product!.priceCents)}`}

          <UtilsIf condition={product!.avgCostCents > 0}>
            {() => ` · custo médio R$ ${money(product!.avgCostCents)}`}
          </UtilsIf>
        </div>
      )}
    </UtilsIf>
  );
}
