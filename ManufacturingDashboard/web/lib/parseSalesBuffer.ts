import * as XLSX from 'xlsx';
import { SalesRow, SalesFile } from './salesTypes';

function toNum(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function parseYear(v: unknown): number | null {
  const s = toStr(v);
  const m = s.match(/^(\d{2})년$/);
  if (!m) return null;
  return 2000 + parseInt(m[1]);
}

function parseMonth(v: unknown): number {
  const s = toStr(v);
  const m = s.match(/^(\d{1,2})월/);
  return m ? parseInt(m[1]) : 0;
}

function parseQuarter(v: unknown): number {
  const s = toStr(v);
  const m = s.match(/^(\d)분기/);
  return m ? parseInt(m[1]) : 0;
}

function parseFileNameDate(name: string): { refYear: number; refMonth: number; refDay: number; label: string } {
  const match = name.match(/\((\d{2})\.(\d{2})\.(\d{2})/);
  if (match) {
    const refYear = 2000 + parseInt(match[1]);
    const refMonth = parseInt(match[2]);
    const refDay = parseInt(match[3]);
    return { refYear, refMonth, refDay, label: `${match[1]}.${match[2]}.${match[3]}` };
  }
  return { refYear: 0, refMonth: 0, refDay: 0, label: name.replace(/\.[^/.]+$/, '') };
}

/** Server-side parser: reads from ArrayBuffer instead of File API */
export function parseSalesBuffer(buffer: ArrayBuffer, fileName: string): SalesFile {
  const wb = XLSX.read(buffer, { type: 'array' });
  const targetSheet = '상세 자료 작성';
  const sheetName = wb.SheetNames.includes(targetSheet) ? targetSheet : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  const rows: SalesRow[] = [];
  let currentYear = 0;
  let currentQuarter = 0;

  for (let i = 6; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    if (!r || r.length === 0) continue;

    const yearVal = parseYear(r[0]);
    if (yearVal) currentYear = yearVal;

    const qVal = parseQuarter(r[1]);
    if (qVal) currentQuarter = qVal;

    const detailCategory = toStr(r[7]);
    const month = parseMonth(r[3]);

    if (!detailCategory || month === 0) continue;
    if (!currentYear) continue;

    rows.push({
      year: currentYear,
      quarter: currentQuarter,
      month,
      detailCategory,
      actual: toNum(r[8]),
      plan: toNum(r[9]),
      forecast: toNum(r[10]),
      prevForecast: toNum(r[12]),
      gap: toNum(r[13]),
    });
  }

  const { refYear, refMonth, refDay, label } = parseFileNameDate(fileName);
  return { name: fileName, label, refYear, refMonth, refDay, rows };
}
