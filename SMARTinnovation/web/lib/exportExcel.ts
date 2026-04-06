import * as XLSX from "xlsx";
import type { Level1Item } from "./types";
import type { ProjectDetailData, TableData } from "./projectDetails";

const STATUS_KO: Record<string, string> = {
  planned:     "예정",
  "in-progress": "진행중",
  completed:   "완료",
  critical:    "핵심 마일스톤",
};

function fmtWDate(s: string): string {
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-W(\d)$/);
  if (!m) return s;
  return `${m[1]}년 ${Number(m[2])}월 ${m[3]}주`;
}

function fmtDate(s: string): string {
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[1]}.${m[2]}.${m[3]}`;
}

export function exportToExcel(items: Level1Item[], title: string) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: L1 + L2 요약 ──────────────────────────────────
  const summaryRows: (string | number)[][] = [
    ["과제 그룹(Lv1)", "세부 과제(Lv2)", "시작일", "종료일", "담당자", "상태", "마일스톤(Lv1 표시)"],
  ];

  for (const l1 of items) {
    if (l1.children.length === 0) {
      summaryRows.push([l1.name, "", "", "", l1.assignee, STATUS_KO[l1.status] ?? l1.status, ""]);
      continue;
    }
    for (const l2 of l1.children) {
      summaryRows.push([
        l1.name,
        l2.name,
        fmtWDate(l2.startDate),
        fmtWDate(l2.endDate),
        l2.assignee || l1.assignee,
        STATUS_KO[l2.status] ?? l2.status,
        l2.showOnLevel1 ? "Y" : "",
      ]);
    }
  }

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);

  // 열 너비 지정
  ws1["!cols"] = [
    { wch: 20 }, // 그룹
    { wch: 32 }, // 과제명
    { wch: 16 }, // 시작
    { wch: 16 }, // 종료
    { wch: 12 }, // 담당자
    { wch: 14 }, // 상태
    { wch: 12 }, // 마일스톤
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "타임라인 요약");

  // ── Sheet 2: L3 세부항목 (있는 경우만) ────────────────────
  const hasL3 = items.some(l1 => l1.children.some(l2 => (l2.children?.length ?? 0) > 0));

  if (hasL3) {
    const detailRows: (string | number)[][] = [
      ["과제 그룹(Lv1)", "세부 과제(Lv2)", "세부항목(Lv3)", "시작일", "종료일", "담당자", "상태"],
    ];
    for (const l1 of items) {
      for (const l2 of l1.children) {
        if (!l2.children?.length) continue;
        for (const l3 of l2.children) {
          detailRows.push([
            l1.name,
            l2.name,
            l3.name,
            fmtDate(l3.startDate),
            fmtDate(l3.endDate),
            l3.assignee || l2.assignee || l1.assignee,
            STATUS_KO[l3.status] ?? l3.status,
          ]);
        }
      }
    }
    const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
    ws2["!cols"] = [
      { wch: 20 }, { wch: 28 }, { wch: 32 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "세부항목");
  }

  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  XLSX.writeFile(wb, `${safeTitle}_타임라인.xlsx`);
}

/* ── 프로젝트 상세정보 내보내기 (LV1별 시트) ── */
function appendTable(
  rows: (string | number)[][],
  label: string,
  table: TableData | undefined,
  defaultHeaders: string[],
) {
  const headers = table?.headers?.length ? table.headers : defaultHeaders;
  const dataRows = table?.rows ?? [];
  rows.push([label]);
  rows.push(headers);
  if (dataRows.length === 0) {
    rows.push(Array(headers.length).fill(""));
  } else {
    for (const r of dataRows) {
      rows.push(r.length ? r : Array(headers.length).fill(""));
    }
  }
  rows.push([]); // 빈 행 구분
}

export function exportProjectDetails(
  items: Level1Item[],
  detailsMap: Map<string, ProjectDetailData>,
  title: string,
) {
  const wb = XLSX.utils.book_new();

  for (const item of items) {
    const d = detailsMap.get(item.id);
    const rows: (string | number)[][] = [];

    // 기본 정보
    rows.push(["과제명", item.name]);
    rows.push(["담당자", item.assignee || ""]);
    rows.push(["프로젝트 개요", d?.description || ""]);
    rows.push(["대상 제품", d?.targetProduct || ""]);
    rows.push([]);

    // 배치사이즈
    appendTable(rows, "▶ 배치사이즈", d?.batchSize, ["구분", "배치번호", "배치사이즈"]);

    // BOM - 제품코드
    appendTable(rows, "▶ BOM - ① 제품코드", d?.bom?.productTable, ["제품코드", "제품명", "비고"]);

    // BOM - 자재코드
    appendTable(rows, "▶ BOM - ② 자재코드", d?.bom?.materialTable, ["구분", "자재코드", "자재명", "제조사", "비고"]);

    // 추가 항목
    if ((d?.customFields?.length ?? 0) > 0) {
      rows.push(["▶ 추가 항목"]);
      rows.push(["항목명", "값"]);
      for (const cf of d!.customFields) {
        rows.push([cf.key, cf.value]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 열 너비
    ws["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

    // 섹션 헤더 굵게 (▶ 포함 행)
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cell?.v && typeof cell.v === "string" && cell.v.startsWith("▶")) {
        cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "F3F4F6" } } };
      }
    }

    // 시트 이름: 31자 제한, 특수문자 제거
    const sheetName = item.name.replace(/[\\/:*?"<>|[\]]/g, "").slice(0, 31) || `Sheet${wb.SheetNames.length + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  XLSX.writeFile(wb, `${safeTitle}_프로젝트상세.xlsx`);
}
