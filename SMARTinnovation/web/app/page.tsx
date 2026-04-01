"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Level1Item, Level2Item, Level3Item, PhaseSegment, CATEGORY_COLORS, generateId, parseWDate, wdateToIndex, shiftDateByWeeks } from "@/lib/types";
import TimelineForm from "@/components/TimelineForm";
import TimelineChart from "@/components/TimelineChart";
import TaskList from "@/components/TaskList";

const C = CATEGORY_COLORS;
const g = generateId;

const DEFAULT_DATA: Level1Item[] = [
  // ── 별첨 로드맵 과제 ───────────────────────────────────────────
  {
    id: g(), name: "전자라벨", color: C[0], assignee: "", status: "in-progress",
    children: [
      { id: g(), parentId: "", name: "테스트 수행",               startDate: "2026-02-W1", endDate: "2026-02-W4", assignee: "", status: "in-progress", showOnLevel1: false },
      { id: g(), parentId: "", name: "적용 여부 검토 및 발주",     startDate: "2026-02-W1", endDate: "2026-03-W2", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "LAN 포설 및 게이트웨이 설치", startDate: "2026-03-W1", endDate: "2026-04-W2", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "전자현황판 전사 설치",        startDate: "2026-04-W1", endDate: "2026-05-W2", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "5월말 Go-Live",              startDate: "2026-05-W3", endDate: "2026-05-W4", assignee: "", status: "critical",    showOnLevel1: true  },
    ],
  },
  {
    id: g(), name: "SOP AI", color: C[1], assignee: "", status: "planned",
    children: [
      { id: g(), parentId: "", name: "사내 AI 경진대회 수상 가정(5월)", startDate: "2026-05-W1", endDate: "2026-05-W4", assignee: "", status: "in-progress", showOnLevel1: true  },
      { id: g(), parentId: "", name: "Kick-off",                        startDate: "2026-06-W1", endDate: "2026-06-W2", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "컨셉 및 모델 전략 수립",            startDate: "2026-06-W3", endDate: "2026-08-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "데이터 전처리",                     startDate: "2026-08-W1", endDate: "2026-09-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "프로토타입/테스트",                  startDate: "2026-09-W1", endDate: "2026-11-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "시스템 개발",                       startDate: "2026-10-W1", endDate: "2027-02-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "사용자 평가 및 피드백 반영",          startDate: "2026-12-W1", endDate: "2027-04-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "'27.06 Go-Live",                   startDate: "2027-06-W1", endDate: "2027-06-W2", assignee: "", status: "critical",    showOnLevel1: true  },
    ],
  },
  {
    id: g(), name: "PPQR, 실패관리 AI", color: C[2], assignee: "", status: "planned",
    children: [
      { id: g(), parentId: "", name: "업체 소싱 및 사전 미팅(3월)", startDate: "2026-02-W1", endDate: "2026-03-W4", assignee: "", status: "in-progress", showOnLevel1: true  },
      { id: g(), parentId: "", name: "업체 선정",                   startDate: "2026-04-W1", endDate: "2026-04-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "분류 체계 체계화",             startDate: "2026-05-W1", endDate: "2026-07-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "데이터 전처리",                startDate: "2026-06-W1", endDate: "2026-08-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "프로세스 설계",                startDate: "2026-08-W1", endDate: "2026-10-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "개발 및 AI 학습",              startDate: "2026-11-W1", endDate: "2027-02-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "사용자 평가",                  startDate: "2027-01-W1", endDate: "2027-02-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "'27.03 Go-Live",              startDate: "2027-03-W1", endDate: "2027-03-W2", assignee: "", status: "critical",    showOnLevel1: true  },
    ],
  },
  {
    id: g(), name: "AMS", color: C[3], assignee: "", status: "planned",
    children: [
      { id: g(), parentId: "", name: "계약 및 CSV 사전 준비", startDate: "2026-02-W1", endDate: "2026-04-W4", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "솔루션 I/F 설계",      startDate: "2026-05-W1", endDate: "2026-07-W4", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "테스트 검증",          startDate: "2026-08-W1", endDate: "2026-09-W2", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "CSV",                 startDate: "2026-09-W3", endDate: "2026-10-W2", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "26.10 Go-Live",       startDate: "2026-10-W1", endDate: "2026-10-W2", assignee: "", status: "critical", showOnLevel1: true  },
    ],
  },
  {
    id: g(), name: "LMS", color: C[4], assignee: "", status: "planned",
    children: [
      { id: g(), parentId: "", name: "Kick off 및 프로젝트 계획 수립",    startDate: "2026-01-W3", endDate: "2026-03-W2", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "LMS 구축 시작",                     startDate: "2026-03-W1", endDate: "2026-04-W4", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "시스템 테스트 수행",                 startDate: "2026-05-W1", endDate: "2026-08-W2", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "EDMS / MS AD 연동 Set up & 테스트", startDate: "2026-05-W1", endDate: "2026-08-W2", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "운영 환경 이관",                     startDate: "2026-08-W1", endDate: "2026-09-W1", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "26.9 Go-Live",                     startDate: "2026-09-W1", endDate: "2026-09-W2", assignee: "", status: "critical", showOnLevel1: true  },
    ],
  },
  // ── 기존 MES / CMMS / NIR 과제 ────────────────────────────────
  {
    id: g(), name: "MES", color: C[5], assignee: "", status: "in-progress",
    children: [
      { id: g(), parentId: "", name: "MES TFT 창설",       startDate: "2026-02-W1", endDate: "2026-02-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "설비자산 업체 실사",   startDate: "2026-03-W1", endDate: "2026-04-W2", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "로드맵 상세화",        startDate: "2026-04-W1", endDate: "2026-05-W2", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "업체별 장단점 분석",   startDate: "2026-05-W3", endDate: "2026-07-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "URS 작성",            startDate: "2026-08-W1", endDate: "2026-10-W3", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "26.12 업체 선정",     startDate: "2026-11-W1", endDate: "2026-12-W4", assignee: "", status: "in-progress", showOnLevel1: true  },
      { id: g(), parentId: "", name: "MES 구축 개시",        startDate: "2027-01-W1", endDate: "2027-01-W2", assignee: "", status: "critical",    showOnLevel1: true  },
      { id: g(), parentId: "", name: "기능 디자인 설계",     startDate: "2027-01-W3", endDate: "2027-03-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "28.10 Go-Live",       startDate: "2027-04-W1", endDate: "2027-04-W2", assignee: "", status: "critical",    showOnLevel1: true  },
    ],
  },
  {
    id: g(), name: "CMMS", color: C[6], assignee: "", status: "planned",
    children: [
      { id: g(), parentId: "", name: "CMMS 적용 범위 설정",   startDate: "2026-03-W1", endDate: "2026-05-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "담당자 지정",           startDate: "2026-04-W1", endDate: "2026-05-W2", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "URS 의견 청취 및 작성", startDate: "2026-05-W3", endDate: "2026-07-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "26.10 업체 선정",       startDate: "2026-09-W1", endDate: "2026-10-W4", assignee: "", status: "in-progress", showOnLevel1: true  },
      { id: g(), parentId: "", name: "26.12 업체 계약",       startDate: "2026-11-W1", endDate: "2026-12-W4", assignee: "", status: "critical",    showOnLevel1: true  },
      { id: g(), parentId: "", name: "구축 계획 수립",        startDate: "2027-01-W1", endDate: "2027-02-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "업무 프로세스 설계",    startDate: "2027-02-W1", endDate: "2027-05-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "27.12 Go-Live",        startDate: "2027-12-W1", endDate: "2027-12-W2", assignee: "", status: "critical",    showOnLevel1: true  },
    ],
  },
  {
    id: g(), name: "NIR", color: C[7], assignee: "", status: "planned",
    children: [
      { id: g(), parentId: "", name: "평가 항목 및 요구사항 검토", startDate: "2026-01-W1", endDate: "2026-03-W4", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "담당자 지정",              startDate: "2026-01-W3", endDate: "2026-02-W2", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "URS 작성",                 startDate: "2026-02-W3", endDate: "2026-04-W2", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "장비 구매",                startDate: "2026-04-W1", endDate: "2026-05-W4", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "평가 진행 및 가능성 검토", startDate: "2026-05-W1", endDate: "2026-09-W4", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "28년 생산 도입",           startDate: "2027-04-W1", endDate: "2027-04-W2", assignee: "", status: "critical", showOnLevel1: true  },
    ],
  },
  {
    id: g(), name: "진천 Window 구축", color: C[8], assignee: "", status: "in-progress",
    children: [
      { id: g(), parentId: "", name: "변경관리 준비",                        startDate: "2026-01-W1", endDate: "2026-02-W2", assignee: "", status: "in-progress", showOnLevel1: false },
      { id: g(), parentId: "", name: "변경관리 개시 및 URS 작성",            startDate: "2026-02-W1", endDate: "2026-05-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "비교견적 및 업체선정",                  startDate: "2026-07-W1", endDate: "2026-08-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "관련 문서 개정, 장비 설치 및 적격성 평가", startDate: "2026-07-W1", endDate: "2026-09-W2", assignee: "", status: "planned",  showOnLevel1: false },
      { id: g(), parentId: "", name: "신규 장비 운용 (과립/혼합 라인)",       startDate: "2026-09-W1", endDate: "2026-09-W2", assignee: "", status: "critical",    showOnLevel1: true  },
      { id: g(), parentId: "", name: "변경관리 개시 및 URS 작성 (2차)",       startDate: "2027-01-W1", endDate: "2027-02-W4", assignee: "", status: "planned",     showOnLevel1: false },
      { id: g(), parentId: "", name: "관련 문서 개정, 장비 설치 및 적격성 평가 (2차)", startDate: "2027-03-W1", endDate: "2027-04-W2", assignee: "", status: "planned", showOnLevel1: false },
      { id: g(), parentId: "", name: "신규 장비 운용 (충전/선별 라인)",       startDate: "2027-04-W1", endDate: "2027-04-W2", assignee: "", status: "critical",    showOnLevel1: true  },
    ],
  },
];

const STORAGE_KEY = "smart-timeline-v3"; // 진천 Window 구축 추가

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
            if (!upd) return child;
            // L2가 이동한 주 수를 계산해 Lv3도 함께 이동
            const deltaWeeks = wdateToIndex(parseWDate(upd.startDate), parseWDate(child.startDate));
            const newL3 = child.children?.map(l3 => ({
              ...l3,
              startDate: shiftDateByWeeks(l3.startDate, deltaWeeks),
              endDate:   shiftDateByWeeks(l3.endDate,   deltaWeeks),
            }));
            return { ...child, startDate: upd.startDate, endDate: upd.endDate, children: newL3 };
          }),
        }));
      });
    },
    [saveUndo],
  );

  const handleAddLevel3 = useCallback((l2Id: string, child: Level3Item) => {
    setItems(prev => prev.map(l1 => ({
      ...l1,
      children: l1.children.map(l2 =>
        l2.id === l2Id
          ? { ...l2, children: [...(l2.children ?? []), { ...child, parentId: l2Id }] }
          : l2
      ),
    })));
  }, []);

  const handleDeleteLevel3 = useCallback((l2Id: string, childId: string) => {
    setItems(prev => {
      let name = "";
      for (const l1 of prev)
        for (const l2 of l1.children)
          if (l2.id === l2Id) name = l2.children?.find(c => c.id === childId)?.name ?? "";
      saveUndo(prev, `세부항목 "${name}" 삭제됨`);
      return prev.map(l1 => ({
        ...l1,
        children: l1.children.map(l2 =>
          l2.id === l2Id
            ? { ...l2, children: (l2.children ?? []).filter(c => c.id !== childId) }
            : l2
        ),
      }));
    });
  }, [saveUndo]);

  const handleEditLevel1 = useCallback((updated: Level1Item) => {
    setItems(prev => prev.map(item => item.id === updated.id ? updated : item));
  }, []);

  const handleEditLevel1Color = useCallback((id: string, color: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, color } : item));
  }, []);

  const handleReorderLevel1 = useCallback((draggingId: string, dropBeforeId: string | null) => {
    setItems(prev => {
      const fromIdx = prev.findIndex(i => i.id === draggingId);
      if (fromIdx < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      if (dropBeforeId === null) {
        next.push(moved);
      } else {
        const toIdx = next.findIndex(i => i.id === dropBeforeId);
        next.splice(toIdx < 0 ? next.length : toIdx, 0, moved);
      }
      return next;
    });
  }, []);

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
            <TimelineForm items={items} onAddLevel1={handleAddLevel1} onAddLevel2={handleAddLevel2} onAddLevel3={handleAddLevel3} />
            <TaskList items={items} onDeleteLevel1={handleDeleteLevel1} onDeleteLevel2={handleDeleteLevel2} onDeleteLevel3={handleDeleteLevel3} />
          </div>

          {/* 우측: 타임라인 차트 */}
          <TimelineChart
            items={items}
            onEditLevel2={handleEditLevel2}
            onEditLevel1Phases={handleEditLevel1Phases}
            onBulkShift={handleBulkShift}
            onReorderLevel1={handleReorderLevel1}
            onEditLevel1Color={handleEditLevel1Color}
            onEditLevel1={handleEditLevel1}
          />
        </div>
      </main>
    </div>
  );
}
