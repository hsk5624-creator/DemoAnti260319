import { loadAllRecords } from "@/lib/dataStore";
import { analyzeProduct, OrderType } from "@/lib/analyze";
import { getOrgNode } from "@/lib/orgChart";

function parseDeptTeam(full: string): string {
  const parts = full.split(">>");
  return parts.length >= 2 ? parts[parts.length - 1].trim() : full.trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") ?? "").trim();
  if (!name) return Response.json({ error: "name required" }, { status: 400 });

  const deptParams = searchParams.getAll("dept");     // 팀 full 문자열 (복수 가능)
  const damdang  = searchParams.get("damdang") ?? "";  // 담당 이름
  const bonbu    = searchParams.get("bonbu")   ?? "";  // 본부 이름
  const specParam = searchParams.getAll("spec");       // 규격 exact match (파라미터 반복)
  const ot       = searchParams.get("orderType") ?? "all";

  // 규격 환산계수: sfSpec[]=규격명 + sfFactor[]=계수 쌍으로 전달
  const sfSpecs   = searchParams.getAll("sfSpec");
  const sfFactors = searchParams.getAll("sfFactor");
  const specFactors: Record<string, number> = {};
  sfSpecs.forEach((spec, i) => {
    const f = parseFloat(sfFactors[i] ?? "1");
    if (f > 1) specFactors[spec] = f;
  });
  const hasFactors = Object.keys(specFactors).length > 0;

  const records = loadAllRecords();

  let deptFilter: string | string[] | undefined;

  if (deptParams.length > 0) {
    // 팀 단위 필터 (단일 or 복수)
    deptFilter = deptParams.length === 1 ? deptParams[0] : deptParams;
  } else if (damdang) {
    // 담당 단위: 해당 담당에 속한 full dept 문자열 목록
    deptFilter = records
      .map((r) => r.department)
      .filter((d, i, arr) => arr.indexOf(d) === i) // unique
      .filter((d) => {
        const team = parseDeptTeam(d);
        return getOrgNode(team).damdang === damdang;
      });
  } else if (bonbu) {
    // 본부 단위
    deptFilter = records
      .map((r) => r.department)
      .filter((d, i, arr) => arr.indexOf(d) === i)
      .filter((d) => {
        const team = parseDeptTeam(d);
        return getOrgNode(team).bonbu === bonbu;
      });
  }

  const orderType: OrderType = (ot === "normal" || ot === "advance") ? ot : "all";
  const specFilter = specParam.length > 0 ? specParam : undefined;
  const analysis = analyzeProduct(name, records, deptFilter, specFilter, orderType,
    hasFactors ? specFactors : undefined);
  return Response.json(analysis);
}
