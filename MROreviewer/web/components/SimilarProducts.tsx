"use client";
import { FuzzyMatch } from "@/lib/fuzzy";

interface Props {
  matches: FuzzyMatch[];
  onSelect: (name: string) => void;
}

export default function SimilarProducts({ matches, onSelect }: Props) {
  if (!matches.length) {
    return <p className="text-gray-400 text-sm">유사 상품명 없음</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-gray-400 text-xs mb-3">
        검색어와 90% 이상 유사한 상품명입니다. 클릭하면 해당 상품 분석으로 이동합니다.
      </p>
      {matches.map((m) => (
        <button
          key={m.name}
          onClick={() => onSelect(m.name)}
          className="w-full text-left flex items-center justify-between bg-white hover:bg-green-50
            border border-gray-200 hover:border-[#00733C] rounded-xl px-4 py-3 transition-colors group shadow-sm"
        >
          <span className="text-gray-800 text-sm group-hover:text-[#00733C]">{m.name}</span>
          <span className="text-xs text-amber-600 font-mono ml-4 shrink-0">
            유사도 {Math.round(m.score * 100)}%
          </span>
        </button>
      ))}
    </div>
  );
}
