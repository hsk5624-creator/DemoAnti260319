// 제조부문 조직도: 팀명 → { 본부, 담당 }
// 키: >> 뒤 팀명 그대로 (대소문자, 공백 포함)

export interface OrgNode {
  bonbu: string;   // 품질본부 / 생산본부 / 운영지원본부 / 기타
  damdang: string; // 담당 이름 (직속은 "{본부} 직속")
}

const ORG: Record<string, OrgNode> = {
  // ── 품질본부 ──────────────────────────────────────
  "데이터보증팀":         { bonbu: "품질본부",   damdang: "품질본부 직속" },

  // 품질경영담당
  "컴플라이언스팀":       { bonbu: "품질본부",   damdang: "품질경영담당" },
  "품질보증1팀":          { bonbu: "품질본부",   damdang: "품질경영담당" },
  "품질보증2팀":          { bonbu: "품질본부",   damdang: "품질경영담당" },
  "연구보증팀":           { bonbu: "품질본부",   damdang: "품질경영담당" },

  // 품질관리담당
  "품질관리1팀":          { bonbu: "품질본부",   damdang: "품질관리담당" },
  "품질관리2팀":          { bonbu: "품질본부",   damdang: "품질관리담당" },
  "품질관리3팀":          { bonbu: "품질본부",   damdang: "품질관리담당" },
  "원자재QC팀":           { bonbu: "품질본부",   damdang: "품질관리담당" },
  "미생물QC팀":           { bonbu: "품질본부",   damdang: "품질관리담당" },
  "미생물 QC":            { bonbu: "품질본부",   damdang: "품질관리담당" },
  "바이오QC팀":           { bonbu: "품질본부",   damdang: "품질관리담당" },

  // 진천품질담당
  "품질보증팀(진천)":     { bonbu: "품질본부",   damdang: "진천품질담당" },
  "품질관리팀(진천)":     { bonbu: "품질본부",   damdang: "진천품질담당" },
  "진천 품질보증팀":      { bonbu: "품질본부",   damdang: "진천품질담당" },
  "진천 품질관리팀":      { bonbu: "품질본부",   damdang: "진천품질담당" },

  // ── 생산본부 ──────────────────────────────────────
  // 케미컬생산담당
  "생산1팀":              { bonbu: "생산본부",   damdang: "케미컬생산담당" },
  "생산2팀":              { bonbu: "생산본부",   damdang: "케미컬생산담당" },
  "생산3팀":              { bonbu: "생산본부",   damdang: "케미컬생산담당" },
  "포장팀":               { bonbu: "생산본부",   damdang: "케미컬생산담당" },

  // 바이오생산담당
  "바이오생산1팀":        { bonbu: "생산본부",   damdang: "바이오생산담당" },
  "바이오생산2팀":        { bonbu: "생산본부",   damdang: "바이오생산담당" },
  "바이오생산3팀":        { bonbu: "생산본부",   damdang: "바이오생산담당" },
  "바이오생산4팀":        { bonbu: "생산본부",   damdang: "바이오생산담당" },

  // 진천생산담당
  "생산지원팀":           { bonbu: "생산본부",   damdang: "진천생산담당" },
  "생산팀":               { bonbu: "생산본부",   damdang: "진천생산담당" },
  "생산팀(진천)":         { bonbu: "생산본부",   damdang: "진천생산담당" },

  // 생산기술담당
  "공정개발팀":           { bonbu: "생산본부",   damdang: "생산기술담당" },
  "시험평가팀":           { bonbu: "생산본부",   damdang: "생산기술담당" },
  "밸리데이션팀":         { bonbu: "생산본부",   damdang: "생산기술담당" },
  "약리평가팀":           { bonbu: "생산본부",   damdang: "생산기술담당" },
  "의약화학팀":           { bonbu: "생산본부",   damdang: "생산기술담당" },

  // ── 운영지원본부 ──────────────────────────────────
  "운영지원팀":           { bonbu: "운영지원본부", damdang: "운영지원본부 직속" },

  // 생산지원담당
  "생산관리팀":           { bonbu: "운영지원본부", damdang: "생산지원담당" },
  "생산관리팀(오창)":     { bonbu: "운영지원본부", damdang: "생산지원담당" },
  "제조관리팀":           { bonbu: "운영지원본부", damdang: "생산지원담당" },
  "자재관리팀":           { bonbu: "운영지원본부", damdang: "생산지원담당" },
  "물류팀":               { bonbu: "운영지원본부", damdang: "생산지원담당" },

  // 엔지니어링
  "설비지원팀":           { bonbu: "운영지원본부", damdang: "엔지니어링" },
  "증설TF팀":             { bonbu: "운영지원본부", damdang: "엔지니어링" },
  "IT팀":                 { bonbu: "운영지원본부", damdang: "엔지니어링" },
};

const FALLBACK: OrgNode = { bonbu: "기타", damdang: "기타" };

export function getOrgNode(teamName: string): OrgNode {
  return ORG[teamName] ?? FALLBACK;
}

/** 담당에 속한 팀명 목록 */
export function getTeamsByDamdang(damdang: string): string[] {
  return Object.entries(ORG)
    .filter(([, v]) => v.damdang === damdang)
    .map(([k]) => k);
}

/** 본부에 속한 팀명 목록 */
export function getTeamsByBonbu(bonbu: string): string[] {
  return Object.entries(ORG)
    .filter(([, v]) => v.bonbu === bonbu)
    .map(([k]) => k);
}

export const BONBU_ORDER = ["품질본부", "생산본부", "운영지원본부", "기타"];

/** 본부 내 담당 목록 (순서 유지) */
export const DAMDANG_BY_BONBU: Record<string, string[]> = {
  "품질본부":     ["품질본부 직속", "품질경영담당", "품질관리담당", "진천품질담당"],
  "생산본부":     ["케미컬생산담당", "바이오생산담당", "진천생산담당", "생산기술담당"],
  "운영지원본부": ["운영지원본부 직속", "생산지원담당", "엔지니어링"],
  "기타":         ["기타"],
};
