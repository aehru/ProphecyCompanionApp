import React from 'react';

import { HouseEditorActions, WriteThroughField as Field } from '@/components/house-editor';
import NumberField from '@/components/number-field';
import ChipSelect from '@/components/ui/chip-select';
import { GREAT_DRAGONS, TIME_UNITS } from '@/constants/prophecy';
import type { CustomFavor, NewCustomFavor } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { favorDurationWarning } from '@/lib/favor';
import { statutRoman } from '@/lib/statut';
import { deleteCustomFavor, updateCustomFavor } from '@/repositories/custom-favors';
import { detachWrite } from '@/repositories/log';

const LEVELS = [1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: `Lien ${statutRoman(n)}` }));

/**
 * The « Maison » Faveur form, laid out like `ManoeuvreEditor`: every field
 * writes through (debounced), « Terminer » leaves, « Supprimer » confirms.
 * Nothing blocks — an empty nom/description says so, a durée the formula
 * grammar refuses is warned about and printed as typed.
 */
export default function FavorEditor({
  favor: f,
  onClose,
}: {
  favor: CustomFavor;
  /** Done, or deleted — both leave the screen. */
  onClose: () => void;
}) {
  const patch = (data: Partial<NewCustomFavor>) =>
    detachWrite('custom_favors', updateCustomFavor(f.id, data), { catalogId: f.id });
  const [difficulty, setDifficulty] = useDebouncedText(
    f.difficulty == null ? '' : String(f.difficulty),
    (v) => patch({ difficulty: v.trim() === '' ? null : Number(v) }),
  );

  return (
    <>
      <Field row={f} field="name" label="Nom" patch={patch} required />
      <ChipSelect
        label="Dragon"
        options={GREAT_DRAGONS}
        value={f.dragon}
        onChange={(key) => patch({ dragon: key as CustomFavor['dragon'] })}
      />
      <ChipSelect
        label="Accordée au"
        options={LEVELS}
        value={String(f.level)}
        onChange={(key) => patch({ level: Number(key) })}
      />
      <Field row={f} field="roll" label="Jet" placeholder="Mental + Volonté, Empathie + Vie en cité…" patch={patch} />
      <NumberField fieldKey="difficulty" label="Difficulté" value={difficulty} onChange={(_, t) => setDifficulty(t)} />
      <Field row={f} field="usages" label="Usages" placeholder="3 par jour, illimité…" patch={patch} />
      <Field
        row={f}
        field="duration"
        label="Durée"
        placeholder="3 + NR, TENDANCE_DRAGON…"
        patch={patch}
        warn={favorDurationWarning}
      />
      {f.duration.trim() ? (
        <ChipSelect
          label="Unité"
          options={TIME_UNITS}
          value={f.durationUnit ?? ''}
          onChange={(key) => patch({ durationUnit: key })}
        />
      ) : null}
      <Field row={f} field="inGameEffect" label="Effet en jeu" patch={patch} multiline />
      <Field row={f} field="description" label="Description" patch={patch} multiline required />

      <HouseEditorActions
        confirm={`Supprimer « ${f.name || 'cette Faveur'} » ? Les Élus qui l'avaient choisie la perdront.`}
        onDelete={() =>
          detachWrite('custom_favors', deleteCustomFavor(f.id).then(onClose), { catalogId: f.id })
        }
        onClose={onClose}
      />
    </>
  );
}
