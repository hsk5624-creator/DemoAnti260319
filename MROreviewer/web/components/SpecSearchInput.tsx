"use client";

import { useState, useMemo } from "react";

interface Props {
  specs: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  specFactors: Record<string, number>;
  onFactorChange: (spec: string, factor: number | null) => void;
}

export default function SpecSearchInput({ specs, selected, onChange, specFactors, onFactorChange }: Props) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? specs.filter((s) => s.toLowerCase().includes(q)) : specs;
  }, [specs, search]);

  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s));
  const activeFactors = Object.entries(specFactors).filter(([, v]) => v > 1);

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

  const clearAllFactors = () => {
    activeFactors.forEach(([spec]) => onFactorChange(spec, null));
  };

  if (!specs.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-1 h-4 rounded-full bg-[#00733C] inline-block" />
          <h3 className="text-gray-700 font-semibold text-sm">
            규격 선택
            <span className="ml-2 text-gray-400 font-normal text-xs">{specs.length}개 규격</span>
          </h3>
          {activeFactors.length > 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              환산 {activeFactors.length}개 적용중
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFactors.length > 0 && (
            <button
              onClick={clearAllFactors}
              className="text-xs text-amber-600 hover:text-amber-800 transition-colors"
            >
              환산 초기화
            </button>
          )}
          {selected.size > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              선택 초기화
            </button>
          )}
        </div>
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
          visible.map((spec) => {
            const isSelected = selected.has(spec);
            const factor = specFactors[spec] ?? 1;
            return (
              <div
                key={spec}
                className={`px-2 py-1.5 rounded-lg transition-colors group ${
                  isSelected ? "bg-green-50/60" : "hover:bg-green-50"
                }`}
              >
                {/* 체크박스 + 규격명 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(spec)}
                    className="w-3.5 h-3.5 accent-[#00733C] rounded flex-shrink-0"
                  />
                  <span className={`text-xs leading-snug break-all ${
                    isSelected ? "text-[#00733C] font-medium" : "text-gray-600 group-hover:text-[#00733C]"
                  }`}>
                    {spec}
                  </span>
                </label>

                {/* 규격환산 입력 (선택된 규격만 표시) */}
                {isSelected && (
                  <div
                    className="flex items-center gap-1.5 mt-1.5 ml-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-gray-300 text-xs">÷</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={factor > 1 ? factor : ""}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        onFactorChange(spec, isNaN(v) || v <= 1 ? null : v);
                      }}
                      placeholder="1"
                      className="w-14 text-xs text-center border border-gray-200 rounded-md px-1 py-0.5
                        focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200
                        bg-white text-gray-700 placeholder-gray-300"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">개/묶음</span>
                    {factor > 1 && (
                      <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
                        → 개당 환산
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 환산 적용 안내 */}
      {activeFactors.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
          단가·수량은 개별 단위 기준으로 환산됩니다
        </div>
      )}
    </div>
  );
}
