"use client";

import { useMemo, useState, useRef, useCallback, Fragment } from "react";
import {
  Level1Item, Level2Item, Level3Item, PhaseSegment, TaskStatus, STATUS_COLORS,
  getLevel1Range, parseWDate, wdateToIndex, todayWDate, WDate,
  dateStrToFractionalWeek, shiftDateByWeeks,
} from "@/lib/types";
import { exportToExcel } from "@/lib/exportExcel";
import { getMonthHolidays } from "@/lib/holidays";

interface BulkShiftUpdate { parentId: string; childId: string; startDate: string; endDate: string; }
interface BulkShiftL3Update { l2Id: string; l3Id: string; startDate: string; endDate: string; }

interface L3Row {
  rowId: string;      // merged → shared rowId, solo → l3.id
  isMerged: boolean;
  items: Level3Item[];
  label?: string;
}

interface Props {
  items: Level1Item[];
  title?: string;
  onEditLevel2?: (parentId: string, updated: Level2Item) => void;
  onEditLevel1Phases?: (id: string, phases: PhaseSegment[]) => void;
  onBulkShift?: (updates: BulkShiftUpdate[]) => void;
  onReorderLevel1?: (draggingId: string, dropBeforeId: string | null) => void;
  onEditLevel1Color?: (id: string, color: string) => void;
  onEditLevel1?: (updated: Level1Item) => void;
  onEditLevel3?: (l2Id: string, updated: Level3Item) => void;
  onBulkShiftL3?: (updates: BulkShiftL3Update[]) => void;
  onMergeL3?: (l2Id: string, srcRowId: string, targetRowId: string) => void;
  onUnmergeL3?: (l2Id: string, l3Id: string) => void;
  onUpdateL3RowLabel?: (l2Id: string, rowId: string, label: string) => void;
}

const WEEK_W      = 20;   // px per week  (1month = 4 × WEEK_W = 80px)
const MONTH_W     = 48;   // px per month (월 뷰)
const QUARTER_W   = 24;   // px per month (분기 뷰)
const DAY_W       = 35;   // px per day   (expanded month)

type ViewMode = "week" | "month" | "quarter";
const L1_BASE_H = 48;   // L1 기본 행 높이
const L2_H      = 36;
const BAR1_H    = 14;   // L1 pill height
const BAR2_H    = 6;    // L2 pill height
const MS_ROW_H  = 28;   // 마일스톤 한 줄 높이
const PHASE_H   = 30;   // Phase 헤더 행 높이
const L3_H      = 24;   // L3 행 높이
const BAR3_H    = 5;    // L3 pill height
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
  onEditLevel1,
  onEditLevel3,
  onBulkShiftL3,
  onMergeL3,
  onUnmergeL3,
  onUpdateL3RowLabel,
}: Props) {
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set());
  const [expandedL2,    setExpandedL2]    = useState<Set<string>>(new Set());
  const [editTarget,    setEditTarget]    = useState<{ parentId: string; child: Level2Item } | null>(null);
  const [l3EditTarget,  setL3EditTarget]  = useState<{ l2Id: string; child: Level3Item } | null>(null);
  const [l1EditTarget,  setL1EditTarget]  = useState<Level1Item | null>(null);
  const [phaseTarget,   setPhaseTarget]   = useState<Level1Item | null>(null);
  const [editMode,        setEditMode]        = useState(false);
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
  const [selectedL3Ids,   setSelectedL3Ids]   = useState<Set<string>>(new Set());
  // dragOffset: 'l1' = L1바 드래그, 'l2' = L2바 드래그, 'l3' = L3바 드래그
  const [dragOffset, setDragOffset] = useState<
    | { type: 'l1'; itemId: string; weekOffset: number }
    | { type: 'l2'; childId: string; weekOffset: number }
    | { type: 'l3'; l3Id: string; weekOffset: number; dayMode?: boolean }
    | null
  >(null);

  // 색상 피커
  const [colorPickerId,  setColorPickerId]  = useState<string | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [skipWeekends,   setSkipWeekends]   = useState(false);
  const [viewMode,       setViewMode]       = useState<ViewMode>("week");
  const [sortAssignee,   setSortAssignee]   = useState<"none" | "asc" | "desc">("none");
  const skipWeekendsRef    = useRef(skipWeekends);
  const expandedMonthsRef  = useRef(expandedMonths);
  skipWeekendsRef.current    = skipWeekends;
  expandedMonthsRef.current  = expandedMonths;

  // 병합 드래그 상태
  const [mergeDrag, setMergeDrag] = useState<{
    srcL2Id: string;
    srcRowId: string;
    targetRowId: string | null;
    valid: boolean;
  } | null>(null);

  // 행 레이블 인라인 편집 상태
  const [editingRowLabel, setEditingRowLabel] = useState<{
    l2Id: string; rowId: string; value: string;
  } | null>(null);

  const onMergeL3Ref = useRef(onMergeL3);
  onMergeL3Ref.current = onMergeL3;

  // L1 행 순서 변경 드래그 상태
  const [reorderDraggingId,  setReorderDraggingId]  = useState<string | null>(null);
  const [reorderDropBeforeId, setReorderDropBeforeId] = useState<string | null | "END">("END");
  const reorderDragRef = useRef<{ draggingId: string; dropBeforeId: string | null } | null>(null);

  // 최신 items / selectedIds를 드래그 핸들러(클로저) 안에서 참조하기 위한 ref
  const itemsRef          = useRef(items);
  const selectedIdsRef    = useRef(selectedIds);
  const selectedL3IdsRef  = useRef(selectedL3Ids);
  itemsRef.current        = items;
  selectedIdsRef.current  = selectedIds;
  selectedL3IdsRef.current = selectedL3Ids;

  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setSelectedIds(new Set());
    setSelectedL3Ids(new Set());
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

  const toggleL3 = useCallback((id: string) => {
    setSelectedL3Ids(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  // L3 바 드래그 핸들러 — 확장 시 일 단위, 비확장 시 주 단위
  const handleL3BarMouseDown = useCallback((
    e: React.MouseEvent,
    l3Id: string,
  ) => {
    if (!editMode || !onBulkShiftL3) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    let lastOffset = 0;
    const isDayMode = expandedMonthsRef.current.size > 0;
    const unitPx = isDayMode ? DAY_W : WEEK_W;

    const onMove = (ev: MouseEvent) => {
      const newOffset = Math.round((ev.clientX - startX) / unitPx);
      if (newOffset !== lastOffset) {
        lastOffset = newOffset;
        setDragOffset({ type: 'l3', l3Id, weekOffset: newOffset, dayMode: isDayMode });
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDragOffset(null);
      if (lastOffset === 0) return;

      const curSelected = selectedL3IdsRef.current;
      const curItems    = itemsRef.current;
      const idsToShift  = curSelected.size > 0 && curSelected.has(l3Id)
        ? curSelected : new Set([l3Id]);

      const skip = skipWeekendsRef.current;
      // 일 단위 모드: 캘린더일 또는 영업일로 이동
      // 주 단위 모드: 기존 주 단위 이동
      const shiftFn = isDayMode
        ? (dateStr: string) => skip
            ? shiftDateByWorkdays(dateStr, lastOffset)
            : shiftDateByCalendarDays(dateStr, lastOffset)
        : (dateStr: string) => skip
            ? shiftDateByWorkdays(dateStr, lastOffset * 5)
            : shiftDateByWeeks(dateStr, lastOffset);

      const updates: BulkShiftL3Update[] = [];
      for (const item of curItems)
        for (const l2 of item.children)
          for (const l3 of (l2.children ?? []))
            if (idsToShift.has(l3.id))
              updates.push({
                l2Id: l2.id, l3Id: l3.id,
                startDate: shiftFn(l3.startDate),
                endDate:   shiftFn(l3.endDate),
              });

      if (updates.length > 0) onBulkShiftL3(updates);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [editMode, onBulkShiftL3]);

  // 병합 드래그 핸들러 — 편집모드에서 ⣿ 핸들을 잡아 다른 L3 행으로 드래그
  const handleMergeHandleMouseDown = useCallback((
    e: React.MouseEvent,
    l2Id: string,
    srcRowId: string,
  ) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();

    setMergeDrag({ srcL2Id: l2Id, srcRowId, targetRowId: null, valid: false });

    const onMove = (ev: MouseEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const rowEl = el?.closest('[data-l3rowid]') as HTMLElement | null;
      const targetRowId  = rowEl?.dataset.l3rowid ?? null;
      const targetL2Id   = rowEl?.dataset.l2id   ?? null;

      if (!targetRowId || targetRowId === srcRowId || targetL2Id !== l2Id) {
        setMergeDrag(prev => prev ? { ...prev, targetRowId: null, valid: false } : null);
        return;
      }

      // 날짜 겹침 검사: 소스 행의 모든 항목 vs 타깃 행의 모든 항목
      const curItems = itemsRef.current;
      const srcItems: Level3Item[] = [], tgtItems: Level3Item[] = [];
      for (const l1 of curItems)
        for (const l2 of l1.children) {
          if (l2.id !== l2Id) continue;
          for (const l3 of (l2.children ?? [])) {
            if (l3.id === srcRowId || l3.rowId === srcRowId) srcItems.push(l3);
            if (l3.id === targetRowId || l3.rowId === targetRowId) tgtItems.push(l3);
          }
        }

      const hasOverlap = srcItems.some(s => tgtItems.some(t => datesOverlap(s, t)));
      const valid = srcItems.length > 0 && tgtItems.length > 0 && !hasOverlap;
      setMergeDrag(prev => prev ? { ...prev, targetRowId, valid } : null);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setMergeDrag(prev => {
        if (prev?.targetRowId && prev.valid) {
          onMergeL3Ref.current?.(prev.srcL2Id, prev.srcRowId, prev.targetRowId);
        }
        return null;
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [editMode]);

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
  const dragRef    = useRef<{ startX: number; startW: number } | null>(null);
  const outerRef        = useRef<HTMLDivElement>(null);
  const scrollRef       = useRef<HTMLDivElement>(null);
  const topScrollRef    = useRef<HTMLDivElement>(null);
  const syncingScroll   = useRef(false);
  const [exporting, setExporting] = useState(false);

  const onTopScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncingScroll.current) return;
    syncingScroll.current = true;
    if (scrollRef.current) scrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    syncingScroll.current = false;
  }, []);

  const onMainScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncingScroll.current) return;
    syncingScroll.current = true;
    if (topScrollRef.current) topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    syncingScroll.current = false;
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!outerRef.current || !scrollRef.current || exporting) return;
    setExporting(true);
    const scrollEl = scrollRef.current;
    const outerEl  = outerRef.current;

    // 원본 상태 저장
    const saved = {
      scrollOverflow:  scrollEl.style.overflow,
      scrollMaxHeight: scrollEl.style.maxHeight,
      outerOverflow:   outerEl.style.overflow,
      scrollLeft:      scrollEl.scrollLeft,
      scrollTop:       scrollEl.scrollTop,
      stickyEls:       [] as { el: HTMLElement; pos: string }[],
    };

    try {
      const { default: html2canvas } = await import("html2canvas");

      // 1) overflow 제거
      scrollEl.style.overflow  = "visible";
      scrollEl.style.maxHeight = "none";
      outerEl.style.overflow   = "visible";

      // 2) sticky → relative (html2canvas 호환 문제 해결)
      outerEl.querySelectorAll("*").forEach(node => {
        const el = node as HTMLElement;
        try {
          if (getComputedStyle(el).position === "sticky") {
            saved.stickyEls.push({ el, pos: el.style.position });
            el.style.position = "relative";
          }
        } catch {}
      });

      // 3) 스크롤 원점으로
      scrollEl.scrollLeft = 0;
      scrollEl.scrollTop  = 0;

      await new Promise(r => setTimeout(r, 150));

      // 4) 캔버스 크기 제한 (Chrome 16384px)
      const w = outerEl.scrollWidth;
      const h = outerEl.scrollHeight;
      const scale = Math.min(2, 16384 / Math.max(w, h));

      const canvas = await html2canvas(outerEl, {
        useCORS: true,
        scale,
        backgroundColor: "#ffffff",
        width: w,
        height: h,
        scrollX: 0,
        scrollY: 0,
      });

      canvas.toBlob(blob => {
        if (!blob) return;
        const url  = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${title}_타임라인.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } catch (err) {
      console.error("PNG export error:", err);
    } finally {
      // 모든 상태 원복
      scrollEl.style.overflow  = saved.scrollOverflow;
      scrollEl.style.maxHeight = saved.scrollMaxHeight;
      outerEl.style.overflow   = saved.outerOverflow;
      scrollEl.scrollLeft      = saved.scrollLeft;
      scrollEl.scrollTop       = saved.scrollTop;
      saved.stickyEls.forEach(({ el, pos }) => { el.style.position = pos; });
      setExporting(false);
    }
  }, [exporting, title]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(items, title);
  }, [items, title]);

  const toggle = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleL2Expand = (id: string) =>
    setExpandedL2(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

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

  /* ── 월별 레이아웃 (확장 여부 + 뷰 모드 반영) ── */
  const { monthLayout, totalWidth, yearLayout } = useMemo(() => {
    const baseMonthW = viewMode === "month" ? MONTH_W : viewMode === "quarter" ? QUARTER_W : 0;
    const ml: Array<{
      year: number; month: number; count: number; startIdx: number; week1: boolean;
      x: number; width: number; expanded: boolean;
    }> = [];
    let x = 0;
    for (const mg of monthGroups) {
      const key = `${mg.year}-${String(mg.month).padStart(2, "0")}`;
      const canExpand = viewMode === "week";
      const isExp = canExpand && expandedMonths.has(key);
      const days = new Date(mg.year, mg.month, 0).getDate();
      const width = isExp ? days * DAY_W : viewMode === "week" ? mg.count * WEEK_W : baseMonthW;
      ml.push({ ...mg, x, width, expanded: isExp });
      x += width;
    }
    const yl: Array<{ year: number; x: number; width: number }> = [];
    for (const m of ml) {
      if (yl.length === 0 || yl[yl.length - 1].year !== m.year) {
        yl.push({ year: m.year, x: m.x, width: m.width });
      } else {
        yl[yl.length - 1].width += m.width;
      }
    }
    return { monthLayout: ml, totalWidth: x, yearLayout: yl };
  }, [monthGroups, expandedMonths, viewMode]);

  /* ── 분기 레이아웃 (quarter 뷰 전용) ── */
  const quarterLayout = useMemo(() => {
    if (viewMode !== "quarter") return [] as { year: number; quarter: number; x: number; width: number }[];
    const result: { year: number; quarter: number; x: number; width: number }[] = [];
    for (const m of monthLayout) {
      const q = Math.ceil(m.month / 3);
      const last = result[result.length - 1];
      if (!last || last.year !== m.year || last.quarter !== q) {
        result.push({ year: m.year, quarter: q, x: m.x, width: m.width });
      } else {
        last.width += m.width;
      }
    }
    return result;
  }, [viewMode, monthLayout]);

  const toggleMonth = (year: number, month: number) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    setExpandedMonths(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  // 날짜 → x 픽셀 (주 단위 WDate)
  function xForWDate(wd: WDate): number {
    const m = monthLayout.find(ml => ml.year === wd.year && ml.month === wd.month);
    if (!m) return 0;
    if (m.expanded) return m.x + (wd.week - 1) * 7 * DAY_W;
    return m.x + (wd.week - 1) * (m.width / 4);
  }
  // 날짜 → x 픽셀 (YYYY-MM-DD 문자열)
  function xForDateStr(dateStr: string): number {
    if (!dateStr) return 0;
    const parts = dateStr.split("-");
    if (parts.length < 3) return 0;
    const y = Number(parts[0]), mo = Number(parts[1]), d = Number(parts[2]);
    if (!y || !mo || !d) return 0;
    const m = monthLayout.find(ml => ml.year === y && ml.month === mo);
    if (!m) return 0;
    if (m.expanded) return m.x + (d - 1) * DAY_W;
    const weekW = m.width / 4;
    const week = Math.min(4, Math.ceil(d / 7));
    const dayInWeek = (d - 1) % 7;
    return m.x + (week - 1) * weekW + (dayInWeek / 7) * weekW;
  }
  // 한 슬롯(주) 폭
  function slotW(wd: WDate): number {
    const m = monthLayout.find(ml => ml.year === wd.year && ml.month === wd.month);
    return m?.expanded ? 7 * DAY_W : (m?.width ?? WEEK_W * 4) / 4;
  }
  // 하루 픽셀 폭
  function daySlotW(dateStr: string): number {
    const parts = dateStr.split("-");
    const y = Number(parts[0]), mo = Number(parts[1]);
    const m = monthLayout.find(ml => ml.year === y && ml.month === mo);
    return m?.expanded ? DAY_W : (m?.width ?? WEEK_W * 4) / 28;
  }

  const todayRaw = new Date();
  const todayX = xForDateStr(
    `${todayRaw.getFullYear()}-${String(todayRaw.getMonth() + 1).padStart(2, "0")}-${String(todayRaw.getDate()).padStart(2, "0")}`
  );
  const showToday = todayX >= 0 && todayX <= totalWidth;
  const anyExpanded = expandedMonths.size > 0;

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
      <div ref={outerRef} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
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
            {/* 뷰 모드 토글 */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
              {(["week", "month", "quarter"] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1.5 transition-colors border-r border-gray-200 last:border-r-0
                    ${viewMode === mode
                      ? "bg-gray-800 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  {mode === "week" ? "주" : mode === "month" ? "월" : "분기"}
                </button>
              ))}
            </div>
            {/* 담당자 정렬 */}
            <button
              onClick={() => setSortAssignee(s => s === "none" ? "asc" : s === "asc" ? "desc" : "none")}
              title={sortAssignee === "none" ? "담당자 오름차순 정렬" : sortAssignee === "asc" ? "담당자 내림차순 정렬" : "정렬 해제"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                ${sortAssignee !== "none"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 12h12M9 17h6" />
              </svg>
              담당자{sortAssignee === "asc" ? " ↑" : sortAssignee === "desc" ? " ↓" : ""}
            </button>
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
            {/* 구분선 */}
            <div className="w-px h-5 bg-gray-200" />
            {/* Excel 내보내기 */}
            <button
              onClick={handleExportExcel}
              title="Excel 내보내기"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Excel
            </button>
            {/* PNG 내보내기 */}
            <button
              onClick={handleExportPNG}
              disabled={exporting}
              title="이미지(PNG) 내보내기"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border bg-white text-sky-700 border-sky-200 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-wait">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
              </svg>
              {exporting ? "캡처 중..." : "PNG"}
            </button>
          </div>
        </div>

        {/* 상단 스크롤바 */}
        <div
          ref={topScrollRef}
          onScroll={onTopScroll}
          className="overflow-x-auto overflow-y-hidden border-b border-gray-100"
          style={{ height: 14 }}
        >
          <div style={{ minWidth: labelW + totalWidth, height: 1 }} />
        </div>

        <div ref={scrollRef} onScroll={onMainScroll} className="overflow-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
          <div style={{ minWidth: labelW + totalWidth }}>

            {/* ━━━ 헤더 ━━━ */}
            <div className="flex sticky top-0 z-30 shadow-sm">
              {/* TASK 열 헤더 */}
              <div style={{ width: labelW, minWidth: labelW }}
                className="sticky left-0 z-30 bg-gray-800 border-r border-gray-700 flex items-center pb-0 px-4 relative">
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
                  {yearLayout.map(yg => (
                    <div key={yg.year}
                      style={{ width: yg.width }}
                      className="text-center text-[15px] font-bold text-white py-1.5 border-r border-gray-600 last:border-r-0 tracking-wider">
                      {yg.year}
                    </div>
                  ))}
                </div>
                {/* 분기 뷰: Q1~Q4 행 */}
                {viewMode === "quarter" ? (
                  <div className="flex">
                    {quarterLayout.map((qg, i) => (
                      <div key={i}
                        style={{ width: qg.width }}
                        className="text-center py-1.5 border-r border-gray-700 last:border-r-0 text-[12px] font-bold text-amber-300 select-none">
                        Q{qg.quarter}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 주/월 뷰: 월 행 — 주 뷰에서만 클릭으로 일별 펼치기 */
                  <div className={`flex${anyExpanded ? " border-b border-gray-700" : ""}`}>
                    {monthLayout.map((mg, i) => (
                      <div key={i}
                        style={{ width: mg.width }}
                        onClick={() => viewMode === "week" && toggleMonth(mg.year, mg.month)}
                        title={viewMode === "week" ? (mg.expanded ? "클릭하여 주 단위로 축소" : "클릭하여 일 단위로 펼치기") : undefined}
                        className={`text-center py-1.5 border-r border-gray-700 last:border-r-0 select-none
                          ${viewMode === "week" ? "cursor-pointer transition-colors hover:bg-gray-700" : "cursor-default"}
                          ${mg.month === 1
                            ? "text-[13px] font-extrabold text-green-300"
                            : "text-[12px] font-semibold text-gray-300"}
                          ${mg.expanded ? "bg-gray-700 text-white" : ""}`}>
                        {mg.month}{mg.expanded ? "▾" : ""}
                      </div>
                    ))}
                  </div>
                )}
                {/* 주 행 — 주 뷰에서 W1~W4 표시 */}
                {viewMode === "week" && (
                  <div className="flex border-b border-gray-700">
                    {monthLayout.map((mg, i) => {
                      if (mg.expanded) {
                        return <div key={i} style={{ width: mg.width }} className="border-r border-gray-700 last:border-r-0" />;
                      }
                      const weeks = mg.count ?? 4;
                      return (
                        <div key={i} style={{ width: mg.width }} className="flex border-r border-gray-700 last:border-r-0">
                          {Array.from({ length: weeks }, (_, w) => (
                            <div key={w}
                              style={{ width: WEEK_W, minWidth: WEEK_W }}
                              className="text-center text-[9px] py-0.5 border-r border-gray-700 last:border-r-0 shrink-0 text-gray-400 font-medium">
                              {w + 1}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* 일 행 — 주 뷰 + 확장된 월만 표시 */}
                {viewMode === "week" && anyExpanded && (
                  <div className="flex">
                    {monthLayout.map((mg, i) => {
                      if (!mg.expanded) {
                        return <div key={i} style={{ width: mg.width }} className="border-r border-gray-700 last:border-r-0" />;
                      }
                      const days = new Date(mg.year, mg.month, 0).getDate();
                      const holidays = getMonthHolidays(mg.year, mg.month);
                      return (
                        <div key={i} style={{ width: mg.width }} className="flex border-r border-gray-600 last:border-r-0">
                          {Array.from({ length: days }, (_, d) => {
                            const dow = new Date(mg.year, mg.month - 1, d + 1).getDay();
                            const isSun = dow === 0, isSat = dow === 6;
                            const holiday = holidays.get(d + 1);
                            const isHoliday = !!holiday;
                            return (
                              <div key={d}
                                title={holiday}
                                style={{ width: DAY_W, minWidth: DAY_W }}
                                className={`text-center text-[9px] py-0.5 border-r border-gray-700 last:border-r-0 shrink-0 overflow-hidden font-medium
                                  ${isHoliday || isSun ? "text-red-400 bg-red-900/20" : isSat ? "text-indigo-400 bg-indigo-900/20" : "text-gray-400"}`}>
                                {d + 1}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ━━━ 본문 (L1 + L2) ━━━ */}
            {/* 순서 변경 드래그 중: 전체 차트에 grabbing 커서 */}
            <style>{reorderDraggingId ? "* { cursor: grabbing !important; }" : ""}</style>
            {(sortAssignee === "none" ? items : items.map(item => ({
              ...item,
              children: [...item.children].sort((a, b) => {
                const cmp = a.assignee.localeCompare(b.assignee, "ko");
                return sortAssignee === "asc" ? cmp : -cmp;
              }),
            }))).map((item, itemIdx) => {
              const range      = getLevel1Range(item);
              const isExpanded = expanded.has(item.id);
              const l2TotalH   = item.children.reduce((sum, l2) => {
                const l3Rows = buildL3Rows(l2.children ?? [], l2.l3RowMeta);
                return sum + L2_H + (expandedL2.has(l2.id) && l3Rows.length > 0 ? l3Rows.length * L3_H : 0);
              }, 0);

              /* ── 이 L1의 마일스톤 플래그 스태킹 ── */
              const msRaw = item.children
                .filter(c => c.showOnLevel1)
                .map(c => ({ child: c, x: xForWDate(parseWDate(c.startDate)) }))
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
                      className="sticky left-0 z-20 bg-white border-r border-gray-100 flex items-center gap-2 px-4 shrink-0">
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
                      {/* L1 수정 버튼 */}
                      {onEditLevel1 && (
                        <button
                          onClick={e => { e.stopPropagation(); setL1EditTarget(item); }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 text-gray-400 hover:text-gray-600 transition-all shrink-0"
                          title="그룹 과제 수정">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
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
                    <div className="flex-1 relative overflow-hidden isolate">
                      {/* 그리드 */}
                      <MonthGrid monthLayout={monthLayout} viewMode={viewMode} />

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

                        const startWd = parseWDate(range.start);
                        const endWd   = parseWDate(range.end);
                        const sx   = xForWDate(startWd);
                        const ex   = xForWDate(endWd) + slotW(endWd);
                        const barW = Math.max(ex - sx, slotW(startWd) * 2);
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
                              const phEndWd = parseWDate(phase.endDate);
                              const psx = Math.max(0, xForWDate(parseWDate(phase.startDate)) - sx);
                              const pex = Math.min(barW, xForWDate(phEndWd) + slotW(phEndWd) - sx);
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
                    overflow: "clip",
                    transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1)",
                  }}>
                    {item.children.map((child, cIdx) => {
                      const sWd    = parseWDate(child.startDate);
                      const eWd    = parseWDate(child.endDate);
                      const sx     = xForWDate(sWd);
                      const ex     = xForWDate(eWd) + slotW(eWd);
                      const barW   = Math.max(ex - sx, slotW(sWd));
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
                        <Fragment key={child.id}>
                        <div
                          className={`flex border-t border-gray-100 group transition-colors duration-100
                            ${cIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                            ${editMode ? "" : "cursor-pointer hover:bg-blue-50/50"}`}
                          style={{ height: L2_H }}
                          onClick={e => {
                            if (editMode) return;
                            e.stopPropagation();
                            setEditTarget({ parentId: item.id, child });
                          }}
                        >
                          {/* 라벨 */}
                          <div style={{ width: labelW, minWidth: labelW }}
                            className="sticky left-0 z-10 bg-white border-r border-gray-100 flex items-center px-3 gap-2 shrink-0">
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
                            {/* 편집 아이콘 */}
                            {!editMode && (
                              <svg className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            )}
                            {/* L3 펼치기 버튼 */}
                            {!editMode && (child.children?.length ?? 0) > 0 && (
                              <button
                                onClick={e => { e.stopPropagation(); toggleL2Expand(child.id); }}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 shrink-0 opacity-60 hover:opacity-100 transition-all"
                                title="세부항목 펼치기/접기">
                                <svg className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${expandedL2.has(child.id) ? "rotate-90" : ""}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* 차트 */}
                          <div className="flex-1 relative overflow-hidden isolate">
                            <MonthGrid monthLayout={monthLayout} viewMode={viewMode} />
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

                        {/* ── Level 3 슬라이드 ── */}
                        {(child.children?.length ?? 0) > 0 && (() => {
                            const l3Rows = buildL3Rows(child.children!, child.l3RowMeta);
                            return (
                              <div style={{
                                maxHeight: expandedL2.has(child.id)
                                  ? `${l3Rows.length * L3_H}px` : "0px",
                                overflow: "clip",
                                transition: "max-height 0.25s cubic-bezier(0.4,0,0.2,1)",
                              }}>
                                {l3Rows.map((row, rowIdx) => {
                                  const isTarget   = mergeDrag?.targetRowId === row.rowId;
                                  const isMergeOk  = isTarget && mergeDrag?.valid;
                                  const isMergeNg  = isTarget && !mergeDrag?.valid;
                                  return (
                                    <div key={row.rowId}
                                      data-l3rowid={row.rowId}
                                      data-l2id={child.id}
                                      className={`flex border-t border-gray-100
                                        ${editMode ? "" : "cursor-pointer hover:bg-blue-50/40"}
                                        ${rowIdx % 2 === 0 ? "bg-slate-50/30" : "bg-white"}
                                        ${isMergeOk ? "!bg-emerald-50 ring-1 ring-inset ring-emerald-400" : ""}
                                        ${isMergeNg ? "!bg-red-50 ring-1 ring-inset ring-red-300" : ""}`}
                                      style={{ height: L3_H }}
                                      onClick={() => {
                                        if (!editMode && row.items[0])
                                          setL3EditTarget({ l2Id: child.id, child: row.items[0] });
                                      }}>

                                      {/* ── 라벨 열 ── */}
                                      <div style={{ width: labelW, minWidth: labelW }}
                                        className="sticky left-0 z-10 bg-white border-r border-gray-100 flex items-center gap-1 shrink-0 pl-6 pr-1">
                                        {/* 체크박스 / 구분선 */}
                                        {editMode ? (
                                          <input type="checkbox"
                                            checked={row.items.every(l3 => selectedL3Ids.has(l3.id))}
                                            onChange={e => { e.stopPropagation(); row.items.forEach(l3 => toggleL3(l3.id)); }}
                                            onClick={e => e.stopPropagation()}
                                            className="w-3 h-3 accent-indigo-600 shrink-0 cursor-pointer"
                                          />
                                        ) : (
                                          <div className="w-px h-3 bg-gray-200 shrink-0" />
                                        )}

                                        {/* 행 레이블 (병합 행에만) */}
                                        {row.isMerged && (
                                          editingRowLabel?.l2Id === child.id && editingRowLabel.rowId === row.rowId
                                            ? <input
                                                autoFocus
                                                value={editingRowLabel.value}
                                                onChange={e => setEditingRowLabel(p => p ? { ...p, value: e.target.value } : null)}
                                                onBlur={() => {
                                                  onUpdateL3RowLabel?.(child.id, row.rowId, editingRowLabel!.value);
                                                  setEditingRowLabel(null);
                                                }}
                                                onKeyDown={e => {
                                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                                    if (e.key === 'Enter') onUpdateL3RowLabel?.(child.id, row.rowId, editingRowLabel!.value);
                                                    setEditingRowLabel(null);
                                                  }
                                                  e.stopPropagation();
                                                }}
                                                onClick={e => e.stopPropagation()}
                                                className="w-12 text-[10px] px-1 border border-teal-400 rounded bg-white text-teal-700 font-bold outline-none shrink-0"
                                              />
                                            : <span
                                                className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded px-1 shrink-0 cursor-text select-none whitespace-nowrap"
                                                onClick={e => { e.stopPropagation(); setEditingRowLabel({ l2Id: child.id, rowId: row.rowId, value: row.label ?? '' }); }}
                                                title="클릭하여 행 레이블 편집">
                                                {row.label || '레이블'}
                                              </span>
                                        )}

                                        {/* 개별 항목들 */}
                                        <div className="flex-1 flex items-center gap-0.5 min-w-0 overflow-hidden">
                                          {row.items.map((l3, li) => {
                                            const c3 = STATUS_COLORS[l3.status];
                                            return (
                                              <span key={l3.id} className="flex items-center gap-0.5 min-w-0 shrink-0">
                                                {li > 0 && <span className="text-gray-300 text-[10px]">/</span>}
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c3 }} />
                                                <span className="text-[12px] text-gray-600 truncate font-medium max-w-[60px]">{l3.name}</span>
                                                {editMode && row.isMerged && (
                                                  <button
                                                    onClick={e => { e.stopPropagation(); onUnmergeL3?.(child.id, l3.id); }}
                                                    className="text-[10px] text-gray-300 hover:text-red-400 transition-colors shrink-0 leading-none"
                                                    title="이 항목을 별도 행으로 분리">✕</button>
                                                )}
                                              </span>
                                            );
                                          })}
                                        </div>

                                        {/* 병합 드래그 핸들 (편집모드) */}
                                        {editMode && (
                                          <div
                                            className="w-4 h-full flex items-center justify-center text-gray-300 hover:text-indigo-400 cursor-grab shrink-0 select-none"
                                            title="드래그하여 다른 행과 합치기"
                                            onMouseDown={e => handleMergeHandleMouseDown(e, child.id, row.rowId)}>
                                            ⣿
                                          </div>
                                        )}
                                      </div>

                                      {/* ── 차트 열 ── */}
                                      <div className="flex-1 relative overflow-hidden isolate">
                                        <MonthGrid monthLayout={monthLayout} viewMode={viewMode} />
                                        {showToday && (
                                          <div className="absolute top-0 bottom-0 w-px bg-red-400/20 pointer-events-none"
                                            style={{ left: todayX }} />
                                        )}
                                        {row.items.map(l3 => {
                                          const sx3 = xForDateStr(l3.startDate);
                                          const ex3 = xForDateStr(l3.endDate) + daySlotW(l3.endDate);
                                          const bw3 = Math.max(ex3 - sx3, daySlotW(l3.startDate));
                                          const c3  = STATUS_COLORS[l3.status];
                                          const isDragThisL3  = dragOffset?.type === 'l3' && dragOffset.l3Id === l3.id;
                                          const isDragGroupL3 = dragOffset?.type === 'l3' && selectedL3Ids.has(dragOffset.l3Id) && selectedL3Ids.has(l3.id);
                                          const l3UnitPx = dragOffset?.type === 'l3' && dragOffset.dayMode ? DAY_W : WEEK_W;
                                          const previewPx3 = (isDragThisL3 || isDragGroupL3) ? (dragOffset?.weekOffset ?? 0) * l3UnitPx : 0;
                                          return (
                                            <Fragment key={l3.id}>
                                              <div
                                                className={`absolute z-10 rounded-full shadow-sm${editMode ? " cursor-ew-resize hover:shadow-md hover:ring-1 hover:ring-indigo-300" : ""}`}
                                                style={{
                                                  left: sx3 + previewPx3, top: (L3_H - BAR3_H) / 2,
                                                  width: bw3, height: BAR3_H,
                                                  backgroundColor: c3,
                                                  opacity: previewPx3 !== 0 ? 1 : 0.75,
                                                  outline: previewPx3 !== 0 ? `2px solid ${c3}` : undefined,
                                                }}
                                                onMouseDown={e => handleL3BarMouseDown(e, l3.id)}
                                              />
                                              <div className="absolute text-[11px] font-semibold whitespace-nowrap z-20 pointer-events-none"
                                                style={{
                                                  left: sx3 + previewPx3 + bw3 / 2,
                                                  top: (L3_H - BAR3_H) / 2 - 13,
                                                  transform: "translateX(-50%)", color: c3,
                                                }}>
                                                {l3.name}
                                              </div>
                                            </Fragment>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </Fragment>
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
          <span className="text-xs text-indigo-700 font-medium flex-1 whitespace-nowrap">
            Lv1·Lv2 주 단위 &nbsp;·&nbsp;
            Lv3 {anyExpanded ? "일 단위" : "주 단위"} 드래그
            {skipWeekends && anyExpanded && <span className="text-emerald-600"> (주말 건너뜀)</span>}
            {selectedIds.size > 0 && <> &nbsp;·&nbsp; <strong>Lv2 {selectedIds.size}개</strong></>}
            {selectedL3Ids.size > 0 && <> &nbsp;·&nbsp; <strong>Lv3 {selectedL3Ids.size}개</strong></>}
          </span>
          {/* Lv3 주말 건너뛰기 토글 */}
          <button
            onClick={() => setSkipWeekends(v => !v)}
            title={skipWeekends ? "주말도 포함하여 이동 (캘린더 기준)" : "주말을 건너뛰고 영업일만 이동"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0
              ${skipWeekends
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400 hover:text-emerald-600"}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              {skipWeekends
                ? <path d="M8 14h.01M12 14h.01M8 18h.01M12 18h.01" />
                : <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />}
            </svg>
            {skipWeekends ? "영업일 기준" : "캘린더 기준"}
          </button>
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

      {/* L3 수정 모달 */}
      {l3EditTarget && (
        <EditLevel3Modal
          l2Id={l3EditTarget.l2Id}
          child={l3EditTarget.child}
          onSave={(l2Id, updated) => { onEditLevel3?.(l2Id, updated); setL3EditTarget(null); }}
          onClose={() => setL3EditTarget(null)}
        />
      )}

      {/* L1 수정 모달 */}
      {l1EditTarget && (
        <EditLevel1Modal
          item={l1EditTarget}
          onSave={updated => { onEditLevel1?.(updated); setL1EditTarget(null); }}
          onClose={() => setL1EditTarget(null)}
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
function MonthGrid({ monthLayout, viewMode }: {
  monthLayout: Array<{ month: number; year: number; x: number; width: number; expanded: boolean; count?: number }>;
  viewMode?: string;
}) {
  return (
    <>
      {monthLayout.map((mg, i) => (
        <Fragment key={i}>
          <div
            className={`absolute top-0 bottom-0 border-l ${mg.month === 1 ? "border-gray-300" : "border-gray-100"}`}
            style={{ left: mg.x }} />
          {/* 주 구분선 (week view, 확장되지 않은 월) */}
          {viewMode === "week" && !mg.expanded && (mg.count ?? 4) > 1 && Array.from(
            { length: (mg.count ?? 4) - 1 },
            (_, w) => (
              <div key={`w${w}`}
                className="absolute top-0 bottom-0 border-l border-dashed border-gray-200 pointer-events-none"
                style={{ left: mg.x + (w + 1) * WEEK_W }} />
            )
          )}
          {mg.expanded && Array.from(
            { length: new Date(mg.year, mg.month, 0).getDate() },
            (_, d) => {
              const dow = new Date(mg.year, mg.month - 1, d + 1).getDay(); // 0=일, 6=토
              const holiday = getMonthHolidays(mg.year, mg.month).get(d + 1);
              const isHoliday = !!holiday;
              const isWeekend = dow === 0 || dow === 6;
              return (
                <Fragment key={d}>
                  {(isWeekend || isHoliday) && (
                    <div className="absolute top-0 bottom-0 pointer-events-none"
                      style={{
                        left: mg.x + d * DAY_W,
                        width: DAY_W,
                        backgroundColor: (dow === 0 || isHoliday) ? "rgba(239,68,68,0.07)" : "rgba(99,102,241,0.07)",
                      }} />
                  )}
                  <div className="absolute top-0 bottom-0 border-l border-gray-100/50 pointer-events-none"
                    style={{ left: mg.x + d * DAY_W }} />
                </Fragment>
              );
            }
          )}
        </Fragment>
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

/* ── Lv3 수정 모달 ── */
function EditLevel3Modal({ l2Id, child, onSave, onClose }: {
  l2Id: string; child: Level3Item;
  onSave: (l2Id: string, updated: Level3Item) => void;
  onClose: () => void;
}) {
  const [name,      setName]      = useState(child.name);
  const [startDate, setStartDate] = useState(child.startDate);
  const [endDate,   setEndDate]   = useState(child.endDate);
  const [assignee,  setAssignee]  = useState(child.assignee);
  const [status,    setStatus]    = useState<TaskStatus>(child.status);

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C] outline-none";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    onSave(l2Id, { ...child, name: name.trim(), startDate, endDate, assignee: assignee.trim(), status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">세부항목 수정</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Level 3 항목 수정</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-3.5">
          <Lbl label="세부항목명">
            <input value={name} onChange={e => setName(e.target.value)} className={inp} required />
          </Lbl>
          <div className="grid grid-cols-2 gap-3">
            <Lbl label="시작일">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} required />
            </Lbl>
            <Lbl label="종료일">
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inp} required />
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

/* ── Lv1 수정 모달 ── */
function EditLevel1Modal({ item, onSave, onClose }: {
  item: Level1Item;
  onSave: (updated: Level1Item) => void;
  onClose: () => void;
}) {
  const [name,     setName]     = useState(item.name);
  const [assignee, setAssignee] = useState(item.assignee);
  const [status,   setStatus]   = useState<TaskStatus>(item.status);

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C] outline-none";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ ...item, name: name.trim(), assignee: assignee.trim(), status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <div>
              <h3 className="text-base font-bold text-gray-900">그룹 과제 수정</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">색상은 차트에서 색상 바를 클릭해 변경</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-3.5">
          <Lbl label="그룹명">
            <input value={name} onChange={e => setName(e.target.value)} className={inp} required autoFocus />
          </Lbl>
          <Lbl label="담당자">
            <input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="담당자명 (선택)" className={inp} />
          </Lbl>
          <Lbl label="상태">
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={inp}>
              <option value="planned">예정</option>
              <option value="in-progress">진행중</option>
              <option value="completed">완료</option>
              <option value="critical">핵심 마일스톤</option>
            </select>
          </Lbl>
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

/* ── L3 행 그룹화 ── */
function buildL3Rows(
  items: Level3Item[],
  meta: Record<string, { label: string }> = {},
): L3Row[] {
  const rows: L3Row[] = [];
  const rowMap = new Map<string, L3Row>();
  for (const l3 of items) {
    if (l3.rowId) {
      if (!rowMap.has(l3.rowId)) {
        const row: L3Row = { rowId: l3.rowId, isMerged: true, items: [], label: meta[l3.rowId]?.label };
        rowMap.set(l3.rowId, row);
        rows.push(row);
      }
      rowMap.get(l3.rowId)!.items.push(l3);
    } else {
      rows.push({ rowId: l3.id, isMerged: false, items: [l3] });
    }
  }
  return rows;
}

function datesOverlap(a: Level3Item, b: Level3Item): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

/* ── 헬퍼 ── */
function shiftDateByCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function shiftDateByWorkdays(dateStr: string, workdays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dir = workdays >= 0 ? 1 : -1;
  let remaining = Math.abs(workdays);
  while (remaining > 0) {
    dt.setDate(dt.getDate() + dir);
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

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
