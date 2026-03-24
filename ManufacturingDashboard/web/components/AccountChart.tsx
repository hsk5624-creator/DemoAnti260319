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

const ACCOUNT_COLORS: Record<string, string> = {
  '복리후생비': '#6366f1',
  '소모품비': '#0ea5e9',
  '수선유지비': '#f59e0b',
  '여비교통비': '#10b981',
  '교육훈련비': '#8b5cf6',
  '차량유지비': '#f97316',
  '통신비': '#ec4899',
  '도서인쇄비': '#84cc16',
  '회의비': '#14b8a6',
  '운반비': '#a78bfa',
  '수도광열비': '#fb923c',
  '전력비': '#facc15',
  '지급수수료': '#4ade80',
  '세금과공과': '#f87171',
  '지급임차료': '#60a5fa',
  '경상연구개발비': '#c084fc',
};

function getCategoryColor(accountName: string): string {
  for (const [key, color] of Object.entries(ACCOUNT_COLORS)) {
    if (accountName.startsWith(key)) return color;
  }
  return '#94a3b8';
}

function fmtOk(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(2)}억`;
  return `${sign}${(abs / 10_000).toFixed(0)}만`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomBarLabel({ x, y, width, height, payload }: any) {
  if (!payload || payload.executionRate == null) return null;
  const d = payload as AccountSummary;
  return (
    <text
      x={Number(x) + Number(width) + 6}
      y={Number(y) + Number(height) / 2}
      fill="#94a3b8"
      fontSize={11}
      dominantBaseline="middle"
    >
      {`${d.executionRate.toFixed(1)}%`}
    </text>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as AccountSummary;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs space-y-1 shadow-xl">
      <p className="font-semibold text-slate-200">{d.accountName}</p>
      <p className="text-slate-400">예산: <span className="text-white">{fmtOk(d.totalPlanY)}</span></p>
      <p className="text-slate-400">실적: <span className="text-white">{fmtOk(d.totalActualY)}</span></p>
      <p className="text-slate-400">집행률: <span className="text-white font-semibold">{d.executionRate.toFixed(1)}%</span></p>
      <p className="text-slate-500 pt-1">클릭하면 부서별 상세 표시</p>
    </div>
  );
}

export default function AccountChart({ accounts }: Props) {
  const [selected, setSelected] = useState<AccountSummary | null>(null);

  // Top 10 by actual amount
  const top10 = [...accounts]
    .sort((a, b) => b.totalActualY - a.totalActualY)
    .slice(0, 10);

  const chartData = top10.map((a) => ({
    ...a,
    name: a.accountName.length > 14 ? a.accountName.slice(0, 14) + '…' : a.accountName,
  }));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">계정별 집행 현황 <span className="text-slate-500 font-normal">Top 10</span></h2>
        <p className="text-xs text-slate-500 mt-0.5">집행 금액 높은 순 · 바 클릭 → 부서별 상세</p>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={top10.length * 32 + 20}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 0, right: 130, left: 140, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 'auto']}
              tickFormatter={(v) => fmtOk(v)}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={135}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
            />
            <Bar
              dataKey="totalActualY"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(data) => setSelected(data as unknown as AccountSummary)}
              label={<CustomBarLabel />}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.accountCode}
                  fill={getCategoryColor(entry.accountName)}
                  opacity={selected && selected.accountCode !== entry.accountCode ? 0.4 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 부서별 상세 패널 */}
      {selected && (
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">{selected.accountName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                전체 실적 {fmtOk(selected.totalActualY)} · 집행률 {selected.executionRate.toFixed(1)}%
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1"
            >
              ✕ 닫기
            </button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {selected.byDept.filter((d) => d.totalActualY > 0).map((dept, i) => {
              const maxActual = selected.byDept[0]?.totalActualY || 1;
              const barWidth = (dept.totalActualY / maxActual) * 100;
              return (
                <div key={dept.deptCode} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-4 tabular-nums">{i + 1}</span>
                  <span className="text-xs text-slate-300 w-28 shrink-0 truncate">{dept.deptName}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${barWidth}%` }} />
                  </div>
                  <span className="text-xs text-slate-200 tabular-nums w-16 text-right">{fmtOk(dept.totalActualY)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
