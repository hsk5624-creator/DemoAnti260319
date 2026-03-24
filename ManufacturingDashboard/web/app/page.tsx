'use client';

import { useState, useCallback, useEffect } from 'react';
import { ActualFile, PlanRow } from '@/lib/types';
import { parseActualFile, parsePlanFile } from '@/lib/parseExcel';
import {
  getKpiSummary, aggregateByGroup, aggregateByAccount,
  buildCumulativeData, getMonthlyBalanceItems,
  GroupSummary, AccountSummary, MonthlyPoint, KpiSummary, BalanceItem,
} from '@/lib/aggregate';
import FileManager from '@/components/FileManager';
import KpiCards from '@/components/KpiCards';
import OrgTable from '@/components/OrgTable';
import AccountChart from '@/components/AccountChart';
import CumulativeChart from '@/components/CumulativeChart';
import BalanceModal from '@/components/BalanceModal';

const PLAN_STORAGE_KEY = 'budget-plan-rows';
const PLAN_NAME_KEY = 'budget-plan-filename';

export default function Dashboard() {
  const [planFileName, setPlanFileName] = useState<string | null>(null);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [actualFiles, setActualFiles] = useState<ActualFile[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLAN_STORAGE_KEY);
      const name = localStorage.getItem(PLAN_NAME_KEY);
      if (saved && name) {
        setPlanRows(JSON.parse(saved));
        setPlanFileName(name);
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
        return exists
          ? prev.map((f) => (f.label === result.label ? result : f))
          : [...prev, result];
      });
      setSelectedLabel(result.label);
    } catch {
      setError('실적 파일 파싱에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRemoveActual = useCallback((label: string) => {
    setActualFiles((prev) => prev.filter((f) => f.label !== label));
    setSelectedLabel((prev) => {
      if (prev !== label) return prev;
      const remaining = actualFiles.filter((f) => f.label !== label);
      return remaining.length > 0 ? remaining[remaining.length - 1].label : null;
    });
  }, [actualFiles]);

  const selectedFile = actualFiles.find((f) => f.label === selectedLabel) ?? null;

  let kpi: KpiSummary | null = null;
  let groups: GroupSummary[] = [];
  let accounts: AccountSummary[] = [];
  let cumulData: MonthlyPoint[] = [];
  let balanceItems: BalanceItem[] = [];

  if (selectedFile) {
    kpi = getKpiSummary(selectedFile.rows);
    groups = aggregateByGroup(selectedFile.rows);
    accounts = aggregateByAccount(selectedFile.rows);
    balanceItems = getMonthlyBalanceItems(selectedFile.rows);
  }
  if (planRows.length > 0 && selectedFile) {
    cumulData = buildCumulativeData(planRows, selectedFile.month);
  }
  const cumulPoint = cumulData.find((d) => d.month === selectedFile?.month) ?? null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-white">제조경영 예산 대시보드</h1>
            <p className="text-xs text-slate-400">Manufacturing Budget Dashboard</p>
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
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        <FileManager
          planFileName={planFileName}
          actualFiles={actualFiles}
          selectedMonth={selectedLabel}
          onPlanUpload={handlePlanUpload}
          onActualUpload={handleActualUpload}
          onSelectMonth={setSelectedLabel}
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

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-3">
                <OrgTable groups={groups} />
              </div>
              <div className="xl:col-span-2">
                <AccountChart accounts={accounts} />
              </div>
            </div>

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

      {/* 당월 잔액 상세 모달 */}
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
