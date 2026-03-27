"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface Props {
  specs: string[];       // 이 상품에 존재하는 규격 목록
  value: string;         // 현재 입력값
  onChange: (val: string) => void;
}

export default function SpecSearchInput({ specs, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 입력값 포함 규격 필터링
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return specs;
    return specs.filter((s) => s.toLowerCase().includes(q));
  }, [specs, value]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!specs.length) return null;

  return (
    <div ref={wrapRef} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-4 rounded-full bg-[#00733C] inline-block" />
        <h3 className="text-gray-700 font-semibold text-sm">
          규격 검색
          <span className="ml-2 text-gray-400 font-normal text-xs">{specs.length}개 규격 존재</span>
        </h3>
      </div>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="규격 입력 (포함된 문자로 검색)"
          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-8
            focus:outline-none focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C]
            text-gray-700 placeholder-gray-400"
        />
        {value && (
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm leading-none"
          >
            ×
          </button>
        )}

        {/* 드롭다운 */}
        {open && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200
            rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
            {suggestions.map((spec) => (
              <button
                key={spec}
                onMouseDown={(e) => { e.preventDefault(); onChange(spec); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-green-50 hover:text-[#00733C]
                  transition-colors border-b border-gray-50 last:border-0
                  ${value === spec ? "bg-green-50 text-[#00733C] font-medium" : "text-gray-600"}`}
              >
                {spec}
              </button>
            ))}
          </div>
        )}
      </div>

      {value && (
        <div className="mt-2 text-xs text-gray-400">
          <span className="text-[#00733C] font-medium">"{value}"</span> 포함 규격으로 필터링 중
          {suggestions.length < specs.length && (
            <span className="ml-1">({suggestions.length}/{specs.length}개 해당)</span>
          )}
        </div>
      )}
    </div>
  );
}
