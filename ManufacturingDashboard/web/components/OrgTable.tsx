'use client';

import React, { useState } from 'react';
import { GroupSummary, DeptSummary, fmt, getDeptAccountItems } from '@/lib/aggregate';
import { BU_ORDER } from '@/lib/orgChart';
import { ActualRow } from '@/lib/types';
import TeamDetailModal from './TeamDetailModal';

interface Props {
  groups: GroupSummary[];
  rows: ActualRow[];
}

interface BuTotal {
  totalPlanY: number;
  totalActualY: number;
  availableY: number;
  planY: number;
  executionRateY: number;
  diffY: number;
  totalPlanM: number;
  actualSumM: number;
  executionRateM: number;
}

function computeBuTotal(groups: GroupSummary[]): BuTotal {
  const t: BuTotal = {
    totalPlanY: 0, totalActualY: 0, availableY: 0, planY: 0,
    executionRateY: 0, diffY: 0,
    totalPlanM: 0, actualSumM: 0, executionRateM: 0,
  };
  for (const g of groups) {
    t.totalPlanY += g.totalPlanY;
    t.totalActualY += g.totalActualY;
    t.availableY += g.availableY;
    t.planY += g.planY;
    t.totalPlanM += g.totalPlanM;
    t.actualSumM += g.actualSumM;
  }
  t.executionRateY = t.totalPlanY ? (t.totalActualY / t.totalPlanY) * 100 : 0;
  t.diffY = t.totalActualY - t.planY;
  t.executionRateM = t.totalPlanM ? (t.actualSumM / t.totalPlanM) * 100 : 0;
  return t;
}

function rateStyle(rate: number) {
  if (rate >= 90) return 'text-red-400 font-bold';
  if (rate >= 70) return 'text-yellow-400 font-semibold';
  return 'text-emerald-400';
}

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 90 ? 'bg-red-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={`text-xs tabular-nums ${rateStyle(rate)}`}>{rate.toFixed(1)}%</span>
    </div>
  );
}

const M_BORDER = 'border-l-2 border-blue-500/30';

function BuRow({ bu, total, expanded, onToggle }: { bu: string; total: BuTotal; expanded: boolean; onToggle: () => void }) {
  return (
    <tr className="bg-slate-700/70 border-t border-slate-500 cursor-pointer hover:bg-slate-600/70 transition-colors" onClick={onToggle}>
      <td className="py-2 pl-4 pr-3 text-xs font-bold text-slate-100 tracking-wide uppercase whitespace-nowrap">
        <span className="mr-1.5 text-slate-400 text-xs">{expanded ? '▼' : '▶'}</span>{bu}
      </td>
      <td className="py-2 px-3 text-right text-xs text-slate-200 tabular-nums font-bold whitespace-nowrap">{fmt(total.totalPlanY, true)}</td>
      <td className="py-2 px-3 text-right text-xs text-slate-200 tabular-nums font-bold whitespace-nowrap">{fmt(total.totalActualY, true)}</td>
      <td className="py-2 px-3 whitespace-nowrap"><RateBar rate={total.executionRateY} /></td>
      <td className={`py-2 px-3 text-right text-xs tabular-nums font-bold whitespace-nowrap ${total.diffY > 0 ? 'text-red-400' : total.diffY < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
        {total.diffY > 0 ? '+' : ''}{fmt(total.diffY, true)}
      </td>
      <td className="py-2 px-3 text-right text-xs text-slate-300 tabular-nums whitespace-nowrap">{fmt(total.availableY, true)}</td>
      <td className={`py-2 px-3 text-right text-xs text-slate-200 tabular-nums font-bold whitespace-nowrap ${M_BORDER}`}>{fmt(total.totalPlanM, true)}</td>
      <td className="py-2 px-3 text-right text-xs text-slate-200 tabular-nums font-bold whitespace-nowrap">{fmt(total.actualSumM, true)}</td>
      <td className="py-2 px-3 whitespace-nowrap"><RateBar rate={total.executionRateM} /></td>
    </tr>
  );
}

function TeamRow({ team, onSelect }: { team: DeptSummary; onSelect: () => void }) {
  return (
    <tr className="border-t border-slate-700/50 bg-slate-800/30 cursor-pointer hover:bg-slate-700/30 transition-colors" onClick={onSelect}>
      <td className="py-2 pl-10 pr-3 text-sm text-slate-300 whitespace-nowrap">
        <span className="text-slate-600 mr-1">└</span> {team.deptName}
        <span className="ml-1.5 text-[10px] text-blue-400/70">상세▶</span>
      </td>
      <td className="py-2 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap">{fmt(team.totalPlanY, true)}</td>
      <td className="py-2 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap">{fmt(team.totalActualY, true)}</td>
      <td className="py-2 px-3 whitespace-nowrap"><RateBar rate={team.executionRateY} /></td>
      <td className={`py-2 px-3 text-right text-sm tabular-nums whitespace-nowrap ${team.diffY > 0 ? 'text-red-400' : team.diffY < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
        {team.diffY > 0 ? '+' : ''}{fmt(team.diffY, true)}
      </td>
      <td className="py-2 px-3 text-right text-sm text-slate-400 tabular-nums whitespace-nowrap">{fmt(team.availableY, true)}</td>
      <td className={`py-2 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap ${M_BORDER}`}>{fmt(team.totalPlanM, true)}</td>
      <td className="py-2 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap">{fmt(team.actualSumM, true)}</td>
      <td className="py-2 px-3 whitespace-nowrap"><RateBar rate={team.executionRateM} /></td>
    </tr>
  );
}

function GroupRow({ group, expanded, onToggle }: { group: GroupSummary; expanded: boolean; onToggle: () => void }) {
  return (
    <tr
      className={`border-t border-slate-700 cursor-pointer transition-colors ${expanded ? 'bg-slate-700/40' : 'hover:bg-slate-700/20'}`}
      onClick={onToggle}
    >
      <td className="py-2.5 pl-6 pr-3 text-sm font-semibold text-slate-100 whitespace-nowrap">
        <span className="mr-1.5 text-slate-400 text-xs">{group.isStandalone ? '  ' : expanded ? '▼' : '▶'}</span>
        {group.groupName}
      </td>
      <td className="py-2.5 px-3 text-right text-sm text-slate-200 tabular-nums font-medium whitespace-nowrap">{fmt(group.totalPlanY, true)}</td>
      <td className="py-2.5 px-3 text-right text-sm text-slate-200 tabular-nums font-medium whitespace-nowrap">{fmt(group.totalActualY, true)}</td>
      <td className="py-2.5 px-3 whitespace-nowrap"><RateBar rate={group.executionRateY} /></td>
      <td className={`py-2.5 px-3 text-right text-sm tabular-nums font-medium whitespace-nowrap ${group.diffY > 0 ? 'text-red-400' : group.diffY < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
        {group.diffY > 0 ? '+' : ''}{fmt(group.diffY, true)}
      </td>
      <td className="py-2.5 px-3 text-right text-sm text-slate-300 tabular-nums whitespace-nowrap">{fmt(group.availableY, true)}</td>
      <td className={`py-2.5 px-3 text-right text-sm text-slate-200 tabular-nums whitespace-nowrap ${M_BORDER}`}>{fmt(group.totalPlanM, true)}</td>
      <td className="py-2.5 px-3 text-right text-sm text-slate-200 tabular-nums whitespace-nowrap">{fmt(group.actualSumM, true)}</td>
      <td className="py-2.5 px-3 whitespace-nowrap"><RateBar rate={group.executionRateM} /></td>
    </tr>
  );
}

export default function OrgTable({ groups, rows }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedBu, setCollapsedBu] = useState<Set<string>>(new Set());
  const [selectedTeam, setSelectedTeam] = useState<DeptSummary | null>(null);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleBu = (bu: string) => {
    setCollapsedBu((prev) => {
      const next = new Set(prev);
      next.has(bu) ? next.delete(bu) : next.add(bu);
      return next;
    });
  };

  const buMap = new Map<string, GroupSummary[]>();
  for (const g of groups) {
    if (!buMap.has(g.parentBu)) buMap.set(g.parentBu, []);
    buMap.get(g.parentBu)!.push(g);
  }
  const buList = BU_ORDER.filter((bu) => buMap.has(bu));
  const grandTotal = computeBuTotal(groups);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">조직별 집행 현황</h2>
        <p className="text-xs text-slate-500 mt-0.5">본부 클릭 → 접기/펼치기 · 담당 클릭 → 팀 상세</p>
      </div>
      {selectedTeam && (
        <TeamDetailModal
          deptName={selectedTeam.deptName}
          items={getDeptAccountItems(rows, selectedTeam.deptCode)}
          onClose={() => setSelectedTeam(null)}
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs border-b border-slate-700/50">
              <th className="py-1.5 pl-4 pr-3" rowSpan={2} />
              <th colSpan={5} className="py-1.5 px-3 text-center font-semibold text-blue-300/80 tracking-wide bg-blue-900/10 border-b border-blue-500/20">
                연간 (Y)
              </th>
              <th colSpan={3} className={`py-1.5 px-3 text-center font-semibold text-violet-300/80 tracking-wide bg-violet-900/10 border-b border-violet-500/20 ${M_BORDER}`}>
                당월 (M)
              </th>
            </tr>
            <tr className="text-xs text-slate-400 border-b border-slate-700">
              <th className="py-2 px-3 text-right font-medium whitespace-nowrap">연간예산</th>
              <th className="py-2 px-3 text-right font-medium whitespace-nowrap">연간실적</th>
              <th className="py-2 px-3 font-medium whitespace-nowrap">집행률(Y)</th>
              <th className="py-2 px-3 text-right font-medium whitespace-nowrap">계획대비</th>
              <th className="py-2 px-3 text-right font-medium whitespace-nowrap">가용예산</th>
              <th className={`py-2 px-3 text-right font-medium whitespace-nowrap ${M_BORDER}`}>당월예산</th>
              <th className="py-2 px-3 text-right font-medium whitespace-nowrap">당월실적</th>
              <th className="py-2 px-3 font-medium whitespace-nowrap">집행률(M)</th>
            </tr>
          </thead>
          <tbody>
            {/* 제조부문 합계 행 */}
            <tr className="bg-slate-600/50 border-b-2 border-slate-500">
              <td className="py-2.5 pl-4 pr-3 text-xs font-bold text-white tracking-wide whitespace-nowrap">
                ∑ 제조부문 합계
              </td>
              <td className="py-2.5 px-3 text-right text-xs text-white tabular-nums font-bold whitespace-nowrap">{fmt(grandTotal.totalPlanY, true)}</td>
              <td className="py-2.5 px-3 text-right text-xs text-white tabular-nums font-bold whitespace-nowrap">{fmt(grandTotal.totalActualY, true)}</td>
              <td className="py-2.5 px-3 whitespace-nowrap"><RateBar rate={grandTotal.executionRateY} /></td>
              <td className={`py-2.5 px-3 text-right text-xs tabular-nums font-bold whitespace-nowrap ${grandTotal.diffY > 0 ? 'text-red-400' : grandTotal.diffY < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                {grandTotal.diffY > 0 ? '+' : ''}{fmt(grandTotal.diffY, true)}
              </td>
              <td className="py-2.5 px-3 text-right text-xs text-slate-200 tabular-nums font-bold whitespace-nowrap">{fmt(grandTotal.availableY, true)}</td>
              <td className={`py-2.5 px-3 text-right text-xs text-white tabular-nums font-bold whitespace-nowrap ${M_BORDER}`}>{fmt(grandTotal.totalPlanM, true)}</td>
              <td className="py-2.5 px-3 text-right text-xs text-white tabular-nums font-bold whitespace-nowrap">{fmt(grandTotal.actualSumM, true)}</td>
              <td className="py-2.5 px-3 whitespace-nowrap"><RateBar rate={grandTotal.executionRateM} /></td>
            </tr>
            {buList.map((bu) => {
              const buGroups = buMap.get(bu)!;
              const buTotal = computeBuTotal(buGroups);
              return (
                <React.Fragment key={bu}>
                  {/* 본부 합계 행 */}
                  <BuRow bu={bu} total={buTotal} expanded={!collapsedBu.has(bu)} onToggle={() => toggleBu(bu)} />
                  {/* 담당 / 팀 행 */}
                  {!collapsedBu.has(bu) && buGroups.map((group) => (
                    <React.Fragment key={group.groupKey}>
                      <GroupRow
                        group={group}
                        expanded={expanded.has(group.groupKey)}
                        onToggle={() => !group.isStandalone && toggle(group.groupKey)}
                      />
                      {expanded.has(group.groupKey) &&
                        group.teams.map((team) => <TeamRow key={team.deptCode} team={team} onSelect={() => setSelectedTeam(team)} />)}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
