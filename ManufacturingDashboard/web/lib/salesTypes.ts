export interface SalesRow {
  year: number;           // 2024, 2025, 2026
  quarter: number;        // 1–4
  month: number;          // 1–12
  detailCategory: string; // Col H 상세구분
  actual: number;         // Col I 매출실적
  plan: number;           // Col J 사업계획
  forecast: number;       // Col K 예상마감
  prevForecast: number;   // Col M 전주 예상실적
  gap: number;            // Col N Gap
}

export interface SalesFile {
  name: string;
  label: string;    // '26.03.19'
  refYear: number;  // 2026
  refMonth: number; // 3
  refDay: number;   // 19
  rows: SalesRow[];
}
