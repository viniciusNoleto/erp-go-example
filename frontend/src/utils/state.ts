'use client';

import { produce } from 'immer';
import _get from 'lodash-es/get';
import _set from 'lodash-es/set';
import { useCallback, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ObjectSchema } from 'yup';

import type { Path, PathValue } from '@/shared/types/object';

export function setStateDeepValue<T extends object>(setState: Dispatch<SetStateAction<T>>, path: string, value: unknown) {
  setState((prev) => produce(prev, (draft) => void _set(draft, path, value)));
}

/** Estado de objeto com `field(path)` para espalhar direto num input (filtros, flags de modal). */
export function useRecordState<T extends object>(initialValue: T) {
  const [state, setState] = useState(initialValue);

  const setValue = <P extends Path<T>>(path: P, value: PathValue<T, P>) => setStateDeepValue(setState, path, value);

  const field = <P extends Path<T>>(path: P) => ({
    value: _get(state, path) as PathValue<T, P>,
    onChange: (value: PathValue<T, P>) => setValue(path, value),
  });

  return { state, setState, field, setValue };
}

function getValidError(errors: object, path: string) {
  const error = _get(errors, path);

  return typeof error === 'string' ? error : undefined;
}

/**
 * Estado de formulário validado por um schema Yup. `field(path)` devolve
 * { value, onChange, error, onValidate } para espalhar nos componentes de
 * components/form; `validate()` valida tudo antes do envio.
 */
export function useValidatedFormState<T extends object>(schema: ObjectSchema<T>) {
  const [state, setState] = useState<T>(schema.getDefault() as T);

  // Estado mais recente para o `onValidate`: os inputs o chamam num effect,
  // depois do re-render; o layout effect atualiza antes disso.
  const latestState = useRef(state);
  useLayoutEffect(() => {
    latestState.current = state;
  }, [state]);

  const [errors, setErrors] = useState<Record<string, unknown>>({});

  const setValue = <P extends Path<T>>(path: P, value: PathValue<T, P>) => setStateDeepValue(setState, path, value);

  const setErrorValue = (path: string, value?: string) => setStateDeepValue(setErrors, path, value);

  const field = useCallback(
    <P extends Path<T>>(path: P) => ({
      error: getValidError(errors, path),

      value: _get(state, path) as PathValue<T, P>,

      onChange: (value: PathValue<T, P>) => setStateDeepValue(setState, path, value),

      onValidate: () => {
        setStateDeepValue(setErrors, path, undefined);

        schema
          .validateAt(path, latestState.current)
          .catch((error) => path === error.path && setStateDeepValue(setErrors, error.path, error.errors[0]));
      },
    }),
    [state, errors, schema],
  );

  const validate = async () =>
    schema
      .validate(state, { abortEarly: false })
      .then(() => true)
      .catch((validationError) => {
        const newErrors: Record<string, unknown> = {};

        validationError.inner.forEach((error: { path?: string; errors: string[] }) => {
          if (error.path) _set(newErrors, error.path, error.errors[0]);
        });

        setErrors(newErrors);

        return false;
      });

  const reset = () => {
    setState(schema.getDefault() as T);
    setErrors({});
  };

  return {
    state,
    setState,
    setValue,
    errors,
    setErrors,
    setErrorValue,
    field,
    validate,
    reset,
  };
}
