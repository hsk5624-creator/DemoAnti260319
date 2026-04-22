"use client";

import { useState, useRef, useCallback } from "react";

const TEXT_LIMIT = 50;

function ExpandableText({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTrunc = value.length > TEXT_LIMIT;

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(p => !p);
  }, []);

  if (!needsTrunc) return <>{value}</>;

  return (
    <>
      <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {expanded ? value : value.slice(0, TEXT_LIMIT) + "…"}
      </span>
      <button
        onClick={toggle}
        style={{
          marginLeft: 4,
          padding: "0 5px",
          fontSize: 10,
          borderRadius: 3,
          border: "1px solid #ccc",
          background: "transparent",
          color: "#888",
          cursor: "pointer",
          lineHeight: "16px",
          whiteSpace: "nowrap",
          verticalAlign: "middle",
        }}
      >
        {expanded ? "접기" : "더보기"}
      </button>
    </>
  );
}

type Source = { file: string; sheet: string; row: number };
type TableRow = {
  data: Record<string, string>;
  sources: Source[];
  review_required: boolean;
  review_reason: string;
};
type TableData = { id: string; title: string; columns: string[]; rows: TableRow[] };

// rowIdx → col → 편집값
type Edits = Record<number, Record<string, string>>;

interface Props {
  table: TableData;
  selectedIdx: number | null;
  confirmedSet: Set<number>;
  edits: Edits;
  onSelect: (idx: number) => void;
  onConfirm: (idx: number) => void;
  onUnconfirm: (idx: number) => void;
  onEdit: (rowIdx: number, col: string, val: string) => void;
}

const COL_WIDTHS: Record<string, number> = {
  "No": 36,
  "Batch No": 88,
  "Date of Manufacture": 106,
  "Batch Size": 86,
  "Packaging Unit": 96,
  "Product Batch No.": 108,
  "Market": 56,
  "Remark": 76,
  "Change no.": 126,
  "Change Information": 240,
  "Open/Close date": 150,
  "CAPA No.": 126,
  "Summary": 240,
  "Complaint No.": 106,
  "Contents / Corrective Action": 260,
  "Receive / Complete Date": 150,
};

// 검증 상태 타입
type MatchStatus = "match" | "review" | "incomplete";

interface StatusMeta {
  status: MatchStatus;
  label: string;
  issues: string[];  // 구체적 문제점 목록
}

function calcStatus(row: TableRow, columns: string[]): StatusMeta {
  const issues: string[] = [];

  // 1. "?" 값 = 소스에서 데이터를 찾지 못함
  for (const col of columns) {
    const v = row.data[col] ?? "";
    if (v === "?") issues.push(`"${col}" 값 없음`);
  }

  // 2. 핵심 컬럼 빈값
  const keyColumns = columns.filter(c => c !== "No" && c !== "Remark");
  for (const col of keyColumns) {
    const v = row.data[col] ?? "";
    if (!v || v === "") issues.push(`"${col}" 미입력`);
  }

  // 3. 날짜 형식 이상
  for (const col of columns) {
    if (col.toLowerCase().includes("date") || col.includes("날짜")) {
      const v = row.data[col] ?? "";
      if (v && v !== "진행 중" && !/\d{4}/.test(v)) {
        issues.push(`"${col}" 날짜 형식 이상: ${v}`);
      }
    }
  }

  // 4. 연도 범위 체크 (Open/Close date 등)
  for (const col of columns) {
    const v = row.data[col] ?? "";
    if ((col.includes("date") || col.includes("Date")) && v.includes(" / ")) {
      const [open] = v.split(" / ");
      const yr = parseInt(open.slice(0, 4));
      if (!isNaN(yr) && (yr < 2020 || yr > 2030)) {
        issues.push(`"${col}" 연도 이상: ${yr}년`);
      }
    }
  }

  if (issues.length > 0) {
    return { status: "incomplete", label: "데이터 오류", issues };
  }
  if (row.review_required) {
    return { status: "review", label: "요확인", issues: [row.review_reason] };
  }
  return { status: "match", label: "일치", issues: [] };
}

const STATUS_STYLE: Record<MatchStatus, { bg: string; border: string; text: string; dot: string }> = {
  match:      { bg: "#f0faf4", border: "#a7d4b6", text: "#00733C", dot: "#00733C" },
  review:     { bg: "#fffbeb", border: "#fcd34d", text: "#b45309", dot: "#f59e0b" },
  incomplete: { bg: "#fff5f5", border: "#fca5a5", text: "#dc2626", dot: "#ef4444" },
};

export default function ReviewTable({ table, selectedIdx, confirmedSet, edits, onSelect, onConfirm, onUnconfirm, onEdit }: Props) {
  const statuses = table.rows.map(row => calcStatus(row, table.columns));

  const matchCount      = statuses.filter(s => s.status === "match").length;
  const reviewCount     = statuses.filter(s => s.status === "review").length;
  const incompleteCount = statuses.filter(s => s.status === "incomplete").length;

  // 인라인 편집 상태
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const NON_EDITABLE = new Set(["No"]);

  function startEdit(rowIdx: number, col: string, currentVal: string) {
    setEditingCell({ row: rowIdx, col });
    setEditValue(currentVal);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    if (!editingCell) return;
    onEdit(editingCell.row, editingCell.col, editValue);
    setEditingCell(null);
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* 테이블 헤더 정보 */}
      <div style={{
        padding: "10px 18px",
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{table.title}</span>
        <span style={{ color: "#ccc", fontSize: 12 }}>|</span>

        {/* 상태 요약 배지 */}
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
          <span style={{ color: "#00733C" }}>●</span>
          <span style={{ color: "var(--text-muted)" }}>일치 {matchCount}건</span>
        </span>
        {reviewCount > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            <span style={{ color: "#f59e0b" }}>●</span>
            <span style={{ color: "var(--text-muted)" }}>요확인 {reviewCount}건</span>
          </span>
        )}
        {incompleteCount > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            <span style={{ color: "#ef4444" }}>●</span>
            <span style={{ color: "var(--text-muted)" }}>오류 {incompleteCount}건</span>
          </span>
        )}

        <span style={{ marginLeft: "auto", fontSize: 10, color: "#ccc" }}>
          행 클릭 → 원본 확인
        </span>
      </div>

      {/* 스크롤 테이블 */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <tr style={{ background: "#f0f7f3" }}>
              {/* 검증 상태 컬럼 */}
              <th style={{
                padding: "9px 10px",
                textAlign: "center",
                fontWeight: 700,
                color: "#005a2e",
                borderBottom: "2px solid #d4e9dc",
                width: 72,
                fontSize: 11,
                whiteSpace: "nowrap",
              }}>
                검증
              </th>

              {table.columns.map(col => (
                <th key={col} style={{
                  padding: "9px 12px",
                  textAlign: "left",
                  fontWeight: 700,
                  color: "#005a2e",
                  borderBottom: "2px solid #d4e9dc",
                  whiteSpace: "nowrap",
                  width: COL_WIDTHS[col] ?? 120,
                  minWidth: COL_WIDTHS[col] ?? 80,
                  fontSize: 11,
                }}>
                  {col}
                </th>
              ))}

              <th style={{
                padding: "9px 12px",
                textAlign: "center",
                fontWeight: 700,
                color: "#005a2e",
                borderBottom: "2px solid #d4e9dc",
                width: 76,
                fontSize: 11,
              }}>
                확인
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => {
              const meta = statuses[idx];
              const st = STATUS_STYLE[meta.status];
              const isSelected = selectedIdx === idx;
              const isConfirmed = confirmedSet.has(idx);

              // 행 배경: 선택 > 확인됨 > 상태별
              let rowBg = st.bg;
              if (isSelected) rowBg = "#e8f4ed";
              else if (isConfirmed) rowBg = "#f8fdf9";

              return (
                <tr
                  key={idx}
                  onClick={() => onSelect(idx)}
                  style={{
                    background: rowBg,
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: `3px solid ${isSelected ? "var(--brand)" : st.border}`,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#edf7f2";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = rowBg;
                  }}
                >
                  {/* 검증 상태 셀 */}
                  <td style={{ padding: "7px 8px", textAlign: "center", verticalAlign: "middle" }}>
                    <div
                      title={meta.issues.length > 0 ? meta.issues.join("\n") : "데이터 일치 확인됨"}
                      style={{
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <span style={{
                        display: "inline-block",
                        padding: "2px 7px",
                        borderRadius: 10,
                        background: isConfirmed ? "transparent" : st.bg,
                        border: `1px solid ${isConfirmed ? "#a7d4b6" : st.border}`,
                        color: isConfirmed ? "#00733C" : st.text,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        lineHeight: 1.6,
                      }}>
                        {isConfirmed
                          ? "✓ 완료"
                          : meta.status === "match"
                            ? "✓ 일치"
                            : meta.status === "review"
                              ? "⚠ 확인"
                              : "✕ 오류"
                        }
                      </span>
                      {/* 문제 항목 요약 (첫 번째만) */}
                      {!isConfirmed && meta.issues.length > 0 && (
                        <span style={{
                          fontSize: 9,
                          color: st.text,
                          maxWidth: 66,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                          textAlign: "center",
                        }} title={meta.issues.join("\n")}>
                          {meta.issues[0]}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 데이터 컬럼들 */}
                  {table.columns.map(col => {
                    const rawVal  = row.data[col] ?? "";
                    const edited  = edits[idx]?.[col];
                    const val     = edited !== undefined ? edited : rawVal;
                    const isEdited = edited !== undefined && edited !== rawVal;
                    const colIssue = meta.issues.some(iss => iss.includes(`"${col}"`));
                    const isEditingThis = editingCell?.row === idx && editingCell?.col === col;
                    const canEdit = !NON_EDITABLE.has(col);
                    const isMultiline = col === "Change Information" || col === "Summary" || col === "Contents / Corrective Action";

                    return (
                      <td
                        key={col}
                        style={{
                          padding: "7px 12px",
                          verticalAlign: "top",
                          maxWidth: COL_WIDTHS[col] ?? 160,
                          cursor: canEdit ? "text" : "default",
                          position: "relative",
                        }}
                        onDoubleClick={e => {
                          if (!canEdit) return;
                          e.stopPropagation();
                          startEdit(idx, col, val === "(없음)" ? "" : val);
                        }}
                        onClick={e => { if (isEditingThis) e.stopPropagation(); }}
                      >
                        {col === table.columns[0] && row.review_required && !isConfirmed && (
                          <span
                            title={row.review_reason}
                            style={{ color: "#f59e0b", marginRight: 3, fontSize: 11, cursor: "help" }}
                          >⚠</span>
                        )}

                        {isEditingThis ? (
                          isMultiline ? (
                            <textarea
                              ref={el => { inputRef.current = el; }}
                              value={editValue}
                              rows={3}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => {
                                if (e.key === "Escape") cancelEdit();
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                              }}
                              style={{
                                width: "100%", fontSize: 12, lineHeight: 1.4,
                                border: "1.5px solid var(--brand)", borderRadius: 4,
                                padding: "3px 6px", outline: "none",
                                resize: "vertical", fontFamily: "inherit",
                                background: "#fff",
                              }}
                            />
                          ) : (
                            <input
                              ref={el => { inputRef.current = el; }}
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => {
                                if (e.key === "Enter") commitEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              style={{
                                width: "100%", fontSize: 12,
                                border: "1.5px solid var(--brand)", borderRadius: 4,
                                padding: "2px 6px", outline: "none",
                                fontFamily: "inherit", background: "#fff",
                              }}
                            />
                          )
                        ) : (
                          <span style={{
                            display: "block",
                            lineHeight: 1.4,
                            color: colIssue && !isEdited
                              ? "#dc2626"
                              : (val === "?" || val === "")
                                ? "#ccc"
                                : isConfirmed
                                  ? "#6b7f74"
                                  : "var(--text)",
                            fontWeight: (colIssue && !isEdited) ? 600 : 400,
                            fontStyle: (val === "?" || val === "") ? "italic" : "normal",
                            borderBottom: isEdited ? "2px solid #f59e0b" : "none",
                          }}>
                            {val === "" ? "(없음)" : <ExpandableText value={val} />}
                          </span>
                        )}

                        {/* 편집 힌트 (호버 시) */}
                        {canEdit && !isEditingThis && (
                          <span style={{
                            position: "absolute", top: 4, right: 4,
                            fontSize: 8, color: "#ccc", pointerEvents: "none",
                            opacity: 0, transition: "opacity 0.1s",
                          }} className="edit-hint">✎</span>
                        )}

                      </td>
                    );
                  })}

                  {/* 확인 버튼 */}
                  <td style={{ padding: "6px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    {isConfirmed ? (
                      <button
                        onClick={e => { e.stopPropagation(); onUnconfirm(idx); }}
                        title="클릭하여 확인 취소"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          padding: "4px 8px", borderRadius: 5,
                          border: "1px solid #a7d4b6",
                          background: "var(--brand-light)", color: "var(--brand)",
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ✓ 완료
                      </button>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); onConfirm(idx); }}
                        style={{
                          padding: "4px 10px", borderRadius: 5,
                          border: `1.5px solid ${meta.status === "incomplete" ? "#ef4444" : "var(--brand)"}`,
                          background: isSelected ? "var(--brand)" : "transparent",
                          color: isSelected ? "#fff" : meta.status === "incomplete" ? "#ef4444" : "var(--brand)",
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                          transition: "all 0.15s",
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={e => {
                          const b = e.currentTarget;
                          b.style.background = meta.status === "incomplete" ? "#ef4444" : "var(--brand)";
                          b.style.color = "#fff";
                        }}
                        onMouseLeave={e => {
                          const b = e.currentTarget;
                          b.style.background = isSelected ? "var(--brand)" : "transparent";
                          b.style.color = isSelected ? "#fff"
                            : meta.status === "incomplete" ? "#ef4444" : "var(--brand)";
                        }}
                      >
                        확인
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
