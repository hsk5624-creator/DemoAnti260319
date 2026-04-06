"use client";

import { useState, useEffect, useRef } from "react";
import { Level1Item } from "@/lib/types";
import {
  ProjectDetailData, TableData, BomData, emptyTable, CustomField,
  EMPTY_DETAIL_DATA, EMPTY_BOM,
  loadProjectDetails, saveProjectDetail,
} from "@/lib/projectDetails";

interface Props {
  timelineId: string;
  items: Level1Item[];
  editMode: boolean;
  focusLevel1Id?: string | null;
  onFocusHandled?: () => void;
}

/* ── 자유 편집 테이블 컴포넌트 ── */
function EditableTable({
  table, onChange, editMode,
}: {
  table: TableData;
  onChange: (t: TableData) => void;
  editMode: boolean;
}) {
  function setCell(ri: number, ci: number, val: string) {
    const rows = table.rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r);
    onChange({ ...table, rows });
  }
  function setHeader(ci: number, val: string) {
    const headers = table.headers.map((h, i) => i === ci ? val : h);
    onChange({ ...table, headers });
  }
  function addRow() {
    onChange({ ...table, rows: [...table.rows, Array(table.headers.length).fill("")] });
  }
  function removeRow(ri: number) {
    onChange({ ...table, rows: table.rows.filter((_, i) => i !== ri) });
  }
  function addCol() {
    onChange({
      headers: [...table.headers, ""],
      rows: table.rows.map(r => [...r, ""]),
    });
  }
  function removeCol(ci: number) {
    onChange({
      headers: table.headers.filter((_, i) => i !== ci),
      rows: table.rows.map(r => r.filter((_, i) => i !== ci)),
    });
  }

  const cellCls = "px-2 py-1.5 text-xs border-r border-gray-200 last:border-r-0 min-w-[80px]";

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            {table.headers.map((h, ci) => (
              <th key={ci} className={`${cellCls} font-semibold text-gray-600 text-left`}>
                {editMode ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={h}
                      onChange={e => setHeader(ci, e.target.value)}
                      className="w-full bg-transparent outline-none font-semibold text-gray-700 placeholder-gray-300 min-w-[60px]"
                      placeholder="열 이름"
                    />
                    {table.headers.length > 1 && (
                      <button onClick={() => removeCol(ci)}
                        className="text-gray-300 hover:text-red-400 shrink-0 transition-colors">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : h || <span className="text-gray-300">-</span>}
              </th>
            ))}
            {editMode && (
              <th className="px-2 py-1.5 w-8">
                <button onClick={addCol}
                  className="text-gray-300 hover:text-green-500 transition-colors"
                  title="열 추가">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {table.rows.length === 0 && (
            <tr>
              <td colSpan={table.headers.length + (editMode ? 1 : 0)}
                className="text-center text-xs text-gray-300 py-4">
                행이 없습니다
              </td>
            </tr>
          )}
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-t border-gray-100 hover:bg-gray-50/50">
              {row.map((cell, ci) => (
                <td key={ci} className={cellCls}>
                  {editMode ? (
                    <input
                      value={cell}
                      onChange={e => setCell(ri, ci, e.target.value)}
                      className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-200 min-w-[60px]"
                      placeholder="입력"
                    />
                  ) : <span className="text-gray-800">{cell || <span className="text-gray-300">-</span>}</span>}
                </td>
              ))}
              {editMode && (
                <td className="px-2 py-1.5 w-8">
                  <button onClick={() => removeRow(ri)}
                    className="text-gray-200 hover:text-red-400 transition-colors"
                    title="행 삭제">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editMode && (
        <button onClick={addRow}
          className="w-full py-1.5 text-[11px] text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          행 추가
        </button>
      )}
    </div>
  );
}

/* ── 메인 컴포넌트 ── */
export default function ProjectDetailsBoard({
  timelineId, items, editMode, focusLevel1Id, onFocusHandled,
}: Props) {
  const [detailsMap, setDetailsMap] = useState<Map<string, ProjectDetailData>>(new Map());
  const [openId,     setOpenId]     = useState<string | null>(null);
  const [saving,     setSaving]     = useState<string | null>(null);
  const [drafts,     setDrafts]     = useState<Map<string, ProjectDetailData>>(new Map());
  const [tableError, setTableError] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!timelineId) return;
    loadProjectDetails(timelineId).then(list => {
      if (!list) { setTableError(true); return; }
      const m = new Map<string, ProjectDetailData>();
      list.forEach(d => {
        const data = d.data as unknown as Record<string, unknown>;
        // bom 마이그레이션: 구버전 string → EMPTY_BOM, 구버전 단일 TableData → EMPTY_BOM, 신버전 BomData 그대로
        let bom: BomData;
        const rawBom = data.bom;
        if (rawBom && typeof rawBom === "object" && "productTable" in rawBom) {
          bom = rawBom as BomData;
        } else {
          bom = EMPTY_BOM;
        }
        // batchSize 마이그레이션: 구버전 string → 신규 기본값
        let batchSize: TableData;
        const rawBs = data.batchSize;
        if (rawBs && typeof rawBs === "object" && "headers" in rawBs) {
          batchSize = rawBs as TableData;
        } else {
          batchSize = emptyTable(["구분", "배치번호", "배치사이즈"]);
        }
        m.set(d.level1Id, { ...EMPTY_DETAIL_DATA, ...data, bom, batchSize });
      });
      setDetailsMap(m);
    });
  }, [timelineId]);

  useEffect(() => {
    if (!focusLevel1Id) return;
    setOpenId(focusLevel1Id);
    setTimeout(() => {
      cardRefs.current.get(focusLevel1Id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    onFocusHandled?.();
  }, [focusLevel1Id, onFocusHandled]);

  function getDetail(id: string): ProjectDetailData {
    return drafts.get(id) ?? detailsMap.get(id) ?? { ...EMPTY_DETAIL_DATA };
  }

  function startDraft(id: string) {
    if (!drafts.has(id)) {
      const d = getDetail(id);
      setDrafts(prev => new Map(prev).set(id, JSON.parse(JSON.stringify(d))));
    }
  }

  function updateDraft(id: string, patch: Partial<ProjectDetailData>) {
    setDrafts(prev => {
      const m = new Map(prev);
      m.set(id, { ...(m.get(id) ?? { ...EMPTY_DETAIL_DATA }), ...patch });
      return m;
    });
  }

  function updateCustomField(id: string, idx: number, field: Partial<CustomField>) {
    const d = getDetail(id);
    const cf = [...(d.customFields ?? [])];
    cf[idx] = { ...cf[idx], ...field };
    startDraft(id);
    updateDraft(id, { customFields: cf });
  }

  function addCustomField(id: string) {
    startDraft(id);
    const cf = [...(getDetail(id).customFields ?? []), { key: "", value: "" }];
    updateDraft(id, { customFields: cf });
  }

  function removeCustomField(id: string, idx: number) {
    startDraft(id);
    const cf = [...(getDetail(id).customFields ?? [])];
    cf.splice(idx, 1);
    updateDraft(id, { customFields: cf });
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
    const bomHasData = d.bom?.productTable?.rows?.some(r => r.some(c => c.trim()))
                    || d.bom?.materialTable?.rows?.some(r => r.some(c => c.trim()));
    const bsHasData  = d.batchSize?.rows?.some(r => r.some(c => c.trim()));
    return d.description || d.targetProduct || bomHasData || bsHasData || (d.customFields?.length ?? 0) > 0;
  };

  if (tableError) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        <p className="font-semibold text-red-500 mb-2">project_details 테이블이 없습니다.</p>
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
              {hasFilled(item.id) && !isDraft && (
                <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">입력됨</span>
              )}
              {isDraft && (
                <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">수정 중</span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 상세 패널 */}
            {isOpen && (
              <div className="px-5 pb-5 border-t border-gray-100 space-y-5 mt-4">

                {/* 프로젝트 개요 */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">프로젝트 개요</label>
                  {editMode ? (
                    <textarea rows={3}
                      value={detail.description}
                      onChange={e => { startDraft(item.id); updateDraft(item.id, { description: e.target.value }); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200"
                      placeholder="프로젝트 개요 입력" />
                  ) : (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap min-h-[2rem] bg-gray-50 rounded-lg px-3 py-2">
                      {detail.description || <span className="text-gray-300 text-xs">-</span>}
                    </p>
                  )}
                </div>

                {/* 대상 제품 */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">대상 제품</label>
                  {editMode ? (
                    <input type="text"
                      value={detail.targetProduct}
                      onChange={e => { startDraft(item.id); updateDraft(item.id, { targetProduct: e.target.value }); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200"
                      placeholder="대상 제품 입력" />
                  ) : (
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2">
                      {detail.targetProduct || <span className="text-gray-300 text-xs">-</span>}
                    </p>
                  )}
                </div>

                {/* 배치사이즈 표 */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">배치사이즈</label>
                  <EditableTable
                    table={detail.batchSize ?? emptyTable(["구분", "배치번호", "배치사이즈"])}
                    editMode={editMode}
                    onChange={t => { startDraft(item.id); updateDraft(item.id, { batchSize: t }); }}
                  />
                </div>

                {/* BOM 정보 */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-semibold text-gray-500">BOM 정보</label>

                  {/* 1) 제품코드 */}
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1 ml-0.5">① 제품코드</p>
                    <EditableTable
                      table={detail.bom?.productTable ?? emptyTable(["제품코드", "제품명", "비고"])}
                      editMode={editMode}
                      onChange={t => {
                        startDraft(item.id);
                        updateDraft(item.id, { bom: { ...(detail.bom ?? EMPTY_BOM), productTable: t } });
                      }}
                    />
                  </div>

                  {/* 2) 자재코드 */}
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1 ml-0.5">② 자재코드</p>
                    <EditableTable
                      table={detail.bom?.materialTable ?? emptyTable(["구분", "자재코드", "자재명", "제조사", "비고"])}
                      editMode={editMode}
                      onChange={t => {
                        startDraft(item.id);
                        updateDraft(item.id, { bom: { ...(detail.bom ?? EMPTY_BOM), materialTable: t } });
                      }}
                    />
                  </div>
                </div>

                {/* 추가 항목 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-gray-500">추가 항목</span>
                    {editMode && (
                      <button onClick={() => addCustomField(item.id)}
                        className="text-[11px] text-green-600 hover:text-green-800 font-semibold flex items-center gap-0.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        항목 추가
                      </button>
                    )}
                  </div>
                  {(detail.customFields?.length ?? 0) === 0 && !editMode ? (
                    <p className="text-xs text-gray-300">-</p>
                  ) : (
                    <div className="space-y-2">
                      {(detail.customFields ?? []).map((cf, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          {editMode ? (
                            <>
                              <input type="text" value={cf.key}
                                onChange={e => updateCustomField(item.id, idx, { key: e.target.value })}
                                placeholder="항목명"
                                className="w-32 shrink-0 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-green-400" />
                              <input type="text" value={cf.value}
                                onChange={e => updateCustomField(item.id, idx, { value: e.target.value })}
                                placeholder="값"
                                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-green-400" />
                              <button onClick={() => removeCustomField(item.id, idx)}
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
                  )}
                </div>

                {/* 저장/취소 */}
                {editMode && isDraft && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleSave(item.id)} disabled={saving === item.id}
                      className="px-4 py-2 rounded-xl bg-[#00733C] text-white text-xs font-bold hover:bg-[#005a2e] transition-colors disabled:opacity-50">
                      {saving === item.id ? "저장 중..." : "저장"}
                    </button>
                    <button onClick={() => handleDiscard(item.id)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
                      취소
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
