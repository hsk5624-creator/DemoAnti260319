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

  const dept     = searchParams.get("dept")    ?? "";  // 팀 full 문자열
  const damdang  = searchParams.get("damdang") ?? "";  // 담당 이름
  const bonbu    = searchParams.get("bonbu")   ?? "";  // 본부 이름
  const spec     = searchParams.get("spec")    ?? "";  // 규격 contains match
  const ot       = searchParams.get("orderType") ?? "all";

  const records = loadAllRecords();

  let deptFilter: string | string[] | undefined;

  if (dept) {
    // 팀 단위 필터
    deptFilter = dept;
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
  const analysis = analyzeProduct(name, records, deptFilter, spec || undefined, orderType);
  return Response.json(analysis);
}
