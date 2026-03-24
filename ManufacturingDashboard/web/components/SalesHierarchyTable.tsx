'use client';

import { useState } from 'react';
import { SalesItemSummary, fmtSales } from '@/lib/salesAggregate';

interface Props {
  root: SalesItemSummary;
}

function rateStyle(rate: number) {
  if (rate >= 100) return 'text-emerald-400 font-bold';
  if (rate >= 80)  return 'text-blue-400 font-semibold';
  if (rate >= 60)  return 'text-yellow-400 font-semibold';
  return 'text-red-400 font-bold';
}

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 100 ? 'bg-emerald-500' : rate >= 80 ? 'bg-blue-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={`text-xs tabular-nums ${rateStyle(rate)}`}>{rate.toFixed(1)}%</span>
    </div>
  );
}

function GapCell({ gap }: { gap: number }) {
  const color = gap > 0 ? 'text-emerald-400' : gap < 0 ? 'text-red-400' : 'text-slate-500';
  return (
    <span className={`tabular-nums ${color}`}>
      {gap > 0 ? '+' : ''}{fmtSales(gap, true)}
    </span>
  );
}

interface RowProps {
  item: SalesItemSummary;
  depth: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
}

function HRow({ item, depth, expanded, onToggle }: RowProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expanded.has(item.key);

  const bgClass =
    item.level === 'total'    ? 'bg-slate-600/80 border-t-2 border-slate-500' :
    item.level === 'category' ? 'bg-slate-700/60 border-t border-slate-600' :
    item.level === 'group'    ? 'border-t border-slate-700/70' :
    'border-t border-slate-700/40 bg-slate-800/20';

  const textClass =
    item.level === 'total'    ? 'text-white font-bold text-sm' :
    item.level === 'category' ? 'text-slate-100 font-semibold text-sm' :
    item.level === 'group'    ? 'text-slate-200 font-medium text-sm' :
    'text-slate-300 text-sm';

  const indent = depth * 16;

  return (
    <>
      <tr
        className={`${bgClass} ${hasChildren ? 'cursor-pointer hover:brightness-110' : ''} transition-colors`}
        onClick={() => hasChildren && onToggle(item.key)}
      >
        <td className="py-2.5 pr-3 whitespace-nowrap" style={{ paddingLeft: `${16 + indent}px` }}>
          <span className={textClass}>
            {hasChildren && (
              <span className="mr-1.5 text-slate-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
            )}
            {!hasChildren && <span className="mr-3 text-slate-600 text-xs">└</span>}
            {item.name}
          </span>
        </td>
        <td className="py-2.5 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap font-medium">
          {fmtSales(item.plan, true)}
        </td>
        <td className="py-2.5 px-3 text-right text-sm text-slate-200 tabular-nums whitespace-nowrap font-medium">
          {fmtSales(item.actual, true)}
        </td>
        <td className="py-2.5 px-3 text-right text-sm text-blue-300 tabular-nums whitespace-nowrap">
          {fmtSales(item.forecast, true)}
        </td>
        <td className="py-2.5 px-3 whitespace-nowrap">
          <RateBar rate={item.achievementRate} />
        </td>
        <td className="py-2.5 px-3 whitespace-nowrap">
          <RateBar rate={item.forecastRate} />
        </td>
        <td className="py-2.5 px-3 text-right text-sm whitespace-nowrap">
          <GapCell gap={item.gap} />
        </td>
      </tr>
      {isExpanded && item.children?.map((child) => (
        <HRow key={child.key} item={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  );
}

export default function SalesHierarchyTable({ root }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['total', 'chem', 'bio', 'dev']) // 기본 펼침
  );

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">CMO 매출 구조별 현황</h2>
        <p className="text-xs text-slate-500 mt-0.5">항목 클릭 → 하위 항목 펼치기</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-slate-700">
              <th className="py-2 pl-4 pr-3 font-medium whitespace-nowrap">항목</th>
              <th className="py-2 px-3 text-right font-medium whitespace-nowrap">사업계획</th>
              <th className="py-2 px-3 text-right font-medium whitespace-nowrap">매출실적</th>
              <th className="py-2 px-3 text-right font-medium whitespace-nowrap">예상마감</th>
              <th className="py-2 px-3 font-medium whitespace-nowrap">달성률(실적)</th>
              <th className="py-2 px-3 font-medium whitespace-nowrap">달성률(예상)</th>
              <th className="py-2 px-3 text-right font-medium whitespace-nowrap">전주 Gap</th>
            </tr>
          </thead>
          <tbody>
            <HRow item={root} depth={0} expanded={expanded} onToggle={toggle} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
