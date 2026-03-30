import { getAllProductNames } from "@/lib/dataStore";
import { fuzzySearch, normalizeSpaces } from "@/lib/fuzzy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q") ?? "";
  const q = normalizeSpaces(raw);

  if (!q || q.length < 2) return Response.json({ exact: [], similar: [] });

  const allNames = getAllProductNames();
  const qNorm = q.toLowerCase();

  // 완전 일치 (띄어쓰기 정규화 후)
  const exactMatch = allNames.filter(
    (n) => normalizeSpaces(n).toLowerCase() === qNorm
  );
  const exactSet = new Set(exactMatch);

  // contains + 유사도 검색 (완전일치 제외, 최대 15개)
  const fuzzyMatches = fuzzySearch(q, allNames, 0.75)
    .filter((m) => !exactSet.has(m.name))
    .slice(0, 15);

  return Response.json({ exact: exactMatch, similar: fuzzyMatches });
}
