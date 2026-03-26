import * as XLSX from 'xlsx';
import type { Factory, PivotRow, EquipmentRow, ProductBatch, UtilizationFile } from './utilizationTypes';

// ── 피벗 시트 매핑 ────────────────────────────────────────────────────────────

export const CHEONGJU_CATEGORY_MAP: Record<string, string> = {
  'CSO(청주)':    '국내제네릭',
  '가네진':       '국내제네릭',
  'APAC':         '내재화(해외/국내)',
  'APAC(국내)':  '내재화(해외/국내)',
  'APAC(해외)':  '내재화(해외/국내)',
  'APAC(LCM)':   '개량신약',
  '개량신약':     '개량신약',
  '개발':         '개발',
  '프랑스제네릭': '개발',
};

const JINCHEONG_VALID = new Set(['고덱스', 'CSO (진천)', '기타']);

// ── 설비가동율 시트 매핑 ───────────────────────────────────────────────────────

const EQUIPMENT_PROCESS_MAP: Record<string, string> = {
  // 청주 과립
  '500kg': '과립', '150kg': '과립', '50kg': '과립', '혼합': '과립',
  // 청주 타정
  '이중 타정': '타정', '일반 타정': '타정', '캡슐': '타정',
  // 청주 코팅
  '650L': '코팅', '250L': '코팅', '70L': '코팅',
  // 청주 선별
  '자동': '선별', '수동': '선별', '인쇄': '선별', '진공건조': '선별',
  // 청주 포장
  '바틀': '포장', '블리스터': '포장',
  // 진천 과립
  '건식': '과립', '습식': '과립', '직타': '과립',
  // 진천 타정
  '(KT30MSA)(1)': '타정', '(KT30MSA)(2)': '타정', 'KF-6': '타정', 'KF90N': '타정',
  // 진천 코팅
  'KAC1300F/S(1)': '코팅', 'KAC1300F/S(2)': '코팅',
  // 진천 선별
  '정제선별': '선별', '캡슐선별': '선별',
  // 진천 포장
  '병포장': '포장', 'PTP': '포장',
};

const PROCESS_SUMMARY_MAP: Record<string, string> = {
  '과립 요약': '과립', '타정 요약': '타정',
  '코팅 요약': '코팅', '선별 요약': '선별', '포장 요약': '포장',
};

const FACTORY_SUMMARY_SET = new Set(['청주 요약', '진천 요약']);

// ── 기간 정규화 ───────────────────────────────────────────────────────────────

/** Excel date / string → 'YY.MM' | null */
function normalizePeriod(v: unknown): string | null {
  if (v instanceof Date) {
    const yy = String(v.getUTCFullYear()).slice(2);
    const mm = String(v.getUTCMonth() + 1).padStart(2, '0');
    return `${yy}.${mm}`;
  }
  if (typeof v === 'string') {
    // '25.01월' or '25.01'
    const m = v.match(/^(\d{2})\.(\d{2})월?$/);
    if (m) return `${m[1]}.${m[2]}`;
  }
  return null;
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function parseFileLabel(name: string): string {
  const m = name.match(/(\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1].slice(2)}.${m[2]}.${m[3]}`;
  return name.replace(/\.[^/.]+$/, '');
}

// ── 피벗 시트 파싱 ─────────────────────────────────────────────────────────────

function parsePivotSheet(ws: XLSX.WorkSheet): PivotRow[] {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  // 헤더 행: col A = '공장' + 월별 기간 컬럼이 있는 행 동적 탐색
  // (연간 집계 테이블을 건너뛰고 월별 테이블을 찾기 위해 월별 period 존재 여부 검증)
  let headerRow = -1;
  let firstPeriodCol = 2;

  for (let r = 0; r < Math.min(raw.length, 80); r++) {
    if (String(raw[r]?.[0] ?? '') === '공장') {
      const hRow = raw[r] as unknown[];
      let candidate = -1;
      for (let c = 2; c < hRow.length; c++) {
        if (normalizePeriod(hRow[c]) !== null) { candidate = c; break; }
      }
      if (candidate !== -1) {
        headerRow = r;
        firstPeriodCol = candidate;
        break; // 월별 기간이 있는 첫 번째 테이블
      }
      // 월별 기간 없는 테이블(연간 집계 등) → 계속 탐색
    }
  }
  if (headerRow === -1) return [];

  // 월별 컬럼 수집
  const hRow = raw[headerRow] as unknown[];
  const periods: { col: number; period: string }[] = [];
  for (let c = firstPeriodCol; c < hRow.length; c++) {
    const p = normalizePeriod(hRow[c]);
    if (p) periods.push({ col: c, period: p });
  }

  // 데이터 파싱 — 카테고리별 누적
  const accumulator = new Map<string, number>(); // key = 'factory|category|period'

  let currentFactory: Factory = '청주';

  for (let r = headerRow + 1; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    if (!row || row.every(v => v == null)) continue;

    const colA = String(row[0] ?? '').trim();
    const colB = String(row[1] ?? '').trim();

    // 공장 컨텍스트 업데이트 (요약 행 제외)
    if (colA.includes('청주') && !colA.includes('요약')) currentFactory = '청주';
    else if (colA.includes('진천') && !colA.includes('요약')) currentFactory = '진천';

    // 요약/합계 행 스킵
    if (colA.includes('요약') || colA.includes('총합계')) continue;

    // 카테고리 매핑
    let category: string | null = null;
    if (currentFactory === '청주') {
      category = CHEONGJU_CATEGORY_MAP[colB] ?? null;
    } else {
      category = JINCHEONG_VALID.has(colB) ? colB : null;
    }
    if (!category) continue;

    // 기간별 값 누적
    for (const { col, period } of periods) {
      const val = toNum(row[col]);
      const key = `${currentFactory}|${category}|${period}`;
      accumulator.set(key, (accumulator.get(key) ?? 0) + val);
    }
  }

  // Map → PivotRow[]
  return Array.from(accumulator.entries()).map(([key, value]) => {
    const [factory, category, period] = key.split('|');
    return { factory: factory as Factory, category, period, value };
  });
}

// ── 설비가동율 시트 파싱 ───────────────────────────────────────────────────────

function parseEquipmentSheet(ws: XLSX.WorkSheet): EquipmentRow[] {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  // 헤더 행: 기간 값(날짜 or '24.01' 패턴)이 처음 등장하는 행 동적 탐색
  let headerRow = -1;
  let firstPeriodCol = -1;
  let factoryCol = -1;
  let equipCol = -1;

  outer:
  for (let r = 0; r < Math.min(raw.length, 20); r++) {
    const row = raw[r] as unknown[];
    if (!row) continue;
    for (let c = 0; c < Math.min(row.length, 20); c++) {
      if (normalizePeriod(row[c]) !== null) {
        headerRow = r;
        firstPeriodCol = c;
        factoryCol = c - 2;
        equipCol = c - 1;
        break outer;
      }
    }
  }
  if (headerRow === -1) return [];

  // 월별 컬럼 수집
  const hRow = raw[headerRow] as unknown[];
  const periods: { col: number; period: string }[] = [];
  for (let c = firstPeriodCol; c < hRow.length; c++) {
    const p = normalizePeriod(hRow[c]);
    if (p) periods.push({ col: c, period: p });
  }

  const rows: EquipmentRow[] = [];
  let currentFactory: Factory = '청주';

  for (let r = headerRow + 1; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    if (!row || row.every(v => v == null)) continue;

    const factoryVal = row[factoryCol];
    const equipVal = String(row[equipCol] ?? '').trim();
    if (!equipVal || equipVal === '근무일수') continue;

    // 공장 컨텍스트 업데이트
    if (typeof factoryVal === 'string') {
      if (factoryVal.includes('청주')) currentFactory = '청주';
      else if (factoryVal.includes('진천')) currentFactory = '진천';
    }

    const isFactorySummary = FACTORY_SUMMARY_SET.has(equipVal);
    const summaryProcess = PROCESS_SUMMARY_MAP[equipVal] ?? null;
    const isSummary = summaryProcess !== null;
    const process = summaryProcess ?? EQUIPMENT_PROCESS_MAP[equipVal] ?? '기타';

    // 팩토리 요약 행은 이름에서 직접 결정
    let factory: Factory = currentFactory;
    if (equipVal === '청주 요약') factory = '청주';
    else if (equipVal === '진천 요약') factory = '진천';

    for (const { col, period } of periods) {
      rows.push({
        factory, process, equipment: equipVal,
        isSummary, isFactorySummary, period,
        value: toNum(row[col]),
      });
    }
  }

  return rows;
}

// ── 케미컬 요약 시트 파싱 ─────────────────────────────────────────────────────

function parseSummarySheet(ws: XLSX.WorkSheet): ProductBatch[] {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  // 헤더 행 탐색: '공장' 컬럼이 있는 행 찾기
  let headerRow = -1;
  let factoryCol = -1;

  for (let r = 0; r < Math.min(raw.length, 10); r++) {
    const row = raw[r] as unknown[];
    if (!row) continue;
    for (let c = 0; c < Math.min(row.length, 10); c++) {
      if (String(row[c] ?? '').trim() === '공장') {
        headerRow = r;
        factoryCol = c;
        break;
      }
    }
    if (headerRow !== -1) break;
  }
  if (headerRow === -1) return [];

  const hRow = raw[headerRow] as unknown[];

  // 월별 배치 컬럼 수집 (첫 번째 연속 period 그룹만 사용)
  const periods: { col: number; period: string }[] = [];
  let nonPeriodStreak = 0;

  for (let c = factoryCol + 1; c < hRow.length; c++) {
    const p = normalizePeriod(hRow[c]);
    if (p) {
      nonPeriodStreak = 0;
      periods.push({ col: c, period: p });
    } else if (periods.length > 0) {
      nonPeriodStreak++;
      if (nonPeriodStreak >= 3) break; // 두 번째 테이블 영역 → 중단
    }
  }

  // 제품명 컬럼 탐색: '제품명' 또는 '품명' 헤더가 있는 열
  let productCol = -1;
  for (let c = factoryCol; c < Math.min(hRow.length, factoryCol + 10); c++) {
    const v = String(hRow[c] ?? '').trim();
    if (v.includes('제품명') || v.includes('품명') || v === '품목') {
      productCol = c;
      break;
    }
  }
  // fallback: factoryCol + 6 (col H = index 7 when factoryCol = 1)
  if (productCol === -1) productCol = factoryCol + 6;

  // 'Main' 열 탐색 (●표시 확인용)
  let markCol = -1;
  for (let c = factoryCol; c < Math.min(hRow.length, factoryCol + 6); c++) {
    const v = String(hRow[c] ?? '').trim();
    if (v === 'Main' || v === 'main') { markCol = c; break; }
  }
  if (markCol === -1) markCol = factoryCol + 2; // fallback

  // 카테고리 열: '공장' 바로 다음
  const categoryCol = factoryCol + 1;

  // 설비명 정규화: '(진)건식' → '건식', '500Kg' → '500kg'
  function normalizeEquipName(raw: string): string {
    return raw.replace(/^\([^)]*\)/, '').trim().toLowerCase();
  }

  // (설)과1, (설)과2, 제조단위, 수율 열 탐색
  let granule1Col = -1;
  let granule2Col = -1;
  let mfgUnitCol = -1;
  let mfgYieldCol = -1;
  for (let c = factoryCol; c < hRow.length; c++) {
    const v = String(hRow[c] ?? '').trim();
    if (v === '(설)과1') granule1Col = c;
    else if (v === '(설)과2') granule2Col = c;
    else if (v === '제조 단위' || v === '제조단위') mfgUnitCol = c;
    else if (v === '수율') mfgYieldCol = c;
    if (granule1Col !== -1 && granule2Col !== -1 && mfgUnitCol !== -1 && mfgYieldCol !== -1) break;
  }

  // 1차 패스: ● 행의 배치 데이터 수집 + 위치 기록
  interface PendingProduct {
    factory: Factory;
    category: string;
    product: string;
    rowIdx: number;
    periodBatches: { period: string; batches: number }[];
    mfgUnit?: number;
    mfgYield?: number;
  }

  const pending: PendingProduct[] = [];
  let currentFactory: Factory = '청주';

  for (let r = headerRow + 1; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    if (!row || row.every(v => v == null)) continue;

    const fv = String(row[factoryCol] ?? '').trim();
    if (fv.includes('청주')) currentFactory = '청주';
    else if (fv.includes('진천')) currentFactory = '진천';

    const mark = String(row[markCol] ?? '').trim();
    if (mark !== '●') continue;

    const product = String(row[productCol] ?? '').trim();
    if (!product) continue;

    const category = String(row[categoryCol] ?? '').trim();

    const periodBatches: { period: string; batches: number }[] = [];
    for (const { col, period } of periods) {
      const batches = toNum(row[col]);
      if (batches > 0) periodBatches.push({ period, batches });
    }

    // 제조 단위 / 수율 읽기
    const rawMfgUnit = mfgUnitCol !== -1 ? toNum(row[mfgUnitCol]) : 0;
    const mfgUnit = rawMfgUnit > 0 ? rawMfgUnit : undefined;
    const rawMfgYield = mfgYieldCol !== -1 ? toNum(row[mfgYieldCol]) : 0;
    const mfgYield = rawMfgYield > 0 ? rawMfgYield : undefined;

    if (periodBatches.length > 0) {
      pending.push({ factory: currentFactory, category, product, rowIdx: r, periodBatches, mfgUnit, mfgYield });
    }
  }

  // 2차 패스: ● 행 아래 서브 행(규격별)에서 설비 정보를 수집하여 ● 행에 병합
  // 서브 행 = ● 행 다음부터 다음 ● 행(또는 시트 끝)까지의 non-● 행
  const results: ProductBatch[] = [];

  for (let idx = 0; idx < pending.length; idx++) {
    const p = pending[idx];
    const nextMainRow = idx + 1 < pending.length ? pending[idx + 1].rowIdx : raw.length;

    // 서브 행들의 (설)과1, (설)과2에서 고유 설비명 수집
    const equipSet = new Set<string>();

    // ● 행 자체의 설비 정보도 확인
    const mainRow = raw[p.rowIdx] as unknown[];
    for (const col of [granule1Col, granule2Col]) {
      if (col === -1) continue;
      const v = mainRow[col];
      if (v == null) continue;
      const s = normalizeEquipName(String(v));
      if (s && s !== '0') equipSet.add(s);
    }

    // 서브 행 탐색
    for (let sr = p.rowIdx + 1; sr < nextMainRow; sr++) {
      const subRow = raw[sr] as unknown[];
      if (!subRow) continue;
      for (const col of [granule1Col, granule2Col]) {
        if (col === -1) continue;
        const v = subRow[col];
        if (v == null) continue;
        const s = normalizeEquipName(String(v));
        if (s && s !== '0') equipSet.add(s);
      }
    }

    const granuleEquip = Array.from(equipSet);

    for (const { period, batches } of p.periodBatches) {
      results.push({
        factory: p.factory,
        category: p.category,
        product: p.product,
        period,
        batches,
        granuleEquip,
        mfgUnit: p.mfgUnit,
        mfgYield: p.mfgYield,
      });
    }
  }

  return results;
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

export function parseUtilizationBuffer(buffer: ArrayBuffer, fileName: string): UtilizationFile {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const pivotWs   = wb.Sheets['피벗']       ?? null;
  const equipWs   = wb.Sheets['설비가동율'] ?? null;
  const summaryWs = wb.Sheets['케미컬 요약'] ?? wb.Sheets['케미컬요약'] ?? null;

  return {
    name: fileName,
    label: parseFileLabel(fileName),
    pivotRows:      pivotWs   ? parsePivotSheet(pivotWs)       : [],
    equipmentRows:  equipWs   ? parseEquipmentSheet(equipWs)   : [],
    productBatches: summaryWs ? parseSummarySheet(summaryWs)   : [],
  };
}
