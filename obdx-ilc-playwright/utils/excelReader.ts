/**
 * Excel reader — parses a sheet into an array of objects keyed by column header.
 *
 * Some workbooks (including the project's manual-test-cases.xlsx) render the
 * header row as styled merged cells that SheetJS doesn't auto-detect, so the
 * sheet_to_json keys come back as `__EMPTY`, `__EMPTY_1`, etc., with the real
 * header text sitting in row 0 of the data. This reader handles both cases.
 *
 * Uses xlsx (SheetJS) — already installed as a devDependency.
 */

import * as XLSX from 'xlsx';

/** A row from a sheet, with values trimmed and coerced to strings. */
export type SheetRow = Record<string, string>;

/**
 * Read a single sheet by name.
 *
 * @throws if the sheet name is not present in the workbook.
 */
export function readSheet(file: string, sheetName: string): SheetRow[] {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error(
      `Sheet "${sheetName}" not found in ${file}. Available sheets: ${wb.SheetNames.join(', ')}`
    );
  }

  const raw = XLSX.utils.sheet_to_json<SheetRow>(ws, { defval: '', raw: false });
  if (raw.length === 0) return [];

  // Detect the "auto-named __EMPTY keys" case: real headers live in row 0.
  const firstRowKeys = Object.keys(raw[0]);
  const headerInDataRow = firstRowKeys.every(k => k.startsWith('__EMPTY'));

  if (!headerInDataRow) {
    return raw.map(trimmed);
  }

  const headers = firstRowKeys.map(k => String(raw[0][k] ?? '').trim());
  return raw
    .slice(1)
    .map(r => {
      const out: SheetRow = {};
      firstRowKeys.forEach((k, i) => {
        out[headers[i]] = String(r[k] ?? '').trim();
      });
      return out;
    })
    .filter(o => Object.values(o).some(v => v.length > 0));
}

/** List the sheet names in a workbook (handy for debugging unknown files). */
export function listSheets(file: string): string[] {
  return XLSX.readFile(file).SheetNames;
}

function trimmed(row: SheetRow): SheetRow {
  const out: SheetRow = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim()] = String(v ?? '').trim();
  }
  return out;
}
