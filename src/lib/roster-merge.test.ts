import { describe, expect, it } from 'vitest';

import type { RosterEntry } from './campaign-protocol';
import { mergeRoster } from './roster-merge';

function entry(charId: string, nom: string, over: Partial<RosterEntry> = {}): RosterEntry {
  return {
    charId,
    character: { nom },
    online: true,
    updatedAt: 1,
    owner: 'player',
    ...over,
  };
}

describe('mergeRoster', () => {
  it('keeps local and remote entries, name-sorted', () => {
    const merged = mergeRoster(
      [entry('n1', 'Zora', { owner: 'gm' })],
      [entry('p1', 'Kael')],
    );
    expect(merged.map((e) => e.charId)).toEqual(['p1', 'n1']);
    expect(merged.map((e) => e.source)).toEqual(['remote', 'local']);
  });

  it('lets the local entry win over the server echo of the same character', () => {
    const merged = mergeRoster(
      [entry('n1', 'Garde', { owner: 'gm', character: { nom: 'Garde', conditions: 'à terre' } })],
      [entry('n1', 'Garde', { owner: 'gm', character: { nom: 'Garde', conditions: '' } })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('local');
    expect(merged[0].character.conditions).toBe('à terre');
  });

  it('works with no server at all', () => {
    expect(mergeRoster([entry('n1', 'Garde', { owner: 'gm' })], [])).toHaveLength(1);
  });

  it('orders same-named entries stably by id', () => {
    const a = mergeRoster([entry('b', 'Garde 2'), entry('a', 'Garde 2')], []);
    const b = mergeRoster([entry('a', 'Garde 2'), entry('b', 'Garde 2')], []);
    expect(a.map((e) => e.charId)).toEqual(['a', 'b']);
    expect(b.map((e) => e.charId)).toEqual(['a', 'b']);
  });

  it('does not mutate its inputs', () => {
    const local = [entry('n1', 'Garde')];
    mergeRoster(local, [entry('p1', 'Kael')]);
    expect(local[0]).not.toHaveProperty('source');
  });
});
