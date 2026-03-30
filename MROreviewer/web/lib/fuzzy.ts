/** 띄어쓰기 정규화: 연속 공백 → 단일 공백, 앞뒤 trim */
export function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Levenshtein 거리 기반 문자열 유사도
 * 반환값: 0.0 ~ 1.0 (1.0 = 완전 일치)
 */
export function similarity(a: string, b: string): number {
  const na = normalizeSpaces(a).toLowerCase();
  const nb = normalizeSpaces(b).toLowerCase();
  if (na === nb) return 1;
  const la = na.length, lb = nb.length;
  if (la === 0 || lb === 0) return 0;

  const dp: number[] = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= lb; j++) {
      const tmp = dp[j];
      dp[j] = na[i - 1] === nb[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return 1 - dp[lb] / Math.max(la, lb);
}

export interface FuzzyMatch {
  name: string;
  score: number; // 0~1
}

/**
 * 검색어를 포함하거나 유사도 threshold 이상인 항목 반환
 * - 완전일치(정규화) → 시작일치 → 포함일치 → 유사도 순
 */
export function fuzzySearch(
  query: string,
  candidates: string[],
  threshold = 0.85
): FuzzyMatch[] {
  const q = normalizeSpaces(query).toLowerCase();
  if (!q) return [];

  const seen = new Set<string>();
  const results: FuzzyMatch[] = [];

  const add = (name: string, score: number) => {
    if (!seen.has(name)) {
      seen.add(name);
      results.push({ name, score });
    }
  };

  // 1단계: 포함(contains) 검색 — 실시간 자동완성 핵심
  const containsMatches: { name: string; score: number }[] = [];
  for (const name of candidates) {
    const normalized = normalizeSpaces(name).toLowerCase();
    if (normalized === q) {
      add(name, 1.0);
    } else if (normalized.startsWith(q)) {
      containsMatches.push({ name, score: 0.95 + q.length / name.length * 0.04 });
    } else if (normalized.includes(q)) {
      containsMatches.push({ name, score: 0.9 + q.length / name.length * 0.04 });
    }
  }
  // 시작일치 > 포함일치 순 정렬 후 추가
  containsMatches.sort((a, b) => b.score - a.score);
  for (const m of containsMatches) add(m.name, m.score);

  // 2단계: Levenshtein 유사도 (contains로 못 잡은 것)
  for (const name of candidates) {
    if (seen.has(name)) continue;
    const score = similarity(q, name);
    if (score >= threshold) add(name, score);
  }

  return results.sort((a, b) => b.score - a.score);
}
