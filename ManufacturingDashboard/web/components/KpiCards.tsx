'use client';

import { KpiSummary, MonthlyPoint, fmt } from '@/lib/aggregate';

interface Props {
  kpi: KpiSummary;
  label: string;
  cumulPoint?: MonthlyPoint | null; // 월 누적 (연간 사업계획 기반)
  onBalanceClick: () => void;
}

function diffColor(diff: number) {
  return diff > 0 ? 'text-red-400' : diff < 0 ? 'text-blue-400' : 'text-slate-400';
}

function rateColor(rate: number) {
  if (rate >= 90) return 'bg-red-500';
  if (rate >= 70) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function SummaryCard({
  title,
  actual,
  plan,
  rate,
  diff,
  diffLabel,
  sub,
  onClick,
  disabled,
}: {
  title: string;
  actual: number;
  plan: number;
  rate: number;
  diff: number;
  diffLabel?: string;
  sub?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`bg-slate-800 border rounded-xl p-5 flex flex-col gap-3 transition-colors
        ${onClick ? 'border-slate-600 cursor-pointer hover:border-blue-500/60 hover:bg-slate-700/50' : 'border-slate-700'}
        ${disabled ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">{title}</span>
        {onClick && <span className="text-[10px] text-blue-400">상세 ▶</span>}
        {disabled && <span className="text-[10px] text-slate-600">사업계획 파일 필요</span>}
      </div>

      {/* 실적 / 예산  집행률 */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white tabular-nums">{fmt(actual, true)}</span>
        <span className="text-sm text-slate-500">/</span>
        <span className="text-base text-slate-400 tabular-nums">{fmt(plan, true)}</span>
        <span className={`ml-auto text-xl font-bold tabular-nums ${
          rate >= 90 ? 'text-red-400' : rate >= 70 ? 'text-yellow-400' : 'text-emerald-400'
        }`}>
          {rate.toFixed(1)}%
        </span>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${rateColor(rate)}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>

      {/* 계획 대비 */}
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${diffColor(diff)}`}>
          계획 대비 {diff > 0 ? '▲' : diff < 0 ? '▼' : ''} {fmt(Math.abs(diff), true)}
        </span>
        {sub && <span className="text-slate-500">{sub}</span>}
      </div>

      {diffLabel && <p className="text-xs text-slate-500">{diffLabel}</p>}
    </div>
  );
}

export default function KpiCards({ kpi, label, cumulPoint, onBalanceClick }: Props) {
  const hasCumul = cumulPoint != null;
  const cumulDiff = hasCumul ? (cumulPoint!.cumulActual ?? 0) - cumulPoint!.cumulPlan : 0;
  const cumulRate = hasCumul && cumulPoint!.cumulPlan
    ? ((cumulPoint!.cumulActual ?? 0) / cumulPoint!.cumulPlan) * 100
    : 0;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{label} 기준 · 임원예산 제외</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 연간 */}
        <SummaryCard
          title="연간 누적 집행"
          actual={kpi.totalActualY}
          plan={kpi.totalPlanY}
          rate={kpi.executionRateY}
          diff={kpi.diffY}
          sub={`가용 ${fmt(kpi.availableY, true)}`}
        />

        {/* 당월 */}
        <SummaryCard
          title="당월 집행"
          actual={kpi.totalActualM}
          plan={kpi.totalPlanM}
          rate={kpi.executionRateM}
          diff={kpi.diffM}
          sub={`잔액 ${fmt(kpi.budgetBalanceM, true)}`}
          onClick={onBalanceClick}
        />

        {/* 월 누적 (사업계획 기반) */}
        <SummaryCard
          title={hasCumul ? `월 누적 집행 (${cumulPoint!.month}월 기준)` : '월 누적 집행'}
          actual={hasCumul ? (cumulPoint!.cumulActual ?? 0) : 0}
          plan={hasCumul ? cumulPoint!.cumulPlan : 0}
          rate={cumulRate}
          diff={cumulDiff}
          diffLabel={hasCumul ? '연간 사업계획 기준 누적 비교' : undefined}
          disabled={!hasCumul}
        />
      </div>
    </div>
  );
}
