import { useCallback, useRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';

/**
 * Keyboard "next" wiring for a form: pressing return jumps to the following
 * field instead of dismissing the keyboard, with the last field submitting.
 *
 * `order` lists the field keys in tab order — pass the module-level constant the
 * screen already declares. Spread the result onto the input:
 *
 *   const { textChain, numChain } = useFieldChain(EDIT_ORDER);
 *   <TextInput {...textChain('name')} />
 *   <NumberField {...numChain('encombrement', true)} />
 *
 * The two variants exist because Paper's `TextInput` takes a `ref` while
 * `NumberField` forwards its own `inputRef`.
 *
 * The callbacks are memoised on purpose: they close over a ref, and the React
 * Compiler rejects reading `ref.current` from a closure it cannot prove runs
 * outside render. Going through `useCallback` marks them as event handlers.
 */
export function useFieldChain(order: readonly string[]) {
  const refs = useRef<Record<string, RNTextInput | null>>({});

  const focusNext = useCallback(
    (key: string) => {
      const next = order[order.indexOf(key) + 1];
      if (next) refs.current[next]?.focus();
    },
    [order],
  );

  const setRef = useCallback(
    (key: string) => (el: RNTextInput | null) => {
      refs.current[key] = el;
    },
    [],
  );

  const textChain = useCallback(
    (key: string) => ({
      // Paper types its ref loosely; the element is an RNTextInput at runtime.
      ref: setRef(key) as (el: unknown) => void,
      returnKeyType: 'next' as const,
      blurOnSubmit: false,
      onSubmitEditing: () => focusNext(key),
    }),
    [focusNext, setRef],
  );

  const numChain = useCallback(
    (key: string, last = false) => ({
      inputRef: setRef(key),
      returnKeyType: (last ? 'done' : 'next') as 'done' | 'next',
      submitBehavior: (last ? 'blurAndSubmit' : 'submit') as 'blurAndSubmit' | 'submit',
      onSubmitEditing: () => focusNext(key),
    }),
    [focusNext, setRef],
  );

  return { textChain, numChain };
}
