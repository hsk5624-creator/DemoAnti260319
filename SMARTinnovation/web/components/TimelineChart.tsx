"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import {
  Level1Item, Level2Item, PhaseSegment, TaskStatus, STATUS_COLORS,
  getLevel1Range, parseWDate, wdateToIndex, todayWDate, WDate,
} from "@/lib/types";

interface BulkShiftUpdate { parentId: string; childId: string; startDate: string; endDate: string; }

interface Props {
  items: Level1Item[];
  title?: string;
  onEditLevel2?: (parentId: string, updated: Level2Item) => void;
  onEditLevel1Phases?: (id: string, phases: PhaseSegment[]) => void;
  onBulkShift?: (updates: BulkShiftUpdate[]) => void;
  onReorderLevel1?: (draggingId: string, dropBeforeId: string | null) => void;
  onEditLevel1Color?: (id: string, color: string) => void;
}

const WEEK_W    = 20;   // px per week  (1month = 4 × WEEK_W = 80px)
const L1_BASE_H = 48;   // L1 기본 행 높이
const L2_H      = 36;
const BAR1_H    = 14;   // L1 pill height
const BAR2_H    = 6;    // L2 pill height
const MS_ROW_H  = 28;   // 마일스톤 한 줄 높이
const PHASE_H   = 30;   // Phase 헤더 행 높이
const MIN_LABEL_W = 80;
const FLAG_ITEM_W = 130; // 플래그 겹침 판단 폭

const PALETTE = [
  "#00733C", "#16a34a", "#0891b2", "#0284c7",
  "#2563eb", "#4f46e5", "#7c3aed", "#9333ea",
  "#db2777", "#e11d48", "#ef4444", "#ea580c",
  "#d97706", "#ca8a04", "#0f766e", "#475569",
];

// YY.MM 포맷
function fmtMonth(wd: WDate) {
  return `${String(wd.year).slice(2)}.${String(wd.month).padStart(2, "0")}`;
}

// 바 내부 날짜 텍스트
function fmtRange(start: string, end: string) {
  const s = parseWDate(start);
  const e = parseWDate(end);
  return `${fmtMonth(s)} ~ ${fmtMonth(e)}`;
}

// 날짜를 N주 이동
function shiftDate(dateStr: string, weeks: number): string {
  let { year, month, week } = parseWDate(dateStr);
  week += weeks;
  while (week > 4) { week -= 4; month++; }
  while (week < 1)  { week += 4; month--; }
  while (month > 12) { month -= 12; year++; }
  while (month < 1)  { month += 12; year--; }
  return `${year}-${String(month).padStart(2, "0")}-W${week}`;
}

export default function TimelineChart({
  items,
  title = "로드맵 과제별 타임라인 요약",
  onEditLevel2,
  onEditLevel1Phases,
  onBulkShift,
  onReorderLevel1,
  onEditLevel1Color,
}: Props) {
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set());
  const [editTarget,    setEditTarget]    = useState<{ parentId: string; child: Level2Item } | null>(null);
  const [phaseTarget,   setPhaseTarget]   = useState<Level1Item | null>(null);
  const [editMode,      setEditMode]      = useState(false);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  // dragOffset: 'l1' = L1바 드래그, 'l2' = L2바 드래그
  const [dragOffset, setDragOffset] = useState<
    | { type: 'l1'; itemId: string; weekOffset: number }
    | { type: 'l2'; childId: string; weekOffset: number }
    | null
  >(null);

  // 색상 피커
  const [colorPickerId,  setColorPickerId]  = useState<string | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number } | null>(null);

  // L1 행 순서 변경 드래그 상태
  const [reorderDraggingId,  setReorderDraggingId]  = useState<string | null>(null);
  const [reorderDropBeforeId, setReorderDropBeforeId] = useState<string | null | "END">("END");
  const reorderDragRef = useRef<{ draggingId: string; dropBeforeId: string | null } | null>(null);

  // 최신 items / selectedIds를 드래그 핸들러(클로저) 안에서 참조하기 위한 ref
  const itemsRef        = useRef(items);
  const selectedIdsRef  = useRef(selectedIds);
  itemsRef.current      = items;
  selectedIdsRef.current = selectedIds;

  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setSelectedIds(new Set());
    setDragOffset(null);
  }, []);

  const toggleL2 = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleL1All = useCallback((item: Level1Item) => {
    const childIds = item.children.map(c => c.id);
    setSelectedIds(prev => {
      const allSelected = childIds.every(id => prev.has(id));
      const n = new Set(prev);
      if (allSelected) childIds.forEach(id => n.delete(id));
      else childIds.forEach(id => n.add(id));
      return n;
    });
  }, []);

  // L2 바 드래그 핸들러
  const handleBarMouseDown = useCallback((
    e: React.MouseEvent,
    childId: string,
  ) => {
    if (!editMode || !onBulkShift) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    let lastOffset = 0;

    const onMove = (ev: MouseEvent) => {
      const newOffset = Math.round((ev.clientX - startX) / WEEK_W);
      if (newOffset !== lastOffset) {
        lastOffset = newOffset;
        setDragOffset({ type: 'l2', childId, weekOffset: newOffset });
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDragOffset(null);
      if (lastOffset === 0) return;

      const curSelected = selectedIdsRef.current;
      const curItems    = itemsRef.current;
      const idsToShift  = curSelected.size > 0 && curSelected.has(childId)
        ? curSelected : new Set([childId]);

      const updates: BulkShiftUpdate[] = [];
      for (const item of curItems)
        for (const child of item.children)
          if (idsToShift.has(child.id))
            updates.push({ parentId: item.id, childId: child.id,
              startDate: shiftDate(child.startDate, lastOffset),
              endDate:   shiftDate(child.endDate,   lastOffset) });

      if (updates.length > 0) onBulkShift(updates);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [editMode, onBulkShift]);

  // L1 바 드래그 — 소속 L2 전체 이동
  const handleL1BarMouseDown = useCallback((
    e: React.MouseEvent,
    itemId: string,
  ) => {
    if (!editMode || !onBulkShift) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    let lastOffset = 0;

    const onMove = (ev: MouseEvent) => {
      const newOffset = Math.round((ev.clientX - startX) / WEEK_W);
      if (newOffset !== lastOffset) {
        lastOffset = newOffset;
        setDragOffset({ type: 'l1', itemId, weekOffset: newOffset });
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDragOffset(null);
      if (lastOffset === 0) return;

      const curItems = itemsRef.current;
      const targetItem = curItems.find(i => i.id === itemId);
      if (!targetItem) return;

      const updates: BulkShiftUpdate[] = targetItem.children.map(child => ({
        parentId: itemId, childId: child.id,
        startDate: shiftDate(child.startDate, lastOffset),
        endDate:   shiftDate(child.endDate,   lastOffset),
      }));

      if (updates.length > 0) onBulkShift(updates);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [editMode, onBulkShift]);

  // L1 행 순서 변경 드래그
  const handleRowDragStart = useCallback((e: React.MouseEvent, itemId: string) => {
    if (editMode || !onReorderLevel1) return;
    e.preventDefault();
    e.stopPropagation();
    setReorderDraggingId(itemId);
    setReorderDropBeforeId("END");
    reorderDragRef.current = { draggingId: itemId, dropBeforeId: null };

    const onUp = () => {
      window.removeEventListener("mouseup", onUp);
      if (reorderDragRef.current) {
        onReorderLevel1(reorderDragRef.current.draggingId, reorderDragRef.current.dropBeforeId);
      }
      reorderDragRef.current = null;
      setReorderDraggingId(null);
      setReorderDropBeforeId("END");
    };
    window.addEventListener("mouseup", onUp);
  }, [editMode, onReorderLevel1]);

  const [labelW,     setLabelW]     = useState(160);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const toggle = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: labelW };
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setLabelW(Math.max(MIN_LABEL_W, dragRef.current.startW + e.clientX - dragRef.current.startX));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [labelW]);

  /* ── 날짜 범위 계산 ── */
  const { weeks, base, totalWeeks, monthGroups, yearGroups } = useMemo(() => {
    const allDates: string[] = [];
    for (const item of items)
      for (const c of item.children) allDates.push(c.startDate, c.endDate);

    const now = todayWDate();
    if (allDates.length === 0) {
      const b = { year: now.year, month: now.month > 1 ? now.month - 1 : 12, week: 1 };
      if (now.month === 1) b.year--;
      const ws = buildWeeks(b, 24 * 4);
      return { weeks: ws, base: b, totalWeeks: ws.length, ...buildGroups(ws) };
    }

    allDates.sort();
    let { year: minY, month: minM } = parseWDate(allDates[0]);
    let { year: maxY, month: maxM } = parseWDate(allDates[allDates.length - 1]);
    if (minM > 1) minM--; else { minY--; minM = 12; }
    if (maxM < 12) maxM++; else { maxY++; maxM = 1; }

    const base = { year: minY, month: minM, week: 1 };
    const total = wdateToIndex({ year: maxY, month: maxM, week: 4 }, base) + 1;
    const ws = buildWeeks(base, total);
    return { weeks: ws, base, totalWeeks: total, ...buildGroups(ws) };
  }, [items]);

  const today  = todayWDate();
  const todayX = wdateToIndex(today, base) * WEEK_W;
  const showToday = todayX >= 0 && todayX <= totalWeeks * WEEK_W;

  if (items.length === 0 || items.every(i => i.children.length === 0)) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 shadow-sm text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl mx-auto mb-3 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500">과제를 추가하면 타임라인이 자동 생성됩니다</p>
        <p className="text-xs text-gray-400 mt-1">좌측 패널에서 Lv1 그룹 → Lv2 세부 과제 순서로 추가하세요</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* 타이틀 */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Lv1 클릭 → 세부 펼침 &nbsp;·&nbsp; Lv2 클릭 → 내용 수정 &nbsp;·&nbsp; ◆ = Lv1 마일스톤 표시 항목
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Legend color="#94a3b8" label="예정" />
            <Legend color="#00733C" label="진행/완료" />
            <Legend color="#ef4444" label="핵심" />
            {onBulkShift && (
              <button
                onClick={() => editMode ? exitEditMode() : setEditMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                  ${editMode
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {editMode ? "편집 종료" : "편집"}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: labelW + totalWeeks * WEEK_W }}>

            {/* ━━━ 헤더 ━━━ */}
            <div className="flex sticky top-0 z-30 shadow-sm">
              {/* TASK 열 헤더 */}
              <div style={{ width: labelW, minWidth: labelW }}
                className="bg-gray-800 border-r border-gray-700 flex items-center pb-0 px-4 relative">
                <span className="text-[11px] font-bold text-gray-300 tracking-widest uppercase">Task</span>
                {/* 드래그 핸들 */}
                <div onMouseDown={onDragStart}
                  className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-col-resize group z-10">
                  <div className="w-px h-5 bg-gray-600 group-hover:bg-green-400 group-hover:w-0.5 transition-all rounded-full" />
                </div>
              </div>
              {/* 월 헤더 */}
              <div className="flex-1 bg-gray-800">
                {/* 연도 행 */}
                <div className="flex border-b border-gray-700">
                  {yearGroups.map(yg => (
                    <div key={yg.year}
                      style={{ width: yg.count * WEEK_W }}
                      className="text-center text-[15px] font-bold text-white py-1.5 border-r border-gray-600 last:border-r-0 tracking-wider">
                      {yg.year}
                    </div>
                  ))}
                </div>
                {/* 월 행 — 숫자만 */}
                <div className="flex">
                  {monthGroups.map((mg, i) => (
                    <div key={i}
                      style={{ width: mg.count * WEEK_W }}
                      className={`text-center py-1.5 border-r border-gray-700 last:border-r-0 select-none
                        ${mg.month === 1
                          ? "text-[13px] font-extrabold text-green-300"
                          : "text-[12px] font-semibold text-gray-300"}`}>
                      {mg.month}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ━━━ 본문 (L1 + L2) ━━━ */}
            {/* 순서 변경 드래그 중: 전체 차트에 grabbing 커서 */}
            <style>{reorderDraggingId ? "* { cursor: grabbing !important; }" : ""}</style>
            {items.map((item, itemIdx) => {
              const range      = getLevel1Range(item);
              const isExpanded = expanded.has(item.id);
              const l2TotalH   = item.children.length * L2_H;

              /* ── 이 L1의 마일스톤 플래그 스태킹 ── */
              const msRaw = item.children
                .filter(c => c.showOnLevel1)
                .map(c => ({ child: c, x: wdateToIndex(parseWDate(c.startDate), base) * WEEK_W }))
                .sort((a, b) => a.x - b.x);
              const rowEdge: number[] = [];
              const msStacked = msRaw.map(m => {
                let row = 0;
                while (rowEdge[row] !== undefined && rowEdge[row] > m.x - 4) row++;
                rowEdge[row] = m.x + FLAG_ITEM_W;
                return { ...m, row };
              });
              const msRows  = msStacked.length > 0 ? Math.max(...msStacked.map(m => m.row)) + 1 : 0;
              const rowMsH  = msRows * MS_ROW_H;
              const l1RowH  = L1_BASE_H + rowMsH;
              const barTop  = rowMsH + (L1_BASE_H - BAR1_H) / 2;

              return (
                <div key={item.id}
                  style={{
                    borderTop: reorderDropBeforeId === item.id
                      ? "2px solid #6366f1"
                      : itemIdx > 0 ? `2px solid ${item.color}30` : undefined,
                    opacity: reorderDraggingId === item.id ? 0.35 : 1,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={() => {
                    if (reorderDragRef.current && reorderDragRef.current.draggingId !== item.id) {
                      reorderDragRef.current.dropBeforeId = item.id;
                      setReorderDropBeforeId(item.id);
                    }
                  }}
                >

                  {/* ── Level 1 행 ── */}
                  <div
                    className="group flex cursor-pointer transition-colors duration-150"
                    style={{
                      height: l1RowH,
                      backgroundColor: isExpanded ? `${item.color}18` : `${item.color}0d`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${item.color}22`)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = isExpanded ? `${item.color}18` : `${item.color}0d`)}
                    onClick={() => !editMode && item.children.length > 0 && toggle(item.id)}
                  >
                    {/* 라벨 열 — 하단 L1_BASE_H 영역에 정렬 */}
                    <div style={{ width: labelW, minWidth: labelW, paddingTop: rowMsH }}
                      className="border-r border-gray-100 flex items-center gap-2 px-4 shrink-0">
                      {/* 행 순서 변경 드래그 핸들 */}
                      {!editMode && onReorderLevel1 && (
                        <div
                          onMouseDown={e => handleRowDragStart(e, item.id)}
                          className="opacity-0 group-hover:opacity-50 hover:!opacity-100 shrink-0 flex flex-col gap-[3px] py-1 px-0.5 cursor-grab active:cursor-grabbing"
                          title="드래그하여 순서 변경">
                          {[0,1,2].map(i => <div key={i} className="w-3 h-[2px] bg-gray-400 rounded-full" />)}
                        </div>
                      )}
                      {/* 편집 모드 체크박스 */}
                      {editMode && item.children.length > 0 && (
                        <input type="checkbox"
                          checked={item.children.every(c => selectedIds.has(c.id))}
                          ref={el => { if (el) el.indeterminate = item.children.some(c => selectedIds.has(c.id)) && !item.children.every(c => selectedIds.has(c.id)); }}
                          onChange={e => { e.stopPropagation(); toggleL1All(item); }}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 accent-indigo-600 shrink-0 cursor-pointer"
                        />
                      )}
                      <div
                        className="w-[4px] h-8 rounded-full shrink-0 cursor-pointer hover:w-[6px] transition-all"
                        style={{ backgroundColor: item.color }}
                        title="색상 변경"
                        onClick={e => {
                          e.stopPropagation();
                          if (colorPickerId === item.id) { setColorPickerId(null); setColorPickerPos(null); return; }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setColorPickerId(item.id);
                          setColorPickerPos({ x: rect.right + 10, y: rect.top });
                        }}
                      />
                      <span className="text-[16px] font-bold text-gray-800 truncate flex-1 tracking-tight">
                        {item.name}
                      </span>
                      {/* Phase 설정 버튼 */}
                      {onEditLevel1Phases && (
                        <button
                          onClick={e => { e.stopPropagation(); setPhaseTarget(item); }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 text-gray-400 hover:text-gray-600 transition-all shrink-0"
                          title="Phase 구간 설정">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
                          </svg>
                        </button>
                      )}
                      {item.children.length > 0 && (
                        <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>

                    {/* 차트 열 */}
                    <div className="flex-1 relative overflow-hidden">
                      {/* 그리드 */}
                      <MonthGrid monthGroups={monthGroups} weekW={WEEK_W} />

                      {/* 오늘 라인 */}
                      {showToday && (
                        <div className="absolute top-0 bottom-0 w-px bg-red-400/50 z-20 pointer-events-none"
                          style={{ left: todayX }} />
                      )}

                      {/* ── 마일스톤 플래그 (이 L1에만) ── */}
                      {msStacked.map(m => {
                        const flagBottom  = rowMsH - m.row * MS_ROW_H;
                        const flagTop     = flagBottom - MS_ROW_H + 4;
                        const statusColor = STATUS_COLORS[m.child.status as TaskStatus];
                        const isCritical  = m.child.status === "critical";
                        const isPlanned   = m.child.status === "planned";
                        return (
                          <div key={m.child.id} className="absolute pointer-events-none z-10"
                            style={{ left: m.x, top: 0, height: l1RowH }}>
                            {/* 수직선 — 플래그 하단 → 바 */}
                            <div className="absolute w-px"
                              style={{
                                backgroundColor: statusColor,
                                opacity: isPlanned ? 0.3 : 0.5,
                                top: flagBottom,
                                bottom: L1_BASE_H - barTop - BAR1_H / 2,
                                left: 0,
                              }} />
                            {/* 다이아몬드 마커 */}
                            <div className="absolute"
                              style={{
                                width: isCritical ? 9 : 7,
                                height: isCritical ? 9 : 7,
                                backgroundColor: statusColor,
                                top: barTop + BAR1_H / 2 - (isCritical ? 4.5 : 3.5),
                                left: isCritical ? -4.5 : -3.5,
                                transform: "rotate(45deg)",
                                borderRadius: 1,
                              }} />
                            {/* 플래그 텍스트 */}
                            <div className="absolute flex items-center gap-1"
                              style={{ top: flagTop, left: 5 }}>
                              {/* 삼각형 — 상태 색 */}
                              <svg width={isCritical ? 10 : 8} height={isCritical ? 14 : 12}
                                viewBox="0 0 8 12" className="shrink-0">
                                <polygon points="0,0 8,6 0,12" fill={statusColor} />
                              </svg>
                              <div>
                                <div className="leading-tight whitespace-nowrap font-bold"
                                  style={{
                                    fontSize: isCritical ? 12 : 11,
                                    color: isCritical ? statusColor : "#1e293b",
                                  }}>
                                  {m.child.name}
                                </div>
                                <div className="text-[10px] leading-tight whitespace-nowrap font-mono flex items-center gap-1"
                                  style={{ color: statusColor }}>
                                  {fmtMonth(parseWDate(m.child.startDate))}
                                  {/* 상태 배지 */}
                                  <span className="text-[9px] font-semibold px-1 rounded"
                                    style={{
                                      backgroundColor: `${statusColor}20`,
                                      color: statusColor,
                                    }}>
                                    {m.child.status === "critical"    ? "핵심"
                                      : m.child.status === "in-progress" ? "진행"
                                      : m.child.status === "completed"   ? "완료"
                                      : "예정"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* L1 Summary Bar */}
                      {range && (() => {
                        // L1 드래그 미리보기 오프셋
                        const l1Preview = dragOffset?.type === 'l1' && dragOffset.itemId === item.id
                          ? dragOffset.weekOffset * WEEK_W : 0;

                        const sx   = wdateToIndex(parseWDate(range.start), base) * WEEK_W;
                        const ex   = wdateToIndex(parseWDate(range.end),   base) * WEEK_W + WEEK_W;
                        const barW = Math.max(ex - sx, WEEK_W * 2);
                        const phases = item.phases?.filter(p => p.startDate && p.endDate) ?? [];
                        const N = phases.length;

                        const barStyle = {
                          left: sx + l1Preview, top: barTop, width: barW, height: BAR1_H,
                          cursor: editMode ? "ew-resize" : undefined,
                          outline: l1Preview !== 0 ? `2px solid ${item.color}` : undefined,
                        };
                        const dragProps = editMode
                          ? { onMouseDown: (e: React.MouseEvent) => handleL1BarMouseDown(e, item.id) }
                          : {};

                        if (N === 0) {
                          // 기본: 단색 그라디언트 바
                          const label = fmtRange(range.start, range.end);
                          const fits  = barW > label.length * 7.5 + 24;
                          return (
                            <>
                              <div className={`absolute z-10 rounded-lg overflow-hidden shadow-md${editMode ? " hover:shadow-lg hover:ring-2 hover:ring-indigo-300" : ""}`}
                                style={{ ...barStyle, background: `linear-gradient(135deg, ${item.color}f0, ${item.color}c0)` }}
                                {...dragProps}>
                                {fits && (
                                  <div className="w-full h-full flex items-center justify-center pointer-events-none">
                                    <span className="text-[12px] font-semibold text-white/90 tracking-tight px-2 truncate font-mono">
                                      {label}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {!fits && (
                                <div className="absolute text-[12px] font-semibold whitespace-nowrap z-20 pointer-events-none font-mono"
                                  style={{ left: sx + l1Preview + barW + 8, top: barTop + BAR1_H / 2,
                                    transform: "translateY(-50%)", color: item.color }}>
                                  {label}
                                </div>
                              )}
                            </>
                          );
                        }

                        // Phase 구간 바: 점층적으로 진해지는 색상
                        return (
                          <div className={`absolute z-10 rounded-lg overflow-hidden shadow-md${editMode ? " hover:shadow-lg hover:ring-2 hover:ring-indigo-300" : ""}`}
                            style={{ ...barStyle, backgroundColor: `${item.color}22` }}
                            {...dragProps}>
                            {phases.map((phase, i) => {
                              const alpha = N === 1 ? 0.85 : 0.32 + (i / (N - 1)) * 0.58;
                              const alphHex = Math.round(alpha * 255).toString(16).padStart(2, "0");
                              const psx = Math.max(0, wdateToIndex(parseWDate(phase.startDate), base) * WEEK_W - sx);
                              const pex = Math.min(barW, wdateToIndex(parseWDate(phase.endDate), base) * WEEK_W + WEEK_W - sx);
                              const pw  = Math.max(0, pex - psx);
                              if (pw === 0) return null;
                              return (
                                <div key={i}
                                  className="absolute top-0 bottom-0 flex items-center justify-center overflow-hidden"
                                  style={{ left: psx, width: pw, backgroundColor: `${item.color}${alphHex}` }}>
                                  <span className="text-[10px] font-bold text-white/90 truncate px-1 select-none">
                                    {phase.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* ── Level 2 슬라이드 ── */}
                  <div style={{
                    maxHeight: isExpanded ? `${l2TotalH}px` : "0px",
                    overflow: "hidden",
                    transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1)",
                  }}>
                    {item.children.map((child, cIdx) => {
                      const sWd    = parseWDate(child.startDate);
                      const eWd    = parseWDate(child.endDate);
                      const sx     = wdateToIndex(sWd, base) * WEEK_W;
                      const ex     = wdateToIndex(eWd, base) * WEEK_W + WEEK_W;
                      const barW   = Math.max(ex - sx, WEEK_W);
                      const color  = STATUS_COLORS[child.status];
                      const barTop = (L2_H - BAR2_H) / 2;
                      const labelAboveY = barTop - 14;

                      // 드래그 미리보기 오프셋 계산
                      const isDragThis  = dragOffset?.type === 'l2' && dragOffset.childId === child.id;
                      const isDragGroup = dragOffset?.type === 'l2' && selectedIds.has(dragOffset.childId) && selectedIds.has(child.id);
                      const isDragParent = dragOffset?.type === 'l1' && dragOffset.itemId === item.id;
                      const previewPx = (isDragThis || isDragGroup || isDragParent)
                        ? (dragOffset?.weekOffset ?? 0) * WEEK_W : 0;

                      return (
                        <div key={child.id}
                          className={`flex border-t border-gray-100 group transition-colors duration-100
                            ${cIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                            ${editMode ? "" : "cursor-pointer hover:bg-blue-50/50"}`}
                          style={{ height: L2_H }}
                          onClick={e => {
                            if (editMode) return; // 편집 모드에서는 클릭 무시
                            e.stopPropagation();
                            setEditTarget({ parentId: item.id, child });
                          }}
                        >
                          {/* 라벨 */}
                          <div style={{ width: labelW, minWidth: labelW }}
                            className="border-r border-gray-100 flex items-center px-3 gap-2 shrink-0">
                            {editMode ? (
                              <input type="checkbox"
                                checked={selectedIds.has(child.id)}
                                onChange={e => { e.stopPropagation(); toggleL2(child.id); }}
                                onClick={e => e.stopPropagation()}
                                className="w-3.5 h-3.5 accent-indigo-600 shrink-0 cursor-pointer"
                              />
                            ) : (
                              <div className="w-1 h-1 rounded-full shrink-0 ml-2"
                                style={{ backgroundColor: color, opacity: 0.7 }} />
                            )}
                            <span className="text-[12px] text-gray-600 truncate flex-1 font-medium">
                              {child.name}
                            </span>
                            <svg className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                              fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>

                          {/* 차트 */}
                          <div className="flex-1 relative overflow-hidden">
                            <MonthGrid monthGroups={monthGroups} weekW={WEEK_W} />
                            {showToday && (
                              <div className="absolute top-0 bottom-0 w-px bg-red-400/30 pointer-events-none"
                                style={{ left: todayX }} />
                            )}

                            {/* pill 바 (드래그 가능) */}
                            <div
                              className={`absolute z-10 rounded-full shadow-sm transition-shadow
                                ${editMode ? "cursor-ew-resize hover:shadow-md hover:ring-2 hover:ring-indigo-300" : ""}`}
                              style={{
                                left: sx + previewPx, top: barTop, width: barW, height: BAR2_H,
                                backgroundColor: color,
                                opacity: previewPx !== 0 ? 1 : 0.8,
                                outline: previewPx !== 0 ? `2px solid ${color}` : undefined,
                              }}
                              onMouseDown={e => handleBarMouseDown(e, child.id)}
                            />

                            {/* 과제명 라벨 — 바 위 */}
                            <div className="absolute text-[11px] font-semibold whitespace-nowrap z-20 pointer-events-none"
                              style={{
                                left: sx + previewPx + barW / 2,
                                top: Math.max(2, labelAboveY),
                                transform: "translateX(-50%)",
                                color,
                              }}>
                              {child.name}
                            </div>

                            {/* 담당자 */}
                            {child.assignee && (
                              <div className="absolute text-[10px] text-gray-400 whitespace-nowrap z-20 pointer-events-none"
                                style={{ left: sx + barW + 6, top: "50%", transform: "translateY(-50%)" }}>
                                {child.assignee}
                              </div>
                            )}
                            {child.showOnLevel1 && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none z-20"
                                style={{ color: item.color }}>◆</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* 맨 아래 드롭존 — 마지막 순서로 이동 */}
            {reorderDraggingId && (
              <div
                style={{
                  height: 16,
                  borderTop: reorderDropBeforeId === "END" ? "2px solid #6366f1" : undefined,
                  transition: "border-top 0.1s",
                }}
                onMouseEnter={() => {
                  if (reorderDragRef.current) {
                    reorderDragRef.current.dropBeforeId = null;
                    setReorderDropBeforeId("END");
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 편집 모드 안내 패널 */}
      {editMode && (
        <div className="sticky bottom-0 z-40 border-t border-indigo-100 bg-indigo-50/90 backdrop-blur-sm px-4 py-2.5 flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2.5} className="shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-indigo-700 font-medium flex-1">
            바를 좌우로 드래그해 1주 단위로 이동 &nbsp;·&nbsp;
            체크박스 선택 시 함께 이동 &nbsp;·&nbsp;
            {selectedIds.size > 0 && <strong>{selectedIds.size}개 선택됨</strong>}
          </span>
          <button onClick={exitEditMode}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shrink-0">
            편집 종료
          </button>
        </div>
      )}

      {/* 편집 모달 */}
      {editTarget && (
        <EditModal
          parentId={editTarget.parentId}
          child={editTarget.child}
          items={items}
          onSave={(pid, updated) => { onEditLevel2?.(pid, updated); setEditTarget(null); }}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Phase 설정 모달 */}
      {phaseTarget && (
        <PhaseEditorModal
          item={phaseTarget}
          onSave={phases => { onEditLevel1Phases?.(phaseTarget.id, phases); setPhaseTarget(null); }}
          onClose={() => setPhaseTarget(null)}
        />
      )}

      {/* 색상 피커 팝오버 */}
      {colorPickerId && colorPickerPos && (
        <>
          <div className="fixed inset-0 z-40"
            onClick={() => { setColorPickerId(null); setColorPickerPos(null); }} />
          <div className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3"
            style={{ left: colorPickerPos.x, top: colorPickerPos.y }}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-0.5">색상 선택</p>
            <div className="grid grid-cols-4 gap-2">
              {PALETTE.map(c => {
                const isActive = items.find(i => i.id === colorPickerId)?.color === c;
                return (
                  <button key={c}
                    onClick={e => {
                      e.stopPropagation();
                      onEditLevel1Color?.(colorPickerId, c);
                      setColorPickerId(null);
                      setColorPickerPos(null);
                    }}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: c,
                      boxShadow: isActive ? `0 0 0 3px white, 0 0 0 5px ${c}` : undefined,
                      transform: isActive ? "scale(1.15)" : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ── 월 그리드 라인 ── */
function MonthGrid({ monthGroups, weekW }: {
  monthGroups: { month: number; count: number; startIdx: number; year: number }[];
  weekW: number;
}) {
  return (
    <>
      {monthGroups.map((mg, i) => (
        <div key={i}
          className={`absolute top-0 bottom-0 border-l ${mg.month === 1 ? "border-gray-300" : "border-gray-100"}`}
          style={{ left: mg.startIdx * weekW }} />
      ))}
    </>
  );
}

/* ── 범례 ── */
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
      <span className="w-5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/* ── 편집 모달 ── */
function EditModal({ parentId, child, items, onSave, onClose }: {
  parentId: string; child: Level2Item; items: Level1Item[];
  onSave: (parentId: string, updated: Level2Item) => void;
  onClose: () => void;
}) {
  const pm = (s: string) => s ? s.slice(0, 7) : "";
  const pw = (s: string) => s ? Number(s.split("-W")[1]) || 1 : 1;

  const [name,        setName]        = useState(child.name);
  const [startM,      setStartM]      = useState(pm(child.startDate));
  const [startW,      setStartW]      = useState(pw(child.startDate));
  const [endM,        setEndM]        = useState(pm(child.endDate));
  const [endW,        setEndW]        = useState(pw(child.endDate));
  const [assignee,    setAssignee]    = useState(child.assignee);
  const [status,      setStatus]      = useState<TaskStatus>(child.status);
  const [showOnLevel1,setShowOnLevel1]= useState(child.showOnLevel1 ?? false);
  const [pid,         setPid]         = useState(parentId);

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C] outline-none";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startM || !endM) return;
    onSave(pid, {
      ...child, parentId: pid, name: name.trim(),
      startDate: `${startM}-W${startW}`,
      endDate:   `${endM}-W${endW}`,
      assignee: assignee.trim(), status, showOnLevel1,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">세부 과제 수정</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">수정 후 저장하세요</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-3.5">
          <Lbl label="상위 그룹">
            <select value={pid} onChange={e => setPid(e.target.value)} className={inp}>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Lbl>
          <Lbl label="과제명">
            <input value={name} onChange={e => setName(e.target.value)} className={inp} required />
          </Lbl>
          <div className="grid grid-cols-2 gap-3">
            <Lbl label="시작일">
              <input type="month" value={startM} onChange={e => setStartM(e.target.value)} className={inp} required />
              <WPicker value={startW} onChange={setStartW} />
            </Lbl>
            <Lbl label="종료일">
              <input type="month" value={endM} onChange={e => setEndM(e.target.value)} className={inp} required />
              <WPicker value={endW} onChange={setEndW} />
            </Lbl>
          </div>
          <Lbl label="담당자">
            <input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="담당자명" className={inp} />
          </Lbl>
          <Lbl label="상태">
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={inp}>
              <option value="planned">예정</option>
              <option value="in-progress">진행중</option>
              <option value="completed">완료</option>
              <option value="critical">핵심 마일스톤</option>
            </select>
          </Lbl>
          <label className="flex items-start gap-2.5 cursor-pointer group pt-0.5">
            <input type="checkbox" checked={showOnLevel1} onChange={e => setShowOnLevel1(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#00733C]" />
            <div>
              <span className="text-xs font-medium text-gray-700 group-hover:text-[#00733C] transition-colors">
                Lv1 차트에 마일스톤 표시
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">상단 마일스톤 영역에 플래그로 표시됩니다</p>
            </div>
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">취소</button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#00733C] hover:bg-[#005a2e] text-white text-sm font-bold transition-colors">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function WPicker({ value, onChange }: { value: number; onChange: (w: number) => void }) {
  return (
    <div className="flex gap-1 mt-1.5">
      {[1, 2, 3, 4].map(w => (
        <button key={w} type="button" onClick={() => onChange(w)}
          className={`flex-1 py-1 text-xs font-semibold rounded border transition-all
            ${value === w ? "bg-[#00733C] text-white border-[#00733C]" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}>
          {w}W
        </button>
      ))}
    </div>
  );
}

/* ── Phase 설정 모달 ── */
function PhaseEditorModal({ item, onSave, onClose }: {
  item: Level1Item;
  onSave: (phases: PhaseSegment[]) => void;
  onClose: () => void;
}) {
  const [phases, setPhases] = useState<PhaseSegment[]>(item.phases ?? []);

  const pm = (s: string) => s ? s.slice(0, 7) : "";
  const pw = (s: string) => s ? Number(s.split("-W")[1]) || 1 : 1;

  const update = (i: number, key: keyof PhaseSegment, val: string) =>
    setPhases(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p));

  const setDate = (i: number, field: "startDate" | "endDate", month: string, week: number) => {
    if (month) update(i, field, `${month}-W${week}`);
  };

  const inp = "w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:border-[#00733C] outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Phase 구간 설정</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{item.name} · 바 내부를 구간별로 색상 구분</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">×</button>
        </div>

        <div className="space-y-3">
          {phases.map((phase, i) => {
            const N = phases.length;
            const alpha = N === 1 ? 0.85 : 0.32 + (i / (N - 1)) * 0.58;
            const alphHex = Math.round(alpha * 255).toString(16).padStart(2, "0");
            return (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded shrink-0"
                    style={{ backgroundColor: `${item.color}${alphHex}` }} />
                  <input value={phase.name}
                    onChange={e => update(i, "name", e.target.value)}
                    placeholder={`Phase ${i + 1}`}
                    className={`flex-1 ${inp}`} />
                  <button onClick={() => setPhases(p => p.filter((_, idx) => idx !== i))}
                    className="text-gray-300 hover:text-red-400 text-sm px-1 transition-colors">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">시작</p>
                    <input type="month" value={pm(phase.startDate)}
                      onChange={e => setDate(i, "startDate", e.target.value, pw(phase.startDate))}
                      className={inp} />
                    <WPicker value={pw(phase.startDate)}
                      onChange={w => setDate(i, "startDate", pm(phase.startDate), w)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">종료</p>
                    <input type="month" value={pm(phase.endDate)}
                      onChange={e => setDate(i, "endDate", e.target.value, pw(phase.endDate))}
                      className={inp} />
                    <WPicker value={pw(phase.endDate)}
                      onChange={w => setDate(i, "endDate", pm(phase.endDate), w)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => setPhases(p => [...p, { name: `Phase ${p.length + 1}`, startDate: "", endDate: "" }])}
          className="w-full mt-3 py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400
            hover:border-[#00733C] hover:text-[#00733C] transition-colors font-semibold">
          + Phase 추가
        </button>

        {phases.length > 0 && (
          <button onClick={() => setPhases([])}
            className="w-full mt-1.5 py-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors">
            전체 Phase 초기화
          </button>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">취소</button>
          <button onClick={() => onSave(phases.filter(p => p.startDate && p.endDate))}
            className="flex-1 py-2.5 rounded-xl bg-[#00733C] hover:bg-[#005a2e] text-white text-sm font-bold">저장</button>
        </div>
      </div>
    </div>
  );
}

/* ── 헬퍼 ── */
function buildWeeks(base: WDate, count: number): WDate[] {
  const result: WDate[] = [];
  let { year, month, week } = base;
  for (let i = 0; i < count; i++) {
    result.push({ year, month, week });
    week++;
    if (week > 4) { week = 1; month++; }
    if (month > 12) { month = 1; year++; }
  }
  return result;
}

function buildGroups(weeks: WDate[]) {
  const monthGroups: { month: number; year: number; count: number; startIdx: number; week1: boolean }[] = [];
  const yearGroups:  { year: number; count: number }[] = [];

  if (weeks.length === 0) return { monthGroups, yearGroups };

  let cm = weeks[0].month, cy = weeks[0].year, ms = 0;
  let ry = weeks[0].year, ys = 0;

  weeks.forEach((w, i) => {
    if (w.month !== cm || w.year !== cy) {
      monthGroups.push({ month: cm, year: cy, count: i - ms, startIdx: ms, week1: cm === 1 });
      cm = w.month; cy = w.year; ms = i;
    }
    if (w.year !== ry) {
      yearGroups.push({ year: ry, count: i - ys });
      ry = w.year; ys = i;
    }
  });
  monthGroups.push({ month: cm, year: cy, count: weeks.length - ms, startIdx: ms, week1: cm === 1 });
  yearGroups.push({ year: ry, count: weeks.length - ys });

  return { monthGroups, yearGroups };
}
