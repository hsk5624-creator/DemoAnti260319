export interface SalesGroupDef {
  key: string;
  name: string;
  items: string[]; // detailCategory values (Col H)
}

export interface SalesCategoryDef {
  key: string;
  name: string;
  groups: SalesGroupDef[];
}

// 2026 이전에는 PFS가 CMO상업_PFS 단일 항목으로 들어옴
export const SALES_HIERARCHY: SalesCategoryDef[] = [
  {
    key: 'chem',
    name: '케미컬 상업',
    groups: [
      {
        key: 'chem_etc',
        name: '기타(위임형 등)',
        items: ['CMO상업_위임형', 'CMO상업_미국', 'CMO상업_조달'],
      },
      {
        key: 'chem_inhouse',
        name: '내재화',
        items: ['CMO상업_내재화'],
      },
    ],
  },
  {
    key: 'bio',
    name: '바이오상업',
    groups: [
      {
        key: 'bio_phase1',
        name: '바이오상업 1단계',
        // CMO상업_PFS = 2024/2025 합산 항목, 충전/조립/포장 = 2026+
        items: ['CMO상업_PFS 충전', 'CMO상업_PFS 조립', 'CMO상업_PFS 포장', 'CMO상업_PFS', 'CMO상업_L&P'],
      },
    ],
  },
  {
    key: 'dev',
    name: '개발용역',
    groups: [
      { key: 'dev_pfs',     name: 'PFS 개발',      items: ['CMO용역_PFS'] },
      { key: 'dev_lcm',     name: 'LCM',           items: ['CMO용역_LCM'] },
      { key: 'dev_inhouse', name: '내재화 개발',    items: ['CMO용역_내재화'] },
      { key: 'dev_qa',      name: '기타(QA위임등)', items: ['용역_QA위임'] },
      { key: 'dev_gcp',     name: 'GCP 개발',       items: ['CMO용역_GCP'] },
    ],
  },
];

// 모든 매핑된 항목 set (파싱 필터용)
export const ALL_MAPPED_ITEMS = new Set(
  SALES_HIERARCHY.flatMap((c) => c.groups.flatMap((g) => g.items))
);
