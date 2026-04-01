"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Level1Item, Level2Item, PhaseSegment, CATEGORY_COLORS, generateId } from "@/lib/types";
import TimelineForm from "@/components/TimelineForm";
import TimelineChart from "@/components/TimelineChart";
import TaskList from "@/components/TaskList";

const C = CATEGORY_COLORS;
const g = generateId;

const DEFAULT_DATA: Level1Item[] = [
  {
    id: g(), name: "MES", color: C[0], assignee: "", status: "in-progress",
    children: [
      { id: g(), parentId: "", name: "MES TFT 창설", startDate: "2026-02-W1", endDate: "2026-02-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "설비자산 업체 실사", startDate: "2026-03-W1", endDate: "2026-04-W2", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "로드맵 상세화", startDate: "2026-04-W1", endDate: "2026-05-W2", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "업체별 장단점 분석", startDate: "2026-05-W3", endDate: "2026-07-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "URS 작성", startDate: "2026-08-W1", endDate: "2026-10-W3", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "26.12 업체 선정", startDate: "2026-11-W1", endDate: "2026-12-W4", assignee: "", status: "in-progress", showOnLevel1: true },
      { id: g(), parentId: "", name: "MES 구축 개시", startDate: "2027-01-W1", endDate: "2027-01-W2", assignee: "", status: "critical", showOnLevel1: true },
      { id: g(), parentId: "", name: "기능 디자인 설계", startDate: "2027-01-W3", endDate: "2027-03-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "28.10 Go-Live", startDate: "2027-04-W1", endDate: "2027-04-W2", assignee: "", status: "critical", showOnLevel1: true },
    ],
  },
  {
    id: g(), name: "CMMS", color: C[1], assignee: "", status: "planned",
    children: [
      { id: g(), parentId: "", name: "CMMS 적용 범위 설정", startDate: "2026-03-W1", endDate: "2026-05-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "담당자 지정", startDate: "2026-04-W1", endDate: "2026-05-W2", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "URS 의견 청취 및 작성", startDate: "2026-05-W3", endDate: "2026-07-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "26.10 업체 선정", startDate: "2026-09-W1", endDate: "2026-10-W4", assignee: "", status: "in-progress", showOnLevel1: true },
      { id: g(), parentId: "", name: "26.12 업체 계약", startDate: "2026-11-W1", endDate: "2026-12-W4", assignee: "", status: "critical", showOnLevel1: true },
      { id: g(), parentId: "", name: "구축 계획 수립", startDate: "2027-01-W1", endDate: "2027-02-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "업무 프로세스 설계", startDate: "2027-02-W1", endDate: "2027-05-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "27.12 Go-Live", startDate: "2027-12-W1", endDate: "2027-12-W2", assignee: "", status: "critical", showOnLevel1: true },
    ],
  },
  {
    id: g(), name: "NIR", color: C[2], assignee: "", status: "planned",
    children: [
      { id: g(), parentId: "", name: "평가 항목 및 요구사항 검토", startDate: "2026-01-W1", endDate: "2026-03-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "담당자 지정", startDate: "2026-01-W3", endDate: "2026-02-W2", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "URS 작성", startDate: "2026-02-W3", endDate: "2026-04-W2", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "장비 구매", startDate: "2026-04-W1", endDate: "2026-05-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "평가 진행 및 가능성 검토", startDate: "2026-05-W1", endDate: "2026-09-W4", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "28년 생산 도입", startDate: "2027-04-W1", endDate: "2027-04-W2", assignee: "", status: "critical", showOnLevel1: true },
    ],
  },
];

const STORAGE_KEY = "smart-timeline-v1";

function loadItems(): Level1Item[] {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Level1Item[];
  } catch {}
  return DEFAULT_DATA;
}

export default function Home() {
  const [items, setItems] = useState<Level1Item[]>(loadItems);
  const [undoSnapshot, setUndoSnapshot] = useState<Level1Item[] | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // 삭제 전 스냅샷 저장 + 토스트 표시
  const saveUndo = useCallback((prev: Level1Item[], msg: string) => {
    setUndoSnapshot(prev);
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastMsg(null);
      setUndoSnapshot(null);
    }, 6000);
  }, []);

  const handleUndo = useCallback(() => {
    if (!undoSnapshot) return;
    setItems(undoSnapshot);
    setUndoSnapshot(null);
    setToastMsg(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, [undoSnapshot]);

  const handleAddLevel1 = useCallback((item: Level1Item) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const handleAddLevel2 = useCallback((parentId: string, child: Level2Item) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === parentId
          ? { ...item, children: [...item.children, { ...child, parentId }] }
          : item
      )
    );
  }, []);

  const handleDeleteLevel1 = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      saveUndo(prev, `그룹 "${target?.name ?? ""}" 삭제됨`);
      return prev.filter((item) => item.id !== id);
    });
  }, [saveUndo]);

  const handleDeleteLevel2 = useCallback((parentId: string, childId: string) => {
    setItems((prev) => {
      const parent = prev.find((i) => i.id === parentId);
      const target = parent?.children.find((c) => c.id === childId);
      saveUndo(prev, `과제 "${target?.name ?? ""}" 삭제됨`);
      return prev.map((item) =>
        item.id === parentId
          ? { ...item, children: item.children.filter((c) => c.id !== childId) }
          : item
      );
    });
  }, [saveUndo]);

  const handleEditLevel1Phases = useCallback((id: string, phases: PhaseSegment[]) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, phases } : item));
  }, []);

  const handleBulkShift = useCallback(
    (updates: Array<{ parentId: string; childId: string; startDate: string; endDate: string }>) => {
      setItems((prev) => {
        saveUndo(prev, `${updates.length}개 과제 일정 이동`);
        return prev.map((item) => ({
          ...item,
          children: item.children.map((child) => {
            const upd = updates.find((u) => u.childId === child.id);
            return upd ? { ...child, startDate: upd.startDate, endDate: upd.endDate } : child;
          }),
        }));
      });
    },
    [saveUndo],
  );

  const handleEditLevel2 = useCallback((parentId: string, updated: Level2Item) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === parentId) {
          const exists = item.children.some((c) => c.id === updated.id);
          return {
            ...item,
            children: exists
              ? item.children.map((c) => (c.id === updated.id ? updated : c))
              : [...item.children, updated],
          };
        }
        // 그룹 이동 시 원래 그룹에서 제거
        if (item.children.some((c) => c.id === updated.id)) {
          return { ...item, children: item.children.filter((c) => c.id !== updated.id) };
        }
        return item;
      })
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* 되돌리기 토스트 */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
          bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-2xl border border-gray-700
          animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-gray-200">{toastMsg}</span>
          <button
            onClick={handleUndo}
            className="text-green-400 font-bold hover:text-green-300 transition-colors whitespace-nowrap border-l border-gray-700 pl-3">
            되돌리기
          </button>
          <button
            onClick={() => { setToastMsg(null); setUndoSnapshot(null); }}
            className="text-gray-500 hover:text-gray-300 transition-colors text-base leading-none">
            ×
          </button>
        </div>
      )}
      {/* 헤더 */}
      <header className="bg-[#00733C] text-white shadow-lg">
        <div className="w-full px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">SMART Innovation</h1>
            <p className="text-green-200 text-xs mt-0.5">로드맵 과제별 타임라인 자동 생성</p>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
          {/* 좌측 패널 */}
          <div className="space-y-3 lg:sticky lg:top-4">
            <TimelineForm items={items} onAddLevel1={handleAddLevel1} onAddLevel2={handleAddLevel2} />
            <TaskList items={items} onDeleteLevel1={handleDeleteLevel1} onDeleteLevel2={handleDeleteLevel2} />
          </div>

          {/* 우측: 타임라인 차트 */}
          <TimelineChart
            items={items}
            onEditLevel2={handleEditLevel2}
            onEditLevel1Phases={handleEditLevel1Phases}
            onBulkShift={handleBulkShift}
          />
        </div>
      </main>
    </div>
  );
}
