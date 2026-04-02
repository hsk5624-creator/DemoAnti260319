"use client";

import { useState } from "react";
import { Level1Item, STATUS_COLORS, getLevel1Range } from "@/lib/types";

interface Props {
  items: Level1Item[];
  onDeleteLevel1: (id: string) => void;
  onDeleteLevel2: (parentId: string, childId: string) => void;
  onDeleteLevel3: (l2Id: string, childId: string) => void;
  onDuplicateLevel1: (id: string) => void;
  onDuplicateLevel2: (parentId: string, childId: string) => void;
}

export default function TaskList({ items, onDeleteLevel1, onDeleteLevel2, onDeleteLevel3, onDuplicateLevel1, onDuplicateLevel2 }: Props) {
  const [collapsedL1, setCollapsedL1] = useState<Set<string>>(new Set());
  const [collapsedL2, setCollapsedL2] = useState<Set<string>>(new Set());

  if (items.length === 0) return null;

  const toggleL1 = (id: string) =>
    setCollapsedL1(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleL2 = (id: string) =>
    setCollapsedL2(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalL2 = items.reduce((s, i) => s + i.children.length, 0);
  const totalL3 = items.reduce((s, i) => s + i.children.reduce((s2, l2) => s2 + (l2.children?.length ?? 0), 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-700 px-4 py-3 border-b border-gray-100">
        등록된 과제
        <span className="ml-2 text-gray-400 font-normal text-xs">
          Lv1 {items.length} · Lv2 {totalL2}{totalL3 > 0 ? ` · Lv3 ${totalL3}` : ""}
        </span>
      </h3>
      <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
        {items.map((item) => {
          const range = getLevel1Range(item);
          const isL1Collapsed = collapsedL1.has(item.id);
          const hasL2 = item.children.length > 0;

          return (
            <div key={item.id}>
              {/* Level 1 헤더 */}
              <div
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 group cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => hasL2 && toggleL1(item.id)}
              >
                <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform duration-200 ${isL1Collapsed ? "" : "rotate-90"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {hasL2
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  }
                </svg>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-700">{item.name}</span>
                  {range && <span className="ml-2 text-[10px] text-gray-400">{range.start.slice(0, 7)} ~ {range.end.slice(0, 7)}</span>}
                  {hasL2 && <span className="ml-1.5 text-[10px] text-gray-400">({item.children.length})</span>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDuplicateLevel1(item.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-400 transition-all shrink-0 p-0.5"
                  title="그룹 복사">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteLevel1(item.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs px-1 shrink-0"
                  title="그룹 삭제">✕</button>
              </div>

              {/* Level 2 목록 */}
              <div style={{
                maxHeight: isL1Collapsed ? "0px" : `${item.children.length * 200}px`,
                overflow: "hidden",
                transition: "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              }}>
                {item.children.map((child) => {
                  const dotColor = STATUS_COLORS[child.status];
                  const hasL3 = (child.children?.length ?? 0) > 0;
                  const isL2Collapsed = collapsedL2.has(child.id);

                  return (
                    <div key={child.id}>
                      {/* L2 행 */}
                      <div
                        className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-50 group border-t border-gray-50 cursor-pointer"
                        onClick={() => hasL3 && toggleL2(child.id)}
                      >
                        {hasL3 ? (
                          <svg className={`w-2.5 h-2.5 text-gray-300 shrink-0 transition-transform duration-200 ${isL2Collapsed ? "" : "rotate-90"}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        ) : (
                          <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0 ml-1" />
                        )}
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-gray-600 truncate block font-medium">
                            {child.name}
                            {hasL3 && <span className="ml-1 text-[10px] text-gray-400">({child.children!.length})</span>}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {child.startDate} ~ {child.endDate}
                            {child.assignee && ` · ${child.assignee}`}
                            {child.showOnLevel1 && <span className="ml-1 text-amber-400">◆</span>}
                          </span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDuplicateLevel2(item.id, child.id); }}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-400 transition-all shrink-0 p-0.5"
                          title="과제 복사">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteLevel2(item.id, child.id); }}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs px-1 shrink-0"
                          title="삭제">✕</button>
                      </div>

                      {/* L3 목록 */}
                      {hasL3 && (
                        <div style={{
                          maxHeight: isL2Collapsed ? "0px" : `${child.children!.length * 40}px`,
                          overflow: "hidden",
                          transition: "max-height 0.2s ease",
                        }}>
                          {child.children!.map(l3 => (
                            <div key={l3.id}
                              className="flex items-center gap-2 px-6 py-1 hover:bg-blue-50/30 group border-t border-gray-50">
                              <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0 ml-2" />
                              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: STATUS_COLORS[l3.status] }} />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-gray-500 truncate block">{l3.name}</span>
                                <span className="text-[9px] text-gray-400">
                                  {l3.startDate} ~ {l3.endDate}
                                  {l3.assignee && ` · ${l3.assignee}`}
                                </span>
                              </div>
                              <button onClick={() => onDeleteLevel3(child.id, l3.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs px-1 shrink-0"
                                title="삭제">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
