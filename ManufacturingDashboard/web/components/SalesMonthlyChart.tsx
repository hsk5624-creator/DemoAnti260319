'use client';

import { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  SalesMonthlyPoint, MonthDetailRow,
  getSalesMonthDetail, fmtSales,
} from '@/lib/salesAggregate';
import { SalesRow } from '@/lib/salesTypes';

interface Props {
  data: SalesMonthlyPoint[];
  refMonth: number;
  rows: SalesRow[];
  year: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs space-y-1 shadow-xl">
      <p className="font-semibold text-slate-200">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmtSales(p.value, true)}
        </p>
      ))}
      <p className="text-slate-500 pt-0.5">클릭 → 항목별 상세</p>
    </div>
  );
}

function rateColor(rate: number) {
  if (rate >= 100) return 'text-emerald-400';
  if (rate >= 80)  return 'text-blue-400';
  if (rate >= 60)  return 'text-yellow-400';
  return 'text-red-400';
}

function barBg(rate: number) {
  if (rate >= 100) return 'bg-emerald-500';
  if (rate >= 80)  return 'bg-blue-500';
  if (rate >= 60)  return 'bg-yellow-500';
  return 'bg-red-500';
}

function DetailPanel({
  month, items, onClose,
}: {
  month: number;
  items: MonthDetailRow[];
  onClose: () => void;
}) {
  return (
    <div className="border-t border-slate-700 mt-2">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div>
          <span className="text-sm font-semibold text-slate-200">{month}월 항목별 상세</span>
          <span className="text-xs text-slate-500 ml-2">계획 대비 실적·예상마감</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 transition-colors"
        >
          ✕ 닫기
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-slate-500 border-t border-slate-700/50">
              <th className="py-1.5 pl-4 pr-3 font-medium">항목</th>
              <th className="py-1.5 px-3 text-right font-medium whitespace-nowrap">계획</th>
              <th className="py-1.5 px-3 text-right font-medium whitespace-nowrap">실적</th>
              <th className="py-1.5 px-3 font-medium whitespace-nowrap">달성률</th>
              <th className="py-1.5 px-3 text-right font-medium whitespace-nowrap">예상마감</th>
              <th className="py-1.5 px-3 font-medium whitespace-nowrap">예상달성률</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => {
              const indent =
                row.level === 'category' ? 'pl-4' :
                row.level === 'group'    ? 'pl-8' :
                                           'pl-12';
              const textClass =
                row.level === 'category' ? 'text-slate-100 font-semibold' :
                row.level === 'group'    ? 'text-slate-200 font-medium' :
                                           'text-slate-400';
              const bgClass =
                row.level === 'category' ? 'bg-slate-700/40 border-t border-slate-600' :
                row.level === 'group'    ? 'border-t border-slate-700/50' :
                                           'border-t border-slate-700/30';

              return (
                <tr key={i} className={bgClass}>
                  <td className={`py-2 pr-3 text-sm ${indent} ${textClass} whitespace-nowrap`}>
                    {row.level === 'item' && <span className="text-slate-600 mr-1.5">└</span>}
                    {row.name}
                  </td>
                  <td className="py-2 px-3 text-right text-sm text-slate-400 tabular-nums whitespace-nowrap">
                    {fmtSales(row.plan, true)}
                  </td>
                  <td className="py-2 px-3 text-right text-sm text-slate-200 tabular-nums whitespace-nowrap font-medium">
                    {fmtSales(row.actual, true)}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barBg(row.achievementRate)}`}
                          style={{ width: `${Math.min(row.achievementRate, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs tabular-nums ${rateColor(row.achievementRate)}`}>
                        {row.achievementRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-sm text-blue-300 tabular-nums whitespace-nowrap">
                    {fmtSales(row.forecast, true)}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barBg(row.forecastRate)}`}
                          style={{ width: `${Math.min(row.forecastRate, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs tabular-nums ${rateColor(row.forecastRate)}`}>
                        {row.forecastRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SalesMonthlyChart({ data, refMonth, rows, year }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const detailItems = selectedMonth
    ? getSalesMonthDetail(rows, year, selectedMonth)
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = (barData: any) => {
    const month = barData?.month as number;
    if (!month) return;
    setSelectedMonth((prev) => (prev === month ? null : month));
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">월별 계획 대비 실적/예상마감</h2>
        <p className="text-xs text-slate-500 mt-0.5">막대 클릭 → 항목별 상세 · 실선: 계획 · 점선: 예상마감</p>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 24, left: 16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => fmtSales(v, true)}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />
            {refMonth > 0 && (
              <ReferenceLine
                x={`${refMonth}월`}
                stroke="#6366f1"
                strokeDasharray="4 2"
                label={{ value: '기준', fill: '#6366f1', fontSize: 10, position: 'top' }}
              />
            )}
            <Bar
              dataKey="actual"
              name="매출실적"
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
              cursor="pointer"
              onClick={handleBarClick}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={selectedMonth === entry.month ? '#60a5fa' : '#3b82f6'}
                  opacity={selectedMonth && selectedMonth !== entry.month ? 0.45 : 1}
                />
              ))}
            </Bar>
            <Line
              dataKey="forecast"
              name="예상마감"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ fill: '#10b981', r: 3 }}
              type="monotone"
            />
            <Line
              dataKey="plan"
              name="사업계획"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {selectedMonth && detailItems.length > 0 && (
        <DetailPanel
          month={selectedMonth}
          items={detailItems}
          onClose={() => setSelectedMonth(null)}
        />
      )}
    </div>
  );
}
