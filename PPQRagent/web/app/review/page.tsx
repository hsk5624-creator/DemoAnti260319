"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReviewTable from "@/components/ReviewTable";
import SourcePanel from "@/components/SourcePanel";

const TABS = [
  { id: "t11",         label: "표11 제조배치" },
  { id: "t16",         label: "표16 변경관리" },
  { id: "t18",         label: "표18 CAPA" },
  { id: "t19",         label: "표19 불만" },
  { id: "t_scar",      label: "표25 SCAR" },
  { id: "t_deviation", label: "일탈" },
  { id: "t_banpum",    label: "반품" },
];

type Source = { file: string; sheet: string; row: number };
type TableRow = { data: Record<string, string>; sources: Source[]; review_required: boolean; review_reason: string };
type TableData = { id: string; title: string; columns: string[]; rows: TableRow[] };

function ReviewContent() {
  const searchParams = useSearchParams();
  const productName = searchParams.get("name") ?? "";
  const productCode = searchParams.get("code") ?? "";
  const apiName     = searchParams.get("api")  ?? "";

  const [active, setActive] = useState("t11");
  const [tables, setTables] = useState<Record<string, TableData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 선택된 행 인덱스
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  // 탭별 확인된 행 인덱스 Set
  const [confirmed, setConfirmed] = useState<Record<string, Set<number>>>({});
  // 탭별 편집값: tableId → rowIdx → col → 편집값
  const [edits, setEdits] = useState<Record<string, Record<number, Record<string, string>>>>({});

  const handleEdit = useCallback((rowIdx: number, col: string, val: string) => {
    setEdits(prev => ({
      ...prev,
      [active]: {
        ...prev[active],
        [rowIdx]: { ...prev[active]?.[rowIdx], [col]: val },
      },
    }));
  }, [active]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (productName) params.set("product_name", productName);
    if (productCode) params.set("product_code", productCode);
    if (apiName)     params.set("api_name", apiName);
    fetch(`/api/tables?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.message ?? data.error); setLoading(false); return; }
        setTables(data); setLoading(false);
      })
      .catch(() => { setError("서버 연결 실패 — FastAPI 서버(port 8000)가 실행 중인지 확인하세요."); setLoading(false); });
  }, [productName, productCode, apiName]);

  const table = tables[active];
  const confirmedSet = confirmed[active] ?? new Set<number>();
  const totalRows = table?.rows.length ?? 0;
  const confirmedCount = confirmedSet.size;

  // 탭 변경 시 첫 미확인 행 자동 선택
  const handleTabChange = (id: string) => {
    setActive(id);
    const t = tables[id];
    if (t) {
      const conf = confirmed[id] ?? new Set<number>();
      const firstUnconfirmed = t.rows.findIndex((_, i) => !conf.has(i));
      setSelectedIdx(firstUnconfirmed >= 0 ? firstUnconfirmed : 0);
    } else {
      setSelectedIdx(null);
    }
  };

  // 개별 확인
  const handleConfirm = useCallback((idx: number) => {
    setConfirmed(prev => {
      const next = new Map(Object.entries(prev));
      const s = new Set(next.get(active) ?? []);
      s.add(idx);
      next.set(active, s);
      return Object.fromEntries(next);
    });
    // 다음 미확인 행으로 이동
    if (table) {
      const conf = confirmed[active] ?? new Set<number>();
      const nextConf = new Set(conf);
      nextConf.add(idx);
      for (let i = idx + 1; i < table.rows.length; i++) {
        if (!nextConf.has(i)) { setSelectedIdx(i); return; }
      }
      for (let i = 0; i < idx; i++) {
        if (!nextConf.has(i)) { setSelectedIdx(i); return; }
      }
    }
  }, [active, confirmed, table]);

  // 일괄확인
  const handleConfirmAll = () => {
    if (!table) return;
    setConfirmed(prev => ({
      ...prev,
      [active]: new Set(table.rows.map((_, i) => i)),
    }));
  };

  // 확인 취소
  const handleUnconfirm = useCallback((idx: number) => {
    setConfirmed(prev => {
      const s = new Set(prev[active] ?? []);
      s.delete(idx);
      return { ...prev, [active]: s };
    });
  }, [active]);

  const selectedSources = (table && selectedIdx !== null) ? table.rows[selectedIdx]?.sources ?? [] : [];

  // 로딩 시 첫 행 자동 선택
  useEffect(() => {
    if (!loading && table && selectedIdx === null) {
      setSelectedIdx(0);
    }
  }, [loading, table, selectedIdx]);

  const progressPct = totalRows > 0 ? Math.round((confirmedCount / totalRows) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>

      {/* ── 헤더 ── */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: 52,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <a href="/" style={{
          display: "flex", alignItems: "center", gap: 6, textDecoration: "none",
          color: "var(--text-muted)", fontSize: 12, padding: "4px 8px",
          borderRadius: 6, border: "1px solid var(--border)", background: "transparent",
        }}>
          ← 홈
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>P</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>PPQR Agent</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {productName ? `${productName}${productCode ? ` · ${productCode}` : ""}` : "연간품질평가 (PPQR) 데이터 검토"}
            </div>
          </div>
        </div>

        {/* 진행 현황 + Word 다운로드 */}
        {table && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 120, height: 6, borderRadius: 3, background: "#e2e8e4", overflow: "hidden" }}>
                <div style={{
                  width: `${progressPct}%`, height: "100%",
                  background: progressPct === 100 ? "var(--brand)" : "var(--brand)",
                  borderRadius: 3, transition: "width 0.3s ease",
                }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {confirmedCount} / {totalRows} 확인됨
              </span>
            </div>

            {confirmedCount < totalRows && (
              <button
                onClick={handleConfirmAll}
                style={{
                  padding: "5px 14px", borderRadius: 6, border: "1.5px solid var(--brand)",
                  background: "transparent", color: "var(--brand)", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = "var(--brand-light)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; }}
              >
                일괄 확인
              </button>
            )}
            {confirmedCount === totalRows && totalRows > 0 && (
              <span style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600 }}>✓ 전체 확인 완료</span>
            )}

            <a
              href="/api/download-word"
              target="_blank"
              style={{
                padding: "5px 14px", borderRadius: 6,
                border: "1.5px solid var(--brand)",
                background: "var(--brand)", color: "#fff",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap", textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >
              ↓ Word 생성
            </a>
          </div>
        )}
      </header>

      {/* ── 탭 ── */}
      <div style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        display: "flex",
        gap: 2,
        flexShrink: 0,
      }}>
        {TABS.map(tab => {
          const t = tables[tab.id];
          const rc = t?.rows.filter(r => r.review_required).length ?? 0;
          const cc = (confirmed[tab.id] ?? new Set()).size;
          const tc = t?.rows.length ?? 0;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: "10px 18px",
                border: "none",
                borderBottom: isActive ? `2px solid var(--brand)` : "2px solid transparent",
                background: "transparent",
                color: isActive ? "var(--brand)" : "var(--text-muted)",
                fontWeight: isActive ? 700 : 400,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
              {tc > 0 && (
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 10,
                  background: cc === tc ? "var(--brand)" : "var(--brand-light)",
                  color: cc === tc ? "#fff" : "var(--brand)",
                  fontWeight: 600,
                }}>
                  {cc}/{tc}
                </span>
              )}
              {rc > 0 && (
                <span style={{
                  fontSize: 10, padding: "1px 5px", borderRadius: 10,
                  background: "#fef3c7", color: "#b45309", fontWeight: 600,
                }}>
                  ⚠{rc}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 본문 ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{
              width: 32, height: 32, border: "3px solid var(--brand-light)",
              borderTop: "3px solid var(--brand)", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>데이터 로딩 중...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 10,
              padding: "24px 32px", color: "#b91c1c", maxWidth: 400, textAlign: "center",
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠</div>
              {error}
            </div>
          </div>
        )}

        {!loading && !error && table && (
          <>
            {/* 왼쪽: PPQR 검토 테이블 */}
            <div style={{
              width: selectedSources.length > 0 ? "52%" : "100%",
              borderRight: selectedSources.length > 0 ? "1px solid var(--border)" : "none",
              display: "flex", flexDirection: "column", overflow: "hidden",
              transition: "width 0.2s ease",
            }}>
              <ReviewTable
                table={table}
                selectedIdx={selectedIdx}
                confirmedSet={confirmedSet}
                edits={edits[active] ?? {}}
                onSelect={setSelectedIdx}
                onConfirm={handleConfirm}
                onUnconfirm={handleUnconfirm}
                onEdit={handleEdit}
              />
            </div>

            {/* 오른쪽: 소스 패널 */}
            {selectedSources.length > 0 && selectedIdx !== null && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <SourcePanel
                  sources={selectedSources}
                  rowData={table.rows[selectedIdx]}
                  rowIdx={selectedIdx}
                  onClose={() => setSelectedIdx(null)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewContent />
    </Suspense>
  );
}
