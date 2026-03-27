import { loadAllRecords } from "@/lib/dataStore";
import { getOrgNode } from "@/lib/orgChart";

export interface DeptItem {
  full: string;     // 원본 전체 문자열 (필터 키)
  plant: string;    // 청주공장 / 진천공장 / 기타
  team: string;     // >> 뒤 팀명
  bonbu: string;    // 품질본부 / 생산본부 / 운영지원본부 / 기타
  damdang: string;  // 담당 이름
}

function parseDept(raw: string): { plant: string; team: string } {
  const parts = raw.split(">>");
  if (parts.length >= 2) {
    const p = parts[0].trim();
    const plant = p.includes("청주") ? "청주공장"
                : p.includes("진천") ? "진천공장"
                : "기타";
    return { plant, team: parts[parts.length - 1].trim() };
  }
  return { plant: "기타", team: raw.trim() };
}

export async function GET() {
  const records = loadAllRecords();
  const map = new Map<string, DeptItem>();

  for (const r of records) {
    if (!r.department || map.has(r.department)) continue;
    const { plant, team } = parseDept(r.department);
    const { bonbu, damdang } = getOrgNode(team);
    map.set(r.department, { full: r.department, plant, team, bonbu, damdang });
  }

  const items = [...map.values()].sort((a, b) => {
    if (a.bonbu !== b.bonbu) return a.bonbu.localeCompare(b.bonbu);
    if (a.damdang !== b.damdang) return a.damdang.localeCompare(b.damdang);
    return a.team.localeCompare(b.team);
  });

  return Response.json(items);
}
