import * as XLSX from "xlsx";

export interface MRORecord {
  orderNumber: string;   // 주문번호
  productName: string;   // 상품명
  spec: string;          // 규격
  manufacturer: string;  // 제조원명
  department: string;    // 사업장/부서명
  requester: string;     // 주문자
  orderAgent: string;    // 주문대행자
  orderDate: string;     // 주문일 (YYYY.MM.DD)
  quantity: number;      // 총수량
  amount: number;        // 총금액
  currency: string;      // 통화단위
  approvalDate: string;  // 결재일자
  approvalStatus: string;// 결재처리
  purchaseReason: string;// 구매사유
  recipient: string;     // 수령인
  year: number;
  month: number;
  sourceFile: string;
}

function parseDate(raw: string): { year: number; month: number } {
  // YYYY.MM.DD
  const m = String(raw ?? "").match(/^(\d{4})\.(\d{2})/);
  if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) };
  return { year: 0, month: 0 };
}

/** 헤더명 → 필드명 매핑 */
const HEADER_MAP: Record<string, keyof MRORecord> = {
  "주문번호": "orderNumber",
  "상품명": "productName",
  "규격": "spec",
  "제조원명": "manufacturer",
  "사업장/부서명": "department",
  "주문자": "requester",
  "주문대행자": "orderAgent",
  "주문일": "orderDate",
  "총수량": "quantity",
  "총금액": "amount",
  "통화단위": "currency",
  "결재일자": "approvalDate",
  "결재처리": "approvalStatus",
  "구매사유": "purchaseReason",
  "수령인": "recipient",
};

/**
 * 헤더 행을 찾아 컬럼 인덱스 매핑을 반환한다.
 * 타이틀 행이 있는 파일(Row 0=제목, Row 1=헤더)과
 * 타이틀 행이 없는 파일(Row 0=헤더) 모두 지원.
 */
function findHeaderRow(rows: string[][]): { headerRowIdx: number; colMap: Map<keyof MRORecord, number> } | null {
  // 첫 3행 내에서 헤더 행 탐색
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    // "상품명"과 "주문일"이 모두 포함된 행을 헤더로 인식
    const cells = row.map((c) => String(c ?? "").trim());
    if (cells.includes("상품명") && cells.includes("주문일")) {
      const colMap = new Map<keyof MRORecord, number>();
      for (let j = 0; j < cells.length; j++) {
        const field = HEADER_MAP[cells[j]];
        if (field) colMap.set(field, j);
      }
      return { headerRowIdx: i, colMap };
    }
  }
  return null;
}

function getStr(row: unknown[], idx: number | undefined): string {
  if (idx === undefined) return "";
  return String(row[idx] ?? "").trim();
}

function getNum(row: unknown[], idx: number | undefined): number {
  if (idx === undefined) return 0;
  return parseFloat(String(row[idx] ?? "0").replace(/,/g, "")) || 0;
}

export function parseExcelBuffer(buffer: ArrayBuffer, fileName: string): MRORecord[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

  const header = findHeaderRow(rows);
  if (!header) {
    console.error(`[parseExcel] 헤더를 찾을 수 없음: ${fileName}`);
    return [];
  }

  const { headerRowIdx, colMap } = header;
  const records: MRORecord[] = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[colMap.get("productName")!]) continue; // 상품명 없으면 스킵

    const orderDate = getStr(r, colMap.get("orderDate"));
    const { year, month } = parseDate(orderDate);

    records.push({
      orderNumber:    getStr(r, colMap.get("orderNumber")),
      productName:    getStr(r, colMap.get("productName")),
      spec:           getStr(r, colMap.get("spec")),
      manufacturer:   getStr(r, colMap.get("manufacturer")),
      department:     getStr(r, colMap.get("department")),
      requester:      getStr(r, colMap.get("requester")),
      orderAgent:     getStr(r, colMap.get("orderAgent")),
      orderDate,
      quantity:       getNum(r, colMap.get("quantity")),
      amount:         getNum(r, colMap.get("amount")),
      currency:       getStr(r, colMap.get("currency")) || "KRW",
      approvalDate:   getStr(r, colMap.get("approvalDate")),
      approvalStatus: getStr(r, colMap.get("approvalStatus")),
      purchaseReason: getStr(r, colMap.get("purchaseReason")),
      recipient:      getStr(r, colMap.get("recipient")),
      year,
      month,
      sourceFile: fileName,
    });
  }
  return records;
}

export function parseExcelFile(filePath: string): MRORecord[] {
  const fs = require("fs");
  const buffer: Buffer = fs.readFileSync(filePath);
  return parseExcelBuffer(buffer.buffer as ArrayBuffer, require("path").basename(filePath));
}
