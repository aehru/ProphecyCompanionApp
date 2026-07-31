// Keyboard "next" wiring for the sheet form: within a tab, the return key jumps
// to the following field instead of dismissing the keyboard.
//
// The field orders are derived from the domain constants and live at module
// scope (stable identity), which lets the per-field props be built ONCE. That
// matters: NumberField is memoized, and rebuilding these objects every render
// would change every prop identity and re-render every field on each keystroke.

import { useMemo, useRef } from 'react';
import type { TextInput as RNTextInput, TextInputProps } from 'react-native';

import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  DISCIPLINES,
  RESOURCES,
  SPHERES,
  TENDANCES,
  WOUND_LEVELS,
} from '@/constants/prophecy';

export const IDENTITE_ORDER = [
  'nom',
  'concept',
  ...TENDANCES.flatMap((t) => [t.key, `${t.key}Sub`]),
];
export const APTITUDES_ORDER = [
  ...ATTRIBUTS.map((a) => a.key),
  ...CARACTERISTIQUES.map((c) => c.key),
];
export const COMBAT_ORDER = [
  ...WOUND_LEVELS.map((w) => `${w.key}Max`),
  ...RESOURCES.map((r) => `${r.key}Max`),
  'initiativeMax',
];
export const MAGIE_ORDER = [
  'reserveMagiqueMax',
  ...SPHERES.map((s) => `${s.key}Max`),
  ...DISCIPLINES.map((d) => d.key),
];

export interface ChainProps {
  inputRef: (el: RNTextInput | null) => void;
  returnKeyType: TextInputProps['returnKeyType'];
  submitBehavior: TextInputProps['submitBehavior'];
  onSubmitEditing: () => void;
}

/** The chain props of one tab, keyed by field. */
export type ChainMap = Record<string, ChainProps>;

export function useFieldChains() {
  const refs = useRef<Record<string, RNTextInput | null>>({});

  const chains = useMemo(() => {
    const make = (order: string[]): ChainMap =>
      Object.fromEntries(
        order.map((key, i) => {
          const isLast = i === order.length - 1;
          return [
            key,
            {
              inputRef: (el: RNTextInput | null) => {
                refs.current[key] = el;
              },
              returnKeyType: (isLast ? 'done' : 'next') as TextInputProps['returnKeyType'],
              submitBehavior: (isLast ? 'blurAndSubmit' : 'submit') as TextInputProps['submitBehavior'],
              onSubmitEditing: () => refs.current[order[i + 1]]?.focus(),
            },
          ];
        }),
      );
    return {
      identite: make(IDENTITE_ORDER),
      aptitudes: make(APTITUDES_ORDER),
      combat: make(COMBAT_ORDER),
      magie: make(MAGIE_ORDER),
    };
  }, []);

  /** Ref callback for a field the chain doesn't wire itself (Paper inputs). */
  const registerRef = (key: string) => (el: unknown) => {
    refs.current[key] = el as RNTextInput | null;
  };
  const focus = (key: string) => refs.current[key]?.focus();

  return { chains, registerRef, focus };
}
