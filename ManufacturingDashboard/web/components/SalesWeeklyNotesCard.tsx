'use client';

import { WeeklyNote } from '@/lib/salesTypes';
import { fmtSales } from '@/lib/salesAggregate';

interface Props {
  notes: WeeklyNote[];
  label: string;
  gap?: number;
  hasPrev?: boolean;
}

export default function SalesWeeklyNotesCard({ notes, label, gap, hasPrev }: Props) {
  if (!notes.length) return null;

  const gapColor = gap != null && gap > 0 ? 'text-emerald-400' : gap != null && gap < 0 ? 'text-red-400' : 'text-slate-400';
  const gapStr = gap != null && hasPrev
    ? `전주 대비 합계 ${gap > 0 ? '+' : ''}${fmtSales(gap, true)}`
    : null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-sm font-semibold text-slate-200">전주 대비 특이사항</h2>
        <span className="text-xs text-slate-500">{label} 기준</span>
      </div>
      {gapStr && (
        <p className={`text-xs font-bold tabular-nums mb-3 ${gapColor}`}>{gapStr}</p>
      )}
      {!gapStr && <div className="mb-3" />}
      <div className="space-y-1">
        {notes.map((n, i) => {
          const deltaStr = n.delta != null && !isNaN(n.delta) && n.delta !== 0
            ? `${n.delta > 0 ? '+' : ''}${n.delta.toFixed(1)}억`
            : null;
          const deltaColor = n.delta && n.delta > 0 ? 'text-emerald-400' : 'text-red-400';

          if (n.level === 'parent') {
            return (
              <div key={i} className={`flex items-baseline gap-2 ${i > 0 ? 'mt-3' : ''}`}>
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">{n.category}</span>
                {deltaStr && <span className={`text-xs font-bold tabular-nums ${deltaColor}`}>{deltaStr}</span>}
                {n.note && <span className="text-xs text-slate-400 whitespace-pre-wrap">{n.note}</span>}
              </div>
            );
          }

          return (
            <div key={i} className="flex gap-3 text-xs pl-3 border-l border-slate-700">
              <div className="shrink-0 flex items-baseline gap-1.5 w-32">
                <span className="text-violet-400 font-medium">{n.category}</span>
                {deltaStr && <span className={`${deltaColor} font-semibold tabular-nums`}>{deltaStr}</span>}
              </div>
              {n.note && <span className="text-slate-300 whitespace-pre-wrap leading-relaxed">{n.note}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
