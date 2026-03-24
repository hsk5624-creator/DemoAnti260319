'use client';

import { useEffect } from 'react';
import { BalanceItem, fmt } from '@/lib/aggregate';

interface Props {
  items: BalanceItem[];
  totalBalance: number;
  label: string;
  onClose: () => void;
}

function rateColor(rate: number) {
  if (rate >= 90) return 'text-red-400';
  if (rate >= 70) return 'text-yellow-400';
  return 'text-emerald-400';
}

export default function BalanceModal({ items, totalBalance, label, onClose }: Props) {
  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-base font-bold text-white">당월 미집행 예산 상세</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {label} 기준 · 예산 대비 미집행 항목 (잔액 큰 순)
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">총 잔액</p>
            <p className="text-lg font-bold text-blue-300">{fmt(totalBalance)}</p>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
              <tr className="text-xs text-slate-400">
                <th className="py-2 pl-5 pr-3 font-medium whitespace-nowrap">부서</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">예산계정</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap">당월예산</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap">당월실적</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">집행률</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap">잔액</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={`${item.deptCode}_${item.accountCode}`}
                  className={`border-t border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-700/20'}`}
                >
                  <td className="py-2.5 pl-5 pr-3 text-sm text-slate-200 whitespace-nowrap">{item.deptName}</td>
                  <td className="py-2.5 px-3 text-sm text-slate-300 whitespace-nowrap">{item.accountName}</td>
                  <td className="py-2.5 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap">
                    {fmt(item.totalPlanM, true)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap">
                    {fmt(item.actualSumM, true)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.executionRateM >= 90 ? 'bg-red-500' : item.executionRateM >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(item.executionRateM, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs tabular-nums ${rateColor(item.executionRateM)}`}>
                        {item.executionRateM.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm font-semibold text-blue-300 tabular-nums whitespace-nowrap">
                    {fmt(item.budgetBalance, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm">
              미집행 항목이 없습니다.
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <span>총 {items.length}개 항목</span>
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
