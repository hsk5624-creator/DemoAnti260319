'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import SuggestionBoard from '@/components/SuggestionBoard';
import {
  ComposedChart, Bar, Line, LabelList,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { UtilizationFile, Factory, ProductBatch } from '@/lib/utilizationTypes';
import { parseUtilizationBuffer, CHEONGJU_CATEGORY_MAP } from '@/lib/parseUtilizationBuffer';

// ── 상수 ─────────────────────────────────────────────────────────────────────

const CHEONGJU_CATEGORIES = ['국내제네릭', '내재화(해외/국내)', '개량신약', '개발'] as const;
const JINCHEONG_CATEGORIES = ['고덱스', 'CSO (진천)', '기타'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  '국내제네릭':        '#1d4ed8',
  '내재화(해외/국내)': '#6d28d9',
  '개량신약':          '#047857',
  '개발':              '#b45309',
  '고덱스':            '#1d4ed8',
  'CSO (진천)':        '#6d28d9',
  '기타':              '#475569',
};

const PCT_DATAKEYS = new Set(['공장 요약', '과립 요약', '포장 요약']);

// 과립/포장은 툴팁 전용 (차트 라인 비표시)
const TOOLTIP_ONLY_LINES: { key: string; label: string; color: string }[] = [
  { key: '과립 요약', label: '과립 요약', color: '#14b8a6' },
  { key: '포장 요약', label: '포장 요약', color: '#f97316' },
];

// 테이블도 과립/포장만
const UTIL_PROCESSES = ['과립', '포장'] as const;

const YEAR_OPTIONS: { label: string; value: string }[] = [
  { label: '2024년', value: '24' },
  { label: '2025년', value: '25' },
  { label: '2026년', value: '26' },
  { label: '전체',   value: 'all' },
];

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function allMonthlyPeriods(file: UtilizationFile): string[] {
  const set = new Set<string>();
  file.pivotRows.forEach((r) => { if (/^\d{2}\.\d{2}$/.test(r.period)) set.add(r.period); });
  file.equipmentRows.forEach((r) => { if (/^\d{2}\.\d{2}$/.test(r.period)) set.add(r.period); });
  return Array.from(set).sort();
}

function filterPeriods(periods: string[], year: string): string[] {
  if (year === 'all') return periods;
  return periods.filter((p) => p.startsWith(year + '.'));
}

function pct(v: number): number {
  return Math.round(v * 1000) / 10;
}

function utilBg(p: number): string {
  if (p === 0) return 'bg-slate-800 text-slate-600';
  if (p < 20)  return 'bg-red-900/50 text-red-300';
  if (p < 35)  return 'bg-orange-900/50 text-orange-300';
  if (p < 50)  return 'bg-yellow-900/40 text-yellow-300';
  if (p < 70)  return 'bg-teal-900/50 text-teal-300';
  return            'bg-emerald-900/50 text-emerald-300';
}

function mergeFiles(server: UtilizationFile[], uploaded: UtilizationFile[]): UtilizationFile[] {
  const map = new Map(server.map((f) => [f.label, f]));
  for (const u of uploaded) map.set(u.label, u); // 업로드 파일이 서버 파일보다 우선
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

// ── 커스텀 툴팁 ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const bars  = payload.filter((p: { dataKey: string }) =>  p.dataKey in CATEGORY_COLORS);
  const lines = payload.filter((p: { dataKey: string }) => !(p.dataKey in CATEGORY_COLORS));
  const totalBatch = bars.reduce((acc: number, p: { value: number }) => acc + (p.value ?? 0), 0);

  // 과립/포장 데이터는 차트 라인에 없지만 chartData에 존재 → payload[0].payload에서 추출
  const row = payload[0]?.payload as Record<string, unknown> | undefined;
  const hiddenLines = TOOLTIP_ONLY_LINES.map((tl) => ({
    name: tl.label,
    color: tl.color,
    value: row?.[tl.key] as number | null,
  }));

  const allLines = [
    ...lines.map((p: { name: string; dataKey: string; value: number; color: string }) => ({
      name: p.name, dataKey: p.dataKey, color: p.color, value: p.value,
    })),
    ...hiddenLines.map((h) => ({ ...h, dataKey: h.name })),
  ];

  return (
    <div className="bg-slate-950 border border-slate-600 rounded-lg p-3 text-xs shadow-xl min-w-36">
      <p className="font-semibold text-slate-200 mb-2">{label}</p>
      {bars.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="tabular-nums font-medium">{p.value?.toFixed(1) ?? '-'}</span> 배치
        </p>
      ))}
      {bars.length > 0 && (
        <p className="text-slate-400 border-t border-slate-700 mt-1 pt-1">
          합계: <span className="tabular-nums font-medium text-slate-200">{totalBatch.toFixed(1)}</span> 배치
        </p>
      )}
      {allLines.length > 0 && (
        <div className="border-t border-slate-700 mt-1 pt-1 space-y-0.5">
          {allLines.map((p) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}:{' '}
              <span className="tabular-nums font-medium">
                {p.value != null
                  ? PCT_DATAKEYS.has(p.dataKey) ? `${p.value.toFixed(1)}%` : `${p.value.toFixed(2)} 억정`
                  : '-'}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 연/분기 평균 가동률 (메인 차트 헤더에 인라인 표시) ────────────────────────

const UTIL_METRICS = [
  { key: '공장 요약', label: '공장 전체', color: '#f1f5f9', isProcess: false },
  { key: '과립',      label: '과립',      color: '#14b8a6', isProcess: true  },
  { key: '포장',      label: '포장',      color: '#f97316', isProcess: true  },
] as const;

const QUARTERS = [
  { label: 'Q1', months: ['01', '02', '03'] },
  { label: 'Q2', months: ['04', '05', '06'] },
  { label: 'Q3', months: ['07', '08', '09'] },
  { label: 'Q4', months: ['10', '11', '12'] },
] as const;

function avgOf(vals: (number | null)[]): number | null {
  const f = vals.filter((v): v is number => v != null);
  return f.length > 0 ? f.reduce((a, v) => a + v, 0) / f.length : null;
}

type SummaryItem = {
  label: string;
  values: { metric: string; color: string; val: number | null }[];
  prodTotal: number | null;
};

function useUtilSummary(file: UtilizationFile | null, factory: Factory, yearFilter: string) {
  const allPeriods = useMemo(() => (file ? allMonthlyPeriods(file) : []), [file]);

  return useMemo(() => {
    if (!file) return { title: '', items: [] as SummaryItem[] };

    const getUtil = (period: string, metric: typeof UTIL_METRICS[number]): number | null => {
      if (!metric.isProcess) {
        const r = file.equipmentRows.find(
          (e) => e.isFactorySummary && e.factory === factory && e.period === period
        );
        return r != null ? pct(r.value) : null;
      }
      const r = file.equipmentRows.find(
        (e) => e.isSummary && e.factory === factory && e.process === metric.key && e.period === period
      );
      return r != null ? pct(r.value) : null;
    };

    const getProdTotal = (periods: string[]): number | null => {
      const total = periods.reduce((acc, period) => {
        return acc + file.productBatches
          .filter((pb) => pb.factory === factory && pb.period === period && pb.mfgUnit != null)
          .reduce((s, pb) => s + pb.batches * pb.mfgUnit! * (pb.mfgYield ?? 1), 0);
      }, 0);
      return total > 0 ? Math.round(total / 1_000_000) / 100 : null; // 억정, 소수점 둘째자리
    };

    const makeItem = (label: string, periods: string[]): SummaryItem => ({
      label,
      values: UTIL_METRICS.map((m) => ({
        metric: m.label === '공장 전체' ? '공장' : m.label,
        color: m.color,
        val: periods.length > 0 ? avgOf(periods.map((p) => getUtil(p, m))) : null,
      })),
      prodTotal: getProdTotal(periods),
    });

    if (yearFilter === 'all') {
      const years = [...new Set(allPeriods.map((p) => '20' + p.slice(0, 2)))].sort();
      return {
        title: '연도별 평균',
        items: years.map((year) => {
          const yy = year.slice(2);
          return makeItem(year, allPeriods.filter((p) => p.startsWith(yy + '.')));
        }),
      };
    } else {
      const yp = allPeriods.filter((p) => p.startsWith(yearFilter + '.'));
      return {
        title: `20${yearFilter} 분기별 평균`,
        items: [
          ...QUARTERS.map((q) =>
            makeItem(q.label, yp.filter((p) => (q.months as readonly string[]).includes(p.slice(3))))
          ),
          makeItem('연 평균', yp),
        ],
      };
    }
  }, [file, allPeriods, factory, yearFilter]);
}

// ── 설비 상세 테이블 (과립/포장만) ────────────────────────────────────────────

function EquipmentTable({ file, factory, periods }: {
  file: UtilizationFile;
  factory: Factory;
  periods: string[];
}) {
  const [activeProcess, setActiveProcess] = useState<string>('과립');
  const [selectedCell, setSelectedCell] = useState<{ equip: string; period: string } | null>(null);

  const equipNames = useMemo(() => {
    const seen = new Set<string>();
    return file.equipmentRows
      .filter((r) => r.factory === factory && r.process === activeProcess && !r.isSummary && !r.isFactorySummary)
      .reduce<string[]>((acc, r) => {
        if (!seen.has(r.equipment)) { seen.add(r.equipment); acc.push(r.equipment); }
        return acc;
      }, []);
  }, [file, factory, activeProcess]);

  const summaryEquip = `${activeProcess} 요약`;
  const visiblePeriods = periods.slice(-24);

  const getVal = (equip: string, period: string): number | null => {
    const row = file.equipmentRows.find(
      (r) => r.factory === factory && r.equipment === equip && r.period === period
    );
    return row != null ? row.value : null;
  };

  // 선택된 셀의 제품별 배치 상세 (과립 공정일 때 설비 매칭 필터 적용)
  const productDetail: ProductBatch[] = useMemo(() => {
    if (!selectedCell) return [];
    const { equip, period } = selectedCell;
    const equipLower = equip.toLowerCase();

    return file.productBatches
      .filter((r) => {
        if (r.factory !== factory || r.period !== period) return false;
        // 과립 공정: granuleEquip 정보가 있으면 해당 설비 포함 여부로 필터
        if (activeProcess === '과립') {
          // granuleEquip이 비어있는 제품(설비 미지정)은 제외
          if (r.granuleEquip.length === 0) return false;
          return r.granuleEquip.includes(equipLower);
        }
        return true;
      })
      .sort((a, b) => b.batches - a.batches);
  }, [file, factory, selectedCell, activeProcess]);

  const handleCellClick = (equip: string, period: string) => {
    if (selectedCell?.equip === equip && selectedCell?.period === period) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ equip, period });
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">설비별 가동률 현황</h2>
          <p className="text-xs text-slate-500 mt-0.5">단위: % · 색상: 낮음(빨강) → 높음(초록) · 셀 클릭 시 제품별 배치 상세</p>
        </div>
        <div className="flex gap-1">
          {UTIL_PROCESSES.map((p) => (
            <button
              key={p}
              onClick={() => { setActiveProcess(p); setSelectedCell(null); }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                activeProcess === p
                  ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="text-left py-2 px-4 text-slate-500 font-medium whitespace-nowrap sticky left-0 bg-slate-800/95 min-w-36">
                설비
              </th>
              {visiblePeriods.map((p) => (
                <th key={p} className="text-center py-2 px-1.5 text-slate-500 font-medium whitespace-nowrap min-w-12">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipNames.map((equip) => (
              <tr key={equip} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="py-1.5 px-4 text-slate-300 whitespace-nowrap sticky left-0 bg-slate-800/95">
                  {equip}
                </td>
                {visiblePeriods.map((period) => {
                  const v = getVal(equip, period);
                  const p = v != null ? pct(v) : null;
                  const isSelected = selectedCell?.equip === equip && selectedCell?.period === period;
                  return (
                    <td
                      key={period}
                      onClick={() => handleCellClick(equip, period)}
                      className={`py-1.5 px-1 text-center tabular-nums rounded-sm cursor-pointer transition-all ${
                        p != null ? utilBg(p) : 'text-slate-700'
                      } ${isSelected ? 'ring-2 ring-violet-400 ring-inset' : 'hover:ring-1 hover:ring-slate-500 hover:ring-inset'}`}
                    >
                      {p != null ? `${p.toFixed(0)}%` : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* 공정 요약 행 */}
            <tr className="border-t border-slate-600 bg-slate-700/30">
              <td className="py-2 px-4 text-slate-200 font-semibold whitespace-nowrap sticky left-0 bg-slate-700/60">
                {activeProcess} 요약
              </td>
              {visiblePeriods.map((period) => {
                const v = getVal(summaryEquip, period);
                const p = v != null ? pct(v) : null;
                return (
                  <td
                    key={period}
                    className={`py-2 px-1 text-center tabular-nums font-semibold rounded-sm ${p != null ? utilBg(p) : 'text-slate-600'}`}
                  >
                    {p != null ? `${p.toFixed(0)}%` : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 제품별 배치 상세 패널 */}
      {selectedCell && (
        <div className="border-t border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-300">
              {factory} · {selectedCell.period} · {selectedCell.equip} — 제품별 배치 현황
            </h3>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              닫기 ✕
            </button>
          </div>
          {productDetail.length === 0 ? (
            <p className="text-xs text-slate-500">해당 기간의 제품별 배치 데이터가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {productDetail.map((pb, i) => (
                <div
                  key={`${pb.product}-${i}`}
                  className="group bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300 truncate" title={pb.product}>{pb.product}</span>
                    <span className="text-xs font-bold text-violet-300 tabular-nums whitespace-nowrap">
                      {Math.round(pb.batches * 10) / 10}
                    </span>
                  </div>
                  {pb.mfgUnit != null && (
                    <div className="overflow-hidden max-h-0 group-hover:max-h-5 transition-all duration-200">
                      <span className="text-[10px] leading-5 text-slate-500">제조단위: {pb.mfgUnit.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function UtilizationDashboard() {
  const [serverMetas, setServerMetas]   = useState<{ name: string; label: string }[]>([]); // 메타만
  const [serverLoaded, setServerLoaded] = useState<UtilizationFile[]>([]);                 // 파싱 완료
  const [uploadedFiles, setUploadedFiles] = useState<UtilizationFile[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [factory, setFactory]   = useState<Factory>('청주');
  const [yearFilter, setYearFilter] = useState('26');
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 서버 파일 메타데이터만 빠르게 로드 (XLSX 파싱 없음)
  useEffect(() => {
    setLoading(true);
    fetch('/api/utilization-files')
      .then((r) => r.json())
      .then((data: { name: string; label: string }[]) => {
        const sorted = [...data].sort((a, b) => a.label.localeCompare(b.label));
        setServerMetas(sorted);
        if (sorted.length > 0) setSelectedLabel((prev) => prev ?? sorted[sorted.length - 1].label);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseUtilizationBuffer(buffer, file.name);
      if (parsed.pivotRows.length === 0 && parsed.equipmentRows.length === 0) {
        setUploadError('데이터를 찾을 수 없습니다. 파일 형식을 확인해 주세요.');
        return;
      }
      setUploadedFiles((prev) => {
        const exists = prev.some((f) => f.label === parsed.label);
        return exists
          ? prev.map((f) => f.label === parsed.label ? parsed : f)
          : [...prev, parsed];
      });
      setSelectedLabel(parsed.label);
    } catch {
      setUploadError('파일 파싱 실패. 형식을 확인해 주세요.');
    } finally {
      setUploading(false);
    }
  };

  // 온디맨드 서버 파일 파싱
  const handleSelectLabel = async (label: string) => {
    const isLoaded = serverLoaded.some((f) => f.label === label) || uploadedFiles.some((f) => f.label === label);
    setSelectedLabel(label);
    if (isLoaded) return;
    const isMeta = serverMetas.some((m) => m.label === label);
    if (!isMeta) return;
    setLoadingLabel(label);
    try {
      const res = await fetch('/api/utilization-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error('parse failed');
      const file: UtilizationFile = await res.json();
      setServerLoaded((prev) => [...prev, file]);
    } catch {
      setUploadError('파일 파싱 실패');
    } finally {
      setLoadingLabel(null);
    }
  };

  // 파싱된 파일만 분석에 사용 (서버 로드 완료 + 업로드)
  const files = useMemo(() => mergeFiles(serverLoaded, uploadedFiles), [serverLoaded, uploadedFiles]);
  // 전체 파일 레이블 목록 (stub 포함)
  const allLabels = useMemo(() => {
    const loaded = new Set(files.map((f) => f.label));
    const stubs  = serverMetas.filter((m) => !loaded.has(m.label));
    const all = [...files.map((f) => f.label), ...stubs.map((m) => m.label)];
    return [...new Set(all)].sort();
  }, [files, serverMetas]);

  const selectedFile = files.find((f) => f.label === selectedLabel) ?? null;

  const allPeriods = useMemo(() => (selectedFile ? allMonthlyPeriods(selectedFile) : []), [selectedFile]);
  const periods    = useMemo(() => filterPeriods(allPeriods, yearFilter), [allPeriods, yearFilter]);

  const categories        = factory === '청주' ? CHEONGJU_CATEGORIES : JINCHEONG_CATEGORIES;
  const factorySummaryKey = factory === '청주' ? '청주 요약' : '진천 요약';

  // 종합 차트 데이터
  const chartData = useMemo(() => {
    if (!selectedFile) return [];
    return periods.map((period) => {
      const point: Record<string, number | string | null> = { period };

      for (const cat of categories) {
        const sum = selectedFile.pivotRows
          .filter((r) => r.factory === factory && r.period === period && r.category === cat)
          .reduce((acc, r) => acc + r.value, 0);
        point[cat] = sum || 0;
      }

      const fs = selectedFile.equipmentRows.find(
        (r) => r.isFactorySummary && r.factory === factory && r.period === period
      );
      point['공장 요약'] = fs != null ? pct(fs.value) : null;

      for (const proc of ['과립', '포장']) {
        const sr = selectedFile.equipmentRows.find(
          (r) => r.isSummary && r.factory === factory && r.process === proc && r.period === period
        );
        point[`${proc} 요약`] = sr != null ? pct(sr.value) : null;
      }

      // 월별 생산량 (백만정) = Σ(배치수 × 제조단위 × 수율) / 1,000,000
      const prodBatches = selectedFile.productBatches.filter(
        (pb) => pb.factory === factory && pb.period === period && pb.mfgUnit != null
      );
      if (prodBatches.length > 0) {
        const totalProd = prodBatches.reduce(
          (acc, pb) => acc + pb.batches * (pb.mfgUnit!) * (pb.mfgYield ?? 1),
          0
        ) / 1_000_000;
        // 백만정 → 억정 변환, 소수점 둘째자리
        point['생산량'] = Math.round(totalProd / 100 * 100) / 100;
      } else {
        point['생산량'] = null;
      }

      return point;
    });
  }, [selectedFile, factory, periods, categories]);

  // KPI — 파일 기준월(label의 YY.MM) 기반
  const refMonth = selectedFile ? selectedFile.label.slice(0, 5) : null; // 'YY.MM'
  const refPeriod = refMonth && periods.includes(refMonth) ? refMonth : periods.at(-1);
  const refBatch = refPeriod ? chartData.find((d) => d.period === refPeriod) : null;
  const refTotalBatch = refBatch
    ? categories.reduce((acc, cat) => acc + (Number(refBatch[cat]) || 0), 0)
    : null;
  const refUtil = refBatch ? (refBatch['공장 요약'] as number | null) : null;

  const avgBatch = chartData.length > 0
    ? chartData.reduce((acc, d) => acc + categories.reduce((s, c) => s + (Number(d[c]) || 0), 0), 0) / chartData.length
    : null;

  const avgUtil = (() => {
    const vals = chartData.map((d) => d['공장 요약'] as number | null).filter((v): v is number => v != null);
    return vals.length > 0 ? vals.reduce((a, v) => a + v, 0) / vals.length : null;
  })();

  const utilSummary = useUtilSummary(selectedFile, factory, yearFilter);

  const [batchDetailOpen, setBatchDetailOpen] = useState(false);
  const [selectedChartPeriod, setSelectedChartPeriod] = useState<string | null>(null);

  // 기준월 제품별 배치 내역
  const batchDetails = useMemo(() => {
    if (!selectedFile || !refPeriod) return [];
    return selectedFile.productBatches
      .filter((b) => b.factory === factory && b.period === refPeriod)
      .sort((a, b) => b.batches - a.batches);
  }, [selectedFile, factory, refPeriod]);

  // 차트 클릭 월의 제품 목록
  const chartPeriodProducts = useMemo(() => {
    if (!selectedFile || !selectedChartPeriod) return [];
    return selectedFile.productBatches
      .filter((pb) => pb.factory === factory && pb.period === selectedChartPeriod)
      .sort((a, b) => b.batches - a.batches);
  }, [selectedFile, factory, selectedChartPeriod]);

  // 생산량(억정) Top 10
  const chartPeriodTop10 = useMemo(() => {
    return chartPeriodProducts
      .filter((pb) => pb.mfgUnit != null)
      .map((pb) => ({
        product: pb.product,
        category: pb.category,
        batches: pb.batches,
        prodVol: Math.round(pb.batches * pb.mfgUnit! * (pb.mfgYield ?? 1) / 1_000_000) / 100,
      }))
      .sort((a, b) => b.prodVol - a.prodVol)
      .slice(0, 10);
  }, [chartPeriodProducts]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* 헤더 */}
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">← 홈</Link>
            <div className="w-px h-4 bg-slate-600" />
            <div>
              <h1 className="text-base font-bold text-white">제조부문 가동률 대시보드</h1>
              <p className="text-xs text-slate-400">Manufacturing Utilization Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(loading || uploading) && (
              <div className="flex items-center gap-2 text-xs text-violet-400">
                <div className="w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                {uploading ? '파일 처리 중...' : '로드 중...'}
              </div>
            )}
            {uploadError && (
              <p className="text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg">{uploadError}</p>
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
      <SuggestionBoard page="utilization" pageLabel="가동률" open={showSuggestion} onClose={() => setShowSuggestion(false)} />

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

        {/* 컨트롤 바 */}
        <div className="flex flex-wrap items-center gap-3">

          {/* 공장 탭 */}
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5 gap-0.5">
            {(['청주', '진천'] as Factory[]).map((f) => (
              <button
                key={f}
                onClick={() => setFactory(f)}
                className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
                  factory === f
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* 파일 선택 + 업로드 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">파일</span>
            <div className="flex gap-1 flex-wrap">
              {allLabels.map((label) => {
                const isLoaded   = files.some((f) => f.label === label);
                const isUploaded = uploadedFiles.some((u) => u.label === label);
                const isLoading  = loadingLabel === label;
                const handleDelete = () => {
                  // 파일 자체는 삭제하지 않고 UI에서만 숨김 (새로고침 시 복원)
                  if (isUploaded) {
                    setUploadedFiles((prev) => prev.filter((u) => u.label !== label));
                  } else {
                    setServerMetas((prev) => prev.filter((m) => m.label !== label));
                    setServerLoaded((prev) => prev.filter((f) => f.label !== label));
                  }
                  if (selectedLabel === label) {
                    const remaining = allLabels.filter((l) => l !== label);
                    setSelectedLabel(remaining.at(-1) ?? null);
                  }
                };
                return (
                  <div key={label} className="relative flex items-center group">
                    <button
                      onClick={() => handleSelectLabel(label)}
                      disabled={isLoading}
                      className={`text-xs px-3 py-1.5 pr-6 rounded-lg border transition-colors ${
                        isLoading
                          ? 'border-slate-700 text-slate-600 cursor-wait'
                          : isLoaded
                            ? selectedLabel === label
                              ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
                              : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                            : 'border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {isLoading
                        ? <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-500 border-t-transparent animate-spin inline-block" />
                            {label}
                          </span>
                        : label}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors text-[10px] leading-none"
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {/* 파일 추가 버튼 */}
              <label className="cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-dashed border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400 transition-colors select-none">
                + 파일 추가
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* 연도 필터 */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500">연도</span>
            <div className="flex gap-1">
              {YEAR_OPTIONS.map((yr) => (
                <button
                  key={yr.value}
                  onClick={() => setYearFilter(yr.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    yearFilter === yr.value
                      ? 'border-slate-500 bg-slate-700 text-slate-200'
                      : 'border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {yr.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 데이터 없음 */}
        {loadingLabel && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-400">{loadingLabel} 분석 중...</p>
          </div>
        )}

        {!loading && !loadingLabel && files.length === 0 && allLabels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
            <div className="text-5xl">🏭</div>
            <h2 className="text-lg font-semibold text-slate-300">가동률 파일을 찾을 수 없습니다</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              <code className="text-slate-400">data/가동률/</code> 폴더에 XLSX 파일을 넣거나,<br />
              위 <span className="text-slate-400">+ 파일 추가</span> 버튼으로 직접 업로드해 주세요.
            </p>
          </div>
        )}

        {selectedFile && periods.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <p className="text-slate-400">선택한 연도의 데이터가 없습니다.</p>
            <p className="text-xs text-slate-600">다른 연도를 선택해 주세요.</p>
          </div>
        )}

        {selectedFile && periods.length > 0 && (
          <>
            {/* KPI 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 cursor-pointer hover:border-violet-500/50 transition-colors"
                onClick={() => batchDetails.length > 0 && setBatchDetailOpen(true)}
              >
                <p className="text-xs text-slate-500">{refPeriod} 배치수</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5 tabular-nums">
                  {refTotalBatch != null ? Math.round(refTotalBatch) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {factory} 합계
                  {batchDetails.length > 0 && <span className="text-violet-400 ml-1">↗ 상세</span>}
                </p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">{refPeriod} {factorySummaryKey}</p>
                <p className={`text-2xl font-bold mt-0.5 tabular-nums ${
                  refUtil == null ? 'text-slate-600' :
                  refUtil >= 50 ? 'text-emerald-400' :
                  refUtil >= 30 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {refUtil != null ? `${refUtil.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">설비 가동률</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">{yearFilter === 'all' ? '기간' : `20${yearFilter}년`} 평균 배치수</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5 tabular-nums">
                  {avgBatch != null ? Math.round(avgBatch) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">월 평균</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">{yearFilter === 'all' ? '기간' : `20${yearFilter}년`} 평균 가동률</p>
                <p className={`text-2xl font-bold mt-0.5 tabular-nums ${
                  avgUtil == null ? 'text-slate-600' :
                  avgUtil >= 50 ? 'text-emerald-400' :
                  avgUtil >= 30 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {avgUtil != null ? `${avgUtil.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{factory} 전체</p>
              </div>
            </div>

            {/* 종합 차트 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-200">
                      {factory} 배치수 &amp; 설비 가동률 종합 추이
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      막대(좌측): 배치수 · 흰선(우측%): 설비 가동률 · 황선(우측억): 생산량(억정) · 막대 클릭 → 제품 상세
                    </p>
                  </div>
                  {/* 분기/연도 평균 가동률 인라인 */}
                  {utilSummary.items.length > 0 && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-slate-500 font-medium">{utilSummary.title}</span>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {utilSummary.items.map((item) => (
                          <div
                            key={item.label}
                            className={`rounded-lg px-2.5 py-1.5 min-w-28 border ${
                              item.label === '연 평균'
                                ? 'bg-violet-950/60 border-violet-600/40'
                                : 'bg-slate-900/80 border-slate-700/60'
                            }`}
                          >
                            <p className={`text-[10px] font-medium mb-0.5 ${item.label === '연 평균' ? 'text-violet-400' : 'text-slate-500'}`}>
                              {item.label}
                            </p>
                            {item.values.map((v, vi) => (
                              <div
                                key={v.metric}
                                className={`flex items-center justify-between gap-2 text-[10px] leading-tight ${vi > 0 ? 'pl-2 border-l border-slate-700/60' : ''}`}
                              >
                                <span className={vi === 0 ? 'text-slate-400 font-medium' : 'text-slate-500'}>{v.metric}</span>
                                <span className="tabular-nums font-semibold" style={{ color: v.color }}>
                                  {v.val != null ? `${v.val.toFixed(1)}%` : '—'}
                                </span>
                              </div>
                            ))}
                            {item.prodTotal != null && (
                              <div className="flex items-center justify-between gap-2 text-[10px] leading-tight mt-0.5 pt-0.5 border-t border-slate-700/60">
                                <span className="text-slate-500">생산량</span>
                                <span className="tabular-nums font-semibold text-amber-400">{item.prodTotal.toFixed(2)}억</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={360}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 100, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={{ stroke: '#475569' }}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <YAxis
                      yAxisId="prod"
                      orientation="right"
                      tick={{ fill: '#f59e0b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tickFormatter={(v: number) => `${v}억`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />

                    {categories.map((cat, i) => (
                      <Bar
                        key={cat}
                        dataKey={cat}
                        name={cat}
                        stackId="batch"
                        fill={CATEGORY_COLORS[cat]}
                        yAxisId="left"
                        maxBarSize={52}
                        radius={i === categories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                        cursor="pointer"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onClick={(data: any) => {
                          const period = data?.period as string;
                          if (!period) return;
                          setSelectedChartPeriod((prev) => prev === period ? null : period);
                        }}
                      >
                        <LabelList
                          dataKey={cat}
                          position="center"
                          fill="#fff"
                          fontSize={9}
                          formatter={(v: unknown) => { const n = Number(v); return n > 0 ? Math.round(n) : ''; }}
                        />
                      </Bar>
                    ))}

                    {/* 가동률 라인 */}
                    <Line
                      dataKey="공장 요약"
                      name={factorySummaryKey}
                      stroke="#f1f5f9"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                      dot={false}
                      type="monotone"
                      yAxisId="right"
                      connectNulls
                    />

                    {/* 생산량 라인 */}
                    <Line
                      dataKey="생산량"
                      name="생산량(억정)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      type="monotone"
                      yAxisId="prod"
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 막대 클릭 상세 패널 */}
              {selectedChartPeriod && (
                <div className="border-t border-slate-700 px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">
                        {selectedChartPeriod} · {factory} 제품별 현황
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        총 {Math.round(chartPeriodProducts.reduce((s, p) => s + p.batches, 0))}배치 ·
                        제품 {chartPeriodProducts.length}종
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedChartPeriod(null)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1"
                    >
                      닫기 ✕
                    </button>
                  </div>

                  {chartPeriodProducts.length === 0 ? (
                    <p className="text-xs text-slate-500">해당 기간의 제품 데이터가 없습니다.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                      {/* 좌: 카테고리별 제품 목록 */}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">제품 목록</p>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {(() => {
                            const catMap = factory === '청주' ? CHEONGJU_CATEGORY_MAP : {};
                            const mapCat = (raw: string) => catMap[raw] ?? raw;
                            const catOrder = factory === '청주' ? CHEONGJU_CATEGORIES : JINCHEONG_CATEGORIES;
                            const grouped = chartPeriodProducts.reduce<Record<string, typeof chartPeriodProducts>>(
                              (acc, pb) => { const c = mapCat(pb.category); (acc[c] ??= []).push(pb); return acc; }, {}
                            );
                            const orderedEntries = [
                              ...catOrder.filter((c) => grouped[c]).map((c) => [c, grouped[c]] as const),
                              ...Object.entries(grouped).filter(([c]) => !(catOrder as readonly string[]).includes(c)),
                            ];
                            return orderedEntries.map(([cat, items]) => (
                              <div key={cat}>
                                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: CATEGORY_COLORS[cat] ?? '#94a3b8' }}>
                                  {cat} ({items.length}종)
                                </p>
                                <div className="space-y-0.5">
                                  {items.map((pb, i) => (
                                    <div key={i} className="flex items-center justify-between py-1 border-b border-slate-700/40 last:border-0">
                                      <span className="text-xs text-slate-300 truncate max-w-52" title={pb.product}>{pb.product}</span>
                                      <span className="text-xs font-semibold tabular-nums text-violet-300 shrink-0 ml-2">
                                        {Math.round(pb.batches * 10) / 10}배치
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* 우: 생산량 Top 10 */}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">생산량 Top 10 (억정)</p>
                        {chartPeriodTop10.length === 0 ? (
                          <p className="text-xs text-slate-600">제조단위 데이터 없음</p>
                        ) : (
                          <div className="space-y-1.5">
                            {(() => {
                              const maxVol = chartPeriodTop10[0]?.prodVol || 1;
                              return chartPeriodTop10.map((item, i) => (
                                <div key={i} className="space-y-0.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[10px] text-slate-500 tabular-nums w-4 shrink-0">{i + 1}</span>
                                      <span className="text-xs text-slate-300 truncate" title={item.product}>{item.product}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-xs text-slate-500 tabular-nums">{Math.round(item.batches * 10) / 10}배치</span>
                                      <span className="text-xs font-semibold tabular-nums text-amber-400 w-14 text-right">
                                        {item.prodVol.toFixed(2)}억정
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 pl-6">
                                    <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-amber-500"
                                        style={{ width: `${(item.prodVol / maxVol) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 설비 상세 테이블 */}
            <EquipmentTable file={selectedFile} factory={factory} periods={periods} />
          </>
        )}
      </main>

      {/* 배치 상세 팝업 */}
      {batchDetailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setBatchDetailOpen(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{refPeriod} 제품별 배치 현황</h3>
                <p className="text-xs text-slate-500 mt-0.5">{factory} · 총 {Math.round(refTotalBatch ?? 0)}배치</p>
              </div>
              <button
                onClick={() => setBatchDetailOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
              >✕</button>
            </div>

            {/* 목록 */}
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-1">
              {/* 카테고리별 그룹 */}
              {(() => {
                const grouped = batchDetails.reduce<Record<string, typeof batchDetails>>((acc, b) => {
                  (acc[b.category] ??= []).push(b);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="mb-3">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{cat}</p>
                    {items.map((b, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                        <span className="text-sm text-slate-200">{b.product}</span>
                        <span className="text-sm font-semibold tabular-nums text-violet-300">{Math.round(b.batches)}배치</span>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
