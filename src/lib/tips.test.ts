import { describe, expect, it } from 'vitest';

import { nextTip, TIPS, tipsLeft } from './tips';

describe('tips', () => {
  it('ids are unique', () => {
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
  });

  it('walks a screen in order, then stops', () => {
    const seen = new Set<string>();
    expect(nextTip('fiche', seen)?.id).toBe('fiche-edit');
    expect(tipsLeft('fiche', seen)).toBe(3);
    seen.add('fiche-edit');
    expect(nextTip('fiche', seen)?.id).toBe('fiche-roll');
    seen.add('fiche-roll').add('fiche-effects');
    expect(nextTip('fiche', seen)).toBeNull();
    expect(tipsLeft('fiche', seen)).toBe(0);
  });

  it('a screen ignores other screens’ seen ids', () => {
    expect(nextTip('roller', new Set(['fiche-edit']))?.id).toBe('roller-tendances');
  });
});
