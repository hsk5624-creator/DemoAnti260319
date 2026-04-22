"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type Source = { file: string; sheet: string; row: number };

interface Props {
  onSelectSource: (s: Source) => void;
  selectedSource: Source | null;
}

export default function WordPreview({ onSelectSource, selectedSource }: Props) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/word-html")
      .then(r => r.json())
      .then(d => { setHtml(d.html || ""); setLoading(false); })
      .catch(() => { setError("문서 로딩 실패"); setLoading(false); });
  }, []);

  // 출처 버튼 클릭 처리 (이벤트 위임)
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    const btn = el.closest("[data-src]") as HTMLElement | null;
    if (btn) {
      try {
        const src: Source = JSON.parse(btn.dataset.src!);
        onSelectSource(src);
      } catch {}
    }
  }, [onSelectSource]);

  // 선택된 소스 행 하이라이트
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.querySelectorAll("td.sel").forEach(el => el.classList.remove("sel"));
    if (!selectedSource) return;
    containerRef.current.querySelectorAll<HTMLElement>("[data-src]").forEach(btn => {
      try {
        const s: Source = JSON.parse(btn.dataset.src!);
        if (s.file === selectedSource.file && s.row === selectedSource.row) {
          btn.closest("tr")?.querySelectorAll("td").forEach(td => td.classList.add("sel"));
        }
      } catch {}
    });
  }, [selectedSource, html]);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
      <div className="w-5 h-5 border-2 border-slate-500 rounded-full animate-spin mr-2"
        style={{ borderTopColor: "var(--brand)" }} />
      문서 변환 중...
    </div>
  );
  if (error) return <div className="p-4 text-red-400 text-sm">{error}</div>;

  return (
    <div className="flex flex-col h-full">
      {/* 상단 안내 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 border-b border-slate-700 text-[11px] text-slate-400 shrink-0">
        <div className="w-1.5 h-4 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
        <span className="text-slate-300 font-medium">PPQR 문서 미리보기</span>
        <span className="ml-2 text-slate-500">· 매핑 데이터가 표에 자동 채워진 상태입니다</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "rgba(0,115,60,0.15)", border: "1px solid #00733C" }} />자동매핑
          <span className="w-2.5 h-2.5 rounded-sm inline-block bg-amber-200 border border-amber-400 ml-2" />요확인
        </span>
      </div>
      {/* 문서 본문 */}
      <div className="flex-1 overflow-auto bg-slate-200">
        <div className="max-w-4xl mx-auto my-6 shadow-xl rounded">
          <div
            ref={containerRef}
            onClick={handleClick}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
