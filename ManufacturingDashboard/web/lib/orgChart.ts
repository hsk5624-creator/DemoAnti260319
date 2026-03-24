export const EXCLUDED_CODES = new Set([
  '120000', // 제조부문
  '120001', // 품질본부
  '120002', // 품질경영담당
  '120007', // 품질관리담당
  '120013', // 진천품질담당
  '120018', // 케미컬생산담당
  '120030', // 바이오생산담당
  '120040', // 진천생산담당
  '120050', // 생산기술담당
  '120055', // 운영지원본부
  '120057', // 생산지원담당
]);

export interface TeamInfo {
  code: string;
  name: string;
}

export interface OrgGroup {
  groupKey: string;
  groupName: string;
  parentBu: string;
  isStandalone: boolean; // 본부직속 팀 = 드릴다운 없음
  teams: TeamInfo[];
}

export const BU_ORDER = ['품질본부', '생산본부', '운영지원본부'];

export const ORG_GROUPS: OrgGroup[] = [
  // 품질본부
  {
    groupKey: 'g_데이터보증',
    groupName: '데이터보증팀 (본부직속)',
    parentBu: '품질본부',
    isStandalone: true,
    teams: [{ code: '120053', name: '데이터보증팀' }],
  },
  {
    groupKey: 'g_품질경영',
    groupName: '품질경영담당',
    parentBu: '품질본부',
    isStandalone: false,
    teams: [
      { code: '120003', name: '컴플라이언스팀' },
      { code: '120004', name: '품질보증1팀' },
      { code: '120005', name: '품질보증2팀' },
    ],
  },
  {
    groupKey: 'g_품질관리',
    groupName: '품질관리담당',
    parentBu: '품질본부',
    isStandalone: false,
    teams: [
      { code: '120008', name: '품질관리1팀' },
      { code: '120009', name: '품질관리2팀' },
      { code: '120010', name: '원자재QC팀' },
      { code: '120011', name: '미생물QC팀' },
      { code: '120012', name: '바이오QC팀' },
    ],
  },
  {
    groupKey: 'g_진천품질',
    groupName: '진천품질담당',
    parentBu: '품질본부',
    isStandalone: false,
    teams: [
      { code: '120014', name: '품질보증팀(진천)' },
      { code: '120015', name: '품질관리팀(진천)' },
    ],
  },
  // 생산본부
  {
    groupKey: 'g_케미컬',
    groupName: '케미컬생산담당',
    parentBu: '생산본부',
    isStandalone: false,
    teams: [
      { code: '120019', name: '생산1팀' },
      { code: '120022', name: '생산2팀' },
      { code: '120025', name: '생산3팀' },
      { code: '120028', name: '포장팀' },
    ],
  },
  {
    groupKey: 'g_바이오',
    groupName: '바이오생산담당',
    parentBu: '생산본부',
    isStandalone: false,
    teams: [
      { code: '120031', name: '바이오생산1팀' },
      { code: '120033', name: '바이오생산2팀' },
      { code: '120035', name: '바이오생산3팀' },
      { code: '120038', name: '바이오생산4팀' },
    ],
  },
  {
    groupKey: 'g_진천생산',
    groupName: '진천생산담당',
    parentBu: '생산본부',
    isStandalone: false,
    teams: [
      { code: '120041', name: '생산지원팀' },
      { code: '120042', name: '생산팀(진천)' },
    ],
  },
  {
    groupKey: 'g_생산기술',
    groupName: '생산기술담당',
    parentBu: '생산본부',
    isStandalone: false,
    teams: [
      { code: '120051', name: '공정개발팀' },
      { code: '120052', name: '시험평가팀' },
      { code: '120006', name: '밸리데이션팀' },
    ],
  },
  // 운영지원본부
  {
    groupKey: 'g_운영지원',
    groupName: '운영지원팀 (본부직속)',
    parentBu: '운영지원본부',
    isStandalone: true,
    teams: [{ code: '120063', name: '운영지원팀' }],
  },
  {
    groupKey: 'g_생산지원',
    groupName: '생산지원담당',
    parentBu: '운영지원본부',
    isStandalone: false,
    teams: [
      { code: '120058', name: '생산관리팀(오창)' },
      { code: '120059', name: '제조관리팀' },
      { code: '120060', name: '자재관리팀' },
      { code: '120061', name: '물류팀' },
    ],
  },
  {
    groupKey: 'g_엔지니어링',
    groupName: '엔지니어링',
    parentBu: '운영지원본부',
    isStandalone: false,
    teams: [
      { code: '120056', name: '증설TF팀' },
      { code: '120064', name: '설비지원팀' },
    ],
  },
];
