"use client";

import { useState, useEffect, useRef } from "react";
import { Level1Item } from "@/lib/types";
import {
  ProjectDetail, ProjectDetailData, CustomField,
  EMPTY_DETAIL_DATA,
  loadProjectDetails, saveProjectDetail,
} from "@/lib/projectDetails";

interface Props {
  timelineId: string;
  items: Level1Item[];        // L1 항목 목록
  editMode: boolean;
  focusLevel1Id?: string | null; // 타임라인에서 버튼 클릭 시 포커스할 L1 id
  onFocusHandled?: () => void;
}

const FIELD_LABELS: { key: keyof Omit<ProjectDetailData, "customFields">; label: string; multiline?: boolean }[] = [
  { key: "description",   label: "프로젝트 개요",  multiline: true },
  { key: "targetProduct", label: "대상 제품" },
  { key: "batchSize",     label: "배치사이즈" },
  { key: "bom",           label: "BOM 정보", multiline: true },
];

export default function ProjectDetailsBoard({
  timelineId, items, editMode, focusLevel1Id, onFocusHandled,
}: Props) {
  const [detailsMap, setDetailsMap] = useState<Map<string, ProjectDetailData>>(new Map());
  const [openId,     setOpenId]     = useState<string | null>(null);
  const [saving,     setSaving]     = useState<string | null>(null); // 저장 중인 l1 id
  const [drafts,     setDrafts]     = useState<Map<string, ProjectDetailData>>(new Map());
  const [tableError, setTableError] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /* ── 데이터 로드 ── */
  useEffect(() => {
    if (!timelineId) return;
    loadProjectDetails(timelineId).then(list => {
      if (list === null) { setTableError(true); return; }
      const m = new Map<string, ProjectDetailData>();
      list.forEach(d => m.set(d.level1Id, d.data));
      setDetailsMap(m);
    });
  }, [timelineId]);

  /* ── 타임라인에서 포커스 요청 처리 ── */
  useEffect(() => {
    if (!focusLevel1Id) return;
    setOpenId(focusLevel1Id);
    // 약간 딜레이 후 스크롤
    setTimeout(() => {
      const el = cardRefs.current.get(focusLevel1Id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    onFocusHandled?.();
  }, [focusLevel1Id, onFocusHandled]);

  function getDetail(id: string): ProjectDetailData {
    return drafts.get(id) ?? detailsMap.get(id) ?? { ...EMPTY_DETAIL_DATA };
  }

  function startEdit(id: string) {
    if (!drafts.has(id)) {
      setDrafts(prev => new Map(prev).set(id, { ...getDetail(id), customFields: [...(getDetail(id).customFields ?? [])] }));
    }
    setOpenId(id);
  }

  function updateDraft(id: string, patch: Partial<ProjectDetailData>) {
    setDrafts(prev => {
      const m = new Map(prev);
      m.set(id, { ...(m.get(id) ?? { ...EMPTY_DETAIL_DATA }), ...patch });
      return m;
    });
  }

  function updateCustomField(id: string, idx: number, field: Partial<CustomField>) {
    setDrafts(prev => {
      const m = new Map(prev);
      const d = { ...(m.get(id) ?? { ...EMPTY_DETAIL_DATA }) };
      const cf = [...(d.customFields ?? [])];
      cf[idx] = { ...cf[idx], ...field };
      m.set(id, { ...d, customFields: cf });
      return m;
    });
  }

  function addCustomField(id: string) {
    setDrafts(prev => {
      const m = new Map(prev);
      const d = { ...(m.get(id) ?? { ...EMPTY_DETAIL_DATA }) };
      m.set(id, { ...d, customFields: [...(d.customFields ?? []), { key: "", value: "" }] });
      return m;
    });
  }

  function removeCustomField(id: string, idx: number) {
    setDrafts(prev => {
      const m = new Map(prev);
      const d = { ...(m.get(id) ?? { ...EMPTY_DETAIL_DATA }) };
      const cf = [...(d.customFields ?? [])];
      cf.splice(idx, 1);
      m.set(id, { ...d, customFields: cf });
      return m;
    });
  }

  async function handleSave(id: string) {
    const draft = drafts.get(id);
    if (!draft) return;
    setSaving(id);
    await saveProjectDetail(timelineId, id, draft);
    setDetailsMap(prev => new Map(prev).set(id, draft));
    setDrafts(prev => { const m = new Map(prev); m.delete(id); return m; });
    setSaving(null);
  }

  function handleDiscard(id: string) {
    setDrafts(prev => { const m = new Map(prev); m.delete(id); return m; });
  }

  const hasFilled = (id: string) => {
    const d = detailsMap.get(id);
    if (!d) return false;
    return d.description || d.bom || d.batchSize || d.targetProduct || (d.customFields?.length ?? 0) > 0;
  };

  if (tableError) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        <p className="font-semibold text-red-500 mb-2">project_details 테이블이 없습니다.</p>
        <p>Supabase에서 아래 SQL을 실행해주세요:</p>
        <pre className="mt-3 text-left bg-gray-100 rounded-xl p-4 text-xs overflow-auto inline-block">
{`create table project_details (
  id           serial primary key,
  timeline_id  text not null,
  level1_id    text not null,
  data         jsonb not null default '{}',
  updated_at   timestamptz,
  unique (timeline_id, level1_id)
);`}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">프로젝트별 상세정보</h2>
          <p className="text-xs text-gray-400 mt-0.5">각 과제(LV1)의 BOM, 배치사이즈 등 상세정보를 관리합니다.</p>
        </div>
        <span className="text-xs text-gray-400">{items.length}개 과제</span>
      </div>

      {items.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-16">타임라인에 과제(LV1)를 추가하면 여기에 표시됩니다.</div>
      )}

      {items.map(item => {
        const isOpen  = openId === item.id;
        const isDraft = drafts.has(item.id);
        const detail  = getDetail(item.id);
        const filled  = hasFilled(item.id);

        return (
          <div
            key={item.id}
            ref={el => { if (el) cardRefs.current.set(item.id, el); else cardRefs.current.delete(item.id); }}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden
              ${isOpen ? "shadow-md" : "shadow-sm hover:shadow"}
              ${isDraft ? "border-amber-300" : "border-gray-200"}`}
            style={{ borderLeftWidth: 4, borderLeftColor: item.color }}
          >
            {/* 카드 헤더 */}
            <button
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="flex-1 font-semibold text-sm text-gray-900">{item.name}</span>
              {filled && !isDraft && (
                <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">입력됨</span>
              )}
              {isDraft && (
                <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">수정 중</span>
              )}
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 상세 패널 */}
            {isOpen && (
              <div className="px-5 pb-5 border-t border-gray-100">
                {/* 기본 필드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {FIELD_LABELS.map(({ key, label, multiline }) => (
                    <div key={key} className={multiline ? "md:col-span-2" : ""}>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
                      {editMode ? (
                        multiline ? (
                          <textarea
                            rows={3}
                            value={(isDraft ? (drafts.get(item.id) ?? detail) : detail)[key] as string}
                            onChange={e => { if (!isDraft) startEdit(item.id); updateDraft(item.id, { [key]: e.target.value }); }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200"
                            placeholder={`${label} 입력`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={(isDraft ? (drafts.get(item.id) ?? detail) : detail)[key] as string}
                            onChange={e => { if (!isDraft) startEdit(item.id); updateDraft(item.id, { [key]: e.target.value }); }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200"
                            placeholder={`${label} 입력`}
                          />
                        )
                      ) : (
                        <p className="text-sm text-gray-800 whitespace-pre-wrap min-h-[2rem] bg-gray-50 rounded-lg px-3 py-2">
                          {detail[key] as string || <span className="text-gray-400 text-xs">-</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* 사용자 정의 필드 */}
                {(detail.customFields?.length > 0 || editMode) && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-gray-500">추가 항목</span>
                      {editMode && (
                        <button
                          onClick={() => { if (!isDraft) startEdit(item.id); addCustomField(item.id); }}
                          className="text-[11px] text-green-600 hover:text-green-800 font-semibold flex items-center gap-0.5">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          항목 추가
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(isDraft ? (drafts.get(item.id)?.customFields ?? []) : detail.customFields ?? []).map((cf, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          {editMode ? (
                            <>
                              <input
                                type="text"
                                value={cf.key}
                                onChange={e => { if (!isDraft) startEdit(item.id); updateCustomField(item.id, idx, { key: e.target.value }); }}
                                placeholder="항목명"
                                className="w-32 shrink-0 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-green-400"
                              />
                              <input
                                type="text"
                                value={cf.value}
                                onChange={e => { if (!isDraft) startEdit(item.id); updateCustomField(item.id, idx, { value: e.target.value }); }}
                                placeholder="값"
                                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-green-400"
                              />
                              <button onClick={() => { if (!isDraft) startEdit(item.id); removeCustomField(item.id, idx); }}
                                className="text-gray-300 hover:text-red-400 transition-colors mt-1.5">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <div className="flex gap-2 text-sm w-full bg-gray-50 rounded-lg px-3 py-1.5">
                              <span className="font-medium text-gray-600 shrink-0">{cf.key}:</span>
                              <span className="text-gray-800">{cf.value}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 저장/취소 */}
                {editMode && isDraft && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleSave(item.id)}
                      disabled={saving === item.id}
                      className="px-4 py-2 rounded-xl bg-[#00733C] text-white text-xs font-bold hover:bg-[#005a2e] transition-colors disabled:opacity-50">
                      {saving === item.id ? "저장 중..." : "저장"}
                    </button>
                    <button
                      onClick={() => handleDiscard(item.id)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
                      취소
                    </button>
                  </div>
                )}

                {/* 최종 수정 정보 (읽기 전용) */}
                {!editMode && !isDraft && (
                  <p className="text-[10px] text-gray-300 mt-3 text-right">
                    {detailsMap.get(item.id) ? "저장된 정보" : "아직 입력된 정보가 없습니다"}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
