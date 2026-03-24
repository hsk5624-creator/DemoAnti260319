'use client';

import { SalesQuarterlySummary, fmtSales } from '@/lib/salesAggregate';

interface Props {
  quarters: SalesQuarterlySummary[];
  hasPrev: boolean; // 전주 파일 유무 (Gap 표시 여부)
}

function rateColor(rate: number) {
  if (rate >= 100) return 'text-emerald-400';
  if (rate >= 80)  return 'text-blue-400';
  if (rate >= 60)  return 'text-yellow-400';
  return 'text-red-400';
}

function barColor(rate: number) {
  if (rate >= 100) return 'bg-emerald-500';
  if (rate >= 80)  return 'bg-blue-500';
  if (rate >= 60)  return 'bg-yellow-500';
  return 'bg-red-500';
}

function gapColor(gap: number) {
  if (gap > 0) return 'text-emerald-400';
  if (gap < 0) return 'text-red-400';
  return 'text-slate-500';
}

export default function SalesQuarterlyCards({ quarters, hasPrev }: Props) {
  if (!quarters.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 font-medium">분기별 달성률</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quarters.map((q) => (
          <div
            key={q.quarter}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-2.5"
          >
            {/* 분기 헤더 */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 tracking-wide">{q.label}</span>
              <span className={`text-base font-bold tabular-nums ${rateColor(q.achievementRate)}`}>
                {q.achievementRate.toFixed(1)}%
              </span>
            </div>

            {/* 진행 바 */}
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor(q.achievementRate)}`}
                style={{ width: `${Math.min(q.achievementRate, 100)}%` }}
              />
            </div>

            {/* 실적 / 계획 */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>실적</span>
                <span className="text-slate-200 tabular-nums font-medium">{fmtSales(q.actual, true)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>계획</span>
                <span className="text-slate-400 tabular-nums">{fmtSales(q.plan, true)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>예상마감</span>
                <span className={`tabular-nums ${rateColor(q.forecastRate)}`}>{fmtSales(q.forecast, true)}</span>
              </div>
            </div>

            {/* 전주 Gap */}
            {hasPrev && (
              <div className="border-t border-slate-700 pt-2 flex justify-between text-xs text-slate-500">
                <span>전주 Gap</span>
                <span className={`tabular-nums font-medium ${gapColor(q.gap)}`}>
                  {q.gap > 0 ? '+' : ''}{fmtSales(q.gap, true)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
