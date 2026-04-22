"use client";

import { useEffect, useState, useRef } from "react";

type Source = { file: string; sheet: string; row: number };
type SourceRow = { row_num: number; cells: string[]; is_match: boolean };
type SourceData = { headers: string[]; rows: SourceRow[]; match_row: number; file: string; sheet: string; error?: string };

interface Props {
  source: Source;
  onClose: () => void;
}

const FILE_LABELS: Record<string, string> = {
  "자사 제조배치.xlsx": "자사 제조배치",
  "WMS 제조지시 리스트.xlsx": "WMS 제조지시",
  "변경관리 목록_2025년.xlsx": "변경관리 목록",
  "List of CAPA (2025)_QA1.xlsx": "CAPA 목록",
  "소비자불만 리스트.xlsx": "소비자불만",
};

export default function SourceViewer({ source, onClose }: Props) {
  const [data, setData] = useState<SourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const matchRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    const params = new URLSearchParams({ file: source.file, sheet: source.sheet, row: String(source.row) });
    fetch(`/api/source?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [source]);

  useEffect(() => {
    if (matchRef.current) {
      matchRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [data]);

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 border-b border-slate-600 shrink-0">
        <div className="w-1.5 h-4 rounded-full" style={{ background: "var(--brand)" }} />
        <div>
          <p className="text-xs font-semibold text-white">{FILE_LABELS[source.file] ?? source.file}</p>
          <p className="text-[10px] text-slate-400">행 {source.row} · {source.sheet}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-slate-400 hover:text-white text-lg leading-none px-1"
          title="닫기"
        >×</button>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-900/50 border-b border-slate-700 text-[10px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded inline-block"
            style={{ background: "rgba(0,115,60,0.3)", border: "1px solid var(--brand)" }} />
          매칭된 행
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-slate-700 border border-slate-600 inline-block" />
          주변 행
        </span>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            <div className="w-5 h-5 border-2 border-slate-500 rounded-full animate-spin mr-2"
              style={{ borderTopColor: "var(--brand)" }} />
            로딩 중...
          </div>
        )}

        {data?.error && (
          <div className="p-4 text-red-400 text-xs">{data.error}</div>
        )}

        {data && !data.error && (
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr>
                <th className="px-2 py-1.5 text-slate-400 font-medium border-b border-slate-600 text-center w-10">#</th>
                {data.headers.map((h, i) => (
                  <th key={i} className="px-2 py-1.5 text-slate-300 font-medium border-b border-slate-600 text-left whitespace-nowrap max-w-32 overflow-hidden text-ellipsis">
                    {h || `열${i+1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.row_num}
                  ref={row.is_match ? matchRef : undefined}
                  className={`border-b transition-colors ${row.is_match ? "" : "border-slate-700/40 hover:bg-slate-700/20"}`}
                  style={row.is_match
                    ? { background: "rgba(0,115,60,0.2)", borderColor: "rgba(0,115,60,0.4)" }
                    : {}}
                >
                  <td className="px-2 py-1.5 text-center font-mono"
                    style={row.is_match ? { color: "var(--brand-mid)", fontWeight: 700 } : { color: "#64748b" }}>
                    {row.row_num}
                  </td>
                  {row.cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-2 py-1.5 align-top max-w-48"
                      style={row.is_match ? { color: "var(--brand-light)" } : { color: "#cbd5e1" }}
                      title={cell}
                    >
                      <div className="truncate">{cell}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
