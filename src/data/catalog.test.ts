// Guards the CSV → .gen.ts pipeline (scripts/build-catalogs.ts).
//
// The generated catalogues are COMMITTED so the app builds without running the
// script — which means a spreadsheet edit that never got regenerated would ship
// silently. This test re-runs the generator in-process and compares its output
// with what is on disk, so `bun run test` fails on stale (or invalid) catalogues.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  formatFailures,
  generateCatalogs,
  generatedPath,
  sameContent,
} from '../../scripts/build-catalogs';

const { failures, files, counts } = generateCatalogs();

describe('catalogues (data-src/*.csv)', () => {
  it('validates every row', () => {
    expect(failures.length === 0 ? '' : `\n${formatFailures(failures)}`).toBe('');
  });

  it('is not empty', () => {
    expect(counts.weapons).toBeGreaterThan(0);
    expect(counts.spells).toBeGreaterThan(0);
    expect(counts.armor).toBeGreaterThan(0);
    expect(counts.shields).toBeGreaterThan(0);
  });

  // Line endings are ignored on purpose — `core.autocrlf=true` gives Windows
  // checkouts CRLF while the generator always writes LF.
  it.each(files.map((f) => f.file))(
    '%s matches the CSV (run: bun run build:catalogs)',
    (file) => {
      const expected = files.find((f) => f.file === file)!.content;
      const actual = readFileSync(generatedPath(file), 'utf8');
      expect(sameContent(actual, expected) ? expected : actual).toBe(expected);
    },
  );
});
