'use client';

import React, { useState } from 'react';
import { SalesRow } from '@/lib/salesTypes';
import { getSalesSummaryMatrix, SalesSummaryRow, MonthlyCellData } from '@/lib/salesAggregate';

type Metric = 'actual' | 'plan' | 'forecast' | 'gap';

/** 억원 단위 숫자만 반환 (단위 표기 없음, 소수점 1자리 고정) */
function fmtAeok(v: number): string {
  if (v === 0) return '—';
  const sign = v < 0 ? '-' : '';
  return `${sign}${(Math.abs(v) / 100_000_000).toFixed(1)}`;
}

const QUARTERS = [1, 2, 3, 4] as const;

function filterVisible(rows: SalesSummaryRow[], collapsed: Set<string>): SalesSummaryRow[] {
  const result: SalesSummaryRow[] = [];
  const ancestors: string[] = [];
  for (const row of rows) {
    while (ancestors.length > row.depth) ancestors.pop();
    if (!ancestors.some((k) => collapsed.has(k))) result.push(row);
    ancestors[row.depth] = row.key;
  }
  return result;
}

function Cell({ v, isTotal, isGap }: { v: number; isTotal: boolean; isGap?: boolean }) {
  if (isGap) {
    const color = v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-600';
    return <span className={color}>{v === 0 ? '—' : `${v > 0 ? '+' : ''}${fmtAeok(v)}`}</span>;
  }
  return (
    <span className={v === 0 ? 'text-slate-600' : isTotal ? 'text-white' : 'text-slate-200'}>
      {fmtAeok(v)}
    </span>
  );
}

function cellValue(cell: MonthlyCellData, metric: Metric): number {
  if (metric === 'gap') return cell.forecast - cell.plan;
  return cell[metric];
}

export default function SalesSummaryTable({ rows, year }: { rows: SalesRow[]; year: number }) {
  const [metric, setMetric] = useState<Metric>('gap');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const allRows = getSalesSummaryMatrix(rows, year);

  // 개발용역 하위 아이템(depth 3) 키 수집 — 그룹까지만 표시
  const devItemKeys = new Set<string>();
  let inDevSection = false;
  for (const row of allRows) {
    if (row.level === 'category') inDevSection = row.key === 'dev';
    if (row.level === 'item' && inDevSection) devItemKeys.add(row.key);
  }

  const visible = filterVisible(allRows, collapsed).filter((row) => !devItemKeys.has(row.key));

  // 개발용역 카테고리 및 그 하위 그룹은 접기/펼치기 불가
  const canExpand = (row: SalesSummaryRow) =>
    row.level !== 'item' && row.key !== 'dev' && !row.key.startsWith('dev_');

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-baseline gap-3">
          <h3 className="text-sm font-semibold text-slate-200">월별 · 분기별 매출 현황</h3>
          <span className="text-[11px] text-slate-500">(단위: 억원)</span>
        </div>
        <div className="flex gap-1">
          {(['gap', 'forecast', 'actual', 'plan'] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                metric === m
                  ? m === 'gap' ? 'bg-violet-600 text-white' : 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {m === 'plan' ? '사업계획' : m === 'actual' ? '매출실적' : m === 'forecast' ? '예상마감' : 'Gap (예상−계획)'}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: '1100px' }}>
          <thead>
            {/* Q label row */}
            <tr className="bg-slate-900 border-b border-slate-700/50">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 bg-slate-900 border-r border-slate-700 text-left px-3 py-2 text-slate-400 font-medium"
                style={{ width: '190px', minWidth: '190px' }}
              >
                항목
              </th>
              {QUARTERS.map((q) => (
                <th
                  key={q}
                  colSpan={4}
                  className="text-center px-2 py-1.5 text-slate-300 font-semibold border-l border-slate-700/60"
                >
                  {q}분기
                </th>
              ))}
              <th
                rowSpan={2}
                className="text-right px-3 py-2 text-white font-bold bg-slate-700/40 border-l border-slate-600"
                style={{ width: '72px', minWidth: '72px' }}
              >
                연간
              </th>
            </tr>
            {/* Month label row */}
            <tr className="bg-slate-900 border-b border-slate-700">
              {QUARTERS.map((q) => (
                <React.Fragment key={q}>
                  {[1, 2, 3].map((mo) => (
                    <th
                      key={mo}
                      className="text-right px-2 py-1 text-slate-500 font-normal border-l border-slate-700/40"
                      style={{ width: '56px', minWidth: '56px' }}
                    >
                      {(q - 1) * 3 + mo}월
                    </th>
                  ))}
                  <th
                    className="text-right px-2 py-1 text-slate-300 font-semibold bg-slate-800/80 border-l border-slate-600/60"
                    style={{ width: '64px', minWidth: '64px' }}
                  >
                    소계
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {visible.map((row) => {
              const canToggle = canExpand(row);
              const isCollapsed = collapsed.has(row.key);
              const isTotal = row.level === 'total';

              const rowCls =
                row.level === 'total'    ? 'bg-slate-700/50 border-t-2 border-slate-500' :
                row.level === 'category' ? 'bg-slate-700/20 border-t border-slate-600/60' :
                row.level === 'group'    ? 'border-t border-slate-700/40' :
                                           'border-t border-slate-700/20';

              const stickyBg =
                row.level === 'total'    ? 'bg-slate-700' :
                row.level === 'category' ? 'bg-[#263244]' :
                                           'bg-slate-800';

              const nameCls =
                row.level === 'total'    ? 'text-white font-bold text-[13px]' :
                row.level === 'category' ? 'text-slate-100 font-semibold' :
                row.level === 'group'    ? 'text-slate-300 font-medium' :
                                           'text-slate-400';

              return (
                <tr key={row.key} className={`${rowCls} hover:bg-slate-700/20 transition-colors`}>
                  {/* Sticky name */}
                  <td className={`sticky left-0 z-10 border-r border-slate-700 px-2 py-1.5 ${stickyBg}`}>
                    <div
                      className={`flex items-center gap-1.5 ${canToggle ? 'cursor-pointer' : ''}`}
                      style={{ paddingLeft: `${row.depth * 10}px` }}
                      onClick={() => canToggle && toggle(row.key)}
                    >
                      {canToggle ? (
                        <span className="text-slate-500 text-[9px] w-2.5 flex-shrink-0">
                          {isCollapsed ? '▶' : '▼'}
                        </span>
                      ) : (
                        <span className="w-2.5 flex-shrink-0" />
                      )}
                      <span className={nameCls}>{row.name}</span>
                    </div>
                  </td>

                  {/* Monthly + quarterly */}
                  {QUARTERS.map((q) => (
                    <React.Fragment key={q}>
                      {[0, 1, 2].map((mo) => {
                        const v = cellValue(row.months[(q - 1) * 3 + mo], metric);
                        return (
                          <td
                            key={mo}
                            className="text-right px-2 py-1.5 tabular-nums border-l border-slate-700/20"
                          >
                            <Cell v={v} isTotal={isTotal} isGap={metric === 'gap'} />
                          </td>
                        );
                      })}
                      <td className="text-right px-2 py-1.5 tabular-nums font-medium bg-slate-700/20 border-l border-slate-600/40">
                        <Cell v={cellValue(row.quarters[q - 1], metric)} isTotal={isTotal} isGap={metric === 'gap'} />
                      </td>
                    </React.Fragment>
                  ))}

                  {/* Annual */}
                  <td className="text-right px-3 py-1.5 tabular-nums font-semibold bg-slate-700/30 border-l border-slate-600">
                    <Cell v={cellValue(row.annual, metric)} isTotal={isTotal} isGap={metric === 'gap'} />
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
