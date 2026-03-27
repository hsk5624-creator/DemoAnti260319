import { getAllProductNames } from "@/lib/dataStore";
import { fuzzySearch } from "@/lib/fuzzy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) return Response.json({ exact: [], similar: [] });

  const allNames = getAllProductNames();

  // 완전 일치
  const exactMatch = allNames.filter((n) => n === q);

  // 90% 이상 유사 (완전일치 제외)
  const fuzzyMatches = fuzzySearch(q, allNames, 0.9)
    .filter((m) => m.score < 1.0)
    .slice(0, 20);

  return Response.json({ exact: exactMatch, similar: fuzzyMatches });
}
