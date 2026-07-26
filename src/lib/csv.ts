// Minimal CSV parser for the catalog build pipeline (scripts/build-catalogs.ts).
// RFC-4180 semantics with a configurable delimiter (French Excel saves with `;`):
// a quoted field may contain the delimiter, doubled quotes ("") and NEWLINES, so
// multi-line cells (Alt+Entrée in Excel) survive round-tripping. Also strips the
// UTF-8 BOM French Excel prepends, accepts CRLF/LF/CR line endings, and drops
// fully empty records (blank lines).
//
// It THROWS on the two silent-corruption cases instead of guessing: an unclosed
// quote (which would swallow the rest of the file into one cell) and duplicate
// header names (where one column would shadow the other).
//
// PURE — no filesystem, no DB — so it unit-tests in plain Node like the other
// `lib/` engines.

/**
 * Parse raw CSV text into rows of fields. Throws when a quoted cell is never
 * closed — without that guard the rest of the file silently collapses into that
 * one cell.
 */
export function parseCsv(raw: string, delimiter = ';'): string[][] {
  // French Excel writes "UTF-8 with BOM"; strip it so the first header cell
  // doesn't silently become "﻿id".
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let fieldWasQuoted = false;
  let inQuotes = false;

  const pushField = () => {
    // Trim only unquoted fields — quotes mark intentional whitespace/newlines.
    row.push(fieldWasQuoted ? field : field.trim());
    field = '';
    fieldWasQuoted = false;
  };
  const pushRow = () => {
    pushField();
    // A record that is a single empty field is a blank line — skip it.
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // escaped quote
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === '\r') {
        // Normalize CRLF (and bare CR) inside a quoted cell to \n.
        field += '\n';
        i += text[i + 1] === '\n' ? 2 : 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"' && field.trim() === '') {
      inQuotes = true;
      fieldWasQuoted = true;
      field = ''; // drop any pre-quote padding Excel never emits anyway
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      pushField();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      pushRow();
      i += text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (ch === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (inQuotes) {
    throw new Error(
      `Ligne ${rows.length + 1} : guillemet non fermé (une cellule « " » ouverte n'est jamais refermée)`,
    );
  }
  // Flush the last record when the file doesn't end with a newline.
  if (field !== '' || fieldWasQuoted || row.length > 0) pushRow();

  return rows;
}

export type CsvTable = {
  /** Trimmed header cells, in file order. */
  header: string[];
  /** One record per data row, keyed by header cell. Missing cells become ''. */
  records: Record<string, string>[];
};

/**
 * Parse CSV text whose first row is a header into keyed records. Throws on a
 * data row wider than the header (almost always a mis-quoted delimiter) with the
 * record number so the author can find the line in Excel, and on duplicate
 * header names (one column would silently shadow the other).
 */
export function parseCsvTable(raw: string, delimiter = ';'): CsvTable {
  const rows = parseCsv(raw, delimiter);
  if (rows.length === 0) return { header: [], records: [] };
  const header = rows[0].map((h) => h.trim());
  const duplicates = [...new Set(header.filter((h, i) => header.indexOf(h) !== i))];
  if (duplicates.length > 0) {
    throw new Error(`En-tête en double : ${duplicates.map((h) => `« ${h} »`).join(', ')}`);
  }
  const records = rows.slice(1).map((cells, idx) => {
    if (cells.length > header.length) {
      throw new Error(
        `Ligne ${idx + 2} : ${cells.length} colonnes pour ${header.length} en-têtes (délimiteur « ${delimiter} » non échappé ?)`,
      );
    }
    return Object.fromEntries(header.map((h, c) => [h, cells[c] ?? '']));
  });
  return { header, records };
}
