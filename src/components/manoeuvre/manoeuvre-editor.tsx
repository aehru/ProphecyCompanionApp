import React from 'react';

import { HouseEditorActions, WriteThroughField as Field } from '@/components/house-editor';
import ChipSelect from '@/components/ui/chip-select';
import SectionCard from '@/components/ui/section-card';
import { MANOEUVRE_CONTEXTS, MANOEUVRE_FAMILIES } from '@/constants/prophecy';
import type { CustomManoeuvre, NewCustomManoeuvre } from '@/db/schema';
import { ratingWarning } from '@/lib/manoeuvre';
import { deleteCustomManoeuvre, updateCustomManoeuvre } from '@/repositories/custom-manoeuvres';
import { detachWrite } from '@/repositories/log';

/**
 * The « Maison » manœuvre form, laid out like `TraitEditor`: every field writes
 * through (debounced), « Terminer » leaves, « Supprimer » confirms.
 *
 * Nothing BLOCKS. Nom and description are what makes an entry readable, so an
 * empty one says so; a Difficulté / Esquive / Parade cell the rulebook grammar
 * cannot read gets the same message the CSV build would print, and is kept as
 * typed — a table's « très dure » is a legitimate ruling.
 */
export default function ManoeuvreEditor({
  manoeuvre: m,
  onClose,
}: {
  manoeuvre: CustomManoeuvre;
  /** Done, or deleted — both leave the screen. */
  onClose: () => void;
}) {
  const patch = (data: Partial<NewCustomManoeuvre>) =>
    detachWrite('custom_manoeuvres', updateCustomManoeuvre(m.id, data), { catalogId: m.id });

  return (
    <>
      <Field row={m} field="name" label="Nom" patch={patch} required />
      <Field row={m} field="difficulty" label="Difficulté" placeholder="20, 15 + X, opposition…" patch={patch} warn={ratingWarning} />
      <Field row={m} field="dodge" label="Esquive" placeholder="normale, facile (10), impossible…" patch={patch} warn={ratingWarning} />
      <Field row={m} field="parry" label="Parade" placeholder="normale, selon l'arme…" patch={patch} warn={ratingWarning} />
      <Field row={m} field="damage" label="Dommages" placeholder="normaux, la Force s'ajoute…" patch={patch} />
      <Field row={m} field="roll" label="Jet" placeholder="Physique + Corps à corps contre…" patch={patch} />
      <Field row={m} field="inGameEffect" label="Effet en jeu" patch={patch} multiline />
      <Field row={m} field="description" label="Description" patch={patch} multiline required />

      {/* Where it is filed, not what it says: folded, since the defaults
          (Mêlée, Manœuvres) are what most house entries keep. */}
      <SectionCard title="Classement" collapsible defaultExpanded={false}>
        <ChipSelect
          label="Contexte"
          options={MANOEUVRE_CONTEXTS}
          value={m.context}
          onChange={(key) => patch({ context: key as CustomManoeuvre['context'] })}
        />
        <ChipSelect
          label="Rubrique"
          options={MANOEUVRE_FAMILIES}
          value={m.family}
          onChange={(key) => patch({ family: key as CustomManoeuvre['family'] })}
        />
      </SectionCard>

      <HouseEditorActions
        confirm={`Supprimer « ${m.name || 'cette manœuvre'} » ? Les personnages qui l'avaient en favori la perdront.`}
        onDelete={() =>
          detachWrite('custom_manoeuvres', deleteCustomManoeuvre(m.id).then(onClose), {
            catalogId: m.id,
          })
        }
        onClose={onClose}
      />
    </>
  );
}
