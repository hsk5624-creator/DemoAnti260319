"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const CELL_LIMIT = 80;

function CellValue({ value, isMatch }: { value: string; isMatch: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const needsTrunc = value.length > CELL_LIMIT;

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(p => !p);
  }, []);

  if (!needsTrunc) {
    return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{value}</span>;
  }

  return (
    <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {expanded ? value : value.slice(0, CELL_LIMIT) + "…"}
      <button
        onClick={toggle}
        style={{
          marginLeft: 4,
          padding: "0 5px",
          fontSize: 10,
          borderRadius: 3,
          border: "1px solid",
          borderColor: isMatch ? "var(--brand)" : "#ccc",
          background: "transparent",
          color: isMatch ? "var(--brand)" : "#888",
          cursor: "pointer",
          lineHeight: "16px",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {expanded ? "접기" : "더보기"}
      </button>
    </span>
  );
}

type Source = { file: string; sheet: string; row: number };
type TableRow = {
  data: Record<string, string>;
  sources: Source[];
  review_required: boolean;
  review_reason: string;
};
type SourceRow = { row_num: number; cells: string[]; is_match: boolean };
type SourceData = {
  headers: string[];
  rows: SourceRow[];
  match_row: number;
  file: string;
  sheet: string;
  error?: string;
};

const FILE_LABELS: Record<string, string> = {
  "자사 제조배치.xlsx": "자사 제조배치",
  "WMS 제조지시 리스트.xlsx": "WMS 제조지시",
  "변경관리 목록_2025년.xlsx": "변경관리 목록",
  "List of CAPA (2025)_QA1.xlsx": "CAPA 목록",
  "소비자불만 리스트.xlsx": "소비자불만",
  "SCAR DB_2025.xlsx": "SCAR DB",
  "원자재 시험성적.xlsb": "원자재 시험성적",
  "완제품 시험성적.xlsb": "완제품 시험성적",
};

interface Props {
  sources: Source[];
  rowData: TableRow;
  rowIdx: number;
  onClose: () => void;
}

export default function SourcePanel({ sources, rowData, rowIdx, onClose }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<SourceData | null>(null);
  const [loading, setLoading] = useState(false);
  const matchRef = useRef<HTMLTableRowElement>(null);

  const src = sources[activeTab];

  // 소스 변경 시 데이터 로드
  useEffect(() => {
    if (!src) return;
    setLoading(true);
    setData(null);
    const params = new URLSearchParams({
      file: src.file, sheet: src.sheet, row: String(src.row),
    });
    fetch(`/api/source?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [src?.file, src?.row, src?.sheet]);

  // 탭 변경 시 activeTab 초기화
  useEffect(() => { setActiveTab(0); }, [rowIdx]);

  // 매칭 행 스크롤
  useEffect(() => {
    if (matchRef.current) {
      matchRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafbfa" }}>

      {/* 패널 헤더 */}
      <div style={{
        padding: "10px 16px",
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 6, height: 20, borderRadius: 3,
          background: "var(--brand)", flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
            원본 데이터 확인
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
            {Object.values(rowData.data).filter(Boolean).slice(0, 3).join(" · ")}
          </div>
        </div>
        {rowData.review_required && (
          <div style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 6,
            background: "#fef3c7", color: "#b45309",
            border: "1px solid #fde68a", fontWeight: 600,
          }}>
            ⚠ {rowData.review_reason}
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            width: 24, height: 24, borderRadius: 4,
            border: "1px solid var(--border)",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: 14, lineHeight: 1,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f0f0f0"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >×</button>
      </div>

      {/* 소스 탭 (여러 출처가 있을 때) */}
      {sources.length > 1 && (
        <div style={{
          display: "flex",
          background: "#fff",
          borderBottom: "1px solid var(--border)",
          padding: "0 16px",
          flexShrink: 0,
        }}>
          {sources.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              style={{
                padding: "7px 14px",
                border: "none",
                borderBottom: activeTab === i ? "2px solid var(--brand)" : "2px solid transparent",
                background: "transparent",
                color: activeTab === i ? "var(--brand)" : "var(--text-muted)",
                fontWeight: activeTab === i ? 700 : 400,
                fontSize: 11,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {FILE_LABELS[s.file] ?? s.file}
              <span style={{ marginLeft: 4, color: "#aaa", fontSize: 10 }}>행{s.row}</span>
            </button>
          ))}
        </div>
      )}

      {/* 데이터 테이블 */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, gap: 8, color: "var(--text-muted)" }}>
            <div style={{
              width: 18, height: 18, border: "2px solid #e2e8e4",
              borderTop: "2px solid var(--brand)", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: 12 }}>로딩 중...</span>
          </div>
        )}

        {data?.error && (
          <div style={{ padding: 16, color: "#ef4444", fontSize: 12 }}>{data.error}</div>
        )}

        {data && !data.error && (
          <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 5 }}>
              <tr style={{ background: "#f0f7f3" }}>
                <th style={{
                  padding: "7px 10px", textAlign: "center", width: 40,
                  color: "#6b7f74", fontWeight: 700,
                  borderBottom: "2px solid var(--brand-light)", fontSize: 10,
                }}>#</th>
                {data.headers.map((h, i) => (
                  <th key={i} style={{
                    padding: "7px 10px", textAlign: "left",
                    color: "#005a2e", fontWeight: 700,
                    borderBottom: "2px solid var(--brand-light)",
                    whiteSpace: "nowrap",
                    fontSize: 10,
                  }}>
                    {h || `열${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map(row => (
                <tr
                  key={row.row_num}
                  ref={row.is_match ? matchRef : undefined}
                  style={{
                    background: row.is_match ? "rgba(0,115,60,0.08)" : "#fff",
                    borderBottom: row.is_match
                      ? "1px solid rgba(0,115,60,0.2)"
                      : "1px solid var(--border)",
                    outline: row.is_match ? "1.5px solid rgba(0,115,60,0.3)" : "none",
                    outlineOffset: -1,
                    transition: "background 0.1s",
                  }}
                >
                  <td style={{
                    padding: "6px 10px", textAlign: "center", fontFamily: "monospace",
                    color: row.is_match ? "var(--brand)" : "#aaa",
                    fontWeight: row.is_match ? 700 : 400, fontSize: 11,
                  }}>
                    {row.row_num}
                  </td>
                  {row.cells.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: "6px 10px",
                      color: row.is_match ? "var(--text)" : "#6b7f74",
                      fontWeight: row.is_match ? 500 : 400,
                      minWidth: 60,
                      maxWidth: 320,
                    }}>
                      <CellValue value={cell} isMatch={row.is_match} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 하단 정보 */}
      {src && (
        <div style={{
          padding: "6px 16px",
          background: "#fff",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 8,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            📄 {FILE_LABELS[src.file] ?? src.file}
          </span>
          <span style={{ fontSize: 10, color: "#ccc" }}>·</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>시트: {src.sheet}</span>
          <span style={{ fontSize: 10, color: "#ccc" }}>·</span>
          <span style={{ fontSize: 10, color: "var(--brand)", fontWeight: 600 }}>행 {src.row}</span>
        </div>
      )}
    </div>
  );
}
