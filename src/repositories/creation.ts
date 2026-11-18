import { TRAIT_BY_ID, traitFromPreset } from '@/data/trait-catalog';
import type { NewCharacter } from '@/db/schema';
import type { TraitKind } from '@/constants/prophecy';
import type { TraitChoice } from '@/lib/creation';
import { log } from '@/lib/log';
import { storeCharacterMedia } from '@/lib/media';
import { createCharacter, setCharacterMedia } from '@/repositories/characters';
import { createTrait } from '@/repositories/traits';

/**
 * Write out what the guided creation built: the character row, the avantages /
 * désavantages taken, and the portrait. Returns the new character's id.
 *
 * A trait whose catalogue entry is gone is skipped rather than written blank,
 * and a portrait that fails to copy never costs the character itself.
 */
export async function saveCreation(
  data: Partial<NewCharacter>,
  traits: readonly (TraitChoice & { kind: TraitKind })[],
  avatarUri: string | null,
): Promise<number> {
  const { id } = await createCharacter(data);
  for (const t of traits) {
    const preset = TRAIT_BY_ID.get(t.presetId);
    if (preset) await createTrait(id, { ...traitFromPreset(preset, t), kind: t.kind });
  }
  if (avatarUri) {
    try {
      await setCharacterMedia(id, 'avatar', storeCharacterMedia(id, 'avatar', avatarUri));
    } catch (e) {
      log.error('creation.avatar', e, { characterId: id });
    }
  }
  return id;
}
