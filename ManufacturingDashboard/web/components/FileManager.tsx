'use client';

import { useRef } from 'react';
import { ActualFile } from '@/lib/types';

interface Props {
  planFileName: string | null;
  actualFiles: ActualFile[];
  selectedMonth: string | null;
  onPlanUpload: (file: File) => void;
  onActualUpload: (file: File) => void;
  onSelectMonth: (label: string) => void;
  onRemoveActual: (label: string) => void;
}

export default function FileManager({
  planFileName,
  actualFiles,
  selectedMonth,
  onPlanUpload,
  onActualUpload,
  onSelectMonth,
  onRemoveActual,
}: Props) {
  const planRef = useRef<HTMLInputElement>(null);
  const actualRef = useRef<HTMLInputElement>(null);

  const sortedFiles = [...actualFiles].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
      {/* 연간 사업계획 */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-400 w-28 shrink-0">연간 사업계획</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {planFileName ? (
            <span className="text-sm text-slate-200 truncate">{planFileName}</span>
          ) : (
            <span className="text-sm text-slate-500 italic">파일 없음</span>
          )}
          <button
            onClick={() => planRef.current?.click()}
            className="ml-auto shrink-0 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {planFileName ? '변경' : '업로드'}
          </button>
        </div>
        <input
          ref={planRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { onPlanUpload(f); e.target.value = ''; }
          }}
        />
      </div>

      {/* 실적 파일 목록 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">실적 파일</span>
          <button
            onClick={() => actualRef.current?.click()}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            + 파일 추가
          </button>
        </div>

        {sortedFiles.length === 0 ? (
          <p className="text-sm text-slate-500 italic">업로드된 실적 파일 없음</p>
        ) : (
          <div className="space-y-1">
            {sortedFiles.map((f) => (
              <div
                key={f.label}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  selectedMonth === f.label
                    ? 'bg-blue-600/30 border border-blue-500/50'
                    : 'bg-slate-700/50 hover:bg-slate-700'
                }`}
                onClick={() => onSelectMonth(f.label)}
              >
                <div
                  className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                    selectedMonth === f.label
                      ? 'border-blue-400 bg-blue-400'
                      : 'border-slate-500'
                  }`}
                />
                <span className="text-sm text-slate-200 font-medium w-28">{f.label}</span>
                <span className="text-xs text-slate-400 truncate flex-1">{f.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveActual(f.label); }}
                  className="text-slate-500 hover:text-red-400 transition-colors text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={actualRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { onActualUpload(f); e.target.value = ''; }
          }}
        />
      </div>
    </div>
  );
}
