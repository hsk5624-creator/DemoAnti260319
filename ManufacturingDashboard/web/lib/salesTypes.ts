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

/** 파일명에서 추출한 메타데이터만 (XLSX 파싱 없이 빠르게 로드) */
export interface SalesFileMeta {
  name: string;
  label: string;
  refYear: number;
  refMonth: number;
  refDay: number;
}

export interface WeeklyNote {
  category: string;
  level: 'section' | 'parent' | 'child'; // section = 섹션 구분선 ("1) 3월 매출 특이사항")
  delta?: number;   // 전주 대비 (억원 단위)
  note: string;
}

export interface SalesFile {
  name: string;
  label: string;    // '26.03.19'
  refYear: number;  // 2026
  refMonth: number; // 3
  refDay: number;   // 19
  rows: SalesRow[];
  weeklyNotes?: WeeklyNote[];
}
