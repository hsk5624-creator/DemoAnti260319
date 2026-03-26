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

function parseSummaryReport(wb: XLSX.WorkBook): import('./salesTypes').WeeklyNote[] {
  const sheetName = wb.SheetNames.find((s) => s.includes('요약') && s.includes('보고'));
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  type WN = import('./salesTypes').WeeklyNote;
  type RawItem = { category: string; level: 'parent' | 'child'; delta?: number; note: string };
  interface Group { parent: WN; children: WN[] }

  // 실적/변동사항 섹션만 수집 (실질 롤링 등 정적 템플릿 섹션 제외)
  const sections: { headerRow: number; noteCol: number; deltaCol: number }[] = [];
  let pendingIsValid = false;

  for (let i = 20; i < Math.min(raw.length, 80); i++) {
    const r = raw[i] as unknown[] | undefined;
    if (!r) continue;
    const c1 = String(r[1] ?? '').trim();
    if (/^\d+\)/.test(c1)) {
      pendingIsValid = c1.includes('특이사항') || c1.includes('변동사항');
      continue;
    }
    if (c1 === '구분' && pendingIsValid) {
      let noteCol = 12, deltaCol = -1; // deltaCol=-1 means no 전주대비 column
      for (let c = 1; c <= 24; c++) {
        const v = String(r[c] ?? '').trim();
        if (v.includes('사유') || v.includes('특이사항')) noteCol = c;
        if (v === '전주 대비') deltaCol = c;
      }
      sections.push({ headerRow: i, noteCol, deltaCol });
      pendingIsValid = false;
    }
  }
  if (sections.length === 0) return [];

  // Group 기반 병합: parent → { parent, children[] }
  const groups: Group[] = [];
  const groupIdx = new Map<string, number>(); // parentCategory → groups index

  for (let secIdx = 0; secIdx < sections.length; secIdx++) {
    const sec = sections[secIdx];
    const isFirst = secIdx === 0;

    // 섹션 raw items 수집
    const allItems: RawItem[] = [];
    for (let i = sec.headerRow + 1; i < Math.min(sec.headerRow + 15, raw.length); i++) {
      const r = raw[i] as unknown[] | undefined;
      if (!r || r.every((v) => v == null || v === '')) break;
      const colB = String(r[1] ?? '').trim();
      const colC = String(r[2] ?? '').trim();
      if (colB === '총합' || colB === '합계') break;
      const note = String(r[sec.noteCol] ?? '').trim();
      const deltaRaw = sec.deltaCol !== -1 ? r[sec.deltaCol] : null;
      const deltaNum = deltaRaw != null && deltaRaw !== '' ? Number(deltaRaw) : undefined;
      const delta = deltaNum !== undefined && !isNaN(deltaNum) ? deltaNum : undefined;
      if (colB) allItems.push({ category: colB, level: 'parent', delta, note });
      else if (colC) allItems.push({ category: colC, level: 'child', delta, note });
    }

    // parent-child 그룹화
    let idx = 0;
    while (idx < allItems.length) {
      const item = allItems[idx];
      if (item.level === 'parent') {
        idx++;
        const children: RawItem[] = [];
        while (idx < allItems.length && allItems[idx].level === 'child') {
          children.push(allItems[idx++]);
        }
        const relevantChildren = children.filter((c) => c.note || (c.delta !== undefined && c.delta !== 0));
        const parentHasData = item.note || (item.delta !== undefined && item.delta !== 0);
        if (!parentHasData && relevantChildren.length === 0) continue;

        if (groupIdx.has(item.category)) {
          // 이미 존재 → delta/note 보완만 (새 자식 추가 안함)
          const g = groups[groupIdx.get(item.category)!];
          if ((g.parent.delta === undefined || g.parent.delta === 0) && item.delta !== undefined && item.delta !== 0) {
            g.parent.delta = item.delta;
          }
          if (!g.parent.note && item.note) g.parent.note = item.note;
          for (const child of relevantChildren) {
            const ec = g.children.find((c) => c.category === child.category);
            if (ec) {
              if ((ec.delta === undefined || ec.delta === 0) && child.delta !== undefined && child.delta !== 0) ec.delta = child.delta;
              if (!ec.note && child.note) ec.note = child.note;
            }
            // 기존에 없는 자식은 추가하지 않음 (첫 섹션 기준 유지)
          }
        } else if (isFirst) {
          // 첫 섹션에서만 새 그룹 생성
          const pWN: WN = { category: item.category, level: 'parent', delta: item.delta, note: item.note };
          groupIdx.set(item.category, groups.length);
          groups.push({ parent: pWN, children: relevantChildren.map((c) => ({ category: c.category, level: 'child' as const, delta: c.delta, note: c.note })) });
        }
      } else {
        idx++;
      }
    }
  }

  // 그룹 → flat WeeklyNote[]
  const merged: WN[] = [];
  for (const g of groups) {
    merged.push(g.parent);
    merged.push(...g.children);
  }
  return merged;
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
  const weeklyNotes = parseSummaryReport(wb);
  return { name: fileName, label, refYear, refMonth, refDay, rows, weeklyNotes };
}
