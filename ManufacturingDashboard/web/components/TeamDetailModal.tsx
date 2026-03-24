'use client';

import { useEffect } from 'react';
import { TeamAccountItem, fmt } from '@/lib/aggregate';

interface Props {
  deptName: string;
  items: TeamAccountItem[];
  onClose: () => void;
}

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 90 ? 'bg-red-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';
  const textColor = rate >= 90 ? 'text-red-400' : rate >= 70 ? 'text-yellow-400' : 'text-emerald-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={`text-xs tabular-nums ${textColor}`}>{rate.toFixed(1)}%</span>
    </div>
  );
}

export default function TeamDetailModal({ deptName, items, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const totalPlanY = items.reduce((s, i) => s + i.totalPlanY, 0);
  const totalActualY = items.reduce((s, i) => s + i.totalActualY, 0);
  const totalAvailableY = items.reduce((s, i) => s + i.availableY, 0);
  const totalPlanM = items.reduce((s, i) => s + i.totalPlanM, 0);
  const totalActualM = items.reduce((s, i) => s + i.actualSumM, 0);
  const totalBalanceM = items.reduce((s, i) => s + i.budgetBalance, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-base font-bold text-white">{deptName} — 계정별 상세</h2>
            <p className="text-xs text-slate-400 mt-0.5">연간 예산 대비 집행 현황 · 실적 금액 높은 순</p>
          </div>
          <div className="flex gap-6 text-right text-xs text-slate-400">
            <div>
              <p>연간예산</p>
              <p className="text-sm font-bold text-slate-200 tabular-nums">{fmt(totalPlanY)}</p>
            </div>
            <div>
              <p>연간실적</p>
              <p className="text-sm font-bold text-blue-300 tabular-nums">{fmt(totalActualY)}</p>
            </div>
            <div>
              <p>가용잔액</p>
              <p className="text-sm font-bold text-emerald-300 tabular-nums">{fmt(totalAvailableY)}</p>
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
              <tr className="text-xs text-slate-400">
                <th className="py-2 pl-5 pr-3 font-medium whitespace-nowrap">예산계정</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap">연간예산</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap">연간실적</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">집행률(Y)</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap">가용잔액</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap border-l-2 border-blue-500/30">당월예산</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap">당월실적</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">집행률(M)</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap">당월잔액</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={item.accountCode}
                  className={`border-t border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-700/15'}`}
                >
                  <td className="py-2.5 pl-5 pr-3 text-sm text-slate-200 whitespace-nowrap">{item.accountName}</td>
                  <td className="py-2.5 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap">{fmt(item.totalPlanY, true)}</td>
                  <td className="py-2.5 px-3 text-right text-sm text-slate-200 tabular-nums whitespace-nowrap font-medium">{fmt(item.totalActualY, true)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap"><RateBar rate={item.executionRateY} /></td>
                  <td className="py-2.5 px-3 text-right text-sm text-emerald-300 tabular-nums whitespace-nowrap">{fmt(item.availableY, true)}</td>
                  <td className="py-2.5 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap border-l-2 border-blue-500/30">{fmt(item.totalPlanM, true)}</td>
                  <td className="py-2.5 px-3 text-right text-sm text-slate-200 tabular-nums whitespace-nowrap">{fmt(item.actualSumM, true)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap"><RateBar rate={item.executionRateM} /></td>
                  <td className={`py-2.5 px-3 text-right text-sm tabular-nums whitespace-nowrap font-medium ${item.budgetBalance > 0 ? 'text-blue-300' : 'text-slate-500'}`}>
                    {fmt(item.budgetBalance, true)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* 합계 행 */}
            <tfoot className="sticky bottom-0 bg-slate-800 border-t-2 border-slate-600">
              <tr className="text-xs font-bold text-slate-200">
                <td className="py-2.5 pl-5 pr-3 whitespace-nowrap">합계</td>
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">{fmt(totalPlanY, true)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-blue-300">{fmt(totalActualY, true)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <RateBar rate={totalPlanY ? (totalActualY / totalPlanY) * 100 : 0} />
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-emerald-300">{fmt(totalAvailableY, true)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap border-l-2 border-blue-500/30">{fmt(totalPlanM, true)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">{fmt(totalActualM, true)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <RateBar rate={totalPlanM ? (totalActualM / totalPlanM) * 100 : 0} />
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-blue-300">{fmt(totalBalanceM, true)}</td>
              </tr>
            </tfoot>
          </table>

          {items.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm">데이터가 없습니다.</div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <span>총 {items.length}개 계정</span>
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-1.5 rounded-lg transition-colors"
          >
            닫기 (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
