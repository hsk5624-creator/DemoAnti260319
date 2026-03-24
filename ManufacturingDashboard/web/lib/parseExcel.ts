import * as XLSX from 'xlsx';
import { ActualRow, PlanRow, ActualFile } from './types';

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  return v == null ? '' : String(v);
}

export function parseFileNameDate(name: string): { year: number; month: number; label: string } {
  // Match (YY.MM) pattern e.g. "예산 sample(26.02).XLSX"
  const match = name.match(/\((\d{2})\.(\d{2})\)/);
  if (match) {
    const year = 2000 + parseInt(match[1]);
    const month = parseInt(match[2]);
    return { year, month, label: `${year}년 ${String(month).padStart(2, '0')}월` };
  }
  return { year: 0, month: 0, label: name.replace(/\.[^/.]+$/, '') };
}

export function parseActualFile(file: File): Promise<ActualFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

        const rows: ActualRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i] as unknown[];
          if (!r[0]) continue;
          rows.push({
            deptCode: toStr(r[0]),
            deptName: toStr(r[1]),
            accountCode: toStr(r[2]),
            accountName: toStr(r[3]),
            wbsCode: toStr(r[4]),
            wbsName: toStr(r[5]),
            controlCycle: toStr(r[6]),
            planM: toNum(r[7]),
            totalPlanM: toNum(r[9]),
            actualSumM: toNum(r[12]),
            availableM: toNum(r[13]),
            planY: toNum(r[14]),
            totalPlanY: toNum(r[16]),
            totalActualY: toNum(r[26]),
            availableY: toNum(r[27]),
            budgetBalance: toNum(r[28]),
          });
        }

        const { year, month, label } = parseFileNameDate(file.name);
        resolve({ name: file.name, label, year, month, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parsePlanFile(file: File): Promise<PlanRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

        const rows: PlanRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i] as unknown[];
          if (!r[0]) continue;
          // Columns: 0~6 분류, 7=예산합계, 8=실적합계, 9=잔액합계
          // 10,11,12 = 01월 예산/실적/잔액, 13,14,15 = 02월, ...
          const monthly = [];
          for (let m = 0; m < 12; m++) {
            const base = 10 + m * 3;
            monthly.push({
              plan: toNum(r[base]),
              actual: toNum(r[base + 1]),
              balance: toNum(r[base + 2]),
            });
          }
          rows.push({
            deptCode: toStr(r[0]),
            deptName: toStr(r[1]),
            accountCode: toStr(r[2]),
            accountName: toStr(r[3]),
            wbsCode: toStr(r[4]),
            wbsName: toStr(r[5]),
            totalBudget: toNum(r[7]),
            totalActual: toNum(r[8]),
            monthly,
          });
        }
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
