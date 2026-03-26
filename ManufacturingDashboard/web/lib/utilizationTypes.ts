export type Factory = '청주' | '진천';

export interface PivotRow {
  factory: Factory;
  category: string;
  period: string; // 'YY.MM'
  value: number;
}

export interface EquipmentRow {
  factory: Factory;
  process: string; // 과립, 타정, 코팅, 선별, 포장
  equipment: string;
  isSummary: boolean;       // process-level summary
  isFactorySummary: boolean; // factory-level summary (청주 요약 / 진천 요약)
  period: string; // 'YY.MM'
  value: number;  // 0~1 range
}

export interface ProductBatch {
  factory: Factory;
  category: string;    // 원본 카테고리 (CSO(청주), 고덱스, etc.)
  product: string;     // 제품명
  period: string;      // 'YY.MM'
  batches: number;
  granuleEquip: string[]; // (설)과1, (설)과2 정규화값 (소문자) — 빈 배열이면 미지정
  mfgUnit?: number;    // 제조 단위 (예: 190000)
  mfgYield?: number;   // 수율 (예: 0.96)
}

export interface UtilizationFile {
  name: string;
  label: string; // 'YY.MM.DD'
  pivotRows: PivotRow[];
  equipmentRows: EquipmentRow[];
  productBatches: ProductBatch[];
}
