"use client";

import { useState } from "react";
import { Level1Item, STATUS_COLORS, getLevel1Range } from "@/lib/types";

interface Props {
  items: Level1Item[];
  onDeleteLevel1: (id: string) => void;
  onDeleteLevel2: (parentId: string, childId: string) => void;
}

export default function TaskList({ items, onDeleteLevel1, onDeleteLevel2 }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (items.length === 0) return null;

  const toggle = (id: string) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalChildren = items.reduce((sum, i) => sum + i.children.length, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-700 px-4 py-3 border-b border-gray-100">
        등록된 과제
        <span className="ml-2 text-gray-400 font-normal text-xs">
          Lv1 {items.length} · Lv2 {totalChildren}
        </span>
      </h3>
      <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
        {items.map((item) => {
          const range = getLevel1Range(item);
          const isCollapsed = collapsed.has(item.id);
          const hasChildren = item.children.length > 0;

          return (
            <div key={item.id}>
              {/* Level 1 헤더 */}
              <div
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 group cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => hasChildren && toggle(item.id)}
              >
                {/* 접기/펼치기 화살표 */}
                <svg
                  className={`w-3 h-3 text-gray-400 shrink-0 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  {hasChildren
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  }
                </svg>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-700">{item.name}</span>
                  {range && (
                    <span className="ml-2 text-[10px] text-gray-400">
                      {range.start.slice(0, 7)} ~ {range.end.slice(0, 7)}
                    </span>
                  )}
                  {hasChildren && (
                    <span className="ml-1.5 text-[10px] text-gray-400">({item.children.length})</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteLevel1(item.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs px-1 shrink-0"
                  title="그룹 삭제"
                >
                  ✕
                </button>
              </div>

              {/* Level 2 목록 — 슬라이드 */}
              <div
                style={{
                  maxHeight: isCollapsed ? "0px" : `${item.children.length * 44}px`,
                  overflow: "hidden",
                  transition: "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {item.children.map((child) => {
                  const dotColor = STATUS_COLORS[child.status];
                  return (
                    <div key={child.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-50 group border-t border-gray-50">
                      <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0 ml-1" />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] text-gray-600 truncate block font-medium">{child.name}</span>
                        <span className="text-[10px] text-gray-400">
                          {child.startDate} ~ {child.endDate}
                          {child.assignee && ` · ${child.assignee}`}
                          {child.showOnLevel1 && <span className="ml-1 text-amber-400">◆</span>}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteLevel2(item.id, child.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs px-1 shrink-0"
                        title="삭제"
                      >
                        ✕
                      </button>
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
