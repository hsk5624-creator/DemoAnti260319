'use client';

import { SalesKpi, fmtSales } from '@/lib/salesAggregate';

interface Props {
  kpi: SalesKpi;
  year: number;
  label: string;
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

function diffColor(diff: number) {
  if (diff > 0) return 'text-emerald-400';
  if (diff < 0) return 'text-red-400';
  return 'text-slate-500';
}

function KpiCard({
  title, actual, plan, rate, sub, extra,
}: {
  title: string;
  actual: number;
  plan: number;
  rate: number;
  sub?: string;
  extra?: React.ReactNode;
}) {
  const diff = actual - plan;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
      <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">{title}</span>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white tabular-nums">{fmtSales(actual, true)}</span>
        <span className="text-sm text-slate-500">/</span>
        <span className="text-base text-slate-400 tabular-nums">{fmtSales(plan, true)}</span>
        <span className={`ml-auto text-xl font-bold tabular-nums ${rateColor(rate)}`}>
          {rate.toFixed(1)}%
        </span>
      </div>

      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(rate)}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${diffColor(diff)}`}>
          계획 대비 {diff > 0 ? '▲' : diff < 0 ? '▼' : ''} {fmtSales(Math.abs(diff), true)}
        </span>
        {sub && <span className="text-slate-500">{sub}</span>}
      </div>

      {extra}
    </div>
  );
}

export default function SalesKpiCards({ kpi, year, label, hasPrev }: Props) {
  const gapColor = kpi.gap > 0 ? 'text-emerald-400' : kpi.gap < 0 ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{year}년 · {label} 기준</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 연간 달성률 */}
        <KpiCard
          title="연간 매출 달성률"
          actual={kpi.actual}
          plan={kpi.plan}
          rate={kpi.achievementRate}
          sub={`실적 집계 ${kpi.actualMonths}개월`}
        />

        {/* 예상마감 달성률 */}
        <KpiCard
          title="예상마감 달성률"
          actual={kpi.forecast}
          plan={kpi.plan}
          rate={kpi.forecastRate}
          sub="예상마감 / 사업계획"
        />

        {/* 전주 대비 Gap */}
        <div className={`bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-3 ${!hasPrev ? 'opacity-40' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">전주 대비 Gap</span>
            {!hasPrev && <span className="text-[10px] text-slate-600">이전 파일 필요</span>}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${gapColor}`}>
              {kpi.gap > 0 ? '+' : ''}{fmtSales(kpi.gap, true)}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            전주 예상실적 {fmtSales(kpi.prevForecast, true)} 대비
          </p>
          <div className="text-xs space-y-0.5">
            <div className="flex justify-between text-slate-400">
              <span>이번 주 예상마감</span>
              <span className="text-slate-200 tabular-nums">{fmtSales(kpi.forecast, true)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>전주 예상실적</span>
              <span className="text-slate-200 tabular-nums">{fmtSales(kpi.prevForecast, true)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
