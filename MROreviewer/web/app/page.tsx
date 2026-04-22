"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ProductAnalysis, PurchaseEvent } from "@/lib/analyze";
import type { FuzzyMatch } from "@/lib/fuzzy";
import type { DeptItem, DeptFilter } from "@/components/DeptFilter";
import type { ReviewItem } from "@/lib/reviewTypes";

const AmountTrendChart   = dynamic(() => import("@/components/AmountTrendChart"),   { ssr: false });
const PriceHistoryChart  = dynamic(() => import("@/components/PriceHistoryChart"),  { ssr: false });
const DepartmentChart    = dynamic(() => import("@/components/DepartmentChart"),    { ssr: false });
const FrequencyChart     = dynamic(() => import("@/components/FrequencyChart"),     { ssr: false });
const Highlights2026     = dynamic(() => import("@/components/Highlights2026"),     { ssr: false });
const SimilarProducts    = dynamic(() => import("@/components/SimilarProducts"),    { ssr: false });
const DeptFilter         = dynamic(() => import("@/components/DeptFilter"),         { ssr: false });
const ReviewInput        = dynamic(() => import("@/components/ReviewInput"),        { ssr: false });
const ReviewComparison   = dynamic(() => import("@/components/ReviewComparison"),   { ssr: false });
const SpecSearchInput    = dynamic(() => import("@/components/SpecSearchInput"),    { ssr: false });

// ─── 파일 관리 패널 ─────────────────────────────────────────

function FilePanel({ onRefresh }: { onRefresh: () => void }) {
  const [files, setFiles] = useState<{ name: string; isHistory: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    const res = await fetch("/api/files");
    setFiles(await res.json());
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.ok) {
      setMsg(`✅ "${data.name}" 업로드 완료`);
      loadFiles();
      onRefresh();
    } else {
      setMsg(`❌ ${data.error}`);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(name: string) {
    if (!confirm(`"${name}" 파일을 삭제하시겠습니까?`)) return;
    const res = await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.ok) { loadFiles(); onRefresh(); }
    else alert(data.error);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-gray-700 font-semibold text-sm mb-3">📂 데이터 파일 관리</h3>
      <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
        {files.map((f) => (
          <div key={f.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg
            hover:bg-gray-50 group text-xs">
            <span className={f.isHistory ? "text-gray-500" : "text-[#00733C] font-medium"}>
              {f.isHistory ? "📋" : "📄"} {f.name}
            </span>
            {!f.isHistory && (
              <button onClick={() => handleDelete(f.name)}
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                삭제
              </button>
            )}
          </div>
        ))}
      </div>
      <label className={`flex items-center justify-center gap-2 cursor-pointer rounded-xl px-4 py-2.5
        border-2 border-dashed text-sm transition-colors
        ${uploading
          ? "border-gray-200 text-gray-400"
          : "border-gray-300 hover:border-[#00733C] text-gray-400 hover:text-[#00733C]"
        }`}>
        <input ref={inputRef} type="file" accept=".xls,.xlsx" onChange={handleUpload} className="hidden" disabled={uploading} />
        {uploading ? "⏳ 업로드 중..." : "+ 2026년 월별 파일 추가 (.xls/.xlsx)"}
      </label>
      {msg && <p className="text-xs mt-2 text-center text-gray-500">{msg}</p>}
    </div>
  );
}

// ─── 통계 카드 ──────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className="text-gray-900 font-bold text-lg leading-tight">{value}</div>
      {sub && <div className="text-gray-400 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── 섹션 카드 ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-gray-700 font-semibold text-sm mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-[#00733C] inline-block" />
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── 메인 ──────────────────────────────────────────────────

export default function Home() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ exact: string[]; similar: FuzzyMatch[] }>({ exact: [], similar: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 부서 필터
  const [depts, setDepts] = useState<DeptItem[]>([]);
  const [deptFilter, setDeptFilter] = useState<DeptFilter>({ bonbu: "", damdang: "", depts: [] });

  // 규격 검색
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set());
  // 규격 환산계수 (spec → 개/묶음)
  const [specFactors, setSpecFactors] = useState<Record<string, number>>({});
  const specDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검토 중인 구매 건
  const [reviewItem, setReviewItem] = useState<ReviewItem | null>(null);
  const [excludedMonths, setExcludedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then(setDepts);
  }, [refreshKey]);

  // 검색어 자동완성
  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const norm = val.replace(/\s+/g, " ").trim();
    if (norm.length < 2) { setSuggestions({ exact: [], similar: [] }); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(norm)}`);
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    }, 200);
  }, []);

  // 필터 → API 파라미터 변환
  const buildFilterParams = useCallback((
    f: DeptFilter,
    specs?: Set<string>,
    factors?: Record<string, number>,
  ) => {
    const p = new URLSearchParams();
    if (f.depts.length > 0) f.depts.forEach((d) => p.append("dept", d));
    else if (f.damdang)     p.set("damdang", f.damdang);
    else if (f.bonbu)       p.set("bonbu",   f.bonbu);
    specs?.forEach((s) => p.append("spec", s));
    if (factors) {
      Object.entries(factors).forEach(([spec, factor]) => {
        if (factor > 1) { p.append("sfSpec", spec); p.append("sfFactor", String(factor)); }
      });
    }
    return p;
  }, []);

  // 상품 분석 실행
  const searchProduct = useCallback(async (
    name: string,
    f?: DeptFilter,
    specs?: Set<string>,
    factors?: Record<string, number>,
  ) => {
    setQuery(name);
    setShowSuggestions(false);
    setLoading(true);
    setError("");
    if (specs === undefined) setSelectedSpecs(new Set());
    try {
      const url = new URL("/api/product", window.location.origin);
      url.searchParams.set("name", name);
      const fp = buildFilterParams(
        f ?? deptFilter,
        specs !== undefined ? specs : selectedSpecs,
        factors !== undefined ? factors : specFactors,
      );
      fp.forEach((v, k) => url.searchParams.append(k, v));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setAnalysis(data); setExcludedMonths(new Set()); }
    } catch {
      setError("데이터 로딩 실패");
    } finally {
      setLoading(false);
    }
  }, [deptFilter, selectedSpecs, specFactors, buildFilterParams]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) searchProduct(query.trim());
  };

  // 부서 필터 변경 시 재조회 (규격/환산 초기화)
  const handleFilterChange = useCallback((f: DeptFilter) => {
    setDeptFilter(f);
    setSelectedSpecs(new Set());
    setSpecFactors({});
    if (query.trim() && analysis) searchProduct(query.trim(), f, new Set(), {});
  }, [query, analysis, searchProduct]);

  // 규격 체크박스 변경 시 300ms 디바운스 재조회 (선택 해제된 규격 환산계수 정리)
  const handleSpecsChange = useCallback((next: Set<string>) => {
    setSelectedSpecs(next);
    const nextFactors: Record<string, number> = {};
    Object.entries(specFactors).forEach(([spec, factor]) => {
      if (next.has(spec)) nextFactors[spec] = factor;
    });
    setSpecFactors(nextFactors);
    if (specDebounceRef.current) clearTimeout(specDebounceRef.current);
    if (!query.trim() || !analysis) return;
    specDebounceRef.current = setTimeout(() => {
      searchProduct(query.trim(), deptFilter, next, nextFactors);
    }, 300);
  }, [query, analysis, deptFilter, specFactors, searchProduct]);

  // 규격 환산계수 변경 시 300ms 디바운스 재조회
  const handleFactorChange = useCallback((spec: string, factor: number | null) => {
    const next = { ...specFactors };
    if (factor === null || factor <= 1) delete next[spec];
    else next[spec] = factor;
    setSpecFactors(next);
    if (specDebounceRef.current) clearTimeout(specDebounceRef.current);
    if (!query.trim() || !analysis) return;
    specDebounceRef.current = setTimeout(() => {
      searchProduct(query.trim(), deptFilter, selectedSpecs, next);
    }, 300);
  }, [specFactors, query, analysis, deptFilter, selectedSpecs, searchProduct]);

  // 2026 이상 건수 집계
  const flagCount = analysis?.highlights2026.reduce((s, h) => ({
    danger:  s.danger  + h.flags.filter((f) => f.severity === "danger").length,
    warning: s.warning + h.flags.filter((f) => f.severity === "warning").length,
    info:    s.info    + h.flags.filter((f) => f.severity === "info").length,
  }), { danger: 0, warning: 0, info: 0 });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 헤더 */}
      <header className="bg-[#00733C] px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">MRO 구매 검토 시스템</h1>
            <p className="text-green-200 text-xs mt-0.5">2024~2025 이력 기반 · 구매 적절성 검토</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* 좌: 메인 콘텐츠 */}
        <div className="space-y-4">
          {/* 검색창 */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.exact.length + suggestions.similar.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="상품명을 입력하세요 (예: sodium L-tartrate, 파일케이스)"
                  className="w-full bg-white border border-gray-300 rounded-xl px-5 py-3.5 text-gray-900
                    placeholder-gray-400 focus:outline-none focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C]
                    text-sm shadow-sm"
                />
                {/* 자동완성 드롭다운 */}
                {showSuggestions && (suggestions.exact.length + suggestions.similar.length > 0) && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200
                    rounded-xl shadow-lg overflow-hidden">
                    {suggestions.exact.map((name) => (
                      <button key={name} onMouseDown={() => searchProduct(name)}
                        className="w-full text-left px-4 py-2.5 hover:bg-green-50 flex items-center gap-2 text-sm">
                        <span className="text-[#00733C] text-xs shrink-0 font-medium">완전일치</span>
                        <span className="text-gray-900">{name}</span>
                      </button>
                    ))}
                    {suggestions.similar.slice(0, 8).map((m) => (
                      <button key={m.name} onMouseDown={() => searchProduct(m.name)}
                        className="w-full text-left px-4 py-2.5 hover:bg-green-50 flex items-center gap-2 text-sm border-t border-gray-100">
                        <span className="text-amber-600 text-xs shrink-0 font-mono">{Math.round(m.score * 100)}%</span>
                        <span className="text-gray-700">{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => query.trim() && searchProduct(query.trim())}
                disabled={loading}
                className="bg-[#00733C] hover:bg-[#005a2e] disabled:bg-gray-300 text-white px-6 py-3.5
                  rounded-xl font-semibold text-sm transition-colors shrink-0 shadow-sm">
                {loading ? "검색 중…" : "검색"}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>

          {/* 부서 필터 탭 */}
          <DeptFilter
            depts={depts}
            filter={deptFilter}
            onChange={handleFilterChange}
          />

          {/* 규격 검색 (검색 결과 있을 때만) */}
          {analysis && analysis.uniqueSpecs.length > 0 && (
            <SpecSearchInput
              specs={analysis.uniqueSpecs}
              selected={selectedSpecs}
              onChange={handleSpecsChange}
              specFactors={specFactors}
              onFactorChange={handleFactorChange}
            />
          )}

          {/* 검토 중인 구매 건 입력 — analysis 블록 밖에서 항상 마운트 유지 */}
          {(analysis || loading) && (
            <ReviewInput onChange={setReviewItem} />
          )}

          {/* 분석 결과 */}
          {analysis && (
            <div className="space-y-4">
              {/* 상품명 + 필터 뱃지 */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <h2 className="text-gray-900 font-bold text-lg truncate">{analysis.productName}</h2>
                {deptFilter.bonbu && (
                  <span className="text-xs bg-green-50 text-[#00733C] border border-[#b3d9c6] rounded-full px-2.5 py-0.5 shrink-0">
                    {deptFilter.bonbu}
                  </span>
                )}
                {deptFilter.damdang && (
                  <span className="text-xs bg-green-50 text-[#00733C] border border-[#b3d9c6] rounded-full px-2.5 py-0.5 shrink-0">
                    {deptFilter.damdang}
                  </span>
                )}
                {deptFilter.depts.map((full) => (
                  <span key={full} className="text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5 shrink-0">
                    {depts.find((d) => d.full === full)?.team ?? full}
                  </span>
                ))}
                {selectedSpecs.size > 0 && (
                  <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 shrink-0">
                    규격 {selectedSpecs.size}개 선택
                    {Object.keys(specFactors).length > 0 && " · 환산 적용"}
                  </span>
                )}
              </div>

              {/* 검토 비교 결과 */}
              {reviewItem && (
                <ReviewComparison review={reviewItem} analysis={analysis} />
              )}

              {/* 요약 카드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="전체 구매 건수" value={`${analysis.totalRecords}건`} sub="2024~2026" />
                <StatCard label="이력 건수" value={`${analysis.historyRecords}건`} sub="2024~2025" />
                <StatCard label="2026년 건수" value={`${analysis.records2026}건`} />
                <StatCard
                  label="2026 이상 플래그"
                  value={flagCount && (flagCount.danger + flagCount.warning + flagCount.info) > 0
                    ? `🔴 ${flagCount.danger} · 🟡 ${flagCount.warning} · ℹ️ ${flagCount.info}`
                    : "이상 없음"}
                />
              </div>

              {/* 단가 요약 */}
              {analysis.priceStats.avgHistory > 0 && (() => {
                const excludedHistCount = [...excludedMonths].filter(k => parseInt(k.split(".")[0]) !== 2026).length;
                const localTotalQty = (analysis.purchaseEvents as PurchaseEvent[])
                  .filter(e => {
                    const d = new Date(e.timestamp);
                    const k = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return e.year !== 2026 && !excludedMonths.has(k);
                  })
                  .reduce((s, e) => s + e.quantity, 0);
                const localAvgMonthlyQty = Math.round((localTotalQty / Math.max(1, 24 - excludedHistCount)) * 10) / 10;
                return (
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard label="과거 평균단가" value={`${analysis.priceStats.avgHistory.toLocaleString()}원`} sub="2024~2025" />
                    <StatCard label="과거 최저/최고" value={`${analysis.priceStats.minHistory.toLocaleString()} ~ ${analysis.priceStats.maxHistory.toLocaleString()}`} />
                    <StatCard
                      label="월평균 구매수량"
                      value={`${localAvgMonthlyQty}개/월`}
                      sub={excludedHistCount > 0 ? `${excludedHistCount}개월 제외` : "과거 기준"}
                    />
                  </div>
                );
              })()}

              {/* A) 구매 시점 타임라인 */}
              <Section title="구매 시점별 수량 타임라인">
                <FrequencyChart
                  events={analysis.purchaseEvents}
                  avgIntervalDays={analysis.avgIntervalDays}
                  lastPurchaseDate={analysis.lastPurchaseDate}
                  review={reviewItem}
                  excludedMonths={excludedMonths}
                  onToggleMonth={(key) => setExcludedMonths((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })}
                  onResetExcluded={() => setExcludedMonths(new Set())}
                />
              </Section>

              {/* B) 월별 금액 추이 */}
              <Section title="연도별/월별 구매금액 추이">
                <AmountTrendChart
                  data={analysis.monthlyTrend}
                  events={analysis.purchaseEvents}
                  review={reviewItem}
                  avgIntervalDays={analysis.avgIntervalDays}
                  lastPurchaseDate={analysis.lastPurchaseDate}
                />
              </Section>

              {/* C) 단가 변동 */}
              <Section title="단가 변동 이력">
                <PriceHistoryChart data={analysis.priceHistory} avgHistory={analysis.priceStats.avgHistory} review={reviewItem} />
                <p className="text-gray-400 text-xs mt-2">
                  초록점=과거(2024~2025) · 주황점=2026 | 회색점선=과거평균, 주황점선=150%
                  {reviewItem && <span className="text-red-500 ml-2 font-medium">│ 빨간점선=검토 중인 단가</span>}
                </p>
              </Section>

              {/* D) 부서/공장 분포 */}
              <Section title="구매 부서/공장 분포 (전체 기간)">
                <DepartmentChart data={analysis.deptStats} />
              </Section>

              {/* E) 2026 이상징후 */}
              <Section title="2026년 구매 건 검토">
                <Highlights2026 data={analysis.highlights2026} />
              </Section>

              {/* F) 유사 상품명 */}
              <Section title="유사 상품명 (90% 이상 일치)">
                <SimilarProducts matches={suggestions.similar} onSelect={searchProduct} />
                {suggestions.similar.length === 0 && (
                  <p className="text-gray-400 text-xs">유사 상품명 없음 (재검색 시 갱신됩니다)</p>
                )}
              </Section>
            </div>
          )}

          {/* 초기 안내 */}
          {!analysis && !loading && (
            <div className="text-center py-24 text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-lg font-semibold text-gray-500">상품명을 검색하세요</p>
              <p className="text-sm mt-2">2024~2025 구매 이력을 기반으로 구매 적절성을 분석합니다</p>
            </div>
          )}
        </div>

        {/* 우: 사이드바 */}
        <div className="space-y-4">
          <FilePanel onRefresh={() => setRefreshKey((k) => k + 1)} key={refreshKey} />

          {/* 범례 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-xs space-y-2">
            <h3 className="text-gray-700 font-semibold text-sm mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#00733C] inline-block" />
              이상 탐지 기준
            </h3>
            <div className="flex items-center gap-2 text-red-600">
              <span>🔴 위험</span>
              <span className="text-gray-400">단가 200% 초과</span>
            </div>
            <div className="flex items-center gap-2 text-amber-600">
              <span>🟡 주의</span>
              <span className="text-gray-400">단가 150%↑ / 수량 300%↑ / 신규고액</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span>ℹ️ 참고</span>
              <span className="text-gray-400">신규 품목 / 빈도 증가</span>
            </div>
            <hr className="border-gray-100 my-2" />
            <p className="text-gray-400 leading-relaxed">
              최종 승인 판단은 담당자가 합니다.<br />
              기준값은 참고용이며, 맥락에 따라 해석이 달라질 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
