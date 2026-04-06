"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Level1Item, Level2Item, Level3Item, PhaseSegment, CATEGORY_COLORS, generateId, parseWDate, wdateToIndex, shiftDateByWeeks } from "@/lib/types";
import TimelineForm from "@/components/TimelineForm";
import TimelineChart from "@/components/TimelineChart";
import TaskList from "@/components/TaskList";
import {
  loadTimelines, loadTimelineData, saveTimelineData,
  updateTimelineName, updateTimelineEditPassword,
  acquireEditLock, releaseEditLock, renewEditLock,
  getSessionId, LEGACY_TIMELINE_ID,
} from "@/lib/timelines";
import SuggestionsBoard from "@/components/SuggestionsBoard";
import ProjectDetailsBoard from "@/components/ProjectDetailsBoard";

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

export default function TimelinePage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const id           = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const readOnly     = searchParams.get("edit") !== "1";

  // 탭 상태
  const [activeTab, setActiveTab] = useState<"timeline" | "details" | "suggestions">("timeline");
  const [focusDetailL1, setFocusDetailL1] = useState<string | null>(null);

  const [timelineName, setTimelineName] = useState("");
  const [editingName, setEditingName]   = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 편집 비밀번호 변경 모달
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [newPw,        setNewPw]        = useState("");
  const [confirmPw,    setConfirmPw]    = useState("");
  const [changePwErr,  setChangePwErr]  = useState("");

  // 편집 잠금 상태
  const [lockBlocked, setLockBlocked] = useState(false);
  const sessionId = typeof window !== "undefined" ? getSessionId() : "";
  const lockRenewRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 데이터 로딩 상태
  const [dataLoaded, setDataLoaded] = useState(false);

  // 타임라인 이름 + 데이터 로드
  useEffect(() => {
    if (!id) return;
    (async () => {
      const list = await loadTimelines();
      const found = list.find(t => t.id === id);
      setTimelineName(found?.name ?? "타임라인");

      // 편집 모드면 잠금 획득 시도
      if (!readOnly) {
        const result = await acquireEditLock(id, sessionId);
        if (!result.ok) {
          setLockBlocked(true);
          return;
        }
        // 15분마다 잠금 갱신
        lockRenewRef.current = setInterval(() => renewEditLock(id, sessionId), 15 * 60 * 1000);
      }

      // Supabase에서 데이터 로드
      const remote = await loadTimelineData(id);
      if (remote && Array.isArray(remote) && remote.length > 0) {
        setItems(remote as Level1Item[]);
      } else if (id === LEGACY_TIMELINE_ID) {
        // legacy: localStorage 마이그레이션
        try {
          const raw = localStorage.getItem("smart-timeline-v3") ?? localStorage.getItem(`smart-timeline-data-${id}`);
          if (raw) {
            const parsed = JSON.parse(raw) as Level1Item[];
            setItems(parsed);
            await saveTimelineData(id, parsed); // Supabase에 올려두기
          }
        } catch {}
      }
      setDataLoaded(true);
    })();

    return () => {
      if (lockRenewRef.current) clearInterval(lockRenewRef.current);
      if (!readOnly) releaseEditLock(id, sessionId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [items, setItems] = useState<Level1Item[]>(id === LEGACY_TIMELINE_ID ? DEFAULT_DATA : []);
  const [undoSnapshot, setUndoSnapshot] = useState<Level1Item[] | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 변경될 때마다 Supabase에 저장 (debounce 2초)
  useEffect(() => {
    if (!id || !dataLoaded || readOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimelineData(id, items);
    }, 2000);
  }, [items, id, dataLoaded, readOnly]);

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

  const handleDuplicateLevel1 = useCallback((id: string) => {
    setItems((prev) => {
      const src = prev.find(i => i.id === id);
      if (!src) return prev;
      const newL1Id = generateId();
      const copy: Level1Item = {
        ...src,
        id: newL1Id,
        name: src.name + " (복사)",
        children: src.children.map(l2 => {
          const newL2Id = generateId();
          return {
            ...l2,
            id: newL2Id,
            parentId: newL1Id,
            children: (l2.children ?? []).map(l3 => ({
              ...l3,
              id: generateId(),
              parentId: newL2Id,
            })),
          };
        }),
      };
      const idx = prev.findIndex(i => i.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const handleDuplicateLevel2 = useCallback((parentId: string, childId: string) => {
    setItems((prev) => {
      return prev.map(l1 => {
        if (l1.id !== parentId) return l1;
        const src = l1.children.find(c => c.id === childId);
        if (!src) return l1;
        const newL2Id = generateId();
        const copy: Level2Item = {
          ...src,
          id: newL2Id,
          name: src.name + " (복사)",
          parentId,
          children: (src.children ?? []).map(l3 => ({
            ...l3,
            id: generateId(),
            parentId: newL2Id,
          })),
        };
        const idx = l1.children.findIndex(c => c.id === childId);
        const newChildren = [...l1.children];
        newChildren.splice(idx + 1, 0, copy);
        return { ...l1, children: newChildren };
      });
    });
  }, []);

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

  const handleBulkShiftL3 = useCallback((updates: { l2Id: string; l3Id: string; startDate: string; endDate: string }[]) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        children: item.children.map((l2) => {
          const l2Updates = updates.filter((u) => u.l2Id === l2.id);
          if (l2Updates.length === 0) return l2;
          return {
            ...l2,
            children: (l2.children ?? []).map((l3) => {
              const upd = l2Updates.find((u) => u.l3Id === l3.id);
              if (!upd) return l3;
              return { ...l3, startDate: upd.startDate, endDate: upd.endDate };
            }),
          };
        }),
      }))
    );
  }, []);

  const handleEditLevel3 = useCallback((l2Id: string, updated: Level3Item) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        children: item.children.map((l2) => {
          if (l2.id !== l2Id) return l2;
          return {
            ...l2,
            children: (l2.children ?? []).map((l3) => l3.id === updated.id ? updated : l3),
          };
        }),
      }))
    );
  }, []);

  // L3 행 병합: srcRowId·targetRowId가 가리키는 모든 항목을 같은 rowId로 묶음
  const handleMergeL3 = useCallback((l2Id: string, srcRowId: string, targetRowId: string) => {
    setItems((prev) =>
      prev.map((l1) => ({
        ...l1,
        children: l1.children.map((l2) => {
          if (l2.id !== l2Id) return l2;
          // 이미 존재하는 rowId 우선 사용 (없으면 새로 생성)
          let sharedRowId: string | undefined;
          for (const l3 of (l2.children ?? [])) {
            const inSrc = l3.id === srcRowId || l3.rowId === srcRowId;
            const inTgt = l3.id === targetRowId || l3.rowId === targetRowId;
            if ((inSrc || inTgt) && l3.rowId) { sharedRowId = l3.rowId; break; }
          }
          sharedRowId = sharedRowId ?? g();
          return {
            ...l2,
            children: (l2.children ?? []).map((l3) => {
              const inSrc = l3.id === srcRowId || l3.rowId === srcRowId;
              const inTgt = l3.id === targetRowId || l3.rowId === targetRowId;
              return (inSrc || inTgt) ? { ...l3, rowId: sharedRowId } : l3;
            }),
          };
        }),
      }))
    );
  }, []);

  // L3 항목을 병합 행에서 분리 (rowId 제거)
  const handleUnmergeL3 = useCallback((l2Id: string, l3Id: string) => {
    setItems((prev) =>
      prev.map((l1) => ({
        ...l1,
        children: l1.children.map((l2) => {
          if (l2.id !== l2Id) return l2;
          return {
            ...l2,
            children: (l2.children ?? []).map((l3) =>
              l3.id === l3Id ? { ...l3, rowId: undefined } : l3
            ),
          };
        }),
      }))
    );
  }, []);

  // L3 행 레이블 수정
  const handleUpdateL3RowLabel = useCallback((l2Id: string, rowId: string, label: string) => {
    setItems((prev) =>
      prev.map((l1) => ({
        ...l1,
        children: l1.children.map((l2) => {
          if (l2.id !== l2Id) return l2;
          return {
            ...l2,
            l3RowMeta: { ...(l2.l3RowMeta ?? {}), [rowId]: { label } },
          };
        }),
      }))
    );
  }, []);

  // 편집 잠금 차단 화면
  if (lockBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2.2}>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-2">편집 중인 사용자가 있습니다</h2>
          <p className="text-sm text-gray-500 mb-5">다른 사용자가 이 타임라인을 편집 중입니다.<br/>잠시 후 다시 시도하거나 조회 모드로 접속하세요.</p>
          <div className="flex gap-2">
            <button onClick={() => router.push("/")}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 font-medium">홈으로</button>
            <button onClick={() => router.push(`/timeline/${id}`)}
              className="flex-1 py-2.5 rounded-xl bg-[#00733C] text-white text-sm font-bold hover:bg-[#005a2e] transition-colors">조회 모드</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* 되돌리기 토스트 */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
          bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-2xl border border-gray-700">
          <span className="text-gray-200">{toastMsg}</span>
          <button onClick={handleUndo}
            className="text-green-400 font-bold hover:text-green-300 transition-colors whitespace-nowrap border-l border-gray-700 pl-3">
            되돌리기
          </button>
          <button onClick={() => { setToastMsg(null); setUndoSnapshot(null); }}
            className="text-gray-500 hover:text-gray-300 transition-colors text-base leading-none">×</button>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-[#00733C] text-white shadow-lg">
        <div className="w-full px-5 py-3 flex items-center gap-4">
          <button onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">홈</span>
          </button>
          <div className="w-px h-5 bg-green-600" />

          {/* 타임라인 이름 */}
          <div className="flex-1">
            {editingName ? (
              <input
                ref={nameInputRef}
                defaultValue={timelineName}
                onBlur={async e => {
                  const val = e.target.value.trim() || timelineName;
                  setTimelineName(val);
                  await updateTimelineName(id, val);
                  setEditingName(false);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="bg-transparent border-b border-green-300 text-white font-bold text-lg outline-none w-64"
                autoFocus
              />
            ) : (
              <button onClick={() => { if (!readOnly) setEditingName(true); }}
                className={`group flex items-center gap-2 ${readOnly ? "cursor-default" : ""}`}>
                <h1 className="text-lg font-bold tracking-tight">{timelineName}</h1>
                {!readOnly && (
                  <svg className="w-3.5 h-3.5 text-green-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )}
              </button>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-green-200 text-xs">프로젝트 타임라인 관리 시스템</p>
              {readOnly
                ? <span className="text-[10px] font-semibold bg-white/20 text-green-100 rounded-full px-2 py-0.5">조회 모드</span>
                : <span className="text-[10px] font-semibold bg-indigo-500/80 text-white rounded-full px-2 py-0.5">편집 모드</span>
              }
            </div>
          </div>

          {/* 편집 비밀번호 변경 */}
          {!readOnly && (
            <button
              onClick={() => { setNewPw(""); setConfirmPw(""); setChangePwErr(""); setChangePwOpen(true); }}
              className="flex items-center gap-1.5 text-green-200 hover:text-white text-xs font-medium transition-colors shrink-0 border border-green-600 hover:border-green-400 rounded-lg px-2.5 py-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              비밀번호 변경
            </button>
          )}
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-t border-green-700 px-5">
          {(["timeline", "details", "suggestions"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px
                ${activeTab === tab
                  ? "border-white text-white"
                  : "border-transparent text-green-300 hover:text-white"}`}>
              {tab === "timeline" ? "타임라인" : tab === "details" ? "프로젝트 상세" : "개선제안"}
            </button>
          ))}
        </div>
      </header>

      {/* 편집 비밀번호 변경 모달 */}
      {changePwOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setChangePwOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">편집 비밀번호 변경</h3>
            <p className="text-xs text-gray-500 mb-4">비워두면 전역 비밀번호(cell123!hs)로 초기화됩니다</p>
            <label className="text-xs font-medium text-gray-500 mb-1 block">새 비밀번호</label>
            <input autoFocus type="password" placeholder="새 비밀번호 (비워두면 전역 사용)"
              value={newPw} onChange={e => { setNewPw(e.target.value); setChangePwErr(""); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 mb-3"
            />
            <label className="text-xs font-medium text-gray-500 mb-1 block">비밀번호 확인</label>
            <input type="password" placeholder="동일한 비밀번호 재입력"
              value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setChangePwErr(""); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 mb-2"
            />
            {changePwErr && <p className="text-xs text-red-500 mb-2">{changePwErr}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setChangePwOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 font-medium">취소</button>
              <button
                onClick={async () => {
                  if (newPw !== confirmPw) { setChangePwErr("비밀번호가 일치하지 않습니다"); return; }
                  await updateTimelineEditPassword(id, newPw.trim() || undefined);
                  setChangePwOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#00733C] text-white text-sm font-bold hover:bg-[#005a2e] transition-colors">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 탭 콘텐츠 */}
      {activeTab === "suggestions" ? (
        <SuggestionsBoard timelineId={id} editMode={!readOnly} />
      ) : activeTab === "details" ? (
        <ProjectDetailsBoard
          timelineId={id}
          items={items}
          editMode={!readOnly}
          focusLevel1Id={focusDetailL1}
          onFocusHandled={() => setFocusDetailL1(null)}
        />
      ) : (
        <main className="w-full px-4 py-4">
          <div className={`grid gap-4 items-start ${readOnly ? "" : "grid-cols-1 lg:grid-cols-[300px_1fr]"}`}>
            {!readOnly && (
              <div className="space-y-3 lg:sticky lg:top-4">
                <TimelineForm items={items} onAddLevel1={handleAddLevel1} onAddLevel2={handleAddLevel2} onAddLevel3={handleAddLevel3} />
                <TaskList items={items} onDeleteLevel1={handleDeleteLevel1} onDeleteLevel2={handleDeleteLevel2} onDeleteLevel3={handleDeleteLevel3} onDuplicateLevel1={handleDuplicateLevel1} onDuplicateLevel2={handleDuplicateLevel2} />
              </div>
            )}
            <TimelineChart
              items={items}
              onViewDetail={l1Id => { setFocusDetailL1(l1Id); setActiveTab("details"); }}
              {...(!readOnly && {
                onEditLevel2:        handleEditLevel2,
                onEditLevel1Phases:  handleEditLevel1Phases,
                onBulkShift:         handleBulkShift,
                onReorderLevel1:     handleReorderLevel1,
                onEditLevel1Color:   handleEditLevel1Color,
                onEditLevel1:        handleEditLevel1,
                onEditLevel3:        handleEditLevel3,
                onBulkShiftL3:       handleBulkShiftL3,
                onMergeL3:           handleMergeL3,
                onUnmergeL3:         handleUnmergeL3,
                onUpdateL3RowLabel:  handleUpdateL3RowLabel,
              })}
            />
          </div>
        </main>
      )}
    </div>
  );
}
