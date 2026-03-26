'use client';

import { SalesQuarterlySummary, fmtSales } from '@/lib/salesAggregate';

interface Props {
  quarters: SalesQuarterlySummary[];
  hasPrev: boolean;
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

/** 달성/예상 바 — 100% 초과 시 overflow 세그먼트 표시 */
function RateBar({ rate, color }: { rate: number; color: string }) {
  const capped = Math.min(rate, 100);
  const overflow = rate > 100;
  return (
    <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${capped}%` }} />
      {overflow && (
        /* 100% 초과분: 오른쪽 끝에 밝은 표시 */
        <div className="absolute right-0 top-0 h-full w-2 rounded-r-full bg-emerald-300 opacity-80" />
      )}
    </div>
  );
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
            {/* 분기 헤더 + 실적/계획 */}
            <div className="flex items-start justify-between gap-1">
              <span className="text-xs font-bold text-slate-300 tracking-wide pt-0.5">{q.label}</span>
              <span className="text-xs tabular-nums text-right leading-snug">
                <span className="text-slate-200 font-semibold">{fmtSales(q.actual, true)}</span>
                <span className="text-slate-600 mx-0.5">/</span>
                <span className="text-slate-500">{fmtSales(q.plan, true)}</span>
              </span>
            </div>

            {/* 달성률 바 + % */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <RateBar rate={q.achievementRate} color={barColor(q.achievementRate)} />
              </div>
              <span className={`text-xs font-bold tabular-nums w-12 text-right shrink-0 ${rateColor(q.achievementRate)}`}>
                {q.achievementRate.toFixed(1)}%
              </span>
            </div>

            {/* 예상마감 바 + % */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>예상마감</span>
                <span className="tabular-nums text-right leading-snug">
                  <span className={`font-semibold ${rateColor(q.forecastRate)}`}>{fmtSales(q.forecast, true)}</span>
                  <span className="text-slate-600 mx-0.5">/</span>
                  <span className="text-slate-500">{fmtSales(q.plan, true)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <RateBar rate={q.forecastRate} color={`${barColor(q.forecastRate)} opacity-60`} />
                </div>
                <span className={`text-xs tabular-nums w-12 text-right shrink-0 ${rateColor(q.forecastRate)}`}>
                  {q.forecastRate.toFixed(1)}%
                </span>
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
