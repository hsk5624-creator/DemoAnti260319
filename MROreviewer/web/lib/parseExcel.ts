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

export function parseExcelBuffer(buffer: ArrayBuffer, fileName: string): MRORecord[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // Row 0: title, Row 1: headers, Row 2+: data
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

  const records: MRORecord[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1]) continue; // 상품명 없으면 스킵

    const orderDate = String(r[7] ?? "");
    const { year, month } = parseDate(orderDate);

    records.push({
      orderNumber:    String(r[0]  ?? ""),
      productName:    String(r[1]  ?? "").trim(),
      spec:           String(r[2]  ?? ""),
      manufacturer:   String(r[3]  ?? ""),
      department:     String(r[4]  ?? ""),
      requester:      String(r[5]  ?? ""),
      orderAgent:     String(r[6]  ?? ""),
      orderDate,
      quantity:       parseFloat(String(r[8]  ?? "0")) || 0,
      amount:         parseFloat(String(r[9]  ?? "0").replace(/,/g, "")) || 0,
      currency:       String(r[10] ?? "KRW"),
      approvalDate:   String(r[11] ?? ""),
      approvalStatus: String(r[12] ?? ""),
      purchaseReason: String(r[13] ?? ""),
      recipient:      String(r[14] ?? ""),
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
