"use client";

import { useState, useMemo } from "react";

interface Props {
  specs: string[];       // 이 상품에 존재하는 규격 목록
  selected: string;      // 현재 선택된 규격 ("" = 전체)
  onChange: (spec: string) => void;
}

const MAX_DISPLAY_LEN = 60; // 탭에 표시할 규격 최대 글자 수

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function SpecFilter({ specs, selected, onChange }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    search.trim()
      ? specs.filter((s) => s.toLowerCase().includes(search.trim().toLowerCase()))
      : specs,
    [specs, search]
  );

  // 규격이 1개 이하면 렌더링 불필요
  if (specs.length <= 1) {
    if (specs.length === 1) {
      return (
        <div className="flex items-start gap-2 text-xs text-gray-400 px-1">
          <span className="shrink-0 mt-0.5">규격:</span>
          <span className="text-gray-600 break-all">{specs[0]}</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[#00733C] inline-block" />
          <h3 className="text-gray-700 font-semibold text-sm">
            규격 필터
            <span className="ml-2 text-gray-400 font-normal text-xs">{specs.length}개 규격 발견</span>
          </h3>
        </div>
        {selected && (
          <button
            onClick={() => onChange("")}
            className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
          >
            × 전체 보기
          </button>
        )}
      </div>

      {/* 규격 검색 (10개 초과 시) */}
      {specs.length > 8 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="규격 검색..."
          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2
            focus:outline-none focus:border-[#00733C] text-gray-700 placeholder-gray-400"
        />
      )}

      {/* 규격 탭 */}
      <div className="flex flex-wrap gap-1.5">
        {/* 전체 탭 */}
        <button
          onClick={() => onChange("")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
            ${selected === ""
              ? "bg-[#00733C] text-white"
              : "text-gray-400 hover:text-[#00733C] hover:bg-green-50"
            }`}
        >
          전체 규격
        </button>

        {filtered.map((spec) => {
          const active = selected === spec;
          return (
            <button
              key={spec}
              onClick={() => onChange(active ? "" : spec)}
              title={spec}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors text-left
                ${active
                  ? "bg-[#00733C] text-white font-medium"
                  : "bg-gray-50 text-gray-500 hover:bg-green-50 hover:text-[#00733C] border border-gray-200"
                }`}
            >
              {truncate(spec, MAX_DISPLAY_LEN)}
            </button>
          );
        })}

        {filtered.length === 0 && (
          <span className="text-xs text-gray-400 px-2 py-1.5">검색 결과 없음</span>
        )}
      </div>

      {/* 현재 선택된 규격 전문 표시 */}
      {selected && (
        <div className="text-xs bg-green-50 border border-[#b3d9c6] rounded-lg px-3 py-2 text-[#00733C] break-all">
          <span className="font-medium">선택된 규격: </span>{selected}
        </div>
      )}
    </div>
  );
}
