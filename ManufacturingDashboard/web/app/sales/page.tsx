'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { SalesFile, SalesRow } from '@/lib/salesTypes';
import { parseSalesFile } from '@/lib/parseSalesExcel';
import {
  getSalesKpi, buildSalesHierarchy, getSalesMonthlyData, getSalesQuarterlyData,
  buildGapMap, applyGapMap,
  SalesKpi, SalesItemSummary, SalesMonthlyPoint, SalesQuarterlySummary,
} from '@/lib/salesAggregate';
import SalesFileManager from '@/components/SalesFileManager';
import SalesKpiCards from '@/components/SalesKpiCards';
import SalesQuarterlyCards from '@/components/SalesQuarterlyCards';
import SalesHierarchyTable from '@/components/SalesHierarchyTable';
import SalesMonthlyChart from '@/components/SalesMonthlyChart';
import SalesSummaryTable from '@/components/SalesSummaryTable';

const PLAN_LABEL_KEY     = 'sales-plan-label';
const FILES_KEY          = 'sales-weekly-files';
const SELECTED_LABEL_KEY = 'sales-selected-label';
const ORDER_KEY          = 'sales-file-order';

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
  const [salesFiles, setSalesFiles] = useState<SalesFile[]>([]);
  const [fileOrder, setFileOrder] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [compareLabel, setCompareLabel] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedFiles     = localStorage.getItem(FILES_KEY);
      const storedPlanLabel = localStorage.getItem(PLAN_LABEL_KEY);
      const storedSelected  = localStorage.getItem(SELECTED_LABEL_KEY);
      const storedOrder     = localStorage.getItem(ORDER_KEY);
      if (storedFiles) {
        const files: SalesFile[] = JSON.parse(storedFiles);
        const order: string[] = storedOrder ? JSON.parse(storedOrder) : sortByDate(files).map((f) => f.label);
        setSalesFiles(files);
        setFileOrder(order);
        if (files.length > 0) {
          const ordered = applyOrder(files, order);
          const validLabel = storedSelected && files.some((f) => f.label === storedSelected)
            ? storedSelected
            : ordered.at(-1)!.label;
          setSelectedLabel(validLabel);
        }
      }
      if (storedPlanLabel) setPlanLabel(storedPlanLabel);
    } catch { /* ignore */ }
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

  const handleRemoveFile = useCallback((label: string) => {
    setSalesFiles((prev) => {
      const next = prev.filter((f) => f.label !== label);
      localStorage.setItem(FILES_KEY, JSON.stringify(next));
      return next;
    });
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
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        <SalesFileManager
          planLabel={planLabel}
          salesFiles={orderedFiles}
          fileOrder={fileOrder}
          selectedLabel={selectedLabel}
          compareLabel={compareLabel}
          selectedYear={selectedYear}
          onPlanUpload={handlePlanUpload}
          onSalesUpload={handleSalesUpload}
          onSelectFile={(label) => {
              setSelectedLabel(label);
              localStorage.setItem(SELECTED_LABEL_KEY, label);
              setCompareLabel(null);
            }}
          onSelectCompare={setCompareLabel}
          onRemoveFile={handleRemoveFile}
          onReorder={handleReorder}
          onSelectYear={setSelectedYear}
        />

        {!selectedFile && (
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

        {selectedFile && kpi && hierarchyRoot && (
          <>
            <SalesKpiCards kpi={kpi} year={selectedYear} label={selectedLabel ?? ''} hasPrev={!!prevFile} />
            <SalesQuarterlyCards quarters={quarterlyData} hasPrev={!!prevFile} />
            <SalesSummaryTable rows={rows} year={selectedYear} />

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-3">
                <SalesHierarchyTable root={hierarchyRoot} />
              </div>
              <div className="xl:col-span-2">
                <SalesMonthlyChart data={monthlyData} refMonth={selectedFile.refMonth} rows={rows} year={selectedYear} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
