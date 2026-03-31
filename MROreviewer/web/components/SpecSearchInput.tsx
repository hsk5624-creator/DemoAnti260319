"use client";

import { useState, useMemo } from "react";

interface Props {
  specs: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export default function SpecSearchInput({ specs, selected, onChange }: Props) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? specs.filter((s) => s.toLowerCase().includes(q)) : specs;
  }, [specs, search]);

  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s));

  const toggle = (spec: string) => {
    const next = new Set(selected);
    if (next.has(spec)) next.delete(spec);
    else next.add(spec);
    onChange(next);
  };

  const toggleAllVisible = () => {
    const next = new Set(selected);
    if (allVisibleSelected) {
      visible.forEach((s) => next.delete(s));
    } else {
      visible.forEach((s) => next.add(s));
    }
    onChange(next);
  };

  const clearAll = () => onChange(new Set());

  if (!specs.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[#00733C] inline-block" />
          <h3 className="text-gray-700 font-semibold text-sm">
            규격 선택
            <span className="ml-2 text-gray-400 font-normal text-xs">{specs.length}개 규격</span>
          </h3>
        </div>
        {selected.size > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            선택 초기화
          </button>
        )}
      </div>

      {/* 검색 입력 */}
      <div className="relative mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="규격 검색으로 목록 좁히기…"
          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-7
            focus:outline-none focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C]
            text-gray-700 placeholder-gray-400"
        />
        {search && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setSearch(""); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* 전체 선택/해제 행 */}
      <div className="flex items-center gap-2 px-2 py-1.5 mb-1 border-b border-gray-100">
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={toggleAllVisible}
          className="w-3.5 h-3.5 accent-[#00733C] rounded flex-shrink-0"
        />
        <span className="text-xs text-gray-500 flex-1">
          {search ? `검색된 ${visible.length}개 전체` : "전체 선택/해제"}
        </span>
        {selected.size > 0 && (
          <span className="text-xs font-medium text-[#00733C]">{selected.size}개 선택됨</span>
        )}
      </div>

      {/* 체크박스 목록 */}
      <div className="max-h-52 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="text-xs text-gray-400 px-2 py-3 text-center">일치하는 규격 없음</div>
        ) : (
          visible.map((spec) => (
            <label
              key={spec}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-green-50 transition-colors group ${
                selected.has(spec) ? "bg-green-50/60" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(spec)}
                onChange={() => toggle(spec)}
                className="w-3.5 h-3.5 accent-[#00733C] rounded flex-shrink-0"
              />
              <span className={`text-xs leading-snug break-all ${
                selected.has(spec) ? "text-[#00733C] font-medium" : "text-gray-600 group-hover:text-[#00733C]"
              }`}>
                {spec}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
