import { SalesRow } from './salesTypes';
import { SALES_HIERARCHY } from './salesHierarchy';

export interface SalesMetrics {
  plan: number;
  actual: number;
  forecast: number;
  prevForecast: number;
  gap: number;
  achievementRate: number;   // actual / plan * 100
  forecastRate: number;      // forecast / plan * 100
}

export interface SalesItemSummary extends SalesMetrics {
  key: string;
  name: string;
  level: 'total' | 'category' | 'group' | 'item';
  children?: SalesItemSummary[];
}

export interface SalesMonthlyPoint {
  month: number;
  label: string;
  plan: number;
  actual: number;
  forecast: number;
}

export interface SalesQuarterlySummary extends SalesMetrics {
  quarter: number;
  label: string;
}

export interface SalesKpi extends SalesMetrics {
  actualMonths: number; // 실적이 있는 월 수
}

// ─── Gap 직접 계산 ────────────────────────────────────────────────────────────

type GapMap = Map<string, { gap: number; prevForecast: number }>;

function rowKey(r: SalesRow) {
  return `${r.year}_${r.month}_${r.detailCategory}`;
}

/**
 * 현재 파일과 이전 주 파일을 비교해 (year, month, detailCategory) 단위 gap 맵 생성.
 * prevRows가 없으면 빈 맵 반환 (파일이 1개뿐인 경우).
 */
export function buildGapMap(currentRows: SalesRow[], prevRows: SalesRow[]): GapMap {
  const map: GapMap = new Map();
  if (!prevRows.length) return map;

  const prevForecastByKey = new Map<string, number>();
  for (const r of prevRows) {
    const k = rowKey(r);
    prevForecastByKey.set(k, (prevForecastByKey.get(k) ?? 0) + r.forecast);
  }

  const currForecastByKey = new Map<string, number>();
  for (const r of currentRows) {
    const k = rowKey(r);
    currForecastByKey.set(k, (currForecastByKey.get(k) ?? 0) + r.forecast);
  }

  for (const [k, currFc] of currForecastByKey) {
    const prevFc = prevForecastByKey.get(k) ?? 0;
    map.set(k, { gap: currFc - prevFc, prevForecast: prevFc });
  }
  return map;
}

/**
 * rows의 gap / prevForecast 필드를 gapMap으로 교체한 새 배열 반환.
 * gapMap이 비어있으면 원본 그대로 반환.
 */
export function applyGapMap(rows: SalesRow[], gapMap: GapMap): SalesRow[] {
  if (!gapMap.size) return rows;
  return rows.map((r) => {
    const computed = gapMap.get(rowKey(r));
    if (!computed) return { ...r, gap: 0, prevForecast: 0 };
    return { ...r, gap: computed.gap, prevForecast: computed.prevForecast };
  });
}

// ─── 집계 내부 유틸 ───────────────────────────────────────────────────────────

export function sumMetrics(rows: SalesRow[]): SalesMetrics {
  let plan = 0, actual = 0, forecast = 0, prevForecast = 0, gap = 0;
  for (const r of rows) {
    plan         += r.plan;
    actual       += r.actual;
    forecast     += r.forecast;
    prevForecast += r.prevForecast;
    gap          += r.gap;
  }
  return {
    plan, actual, forecast, prevForecast, gap,
    achievementRate: plan ? (actual / plan) * 100 : 0,
    forecastRate:    plan ? (forecast / plan) * 100 : 0,
  };
}

// ─── KPI ─────────────────────────────────────────────────────────────────────

export function getSalesKpi(rows: SalesRow[], year: number): SalesKpi {
  const filtered = rows.filter((r) => r.year === year);
  const m = sumMetrics(filtered);
  const actualMonths = new Set(filtered.filter((r) => r.actual > 0).map((r) => r.month)).size;
  return { ...m, actualMonths };
}

// ─── 분기별 ───────────────────────────────────────────────────────────────────

export function getSalesQuarterlyData(rows: SalesRow[], year: number): SalesQuarterlySummary[] {
  const filtered = rows.filter((r) => r.year === year);
  const result: SalesQuarterlySummary[] = [];

  for (let q = 1; q <= 4; q++) {
    const qRows = filtered.filter((r) => r.quarter === q);
    if (!qRows.length) continue;
    const m = sumMetrics(qRows);
    if (m.plan > 0 || m.actual > 0 || m.forecast > 0) {
      result.push({ quarter: q, label: `${q}분기`, ...m });
    }
  }
  return result;
}

// ─── 계층 구조 ────────────────────────────────────────────────────────────────

export function buildSalesHierarchy(rows: SalesRow[], year: number): SalesItemSummary {
  const filtered = rows.filter((r) => r.year === year);

  const byCategory = SALES_HIERARCHY.map((cat): SalesItemSummary => {
    const groups = cat.groups.map((grp): SalesItemSummary => {
      const itemRows = filtered.filter((r) => grp.items.includes(r.detailCategory));

      const itemMap = new Map<string, SalesRow[]>();
      for (const r of itemRows) {
        if (!itemMap.has(r.detailCategory)) itemMap.set(r.detailCategory, []);
        itemMap.get(r.detailCategory)!.push(r);
      }

      const children: SalesItemSummary[] = [];
      for (const itemName of grp.items) {
        const iRows = itemMap.get(itemName) ?? [];
        if (!iRows.length) continue;
        children.push({ key: `item_${itemName}`, name: itemName, level: 'item', ...sumMetrics(iRows) });
      }

      return { key: grp.key, name: grp.name, level: 'group', children, ...sumMetrics(itemRows) };
    }).filter((g) => g.plan > 0 || g.actual > 0 || g.forecast > 0);

    const catRows = filtered.filter((r) =>
      cat.groups.some((g) => g.items.includes(r.detailCategory))
    );
    return { key: cat.key, name: cat.name, level: 'category', children: groups, ...sumMetrics(catRows) };
  });

  return {
    key: 'total',
    name: 'CMO 합계',
    level: 'total',
    children: byCategory,
    ...sumMetrics(filtered),
  };
}

// ─── 월별 ─────────────────────────────────────────────────────────────────────

export function getSalesMonthlyData(rows: SalesRow[], year: number): SalesMonthlyPoint[] {
  const filtered = rows.filter((r) => r.year === year);
  const points: SalesMonthlyPoint[] = [];

  for (let m = 1; m <= 12; m++) {
    const monthRows = filtered.filter((r) => r.month === m);
    const plan     = monthRows.reduce((s, r) => s + r.plan, 0);
    const actual   = monthRows.reduce((s, r) => s + r.actual, 0);
    const forecast = monthRows.reduce((s, r) => s + r.forecast, 0);
    if (plan > 0 || actual > 0 || forecast > 0) {
      points.push({ month: m, label: `${m}월`, plan, actual, forecast });
    }
  }
  return points;
}

// ─── 월별 항목 상세 ───────────────────────────────────────────────────────────

export interface MonthDetailRow extends SalesMetrics {
  name: string;
  level: 'category' | 'group' | 'item';
}

export function getSalesMonthDetail(rows: SalesRow[], year: number, month: number): MonthDetailRow[] {
  const filtered = rows.filter((r) => r.year === year && r.month === month);
  const result: MonthDetailRow[] = [];

  for (const cat of SALES_HIERARCHY) {
    const catRows = filtered.filter((r) =>
      cat.groups.some((g) => g.items.includes(r.detailCategory))
    );
    if (!catRows.length) continue;
    result.push({ name: cat.name, level: 'category', ...sumMetrics(catRows) });

    for (const grp of cat.groups) {
      const grpRows = filtered.filter((r) => grp.items.includes(r.detailCategory));
      if (!grpRows.length) continue;
      result.push({ name: grp.name, level: 'group', ...sumMetrics(grpRows) });

      for (const itemName of grp.items) {
        const itemRows = filtered.filter((r) => r.detailCategory === itemName);
        if (!itemRows.length) continue;
        result.push({ name: itemName, level: 'item', ...sumMetrics(itemRows) });
      }
    }
  }

  return result;
}

// ─── 월별 매트릭스 (요약 테이블용) ───────────────────────────────────────────

export interface MonthlyCellData {
  plan: number;
  actual: number;
  forecast: number;
}

export interface SalesSummaryRow {
  key: string;
  name: string;
  level: 'total' | 'category' | 'group' | 'item';
  depth: number;
  months: MonthlyCellData[];   // [0] = 1월 … [11] = 12월
  quarters: MonthlyCellData[]; // [0] = Q1 … [3] = Q4
  annual: MonthlyCellData;
}

function buildMonthly(subset: SalesRow[]): MonthlyCellData[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    let plan = 0, actual = 0, forecast = 0;
    for (const r of subset) {
      if (r.month === m) { plan += r.plan; actual += r.actual; forecast += r.forecast; }
    }
    return { plan, actual, forecast };
  });
}

function buildQuarterly(months: MonthlyCellData[]): MonthlyCellData[] {
  return [0, 1, 2, 3].map((qi) => {
    const s = months.slice(qi * 3, qi * 3 + 3);
    return s.reduce((a, m) => ({ plan: a.plan + m.plan, actual: a.actual + m.actual, forecast: a.forecast + m.forecast }), { plan: 0, actual: 0, forecast: 0 });
  });
}

function buildAnnual(months: MonthlyCellData[]): MonthlyCellData {
  return months.reduce((a, m) => ({ plan: a.plan + m.plan, actual: a.actual + m.actual, forecast: a.forecast + m.forecast }), { plan: 0, actual: 0, forecast: 0 });
}

export function getSalesSummaryMatrix(rows: SalesRow[], year: number): SalesSummaryRow[] {
  const filtered = rows.filter((r) => r.year === year);
  const result: SalesSummaryRow[] = [];

  const totalMonths = buildMonthly(filtered);
  result.push({ key: 'total', name: 'CMO 합계', level: 'total', depth: 0, months: totalMonths, quarters: buildQuarterly(totalMonths), annual: buildAnnual(totalMonths) });

  for (const cat of SALES_HIERARCHY) {
    const catRows = filtered.filter((r) => cat.groups.some((g) => g.items.includes(r.detailCategory)));
    if (!catRows.length) continue;
    const catMonths = buildMonthly(catRows);
    result.push({ key: cat.key, name: cat.name, level: 'category', depth: 1, months: catMonths, quarters: buildQuarterly(catMonths), annual: buildAnnual(catMonths) });

    for (const grp of cat.groups) {
      const grpRows = filtered.filter((r) => grp.items.includes(r.detailCategory));
      if (!grpRows.length) continue;
      const grpMonths = buildMonthly(grpRows);
      result.push({ key: grp.key, name: grp.name, level: 'group', depth: 2, months: grpMonths, quarters: buildQuarterly(grpMonths), annual: buildAnnual(grpMonths) });

      for (const itemName of grp.items) {
        const itemRows = filtered.filter((r) => r.detailCategory === itemName);
        if (!itemRows.length) continue;
        const itemMonths = buildMonthly(itemRows);
        result.push({ key: `item_${itemName}`, name: itemName, level: 'item', depth: 3, months: itemMonths, quarters: buildQuarterly(itemMonths), annual: buildAnnual(itemMonths) });
      }
    }
  }

  return result;
}

// ─── 포맷터 ───────────────────────────────────────────────────────────────────

export function fmtSales(v: number, short = false): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (short) {
    if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`;
    if (abs >= 10_000)      return `${sign}${Math.round(abs / 10_000).toLocaleString()}만`;
    return `${sign}${abs.toLocaleString()}`;
  }
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억원`;
  if (abs >= 10_000)      return `${sign}${Math.round(abs / 10_000).toLocaleString()}만원`;
  return `${sign}${abs.toLocaleString()}원`;
}
