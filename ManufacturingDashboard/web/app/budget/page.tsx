'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import SuggestionBoard from '@/components/SuggestionBoard';
import { ActualFile, PlanRow } from '@/lib/types';
import { parseActualFile, parsePlanFile } from '@/lib/parseExcel';
import {
  getKpiSummary, aggregateByGroup, aggregateByAccount,
  buildCumulativeData, getMonthlyBalanceItems, applyPlanData,
  GroupSummary, AccountSummary, MonthlyPoint, KpiSummary, BalanceItem,
} from '@/lib/aggregate';
import FileManager from '@/components/FileManager';
import KpiCards from '@/components/KpiCards';
import OrgTable from '@/components/OrgTable';
import AccountChart from '@/components/AccountChart';
import CumulativeChart from '@/components/CumulativeChart';
import BalanceModal from '@/components/BalanceModal';

const PLAN_STORAGE_KEY   = 'budget-plan-rows';
const PLAN_NAME_KEY      = 'budget-plan-filename';
const ACTUAL_FILES_KEY   = 'budget-actual-files';
const ACTUAL_LABEL_KEY   = 'budget-selected-label';

export default function BudgetDashboard() {
  const [planFileName, setPlanFileName] = useState<string | null>(null);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [actualFiles, setActualFiles] = useState<ActualFile[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLAN_STORAGE_KEY);
      const name  = localStorage.getItem(PLAN_NAME_KEY);
      if (saved && name) { setPlanRows(JSON.parse(saved)); setPlanFileName(name); }

      const savedFiles = localStorage.getItem(ACTUAL_FILES_KEY);
      const savedLabel = localStorage.getItem(ACTUAL_LABEL_KEY);
      if (savedFiles) {
        const files: ActualFile[] = JSON.parse(savedFiles);
        setActualFiles(files);
        setSelectedLabel(savedLabel ?? (files.at(-1)?.label ?? null));
      }
    } catch { /* ignore */ }
  }, []);

  const handlePlanUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await parsePlanFile(file);
      setPlanRows(rows);
      setPlanFileName(file.name);
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(rows));
      localStorage.setItem(PLAN_NAME_KEY, file.name);
    } catch {
      setError('연간 사업계획 파일 파싱에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleActualUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await parseActualFile(file);
      setActualFiles((prev) => {
        const exists = prev.find((f) => f.label === result.label);
        const next = exists
          ? prev.map((f) => (f.label === result.label ? result : f))
          : [...prev, result];
        localStorage.setItem(ACTUAL_FILES_KEY, JSON.stringify(next));
        return next;
      });
      setSelectedLabel(result.label);
      localStorage.setItem(ACTUAL_LABEL_KEY, result.label);
    } catch {
      setError('실적 파일 파싱에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRemoveActual = useCallback((label: string) => {
    setActualFiles((prev) => {
      const next = prev.filter((f) => f.label !== label);
      localStorage.setItem(ACTUAL_FILES_KEY, JSON.stringify(next));
      return next;
    });
    setSelectedLabel((prev) => {
      const remaining = actualFiles.filter((f) => f.label !== label);
      const next = prev !== label ? prev : (remaining.at(-1)?.label ?? null);
      localStorage.setItem(ACTUAL_LABEL_KEY, next ?? '');
      return next;
    });
  }, [actualFiles]);

  const selectedFile = actualFiles.find((f) => f.label === selectedLabel) ?? null;

  let kpi: KpiSummary | null = null;
  let groups: GroupSummary[] = [];
  let accounts: AccountSummary[] = [];
  let cumulData: MonthlyPoint[] = [];
  let balanceItems: BalanceItem[] = [];

  if (selectedFile) {
    // 연간 사업계획 파일이 있으면 해당 월 계획값으로 totalPlanM 교체
    const effectiveRows = planRows.length > 0
      ? applyPlanData(selectedFile.rows, planRows, selectedFile.month)
      : selectedFile.rows;
    kpi = getKpiSummary(effectiveRows);
    groups = aggregateByGroup(effectiveRows);
    accounts = aggregateByAccount(effectiveRows);
    balanceItems = getMonthlyBalanceItems(effectiveRows);
  }
  if (planRows.length > 0 && selectedFile) {
    cumulData = buildCumulativeData(planRows, selectedFile.month);
  }
  const cumulPoint = cumulData.find((d) => d.month === selectedFile?.month) ?? null;

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
              <h1 className="text-base font-bold text-white">제조부문 운영예산 대시보드</h1>
              <p className="text-xs text-slate-400">Manufacturing Operations Budget Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
      <SuggestionBoard page="budget" pageLabel="운영예산" open={showSuggestion} onClose={() => setShowSuggestion(false)} />

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        <FileManager
          planFileName={planFileName}
          actualFiles={actualFiles}
          selectedMonth={selectedLabel}
          onPlanUpload={handlePlanUpload}
          onActualUpload={handleActualUpload}
          onSelectMonth={(label) => {
              setSelectedLabel(label);
              localStorage.setItem(ACTUAL_LABEL_KEY, label ?? '');
            }}
          onRemoveActual={handleRemoveActual}
        />

        {!selectedFile && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
            <div className="text-5xl">📊</div>
            <h2 className="text-lg font-semibold text-slate-300">실적 파일을 업로드해 주세요</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              주간 다운로드한 실적 XLSX 파일을 업로드하면<br />
              계획 대비 집행률을 바로 확인할 수 있습니다.
            </p>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <p>① 연간 사업계획 파일 업로드 (최초 1회)</p>
              <p>② 주간 실적 파일 추가 → 선택하면 대시보드 갱신</p>
            </div>
          </div>
        )}

        {selectedFile && kpi && (
          <>
            <KpiCards
              kpi={kpi}
              label={selectedLabel ?? ''}
              cumulPoint={cumulPoint}
              onBalanceClick={() => setShowBalanceModal(true)}
            />

            <AccountChart accounts={accounts} />
            <OrgTable groups={groups} rows={selectedFile.rows} />

            {cumulData.length > 0 ? (
              <CumulativeChart data={cumulData} currentMonth={selectedFile.month} />
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-400">
                  📅 연간 사업계획 파일을 업로드하면 월간 누적 계획 vs 실적 차트가 표시됩니다.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {showBalanceModal && kpi && (
        <BalanceModal
          items={balanceItems}
          totalBalance={kpi.budgetBalanceM}
          label={selectedLabel ?? ''}
          onClose={() => setShowBalanceModal(false)}
        />
      )}
    </div>
  );
}
