'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import SuggestionBoard from '@/components/SuggestionBoard';
import { SalesFile, SalesFileMeta, SalesRow } from '@/lib/salesTypes';
import { parseSalesFile } from '@/lib/parseSalesExcel';
import {
  getSalesKpi, buildSalesHierarchy, getSalesMonthlyData, getSalesQuarterlyData,
  buildGapMap, applyGapMap,
  SalesKpi, SalesItemSummary, SalesMonthlyPoint, SalesQuarterlySummary,
} from '@/lib/salesAggregate';
import SalesFileManager from '@/components/SalesFileManager';
import SalesKpiCards from '@/components/SalesKpiCards';
import SalesQuarterlyCards from '@/components/SalesQuarterlyCards';
import SalesMonthlyChart from '@/components/SalesMonthlyChart';
import SalesSummaryTable from '@/components/SalesSummaryTable';
import SalesWeeklyNotesCard from '@/components/SalesWeeklyNotesCard';

const CACHE_VERSION      = '4';  // 파서 변경 시 올려서 캐시 자동 초기화
const PLAN_LABEL_KEY     = 'sales-plan-label';
const FILES_KEY          = 'sales-weekly-files';
const SELECTED_LABEL_KEY = 'sales-selected-label';
const ORDER_KEY          = 'sales-file-order';
const CACHE_VER_KEY      = 'sales-cache-version';

/** 날짜 기준 정렬 (오래된 순) — 초기 기본값용 */
function sortByDate(files: SalesFile[]): SalesFile[] {
  return [...files].sort((a, b) => {
    if (a.refYear  !== b.refYear)  return a.refYear  - b.refYear;
    if (a.refMonth !== b.refMonth) return a.refMonth - b.refMonth;
    return a.refDay - b.refDay;
  });
}

/** order 배열 순서대로 files 반환 (order에 없는 파일은 뒤에 추가) */
function applyOrder(files: SalesFile[], order: string[]): SalesFile[] {
  const map = new Map(files.map((f) => [f.label, f]));
  const ordered = order.filter((l) => map.has(l)).map((l) => map.get(l)!);
  const rest = files.filter((f) => !order.includes(f.label));
  return [...ordered, ...rest];
}

export default function SalesDashboard() {
  const [planLabel, setPlanLabel] = useState<string | null>(null);
  const [salesFiles, setSalesFiles] = useState<SalesFile[]>([]);   // 완전히 파싱된 파일
  const [stubMetas, setStubMetas] = useState<SalesFileMeta[]>([]);  // 서버 파일 메타만 (미파싱)
  const [fileOrder, setFileOrder] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [compareLabel, setCompareLabel] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null); // 현재 파싱 중
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // 파서 버전이 다르면 캐시 초기화
        if (localStorage.getItem(CACHE_VER_KEY) !== CACHE_VERSION) {
          localStorage.removeItem(FILES_KEY);
          localStorage.removeItem(ORDER_KEY);
          localStorage.removeItem(SELECTED_LABEL_KEY);
          localStorage.setItem(CACHE_VER_KEY, CACHE_VERSION);
        }

        const storedFiles     = localStorage.getItem(FILES_KEY);
        const storedPlanLabel = localStorage.getItem(PLAN_LABEL_KEY);
        const storedSelected  = localStorage.getItem(SELECTED_LABEL_KEY);
        const storedOrder     = localStorage.getItem(ORDER_KEY);

        const cachedFiles: SalesFile[] = storedFiles ? JSON.parse(storedFiles) : [];
        const cachedLabels = new Set(cachedFiles.map((f) => f.label));

        // 서버에서 메타데이터만 빠르게 가져옴 (XLSX 파싱 없음)
        let serverMetas: SalesFileMeta[] = [];
        try {
          const res = await fetch('/api/sales-files');
          if (res.ok) serverMetas = await res.json();
        } catch { /* server unavailable */ }

        // 캐시에 없는 서버 파일 → stub으로 표시
        const newStubs = serverMetas.filter((m) => !cachedLabels.has(m.label));

        // 순서 계산: 캐시 + stub 합산
        const allMetas: SalesFileMeta[] = [
          ...cachedFiles,
          ...newStubs,
        ];
        const order: string[] = storedOrder
          ? JSON.parse(storedOrder)
          : sortByDate(allMetas as SalesFile[]).map((f) => f.label);
        const allLabels = new Set(allMetas.map((m) => m.label));
        const newLabels = allMetas.filter((m) => !order.includes(m.label)).map((m) => m.label);
        const finalOrder = [...order.filter((l) => allLabels.has(l)), ...newLabels];

        setSalesFiles(cachedFiles);
        setStubMetas(newStubs);
        setFileOrder(finalOrder);
        localStorage.setItem(ORDER_KEY, JSON.stringify(finalOrder));

        // 마지막 선택 파일 복원 (캐시에 있는 것만)
        if (cachedFiles.length > 0 || newStubs.length > 0) {
          const ordered = applyOrder(allMetas as SalesFile[], finalOrder);
          const validLabel = storedSelected && allLabels.has(storedSelected)
            ? storedSelected
            : ordered.at(-1)!.label;
          setSelectedLabel(validLabel);
        }
        if (storedPlanLabel) setPlanLabel(storedPlanLabel);
      } catch { /* ignore */ }
    }
    init();
  }, []);

  const upsertFile = useCallback((result: SalesFile) => {
    setSalesFiles((prev) => {
      const exists = prev.find((f) => f.label === result.label);
      const next = exists
        ? prev.map((f) => f.label === result.label ? result : f)
        : [...prev, result];
      localStorage.setItem(FILES_KEY, JSON.stringify(next));
      return next;
    });
    setFileOrder((prev) => {
      if (prev.includes(result.label)) return prev;
      const next = [...prev, result.label];
      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
      return next;
    });
    setSelectedLabel(result.label);
    localStorage.setItem(SELECTED_LABEL_KEY, result.label);
    setCompareLabel(null);
  }, []);

  const handlePlanUpload = useCallback(async (file: File) => {
    setLoading(true); setError(null);
    try {
      const result = await parseSalesFile(file);
      setPlanLabel(file.name);
      localStorage.setItem(PLAN_LABEL_KEY, file.name);
      upsertFile(result);
    } catch {
      setError('파일 파싱에 실패했습니다. 파일 형식을 확인해 주세요.');
    } finally { setLoading(false); }
  }, [upsertFile]);

  const handleSalesUpload = useCallback(async (file: File) => {
    setLoading(true); setError(null);
    try {
      const result = await parseSalesFile(file);
      upsertFile(result);
    } catch {
      setError('파일 파싱에 실패했습니다. 파일 형식을 확인해 주세요.');
    } finally { setLoading(false); }
  }, [upsertFile]);

  /** stub 파일 클릭 시 온디맨드 파싱 */
  const handleSelectFile = useCallback(async (label: string) => {
    const isLoaded = salesFiles.some((f) => f.label === label);
    if (isLoaded) {
      setSelectedLabel(label);
      localStorage.setItem(SELECTED_LABEL_KEY, label);
      setCompareLabel(null);
      return;
    }
    // stub → 파싱 요청
    setLoadingLabel(label);
    setSelectedLabel(label);
    try {
      const res = await fetch('/api/sales-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error('parse failed');
      const file: SalesFile = await res.json();
      setSalesFiles((prev) => {
        const next = [...prev, file];
        localStorage.setItem(FILES_KEY, JSON.stringify(next));
        return next;
      });
      setStubMetas((prev) => prev.filter((m) => m.label !== label));
      localStorage.setItem(SELECTED_LABEL_KEY, label);
      setCompareLabel(null);
    } catch {
      setError('파일 파싱에 실패했습니다.');
    } finally {
      setLoadingLabel(null);
    }
  }, [salesFiles]);

  const handleRemoveFile = useCallback((label: string) => {
    setSalesFiles((prev) => {
      const next = prev.filter((f) => f.label !== label);
      localStorage.setItem(FILES_KEY, JSON.stringify(next));
      return next;
    });
    setStubMetas((prev) => prev.filter((m) => m.label !== label));
    setFileOrder((prev) => {
      const next = prev.filter((l) => l !== label);
      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
      return next;
    });
    setSelectedLabel((prev) => {
      if (prev !== label) return prev;
      const remaining = applyOrder(salesFiles.filter((f) => f.label !== label), fileOrder.filter((l) => l !== label));
      const next = remaining.length ? remaining.at(-1)!.label : null;
      localStorage.setItem(SELECTED_LABEL_KEY, next ?? '');
      return next;
    });
  }, [salesFiles, fileOrder]);

  const handleReorder = useCallback((newOrder: string[]) => {
    setFileOrder(newOrder);
    localStorage.setItem(ORDER_KEY, JSON.stringify(newOrder));
  }, []);

  // ── 선택 파일 & 비교 파일 ────────────────────────────────────────────────
  const orderedFiles = applyOrder(salesFiles, fileOrder);
  const selectedFile = orderedFiles.find((f) => f.label === selectedLabel) ?? null;

  // compareLabel이 지정되면 해당 파일, 없으면 자동으로 바로 이전 파일(순서 기준)
  const prevFile = compareLabel
    ? (orderedFiles.find((f) => f.label === compareLabel) ?? null)
    : (() => {
        const idx = selectedFile ? orderedFiles.indexOf(selectedFile) : -1;
        return idx > 0 ? orderedFiles[idx - 1] : null;
      })();

  // ── Gap 계산 (파일 직접 비교) ─────────────────────────────────────────────
  let rows: SalesRow[] = selectedFile?.rows ?? [];
  if (selectedFile && prevFile) {
    const gapMap = buildGapMap(selectedFile.rows, prevFile.rows);
    rows = applyGapMap(selectedFile.rows, gapMap);
  } else if (selectedFile) {
    // 이전 파일 없음 → gap = 0 처리
    rows = selectedFile.rows.map((r) => ({ ...r, gap: 0, prevForecast: 0 }));
  }

  // ── 집계 ──────────────────────────────────────────────────────────────────
  let kpi: SalesKpi | null = null;
  let hierarchyRoot: SalesItemSummary | null = null;
  let monthlyData: SalesMonthlyPoint[] = [];
  let quarterlyData: SalesQuarterlySummary[] = [];

  if (selectedFile) {
    kpi           = getSalesKpi(rows, selectedYear);
    hierarchyRoot = buildSalesHierarchy(rows, selectedYear);
    monthlyData   = getSalesMonthlyData(rows, selectedYear);
    quarterlyData = getSalesQuarterlyData(rows, selectedYear);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
              ← 홈
            </Link>
            <div className="w-px h-4 bg-slate-600" />
            <div>
              <h1 className="text-base font-bold text-white">제조부문 매출 대시보드</h1>
              <p className="text-xs text-slate-400">Manufacturing Sales Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {prevFile && (
              <span className="text-xs text-slate-500">
                비교 기준: <span className="text-violet-400">{prevFile.label}</span>
              </span>
            )}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                파일 처리 중...
              </div>
            )}
            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg">{error}</p>
            )}
            <button
              onClick={() => setShowSuggestion(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              개선 제안
            </button>
          </div>
        </div>
      </header>
      <SuggestionBoard page="sales" pageLabel="매출" open={showSuggestion} onClose={() => setShowSuggestion(false)} />

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        <SalesFileManager
          planLabel={planLabel}
          salesFiles={orderedFiles}
          stubMetas={stubMetas}
          loadingLabel={loadingLabel}
          fileOrder={fileOrder}
          selectedLabel={selectedLabel}
          compareLabel={compareLabel}
          selectedYear={selectedYear}
          onPlanUpload={handlePlanUpload}
          onSalesUpload={handleSalesUpload}
          onSelectFile={handleSelectFile}
          onSelectCompare={setCompareLabel}
          onRemoveFile={handleRemoveFile}
          onReorder={handleReorder}
          onSelectYear={setSelectedYear}
        />

        {loadingLabel && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-400">{loadingLabel} 분석 중...</p>
          </div>
        )}

        {!selectedFile && !loadingLabel && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
            <div className="text-5xl">📈</div>
            <h2 className="text-lg font-semibold text-slate-300">주간 매출 파일을 업로드해 주세요</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              매주 다운로드한 주간 매출보고 XLSX 파일을 업로드하면<br />
              계획 대비 실적 및 전주 Gap을 바로 확인할 수 있습니다.
            </p>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <p>① 주간 실적 파일 업로드 → 날짜별 자동 라벨</p>
              <p>② 2주 이상 누적 시 자동 전주 Gap 비교</p>
              <p>③ 연도 선택 → 해당 연도 데이터 조회</p>
            </div>
          </div>
        )}

        {selectedFile && !loadingLabel && kpi && hierarchyRoot && (
          <>
            <SalesKpiCards kpi={kpi} year={selectedYear} label={selectedLabel ?? ''} hasPrev={!!prevFile} />
            <SalesWeeklyNotesCard notes={selectedFile.weeklyNotes ?? []} label={selectedLabel ?? ''} gap={kpi.gap} hasPrev={!!prevFile} />
            <SalesQuarterlyCards quarters={quarterlyData} hasPrev={!!prevFile} />
            <SalesSummaryTable rows={rows} year={selectedYear} />

            <SalesMonthlyChart data={monthlyData} refMonth={selectedFile.refMonth} rows={rows} year={selectedYear} />
          </>
        )}
      </main>
    </div>
  );
}
