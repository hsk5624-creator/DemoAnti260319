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

function parseSummaryReport(wb: XLSX.WorkBook): SalesFile['weeklyNotes'] {
  const sheetName = wb.SheetNames.find((s) => s.includes('요약') && s.includes('보고'));
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  type WN = NonNullable<SalesFile['weeklyNotes']>[number];
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
      let noteCol = 12, deltaCol = -1;
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
          }
        } else if (isFirst) {
          const pWN: WN = { category: item.category, level: 'parent', delta: item.delta, note: item.note };
          groupIdx.set(item.category, groups.length);
          groups.push({ parent: pWN, children: relevantChildren.map((c) => ({ category: c.category, level: 'child' as const, delta: c.delta, note: c.note })) });
        }
      } else {
        idx++;
      }
    }
  }

  const merged: NonNullable<SalesFile['weeklyNotes']> = [];
  for (const g of groups) {
    merged.push(g.parent);
    merged.push(...g.children);
  }
  return merged;
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
        const weeklyNotes = parseSummaryReport(wb);
        resolve({ name: file.name, label, refYear, refMonth, refDay, rows, weeklyNotes });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
