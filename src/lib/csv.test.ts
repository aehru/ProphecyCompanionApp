import { describe, expect, it } from 'vitest';

import { parseCsv, parseCsvTable } from '@/lib/csv';

describe('parseCsv', () => {
  it('splits on the delimiter and trims unquoted fields', () => {
    expect(parseCsv('a; b ;c')).toEqual([['a', 'b', 'c']]);
  });

  it('handles LF, CRLF and a missing trailing newline', () => {
    expect(parseCsv('a;b\nc;d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsv('a;b\r\nc;d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('strips the UTF-8 BOM French Excel prepends', () => {
    expect(parseCsv('﻿id;nom')).toEqual([['id', 'nom']]);
  });

  it('drops blank lines', () => {
    expect(parseCsv('a;b\n\n\nc;d\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps the delimiter inside quoted fields', () => {
    expect(parseCsv('a;"b;c";d')).toEqual([['a', 'b;c', 'd']]);
  });

  it('keeps newlines inside quoted fields (Alt+Entrée in Excel)', () => {
    expect(parseCsv('a;"ligne 1\nligne 2";b')).toEqual([['a', 'ligne 1\nligne 2', 'b']]);
    // Excel writes CRLF inside cells too — normalized to \n.
    expect(parseCsv('a;"ligne 1\r\nligne 2";b')).toEqual([['a', 'ligne 1\nligne 2', 'b']]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsv('a;"il a dit ""oui""";b')).toEqual([['a', 'il a dit "oui"', 'b']]);
  });

  it('does not trim quoted fields', () => {
    expect(parseCsv('a;" garde les espaces "')).toEqual([['a', ' garde les espaces ']]);
  });

  it('keeps empty cells', () => {
    expect(parseCsv('a;;c\n;;')).toEqual([
      ['a', '', 'c'],
      ['', '', ''],
    ]);
  });

  it('supports an alternate delimiter', () => {
    expect(parseCsv('a,b,"c,d"', ',')).toEqual([['a', 'b', 'c,d']]);
  });

  // Without this the rest of the file collapses into the unclosed cell.
  it('throws on an unclosed quote instead of swallowing the rest of the file', () => {
    expect(() => parseCsv('a;"b;c\nd;e')).toThrow(/guillemet non fermé/i);
  });
});

describe('parseCsvTable', () => {
  it('keys records by the header row', () => {
    const t = parseCsvTable('id;nom\nepee;Épée courte\nhache;Hache');
    expect(t.header).toEqual(['id', 'nom']);
    expect(t.records).toEqual([
      { id: 'epee', nom: 'Épée courte' },
      { id: 'hache', nom: 'Hache' },
    ]);
  });

  it('fills missing trailing cells with empty strings', () => {
    const t = parseCsvTable('a;b;c\n1;2');
    expect(t.records).toEqual([{ a: '1', b: '2', c: '' }]);
  });

  it('throws with the record line number when a row is wider than the header', () => {
    expect(() => parseCsvTable('a;b\n1;2;3')).toThrow(/Ligne 2/);
  });

  it('throws on a duplicate header name (one column would shadow the other)', () => {
    expect(() => parseCsvTable('id;nom;id\n1;x;2')).toThrow(/double.*« id »/i);
  });

  it('handles an empty file', () => {
    expect(parseCsvTable('')).toEqual({ header: [], records: [] });
  });
});
