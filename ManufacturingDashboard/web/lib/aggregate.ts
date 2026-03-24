import { ActualRow, PlanRow } from './types';
import { EXCLUDED_CODES, ORG_GROUPS } from './orgChart';

export function filterTeamRows(rows: ActualRow[]): ActualRow[] {
  return rows.filter((r) => !EXCLUDED_CODES.has(r.deptCode));
}

// ─── KPI Summary ───────────────────────────────────────────────────────────

export interface KpiSummary {
  totalPlanY: number;
  totalActualY: number;
  executionRateY: number;
  diffY: number;
  totalPlanM: number;
  totalActualM: number;
  executionRateM: number;
  diffM: number;
  availableY: number;
  budgetBalanceM: number;
}

export function getKpiSummary(rows: ActualRow[]): KpiSummary {
  const filtered = filterTeamRows(rows);
  let planY = 0, totalPlanY = 0, totalActualY = 0, availableY = 0;
  let planM = 0, totalPlanM = 0, totalActualM = 0, budgetBalanceM = 0;

  for (const r of filtered) {
    planY += r.planY;
    totalPlanY += r.totalPlanY;
    totalActualY += r.totalActualY;
    availableY += r.availableY;
    planM += r.planM;
    totalPlanM += r.totalPlanM;
    totalActualM += r.actualSumM;
    budgetBalanceM += r.budgetBalance;
  }

  return {
    totalPlanY,
    totalActualY,
    executionRateY: totalPlanY ? (totalActualY / totalPlanY) * 100 : 0,
    diffY: totalActualY - planY,
    totalPlanM,
    totalActualM,
    executionRateM: totalPlanM ? (totalActualM / totalPlanM) * 100 : 0,
    diffM: totalActualM - planM,
    availableY,
    budgetBalanceM,
  };
}

// ─── Org Table ─────────────────────────────────────────────────────────────

export interface DeptSummary {
  deptCode: string;
  deptName: string;
  planY: number;
  totalPlanY: number;
  totalActualY: number;
  availableY: number;
  planM: number;
  totalPlanM: number;
  actualSumM: number;
  executionRateY: number;
  executionRateM: number;
  diffY: number;
}

export interface GroupSummary {
  groupKey: string;
  groupName: string;
  parentBu: string;
  isStandalone: boolean;
  planY: number;
  totalPlanY: number;
  totalActualY: number;
  availableY: number;
  planM: number;
  totalPlanM: number;
  actualSumM: number;
  executionRateY: number;
  executionRateM: number;
  diffY: number;
  teams: DeptSummary[];
}

export function aggregateByGroup(rows: ActualRow[]): GroupSummary[] {
  const filtered = filterTeamRows(rows);

  const byDept: Record<string, DeptSummary> = {};
  for (const r of filtered) {
    if (!byDept[r.deptCode]) {
      byDept[r.deptCode] = {
        deptCode: r.deptCode,
        deptName: r.deptName,
        planY: 0, totalPlanY: 0, totalActualY: 0, availableY: 0,
        planM: 0, totalPlanM: 0, actualSumM: 0,
        executionRateY: 0, executionRateM: 0, diffY: 0,
      };
    }
    const d = byDept[r.deptCode];
    d.planY += r.planY;
    d.totalPlanY += r.totalPlanY;
    d.totalActualY += r.totalActualY;
    d.availableY += r.availableY;
    d.planM += r.planM;
    d.totalPlanM += r.totalPlanM;
    d.actualSumM += r.actualSumM;
  }

  for (const d of Object.values(byDept)) {
    d.executionRateY = d.totalPlanY ? (d.totalActualY / d.totalPlanY) * 100 : 0;
    d.executionRateM = d.totalPlanM ? (d.actualSumM / d.totalPlanM) * 100 : 0;
    d.diffY = d.totalActualY - d.planY;
  }

  return ORG_GROUPS.map((group) => {
    const teams = group.teams.map((t) => byDept[t.code]).filter(Boolean) as DeptSummary[];
    const sum = (key: keyof DeptSummary) =>
      teams.reduce((acc, t) => acc + (t[key] as number), 0);

    const totalPlanY = sum('totalPlanY');
    const totalActualY = sum('totalActualY');
    const totalPlanM = sum('totalPlanM');
    const actualSumM = sum('actualSumM');
    const planY = sum('planY');

    return {
      groupKey: group.groupKey,
      groupName: group.groupName,
      parentBu: group.parentBu,
      isStandalone: group.isStandalone,
      planY,
      totalPlanY,
      totalActualY,
      availableY: sum('availableY'),
      planM: sum('planM'),
      totalPlanM,
      actualSumM,
      executionRateY: totalPlanY ? (totalActualY / totalPlanY) * 100 : 0,
      executionRateM: totalPlanM ? (actualSumM / totalPlanM) * 100 : 0,
      diffY: totalActualY - planY,
      teams,
    };
  }).filter((g) => g.teams.length > 0);
}

// ─── Account Chart ─────────────────────────────────────────────────────────

export interface DeptActual {
  deptCode: string;
  deptName: string;
  totalActualY: number;
  totalPlanY: number;
  executionRate: number;
}

export interface AccountSummary {
  accountCode: string;
  accountName: string;
  totalPlanY: number;
  totalActualY: number;
  executionRate: number;
  byDept: DeptActual[];
}

export function aggregateByAccount(rows: ActualRow[]): AccountSummary[] {
  const filtered = filterTeamRows(rows);
  const accountNames: Record<string, string> = {};
  const byAccount: Record<string, { planY: number; actualY: number; depts: Record<string, { name: string; planY: number; actualY: number }> }> = {};

  for (const r of filtered) {
    accountNames[r.accountCode] = r.accountName;
    if (!byAccount[r.accountCode]) {
      byAccount[r.accountCode] = { planY: 0, actualY: 0, depts: {} };
    }
    const acc = byAccount[r.accountCode];
    acc.planY += r.totalPlanY;
    acc.actualY += r.totalActualY;
    if (!acc.depts[r.deptCode]) {
      acc.depts[r.deptCode] = { name: r.deptName, planY: 0, actualY: 0 };
    }
    acc.depts[r.deptCode].planY += r.totalPlanY;
    acc.depts[r.deptCode].actualY += r.totalActualY;
  }

  return Object.entries(byAccount)
    .map(([code, v]) => ({
      accountCode: code,
      accountName: accountNames[code] || code,
      totalPlanY: v.planY,
      totalActualY: v.actualY,
      executionRate: v.planY ? (v.actualY / v.planY) * 100 : 0,
      byDept: Object.entries(v.depts)
        .map(([dc, dv]) => ({
          deptCode: dc,
          deptName: dv.name,
          totalActualY: dv.actualY,
          totalPlanY: dv.planY,
          executionRate: dv.planY ? (dv.actualY / dv.planY) * 100 : 0,
        }))
        .sort((a, b) => b.totalActualY - a.totalActualY),
    }))
    .sort((a, b) => b.executionRate - a.executionRate);
}

// ─── Cumulative Chart ──────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: number;
  label: string;
  cumulPlan: number;
  cumulActual: number | null;
}

export function buildCumulativeData(planRows: PlanRow[], currentMonth: number): MonthlyPoint[] {
  const filtered = planRows.filter((r) => !EXCLUDED_CODES.has(r.deptCode));

  const monthlyPlan = new Array(12).fill(0);
  const monthlyActual = new Array(12).fill(0);

  for (const r of filtered) {
    for (let m = 0; m < 12; m++) {
      monthlyPlan[m] += r.monthly[m].plan;
      monthlyActual[m] += r.monthly[m].actual;
    }
  }

  const points: MonthlyPoint[] = [];
  let cumPlan = 0;
  let cumActual = 0;

  for (let m = 1; m <= 12; m++) {
    cumPlan += monthlyPlan[m - 1];
    if (m <= currentMonth) {
      cumActual += monthlyActual[m - 1];
    }
    points.push({
      month: m,
      label: `${m}월`,
      cumulPlan: cumPlan,
      cumulActual: m <= currentMonth ? cumActual : null,
    });
  }

  return points;
}

// ─── Monthly Balance Breakdown ─────────────────────────────────────────────

export interface BalanceItem {
  deptCode: string;
  deptName: string;
  accountCode: string;
  accountName: string;
  totalPlanM: number;
  actualSumM: number;
  budgetBalance: number;
  executionRateM: number;
}

export function getMonthlyBalanceItems(rows: ActualRow[]): BalanceItem[] {
  const filtered = filterTeamRows(rows);
  const map: Record<string, BalanceItem> = {};

  for (const r of filtered) {
    const key = `${r.deptCode}__${r.accountCode}`;
    if (!map[key]) {
      map[key] = {
        deptCode: r.deptCode,
        deptName: r.deptName,
        accountCode: r.accountCode,
        accountName: r.accountName,
        totalPlanM: 0,
        actualSumM: 0,
        budgetBalance: 0,
        executionRateM: 0,
      };
    }
    map[key].totalPlanM += r.totalPlanM;
    map[key].actualSumM += r.actualSumM;
    map[key].budgetBalance += r.budgetBalance;
  }

  for (const item of Object.values(map)) {
    item.executionRateM = item.totalPlanM
      ? (item.actualSumM / item.totalPlanM) * 100
      : 0;
  }

  return Object.values(map)
    .filter((item) => item.budgetBalance > 0 && item.totalPlanM > 0)
    .sort((a, b) => b.budgetBalance - a.budgetBalance);
}

// ─── Team Account Detail ────────────────────────────────────────────────────

export interface TeamAccountItem {
  accountCode: string;
  accountName: string;
  totalPlanY: number;
  totalActualY: number;
  availableY: number;
  totalPlanM: number;
  actualSumM: number;
  budgetBalance: number;
  executionRateY: number;
  executionRateM: number;
}

export function getDeptAccountItems(rows: ActualRow[], deptCode: string): TeamAccountItem[] {
  const filtered = rows.filter((r) => r.deptCode === deptCode);
  const map: Record<string, TeamAccountItem> = {};

  for (const r of filtered) {
    if (!map[r.accountCode]) {
      map[r.accountCode] = {
        accountCode: r.accountCode,
        accountName: r.accountName,
        totalPlanY: 0, totalActualY: 0, availableY: 0,
        totalPlanM: 0, actualSumM: 0, budgetBalance: 0,
        executionRateY: 0, executionRateM: 0,
      };
    }
    const item = map[r.accountCode];
    item.totalPlanY += r.totalPlanY;
    item.totalActualY += r.totalActualY;
    item.availableY += r.availableY;
    item.totalPlanM += r.totalPlanM;
    item.actualSumM += r.actualSumM;
    item.budgetBalance += r.budgetBalance;
  }

  for (const item of Object.values(map)) {
    item.executionRateY = item.totalPlanY ? (item.totalActualY / item.totalPlanY) * 100 : 0;
    item.executionRateM = item.totalPlanM ? (item.actualSumM / item.totalPlanM) * 100 : 0;
  }

  return Object.values(map).sort((a, b) => b.totalActualY - a.totalActualY);
}

// ─── Formatter ─────────────────────────────────────────────────────────────

export function fmt(v: number, short = false): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (short) {
    if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`;
    if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000).toLocaleString()}만`;
    return `${sign}${abs.toLocaleString()}`;
  }
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억원`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000).toLocaleString()}만원`;
  return `${sign}${abs.toLocaleString()}원`;
}
