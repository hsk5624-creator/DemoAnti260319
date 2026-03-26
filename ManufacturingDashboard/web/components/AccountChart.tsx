'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { AccountSummary, fmt } from '@/lib/aggregate';

interface Props {
  accounts: AccountSummary[];
}

/** '전력비-전기' → '전력비', '소모품비' → '소모품비' */
function getParentAccountName(name: string): string {
  const idx = name.indexOf('-');
  return idx > 0 ? name.slice(0, idx).trim() : name;
}

/** 대계정 기준으로 합산 */
function aggregateToParent(accounts: AccountSummary[]): AccountSummary[] {
  const map = new Map<string, AccountSummary>();

  for (const a of accounts) {
    const parentName = getParentAccountName(a.accountName);
    if (!map.has(parentName)) {
      map.set(parentName, {
        accountCode: a.accountCode,
        accountName: parentName,
        totalPlanY: 0,
        totalActualY: 0,
        totalPlanM: 0,
        actualSumM: 0,
        executionRate: 0,
        executionRateM: 0,
        byDept: [],
      });
    }
    const g = map.get(parentName)!;
    g.totalPlanY += a.totalPlanY;
    g.totalActualY += a.totalActualY;
    g.totalPlanM += a.totalPlanM;
    g.actualSumM += a.actualSumM;

    for (const d of a.byDept) {
      const existing = g.byDept.find((bd) => bd.deptCode === d.deptCode);
      if (existing) {
        existing.totalActualY += d.totalActualY;
        existing.totalPlanY += d.totalPlanY;
        existing.totalPlanM += d.totalPlanM;
        existing.actualSumM += d.actualSumM;
        existing.executionRate = existing.totalPlanY
          ? (existing.totalActualY / existing.totalPlanY) * 100 : 0;
        existing.executionRateM = existing.totalPlanM
          ? (existing.actualSumM / existing.totalPlanM) * 100 : 0;
      } else {
        g.byDept.push({ ...d });
      }
    }
  }

  for (const g of map.values()) {
    g.executionRate = g.totalPlanY ? (g.totalActualY / g.totalPlanY) * 100 : 0;
    g.executionRateM = g.totalPlanM ? (g.actualSumM / g.totalPlanM) * 100 : 0;
    g.byDept.sort((a, b) => b.actualSumM - a.actualSumM);
  }

  return [...map.values()];
}

function getCategoryColor(accountName: string): string {
  const COLORS: Record<string, string> = {
    '복리후생비': '#6366f1', '소모품비': '#0ea5e9', '수선유지비': '#f59e0b',
    '여비교통비': '#10b981', '교육훈련비': '#8b5cf6', '차량유지비': '#f97316',
    '통신비': '#ec4899', '도서인쇄비': '#84cc16', '회의비': '#14b8a6',
    '운반비': '#a78bfa', '수도광열비': '#fb923c', '전력비': '#facc15',
    '지급수수료': '#4ade80', '세금과공과': '#f87171', '지급임차료': '#60a5fa',
    '경상연구개발비': '#c084fc',
  };
  for (const [key, color] of Object.entries(COLORS)) {
    if (accountName.startsWith(key)) return color;
  }
  return '#94a3b8';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomXTick({ x, y, payload, chartData }: any) {
  const d = chartData?.find((item: AccountSummary & { name: string }) => item.name === payload.value);
  const rate = d?.executionRateM ?? 0;
  const rateColor = rate >= 90 ? '#f87171' : rate >= 70 ? '#facc15' : '#34d399';
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" x={0} y={8} fill="#cbd5e1" fontSize={10}>
        {payload.value}
      </text>
      <text textAnchor="middle" x={0} y={22} fill={rateColor} fontSize={10} fontWeight="600">
        {rate.toFixed(0)}%
      </text>
    </g>
  );
}

// 계획 레이블: 바 상단 위 높은 위치 (겹침 방지)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlanAmountLabel({ x, y, width, value }: any) {
  if (!value || value < 5_000_000) return null;
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 18}
      textAnchor="middle"
      fill="rgba(255,255,255,0.40)"
      fontSize={9}
    >
      {fmt(value, true)}
    </text>
  );
}

// 실적 레이블: 바 상단 바로 위
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActualAmountLabel({ x, y, width, value }: any) {
  if (value == null || value === 0) return null;
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 4}
      textAnchor="middle"
      fill="#e2e8f0"
      fontSize={10}
      fontWeight="500"
    >
      {fmt(value, true)}
    </text>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as AccountSummary;
  const diff = d.actualSumM - d.totalPlanM;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs space-y-1 shadow-xl">
      <p className="font-semibold text-slate-200">{d.accountName}</p>
      <p className="text-slate-400">당월계획: <span className="text-white">{fmt(d.totalPlanM, true)}</span></p>
      <p className="text-slate-400">당월실적: <span className="text-white">{fmt(d.actualSumM, true)}</span></p>
      <p className={`font-semibold ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
        계획대비: {diff > 0 ? '+' : ''}{fmt(diff, true)}
      </p>
      <p className="text-slate-400">집행률(M): <span className="text-white font-semibold">{d.executionRateM.toFixed(1)}%</span></p>
    </div>
  );
}

export default function AccountChart({ accounts }: Props) {
  const [selected, setSelected] = useState<AccountSummary | null>(null);

  const parentAccounts = aggregateToParent(accounts);

  const top10 = [...parentAccounts]
    .filter((a) => a.totalPlanM > 0 || a.actualSumM > 0)
    .sort((a, b) => b.totalPlanM - a.totalPlanM)
    .slice(0, 10);

  const chartData = top10.map((a) => ({
    ...a,
    name: a.accountName.length > 8 ? a.accountName.slice(0, 8) + '…' : a.accountName,
    color: getCategoryColor(a.accountName),
  }));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">
          계정별 집행 현황 <span className="text-slate-500 font-normal">당월 Top 10 (대계정)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">계획 대비 실적 · 바 클릭 → 부서별 상세</p>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 32, right: 10, left: 10, bottom: 40 }}
            barSize={14}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={(props) => <CustomXTick {...props} chartData={chartData} />}
              interval={0}
              height={48}
            />
            <YAxis
              tickFormatter={(v) => fmt(v, true)}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />

            {/* 계획 바 (연하게) — 레이블은 높게 올려서 실적 레이블과 분리 */}
            <Bar dataKey="totalPlanM" name="당월계획" radius={[3, 3, 0, 0]} opacity={0.4} isAnimationActive={false} label={<PlanAmountLabel />}>
              {chartData.map((entry) => (
                <Cell key={entry.accountCode} fill={entry.color} />
              ))}
            </Bar>

            {/* 실적 바 */}
            <Bar
              dataKey="actualSumM"
              name="당월실적"
              radius={[3, 3, 0, 0]}
              cursor="pointer"
              isAnimationActive={false}
              onClick={(data) => setSelected(data as unknown as AccountSummary)}
              label={<ActualAmountLabel />}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.accountCode}
                  fill={entry.color}
                  opacity={selected && selected.accountCode !== entry.accountCode ? 0.35 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-2 rounded-sm bg-slate-400 opacity-40" /> 계획
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-2 rounded-sm bg-slate-300" /> 실적
          </span>
        </div>
      </div>

      {selected && (
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">{selected.accountName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                당월계획 {fmt(selected.totalPlanM, true)} · 당월실적 {fmt(selected.actualSumM, true)} · 집행률 {selected.executionRateM.toFixed(1)}%
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1">
              ✕ 닫기
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {selected.byDept.filter((d) => d.actualSumM > 0 || d.totalPlanM > 0).map((dept, i) => {
              const maxPlan = Math.max(...selected.byDept.map((d) => d.totalPlanM), 1);
              const rate = dept.executionRateM;
              const rateTextColor = rate >= 90 ? 'text-red-400' : rate >= 70 ? 'text-yellow-400' : 'text-emerald-400';
              const diff = dept.actualSumM - dept.totalPlanM;
              return (
                <div key={dept.deptCode} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-4 tabular-nums shrink-0">{i + 1}</span>
                    <span className="text-xs text-slate-300 w-24 shrink-0 truncate">{dept.deptName}</span>
                    <span className="text-xs text-slate-500 tabular-nums">계획 {fmt(dept.totalPlanM, true)}</span>
                    <span className="text-xs text-slate-200 tabular-nums font-medium">실적 {fmt(dept.actualSumM, true)}</span>
                    <span className={`text-xs tabular-nums font-semibold ml-auto ${rateTextColor}`}>{rate.toFixed(1)}%</span>
                    <span className={`text-xs tabular-nums w-14 text-right ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                      {diff > 0 ? '+' : ''}{fmt(diff, true)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 pl-6">
                    {/* 계획 바 */}
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-slate-500 opacity-50" style={{ width: `${(dept.totalPlanM / maxPlan) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pl-6">
                    {/* 실적 바 */}
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min((dept.actualSumM / maxPlan) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
