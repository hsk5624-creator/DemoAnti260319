"use client";
import { BONBU_ORDER, DAMDANG_BY_BONBU } from "@/lib/orgChart";

export interface DeptItem {
  full: string;
  plant: string;
  team: string;
  bonbu: string;
  damdang: string;
}

export interface DeptFilter {
  bonbu: string;    // "" = 전체
  damdang: string;  // "" = 전체
  dept: string;     // "" = 전체 (full 문자열)
}

interface Props {
  depts: DeptItem[];
  filter: DeptFilter;
  onChange: (f: DeptFilter) => void;
}

const BONBU_COLOR: Record<string, string> = {
  "품질본부":     "bg-blue-600  hover:bg-blue-700",
  "생산본부":     "bg-[#00733C] hover:bg-[#005a2e]",
  "운영지원본부": "bg-purple-600 hover:bg-purple-700",
  "기타":         "bg-gray-500  hover:bg-gray-600",
};
const BONBU_COLOR_INACTIVE: Record<string, string> = {
  "품질본부":     "hover:bg-blue-50   hover:text-blue-700",
  "생산본부":     "hover:bg-green-50  hover:text-[#005a2e]",
  "운영지원본부": "hover:bg-purple-50 hover:text-purple-700",
  "기타":         "hover:bg-gray-100  hover:text-gray-700",
};

function Tab({
  label, active, color, inactiveColor, onClick,
}: {
  label: string; active: boolean;
  color: string; inactiveColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
        ${active ? `${color} text-white` : `text-gray-500 ${inactiveColor}`}`}
    >
      {label}
    </button>
  );
}

function SmallTab({
  label, active, onClick,
}: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
        ${active
          ? "bg-[#00733C] text-white"
          : "text-gray-400 hover:text-[#00733C] hover:bg-green-50"
        }`}
    >
      {label}
    </button>
  );
}

export default function DeptFilter({ depts, filter, onChange }: Props) {
  const { bonbu, damdang, dept } = filter;

  // 현재 데이터에 존재하는 본부 목록
  const activeBonbus = BONBU_ORDER.filter((b) => depts.some((d) => d.bonbu === b));

  // 선택된 본부 내 담당 목록 (실제 데이터에 존재하는 것만)
  const damdangList = bonbu
    ? (DAMDANG_BY_BONBU[bonbu] ?? []).filter((dm) => depts.some((d) => d.damdang === dm))
    : [];

  // 선택된 담당 내 팀 목록
  const teamList = damdang
    ? depts.filter((d) => d.damdang === damdang).sort((a, b) => a.team.localeCompare(b.team))
    : [];

  // 현재 선택된 레이블
  const activeTeam = depts.find((d) => d.full === dept);

  function setBonbu(val: string) {
    onChange({ bonbu: val, damdang: "", dept: "" });
  }
  function setDamdang(val: string) {
    onChange({ bonbu, damdang: val, dept: "" });
  }
  function setDept(val: string) {
    onChange({ bonbu, damdang, dept: val === dept ? "" : val });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">

      {/* ── 1단계: 본부 ──────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 flex-wrap">
        <Tab
          label="전체"
          active={bonbu === ""}
          color="bg-gray-700 hover:bg-gray-800"
          inactiveColor="hover:bg-gray-100 hover:text-gray-700"
          onClick={() => onChange({ bonbu: "", damdang: "", dept: "" })}
        />
        {activeBonbus.map((b) => (
          <Tab
            key={b}
            label={b}
            active={bonbu === b}
            color={BONBU_COLOR[b] ?? "bg-gray-500"}
            inactiveColor={BONBU_COLOR_INACTIVE[b] ?? "hover:bg-gray-100"}
            onClick={() => setBonbu(bonbu === b ? "" : b)}
          />
        ))}
      </div>

      {/* ── 2단계: 담당 (본부 선택 시) ──── */}
      {damdangList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
          <SmallTab label="전체 담당" active={damdang === ""} onClick={() => setDamdang("")} />
          {damdangList.map((dm) => (
            <SmallTab
              key={dm}
              label={dm}
              active={damdang === dm}
              onClick={() => setDamdang(damdang === dm ? "" : dm)}
            />
          ))}
        </div>
      )}

      {/* ── 3단계: 팀 (담당 선택 시) ────── */}
      {teamList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
          <SmallTab label="전체 팀" active={dept === ""} onClick={() => setDept("")} />
          {teamList.map((d) => (
            <SmallTab
              key={d.full}
              label={d.team}
              active={dept === d.full}
              onClick={() => setDept(d.full)}
            />
          ))}
        </div>
      )}

      {/* ── 현재 필터 뱃지 ────────────────── */}
      {(bonbu || damdang || dept) && (
        <div className="flex items-center gap-1.5 pt-1 flex-wrap text-xs">
          <span className="text-gray-400">필터:</span>
          {bonbu && (
            <span className={`rounded-full px-2.5 py-0.5 text-white text-xs ${BONBU_COLOR[bonbu]?.split(" ")[0] ?? "bg-gray-500"}`}>
              {bonbu}
            </span>
          )}
          {damdang && (
            <span className="bg-green-50 text-[#00733C] border border-[#b3d9c6] rounded-full px-2.5 py-0.5">
              {damdang}
            </span>
          )}
          {dept && (
            <span className="bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5">
              {activeTeam?.team ?? dept}
            </span>
          )}
          <button
            onClick={() => onChange({ bonbu: "", damdang: "", dept: "" })}
            className="text-gray-300 hover:text-gray-500 ml-0.5"
          >
            × 초기화
          </button>
        </div>
      )}
    </div>
  );
}
