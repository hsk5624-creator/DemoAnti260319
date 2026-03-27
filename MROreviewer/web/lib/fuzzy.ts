/**
 * Levenshtein 거리 기반 문자열 유사도
 * 반환값: 0.0 ~ 1.0 (1.0 = 완전 일치)
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;

  const dp: number[] = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= lb; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
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
 * candidates 목록 중 query와 유사도 threshold 이상인 항목 반환
 * exact=true 이면 score===1.0 (완전일치)만 반환
 */
export function fuzzySearch(
  query: string,
  candidates: string[],
  threshold = 0.9
): FuzzyMatch[] {
  const q = query.trim();
  const results: FuzzyMatch[] = [];
  for (const name of candidates) {
    const score = similarity(q, name);
    if (score >= threshold) results.push({ name, score });
  }
  return results.sort((a, b) => b.score - a.score);
}
