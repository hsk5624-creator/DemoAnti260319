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
  // Match (YY.MM.DD 기준) or (YY.MM.DD) pattern
  const match = name.match(/\((\d{2})\.(\d{2})\.(\d{2})/);
  if (match) {
    const refYear = 2000 + parseInt(match[1]);
    const refMonth = parseInt(match[2]);
    const refDay = parseInt(match[3]);
    return { refYear, refMonth, refDay, label: `${match[1]}.${match[2]}.${match[3]}` };
  }
  return { refYear: 0, refMonth: 0, refDay: 0, label: name.replace(/\.[^/.]+$/, '') };
}

export function parseSalesFile(file: File): Promise<SalesFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const targetSheet = '상세 자료 작성';
        const sheetName = wb.SheetNames.includes(targetSheet)
          ? targetSheet
          : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        // header:1 → array of arrays, row 0 = row1 in Excel
        const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

        // Row index 5 (0-based) = Row 6 in Excel = 컬럼 헤더
        // Data rows start from index 6
        // Col layout:
        //   A=0 연, B=1 분기, C=2 (sub), D=3 월, E=4 주차,
        //   F=5 법인, G=6 구분, H=7 상세구분,
        //   I=8 매출실적, J=9 사업계획, K=10 예상마감,
        //   L=11 달성률, M=12 전주 예상실적, N=13 Gap

        const rows: SalesRow[] = [];
        let currentYear = 0;
        let currentQuarter = 0;

        for (let i = 6; i < raw.length; i++) {
          const r = raw[i] as unknown[];
          if (!r || r.length === 0) continue;

          // Update running year/quarter from carry-down cells
          const yearVal = parseYear(r[0]);
          if (yearVal) currentYear = yearVal;

          const qVal = parseQuarter(r[1]);
          if (qVal) currentQuarter = qVal;

          // Detail row: must have 상세구분 (Col H) and 월 (Col D)
          const detailCategory = toStr(r[7]);
          const month = parseMonth(r[3]);

          if (!detailCategory || month === 0) continue;
          // Skip summary rows (상세구분 비어있거나 월이 없는 행)
          if (!currentYear) continue;

          rows.push({
            year: currentYear,
            quarter: currentQuarter,
            month,
            detailCategory,
            actual:       toNum(r[8]),
            plan:         toNum(r[9]),
            forecast:     toNum(r[10]),
            prevForecast: toNum(r[12]),
            gap:          toNum(r[13]),
          });
        }

        const { refYear, refMonth, refDay, label } = parseFileNameDate(file.name);
        resolve({ name: file.name, label, refYear, refMonth, refDay, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
