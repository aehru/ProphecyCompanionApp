import { describe, expect, it } from 'vitest';

import { ARCHETYPE_CATALOG } from '@/data/archetype-catalog';
import { initiativeDice, woundBoxes } from '@/lib/creation-rules';
import {
  clampBatchText,
  generateNpc,
  generateNpcs,
  MAX_BATCH,
  NPC_TIERS,
  parseBatch,
} from '@/lib/npc-generator';

const byId = (id: string) => {
  const found = ARCHETYPE_CATALOG.find((a) => a.id === id);
  if (!found) throw new Error(`archétype ${id} absent du catalogue`);
  return found;
};

const combattant = byId('combattant');
const erudit = byId('erudit');

describe('generateNpc', () => {
  it('replays the same PNJ for the same seed', () => {
    const a = generateNpc(combattant, { seed: 'garde' });
    const b = generateNpc(combattant, { seed: 'garde' });
    expect(a).toEqual(b);
  });

  it('gives a different PNJ for a different seed', () => {
    const a = generateNpc(combattant, { seed: 'garde' });
    const b = generateNpc(combattant, { seed: 'brigand' });
    expect(a.character.nom).not.toBe(b.character.nom);
  });

  it('returns the seed it used, so the caller can replay it', () => {
    const npc = generateNpc(combattant);
    expect(npc.seed).toBeTruthy();
    expect(generateNpc(combattant, { seed: npc.seed })).toEqual(npc);
  });

  it('marks the row as a PNJ and carries the archetype caste', () => {
    const npc = generateNpc(erudit, { seed: 'lettre' });
    expect(npc.character.kind).toBe('npc');
    expect(npc.character.caste).toBe('erudit');
  });

  it('leaves the concept empty — that line is the GM to write', () => {
    expect(generateNpc(erudit, { seed: 'lettre' }).character.concept).toBeUndefined();
  });

  it('derives the wound track from the rolled RÉS + VOL', () => {
    const npc = generateNpc(combattant, { seed: 'blessures' });
    const expected = woundBoxes(npc.character.resistance!, npc.character.volonte!);
    expect(npc.character.egratignureMax).toBe(expected.egratignureMax);
    expect(npc.character.mortMax).toBe(expected.mortMax);
  });

  it('derives the initiative dice from the rolled COO + PER', () => {
    for (const tier of NPC_TIERS) {
      const npc = generateNpc(combattant, { tier: tier.key, seed: `init-${tier.key}` });
      expect(npc.character.initiativeMax).toBe(
        initiativeDice(npc.character.coordination!, npc.character.perception!),
      );
    }
  });

  it('never rolls a stat outside 1..10, at any tier or variance', () => {
    for (const tier of NPC_TIERS) {
      for (let i = 0; i < 40; i++) {
        const npc = generateNpc(combattant, {
          tier: tier.key,
          variance: 'chaotique',
          seed: `${tier.key}-${i}`,
        });
        for (const key of ['force', 'resistance', 'intelligence', 'social'] as const) {
          expect(npc.character[key]).toBeGreaterThanOrEqual(1);
          expect(npc.character[key]).toBeLessThanOrEqual(10);
        }
        expect(npc.skills.every((s) => s.value >= 1)).toBe(true);
      }
    }
  });

  it('keeps every stat on the archetype at « fixe »', () => {
    const npc = generateNpc(erudit, { seed: 'fixe', variance: 'fixe' });
    expect(npc.character.intelligence).toBe(erudit.data.stats.intelligence);
    expect(npc.character.mental).toBe(erudit.data.stats.mental);
    expect(npc.skills.map((s) => s.value)).toEqual(
      expect.arrayContaining(erudit.data.skills.map((s) => s.value)),
    );
  });

  it('shifts stats and compétences by tier', () => {
    const weak = generateNpc(erudit, { seed: 't', tier: 'figurant', variance: 'fixe' });
    const strong = generateNpc(erudit, { seed: 't', tier: 'legende', variance: 'fixe' });
    expect(strong.character.intelligence! - weak.character.intelligence!).toBe(3);
    expect(strong.character.maitriseMax! - weak.character.maitriseMax!).toBe(3);
    // Initiative follows only through COO + PER — never a tier bonus of its own.
    expect(strong.character.initiativeMax!).toBeGreaterThanOrEqual(
      weak.character.initiativeMax!,
    );
  });

  it('grants the chosen option compétence', () => {
    const npc = generateNpc(combattant, {
      seed: 'hache',
      optionChoice: 'Armes de choc',
      variance: 'fixe',
    });
    expect(npc.choice).toEqual({ label: 'Arme de prédilection', skill: 'Armes de choc' });
    const skill = npc.skills.find((s) => s.name === 'Armes de choc');
    expect(skill).toEqual({ name: 'Armes de choc', attribut: 'physique', value: 4 });
  });

  it('rolls the option when the choice is missing or not offered', () => {
    const random = generateNpc(combattant, { seed: 'x', optionChoice: null });
    expect(combattant.data.option!.choices).toContain(random.choice!.skill);
    const bogus = generateNpc(combattant, { seed: 'x', optionChoice: 'Natation' });
    expect(bogus.skills.some((s) => s.name === 'Natation')).toBe(false);
  });

  it('takes the higher rating when the choice is already on the archetype', () => {
    const npc = generateNpc(byId('protecteur'), {
      seed: 'cac',
      optionChoice: 'Corps à corps',
      variance: 'fixe',
    });
    // Listed at 3, offered at 3 — one row, not two.
    expect(npc.skills.filter((s) => s.name === 'Corps à corps')).toHaveLength(1);
  });

  it('has no option to resolve when the archetype offers none', () => {
    expect(generateNpc(byId('voyageur'), { seed: 'v' }).choice).toBeNull();
  });

  it('leaves magic, gear and tendances alone', () => {
    const npc = generateNpc(byId('mage'), { seed: 'm' });
    expect(npc.character.reserveMagiqueMax).toBeUndefined();
    expect(npc.character.dragon).toBeUndefined();
  });
});

describe('generateNpcs', () => {
  it('rolls a batch of distinct PNJs with distinct names', () => {
    const batch = generateNpcs(combattant, 5, { seed: 'garde' });
    expect(batch).toHaveLength(5);
    expect(new Set(batch.map((n) => n.character.nom)).size).toBe(5);
  });

  it('avoids names already at the table', () => {
    const first = generateNpcs(combattant, 3, { seed: 'lot' });
    const names = first.map((n) => n.character.nom!);
    const second = generateNpcs(combattant, 3, { seed: 'lot2', taken: names });
    expect(second.some((n) => names.includes(n.character.nom!))).toBe(false);
  });

  it('replays a whole batch from its seed', () => {
    expect(generateNpcs(erudit, 4, { seed: 'b' })).toEqual(generateNpcs(erudit, 4, { seed: 'b' }));
  });

  it('returns nothing for a count of zero or less', () => {
    expect(generateNpcs(erudit, 0)).toEqual([]);
    expect(generateNpcs(erudit, -3)).toEqual([]);
  });
});

describe('name template', () => {
  it('numbers a batch from the template instead of inventing names', () => {
    const batch = generateNpcs(combattant, 3, { seed: 'g', nameTemplate: 'Garde' });
    expect(batch.map((n) => n.character.nom)).toEqual(['Garde #1', 'Garde #2', 'Garde #3']);
  });

  it('continues past the gardes already at the table', () => {
    const batch = generateNpcs(combattant, 2, {
      seed: 'g',
      nameTemplate: 'Garde',
      taken: ['Garde #1', 'Garde #2'],
    });
    expect(batch.map((n) => n.character.nom)).toEqual(['Garde #3', 'Garde #4']);
  });

  it('falls back to invented names when the template is blank', () => {
    const [npc] = generateNpcs(combattant, 1, { seed: 'g', nameTemplate: '   ' });
    expect(npc.character.nom).not.toContain('#');
  });

  it('leaves the rolled stats alone — only the name changes', () => {
    const plain = generateNpc(combattant, { seed: 'same' });
    const named = generateNpc(combattant, { seed: 'same', nameTemplate: 'Garde' });
    expect(named.character.nom).toBe('Garde #1');
    expect(named.skills).toEqual(plain.skills);
  });
});

describe('parseBatch', () => {
  it('reads a typed size', () => {
    expect(parseBatch('3')).toBe(3);
    expect(parseBatch(' 12 ')).toBe(12);
  });

  it('reads blank or junk as nothing to generate', () => {
    expect(parseBatch('')).toBe(0);
    expect(parseBatch('abc')).toBe(0);
    expect(parseBatch('-2')).toBe(0);
  });

  it('never exceeds the ceiling', () => {
    expect(parseBatch('500')).toBe(MAX_BATCH);
  });
});

describe('clampBatchText', () => {
  it('leaves a value inside the ceiling exactly as typed', () => {
    expect(clampBatchText('7')).toBe('7');
  });

  it('rewrites a value past the ceiling, rather than ignoring it', () => {
    expect(clampBatchText('50')).toBe(String(MAX_BATCH));
  });

  it('keeps a blank field blank — mid-typing is legitimate', () => {
    expect(clampBatchText('')).toBe('');
    expect(clampBatchText('   ')).toBe('');
  });

  it('drops junk instead of freezing it in the field', () => {
    expect(clampBatchText('abc')).toBe('');
  });
});
