"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const FILE_SLOTS = [
  {
    key: "batch",
    label: "자사 제조배치",
    desc: "표11 — 제조 배치 데이터",
    accept: ".xlsx",
    sampleKey: "batch",
    icon: "📦",
  },
  {
    key: "wms",
    label: "WMS 제조지시 리스트",
    desc: "표11 — 제조일자 / 배치사이즈 보조",
    accept: ".xlsx",
    sampleKey: "wms",
    icon: "🏭",
  },
  {
    key: "cc",
    label: "변경관리 목록",
    desc: "표16 — 평가기간 변경관리",
    accept: ".xlsx",
    sampleKey: "cc",
    icon: "🔄",
  },
  {
    key: "capa",
    label: "CAPA 목록",
    desc: "표18 — 평가기간 CAPA",
    accept: ".xlsx",
    sampleKey: "capa",
    icon: "✅",
  },
  {
    key: "complaint",
    label: "소비자불만 리스트",
    desc: "표19 — 불만 (Complaints)",
    accept: ".xlsx",
    sampleKey: "complaint",
    icon: "📋",
  },
  {
    key: "scar",
    label: "SCAR DB (공급업체 시정조치)",
    desc: "표25 — Supplier Corrective Action",
    accept: ".xlsx",
    sampleKey: "scar",
    icon: "🔧",
  },
  {
    key: "deviation",
    label: "Deviation Log (일탈 로그)",
    desc: "일탈 — Deviation Log 2025",
    accept: ".xlsx",
    sampleKey: "deviation",
    icon: "⚠️",
  },
  {
    key: "banpum",
    label: "반품 내역",
    desc: "반품 — 반품 내역 (.xlsb)",
    accept: ".xlsb,.xlsx",
    sampleKey: "banpum",
    icon: "↩️",
  },
];

// 슬롯별 파일명 키워드 (소문자 매칭)
const SLOT_KEYWORDS: Record<string, string[]> = {
  batch:     ["제조배치", "batch"],
  wms:       ["wms", "제조지시"],
  cc:        ["변경관리", "change control"],
  capa:      ["capa"],
  complaint: ["불만", "complaint"],
  scar:      ["scar", "supplier corrective"],
  deviation: ["deviation", "일탈"],
  banpum:    ["반품"],
};

function matchFileToSlot(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const [key, keywords] of Object.entries(SLOT_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) return key;
  }
  return null;
}

type UploadedFiles = Record<string, File | null>;

export default function LandingPage() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [apiName, setApiName] = useState("");
  const [dataFiles, setDataFiles] = useState<UploadedFiles>({});
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [sectionDragOver, setSectionDragOver] = useState(false);
  const [unmatchedFiles, setUnmatchedFiles] = useState<string[]>([]);

  const productInfoValid = productCode.trim() !== "";

  const templateInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const dragCounterRef = useRef(0); // 자식 요소 진입/이탈 시 false positive 방지

  // 통합 파일 처리: 1개 + 특정 슬롯 → 슬롯 직접 할당 / 여러 개 → 파일명 자동 매칭 후 순차 체크
  const processFiles = useCallback((files: File[], preferredSlot?: string) => {
    if (files.length === 0) return;

    const isDataFile = (f: File) => f.name.endsWith(".xlsx") || f.name.endsWith(".xlsb");

    if (files.length === 1 && preferredSlot) {
      // 단일 파일을 특정 슬롯에 드롭
      const file = files[0];
      if (isDataFile(file)) {
        setDataFiles(prev => ({ ...prev, [preferredSlot]: file }));
      } else if (file.name.endsWith(".docx")) {
        setTemplateFile(file);
      }
      return;
    }

    // 여러 파일: 파일명으로 자동 매칭 후 순차적으로 상태 반영
    const matched: [string, File][] = [];
    const unmatched: string[] = [];

    for (const file of files) {
      if (file.name.endsWith(".docx")) {
        setTemplateFile(file);
      } else if (isDataFile(file)) {
        const slot = matchFileToSlot(file.name);
        if (slot) matched.push([slot, file]);
        else unmatched.push(file.name);
      }
    }

    // 순차적으로 체크 (120ms 간격으로 하나씩)
    matched.forEach(([slot, file], i) => {
      setTimeout(() => {
        setDataFiles(prev => ({ ...prev, [slot]: file }));
      }, i * 120);
    });

    setUnmatchedFiles(unmatched);
  }, []);

  const handleSectionDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setSectionDragOver(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const uploadedCount = Object.values(dataFiles).filter(Boolean).length;
  const canStart = productInfoValid && (uploadedCount > 0 || templateFile !== null);
  const canSample = productInfoValid;

  async function handleUploadAndStart() {
    setUploading(true);
    setStatus("idle");

    try {
      const fd = new FormData();
      fd.append("product_name", productName.trim());
      fd.append("product_code", productCode.trim());
      fd.append("api_name", apiName.trim());
      if (templateFile) fd.append("template", templateFile);
      for (const slot of FILE_SLOTS) {
        const f = dataFiles[slot.key];
        if (f) fd.append(slot.key, f);
      }

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "업로드 실패");

      setStatus("success");
      setStatusMsg(`${data.count}개 파일 업로드 완료`);

      const params = new URLSearchParams({ name: productName.trim(), code: productCode.trim(), api: apiName.trim() });
      setTimeout(() => router.push(`/review?${params.toString()}`), 800);
    } catch (e: unknown) {
      setStatus("error");
      setStatusMsg(e instanceof Error ? e.message : "오류 발생");
      setUploading(false);
    }
  }

  function handleUseSample() {
    if (!canSample) return;
    const params = new URLSearchParams({ name: productName.trim(), code: productCode.trim(), api: apiName.trim() });
    router.push(`/review?${params.toString()}`);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ── 헤더 ── */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 32px",
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "var(--brand)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>P</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>PPQR Agent</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>연간품질평가 자동화 도구</div>
        </div>
      </header>

      {/* ── 본문 ── */}
      <main style={{
        flex: 1,
        maxWidth: 860,
        margin: "0 auto",
        width: "100%",
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}>

        {/* 히어로 */}
        <div style={{ textAlign: "center", paddingBottom: 8 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 14px", borderRadius: 20,
            background: "var(--brand-light)", color: "var(--brand)",
            fontSize: 11, fontWeight: 600, marginBottom: 16,
          }}>
            ● 파일을 올리면 PPQR 표가 자동으로 채워집니다
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: "var(--text)",
            margin: "0 0 10px", lineHeight: 1.3,
          }}>
            엑셀 데이터 → PPQR Word 자동 완성
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            데이터 파일을 업로드하면 검토 표를 확인하고, 채워진 Word 파일을 바로 다운로드할 수 있습니다.
          </p>
        </div>

        {/* ── 제품 정보 ── */}
        <section>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 50, background: "var(--brand)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>1</span>
            제품 정보
            <span style={{ fontSize: 10, fontWeight: 400, color: "#e53e3e" }}>— 제품코드 필수</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "제품코드", required: true,  value: productCode, onChange: setProductCode, placeholder: "예: 30234" },
              { label: "제품명",   required: false, value: productName, onChange: setProductName, placeholder: "예: 이달비정80밀리그램 (선택)" },
              { label: "원료명 (API)", required: false, value: apiName, onChange: setApiName, placeholder: "예: 아질사르탄메독소밀칼륨 (선택)" },
            ].map(({ label, required, value, onChange, placeholder }) => (
              <div key={label}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>
                  {label}{required && <span style={{ color: "#e53e3e", marginLeft: 2 }}>*</span>}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "9px 12px", borderRadius: 8,
                    border: `1.5px solid ${required && !value.trim() ? "#fca5a5" : "var(--border)"}`,
                    fontSize: 13, color: "var(--text)",
                    background: "#fff", outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--brand)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = required && !e.currentTarget.value.trim() ? "#fca5a5" : "var(--border)"; }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── 빈 양식 업로드 ── */}
        <section>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 50, background: "var(--brand)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>2</span>
            PPQR 빈 양식 (Word)
            <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>— 선택 사항 (없으면 기본 양식 사용)</span>
          </div>

          <DropZone
            label="PPQR_빈양식.docx"
            accept=".docx"
            file={templateFile}
            dragActive={dragOver === "template"}
            onDrop={e => { e.preventDefault(); processFiles([e.dataTransfer.files[0]].filter(Boolean)); }}
            onDragOver={e => { e.preventDefault(); setDragOver("template"); }}
            onDragLeave={() => setDragOver(null)}
            onClick={() => templateInputRef.current?.click()}
            onRemove={() => setTemplateFile(null)}
          />
          <input
            ref={templateInputRef}
            type="file" accept=".docx" style={{ display: "none" }}
            onChange={e => setTemplateFile(e.target.files?.[0] ?? null)}
          />
        </section>

        {/* ── 데이터 파일 업로드 ── */}
        <section>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 50, background: "var(--brand)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>3</span>
            데이터 Excel 파일
            <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>— 하나 이상 필요 · 여러 파일을 한번에 드래그해도 됩니다</span>
          </div>

          {/* 멀티 드롭 래퍼 */}
          <div
            onDrop={handleSectionDrop}
            onDragOver={e => { e.preventDefault(); }}
            onDragEnter={e => { e.preventDefault(); dragCounterRef.current++; setSectionDragOver(true); }}
            onDragLeave={() => { dragCounterRef.current--; if (dragCounterRef.current === 0) setSectionDragOver(false); }}
            style={{
              borderRadius: 12,
              border: sectionDragOver ? "2px dashed var(--brand)" : "2px dashed transparent",
              background: sectionDragOver ? "var(--brand-light)" : "transparent",
              padding: sectionDragOver ? 10 : 0,
              transition: "all 0.15s",
              position: "relative",
            }}
          >
            {/* 드래그 중 오버레이 힌트 */}
            {sectionDragOver && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 10,
                pointerEvents: "none",
              }}>
                <div style={{
                  background: "var(--brand)", color: "#fff",
                  padding: "10px 24px", borderRadius: 20,
                  fontSize: 13, fontWeight: 700,
                  boxShadow: "0 4px 16px rgba(0,115,60,0.25)",
                }}>
                  파일을 놓으면 자동으로 분류됩니다
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, opacity: sectionDragOver ? 0.4 : 1, transition: "opacity 0.15s" }}>
              {FILE_SLOTS.map(slot => (
                <div key={slot.key}>
                  <DropZone
                    label={slot.label}
                    desc={slot.desc}
                    icon={slot.icon}
                    accept=".xlsx"
                    file={dataFiles[slot.key] ?? null}
                    dragActive={dragOver === slot.key}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); processFiles(Array.from(e.dataTransfer.files), slot.key); }}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(slot.key); }}
                    onDragLeave={() => setDragOver(null)}
                    onClick={() => fileInputRefs.current[slot.key]?.click()}
                    onRemove={() => setDataFiles(prev => ({ ...prev, [slot.key]: null }))}
                    sampleHref={`/api/sample/${slot.sampleKey}`}
                  />
                  <input
                    ref={el => { fileInputRefs.current[slot.key] = el; }}
                    type="file" accept=".xlsx" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) processFiles([f], slot.key); }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 매칭 실패 파일 경고 */}
          {unmatchedFiles.length > 0 && (
            <div style={{
              marginTop: 8, padding: "8px 12px", borderRadius: 6,
              background: "#fffbeb", border: "1px solid #fcd34d",
              fontSize: 11, color: "#b45309",
            }}>
              ⚠ 슬롯을 찾지 못한 파일 (직접 슬롯에 드래그하세요): {unmatchedFiles.join(", ")}
            </div>
          )}
        </section>

        {/* ── 액션 버튼 ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>

          {status === "success" && (
            <div style={{
              padding: "10px 20px", borderRadius: 8,
              background: "#f0faf4", border: "1px solid #a7d4b6",
              color: "var(--brand)", fontSize: 13, fontWeight: 600,
            }}>
              ✓ {statusMsg} — 검토 페이지로 이동 중...
            </div>
          )}
          {status === "error" && (
            <div style={{
              padding: "10px 20px", borderRadius: 8,
              background: "#fff5f5", border: "1px solid #fca5a5",
              color: "#dc2626", fontSize: 13,
            }}>
              ✕ {statusMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* 업로드 후 시작 */}
            <button
              disabled={!canStart || uploading}
              onClick={handleUploadAndStart}
              style={{
                padding: "12px 32px", borderRadius: 8,
                background: canStart && !uploading ? "var(--brand)" : "#ccc",
                color: "#fff", border: "none",
                fontSize: 14, fontWeight: 700, cursor: canStart && !uploading ? "pointer" : "not-allowed",
                transition: "background 0.15s",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {uploading ? (
                <>
                  <span style={{
                    width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)",
                    borderTop: "2px solid #fff", borderRadius: "50%",
                    display: "inline-block", animation: "spin 0.7s linear infinite",
                  }} />
                  업로드 중...
                </>
              ) : (
                `↑ 업로드 후 검토 시작 ${uploadedCount > 0 ? `(${uploadedCount}개)` : ""}`
              )}
            </button>

            <span style={{ fontSize: 12, color: "#ccc" }}>또는</span>

            {/* 샘플 데이터로 시작 */}
            <button
              onClick={handleUseSample}
              disabled={!canSample}
              style={{
                padding: "12px 24px", borderRadius: 8,
                background: "transparent",
                color: canSample ? "var(--brand)" : "#bbb",
                border: `1.5px solid ${canSample ? "var(--brand)" : "#ddd"}`,
                fontSize: 13, fontWeight: 600,
                cursor: canSample ? "pointer" : "not-allowed",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (canSample) (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              샘플 데이터로 시작 →
            </button>
          </div>

          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            {!productInfoValid
              ? "제품코드를 먼저 입력하세요."
              : "샘플 데이터로 시작하면 기존에 저장된 예시 파일을 사용합니다."}
          </p>
        </div>

      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Drop Zone 컴포넌트 ── */
interface DropZoneProps {
  label: string;
  desc?: string;
  icon?: string;
  accept: string;
  file: File | null;
  dragActive: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onClick: () => void;
  onRemove?: () => void;
  sampleHref?: string;
}

function DropZone({ label, desc, icon, file, dragActive, onDrop, onDragOver, onDragLeave, onClick, onRemove, sampleHref }: DropZoneProps) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClick}
      style={{
        border: `2px dashed ${dragActive ? "var(--brand)" : file ? "var(--brand)" : "var(--border)"}`,
        borderRadius: 10,
        padding: "14px 16px",
        background: dragActive ? "var(--brand-light)" : file ? "#f8fdf9" : "#fff",
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 64,
        position: "relative",
      }}
    >
      {/* 아이콘 */}
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: file ? "var(--brand-light)" : "#f5f7f6",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
      }}>
        {file ? "✓" : icon ?? "📄"}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: file ? "var(--brand)" : "var(--text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {file ? file.name : label}
        </div>
        {!file && desc && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>
        )}
        {!file && (
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>
            클릭 또는 드래그하여 업로드
          </div>
        )}
        {file && (
          <div style={{ fontSize: 10, color: "var(--brand)", marginTop: 2 }}>
            업로드 준비 완료
          </div>
        )}
      </div>

      {/* 샘플 다운로드 링크 */}
      {sampleHref && !file && (
        <a
          href={sampleHref}
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: 10, color: "var(--text-muted)",
            textDecoration: "underline", whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          샘플↓
        </a>
      )}

      {/* 파일 제거 */}
      {file && (
        <button
          onClick={e => {
            e.stopPropagation();
            onRemove?.();
          }}
          style={{
            width: 20, height: 20, borderRadius: 4,
            border: "1px solid #ccc", background: "transparent",
            color: "#999", fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
