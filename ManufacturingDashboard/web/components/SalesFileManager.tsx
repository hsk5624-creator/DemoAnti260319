'use client';

import { useRef, useState } from 'react';
import { SalesFile } from '@/lib/salesTypes';

interface Props {
  planLabel: string | null;
  salesFiles: SalesFile[];
  fileOrder: string[];
  selectedLabel: string | null;
  compareLabel: string | null;
  selectedYear: number;
  onPlanUpload: (file: File) => void;
  onSalesUpload: (file: File) => void;
  onSelectFile: (label: string) => void;
  onSelectCompare: (label: string | null) => void;
  onRemoveFile: (label: string) => void;
  onReorder: (newOrder: string[]) => void;
  onSelectYear: (year: number) => void;
}

const YEARS = [2024, 2025, 2026];

export default function SalesFileManager({
  planLabel, salesFiles, fileOrder, selectedLabel, compareLabel, selectedYear,
  onPlanUpload, onSalesUpload, onSelectFile, onSelectCompare, onRemoveFile, onReorder, onSelectYear,
}: Props) {
  const planRef   = useRef<HTMLInputElement>(null);
  const salesRef  = useRef<HTMLInputElement>(null);
  const dragIdx   = useRef<number | null>(null);
  // insertIdx: 0..n — 해당 인덱스 앞에 삽입
  const [insertIdx, setInsertIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    // 드래그 고스트 약간 투명하게
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => { el.style.opacity = '0.35'; }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '';
    dragIdx.current = null;
    setInsertIdx(null);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // 마우스가 아이템의 왼쪽 절반 → 앞에 삽입, 오른쪽 절반 → 뒤에 삽입
    const insert = e.clientX < rect.left + rect.width / 2 ? idx : idx + 1;
    setInsertIdx(insert);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIdx.current;
    const to   = insertIdx;
    if (from === null || to === null || from === to || from + 1 === to) {
      setInsertIdx(null);
      return;
    }
    const newOrder = [...fileOrder];
    const [moved] = newOrder.splice(from, 1);
    // splice 후 인덱스 보정
    const adjustedTo = to > from ? to - 1 : to;
    newOrder.splice(adjustedTo, 0, moved);
    onReorder(newOrder);
    setInsertIdx(null);
  };

  // 드래그 영역 밖으로 나갔을 때 인디케이터 초기화
  const handleDragLeave = (e: React.DragEvent) => {
    // 컨테이너 밖으로 나갔을 때만 초기화 (자식 사이 이동은 무시)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setInsertIdx(null);
    }
  };

  const compareOptions = salesFiles.filter((f) => f.label !== selectedLabel);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">

      {/* 상단: 연도 · 파일 업로드 */}
      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">조회 연도</span>
          {YEARS.map((y) => (
            <button key={y} onClick={() => onSelectYear(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${selectedYear === y ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {y - 2000}년
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-600 self-center hidden sm:block" />

        <div className="flex items-center gap-2">
          <input ref={planRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onPlanUpload(e.target.files[0]); e.target.value = ''; }} />
          <button onClick={() => planRef.current?.click()}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition-colors">
            <span className="text-slate-400">📋</span>
            {planLabel ? `사업계획: ${planLabel}` : '사업계획 파일 업로드'}
          </button>
          {planLabel && <span className="text-[10px] text-emerald-400">✓ 저장됨</span>}
        </div>

        <div className="flex items-center gap-2">
          <input ref={salesRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onSalesUpload(e.target.files[0]); e.target.value = ''; }} />
          <button onClick={() => salesRef.current?.click()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
            + 주간 실적 추가
          </button>
        </div>
      </div>

      {salesFiles.length > 0 && (
        <>
          {/* 조회 파일 — 드래그 순서 변경 */}
          <div className="space-y-1.5">
            <p className="text-[11px] text-slate-500 font-medium">
              조회 파일
              <span className="text-slate-600 ml-1.5 font-normal">드래그로 순서 변경</span>
            </p>

            {/* 드래그 컨테이너 */}
            <div
              className="flex flex-wrap items-center gap-y-2"
              onDragLeave={handleDragLeave}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {salesFiles.map((f, idx) => (
                <div key={f.label} className="flex items-center">
                  {/* 삽입 인디케이터 — 이 아이템 앞 */}
                  <div className={`h-6 rounded-full transition-all duration-150 ${
                    insertIdx === idx
                      ? 'w-0.5 mx-1 bg-blue-400 shadow-[0_0_6px_2px_rgba(96,165,250,0.5)]'
                      : 'w-0 mx-0 bg-transparent'
                  }`} />

                  {/* 파일 칩 */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs
                      transition-colors select-none cursor-grab active:cursor-grabbing
                      ${selectedLabel === f.label
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'}
                      ${dragIdx.current === idx ? 'opacity-35' : 'opacity-100'}`}
                    onClick={() => { if (dragIdx.current === null) onSelectFile(f.label); }}
                  >
                    <span className="text-slate-600 text-[10px]">⠿</span>
                    <span className="font-medium">{f.label}</span>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onRemoveFile(f.label); }}
                      className="text-slate-600 hover:text-red-400 transition-colors ml-1"
                    >✕</button>
                  </div>
                </div>
              ))}

              {/* 마지막 아이템 뒤 삽입 인디케이터 */}
              <div className={`h-6 rounded-full transition-all duration-150 ${
                insertIdx === salesFiles.length
                  ? 'w-0.5 mx-1 bg-blue-400 shadow-[0_0_6px_2px_rgba(96,165,250,0.5)]'
                  : 'w-0 mx-0 bg-transparent'
              }`} />
            </div>
          </div>

          {/* 비교 파일 선택 */}
          {compareOptions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-500 font-medium">
                Gap 비교 기준 파일
                <span className="text-slate-600 ml-1.5 font-normal">선택한 파일 대비 변화량 계산</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <div
                  className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors
                    ${compareLabel === null
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'bg-slate-700/50 border-slate-600 text-slate-500 hover:border-slate-500'}`}
                  onClick={() => onSelectCompare(null)}
                >
                  자동 (이전 파일)
                </div>
                {compareOptions.map((f) => (
                  <div key={f.label}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors
                      ${compareLabel === f.label
                        ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                        : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'}`}
                    onClick={() => onSelectCompare(f.label)}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
