"use client";

import { useState } from "react";
import { Level1Item, Level2Item, TaskStatus, CATEGORY_COLORS, generateId, formatWDate } from "@/lib/types";

interface Props {
  items: Level1Item[];
  onAddLevel1: (item: Level1Item) => void;
  onAddLevel2: (parentId: string, child: Level2Item) => void;
}

export default function TimelineForm({ items, onAddLevel1, onAddLevel2 }: Props) {
  const [level, setLevel] = useState<1 | 2>(1);

  const [l1Name, setL1Name] = useState("");
  const [l1Assignee, setL1Assignee] = useState("");
  const [l1Status, setL1Status] = useState<TaskStatus>("planned");

  const [l2ParentId, setL2ParentId] = useState("");
  const [l2Name, setL2Name] = useState("");
  const [l2StartM, setL2StartM] = useState("");
  const [l2StartW, setL2StartW] = useState(1);
  const [l2EndM, setL2EndM] = useState("");
  const [l2EndW, setL2EndW] = useState(4);
  const [l2Assignee, setL2Assignee] = useState("");
  const [l2Status, setL2Status] = useState<TaskStatus>("planned");
  const [l2ShowOnLevel1, setL2ShowOnLevel1] = useState(false);

  const handleSubmitL1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!l1Name.trim()) return;
    onAddLevel1({
      id: generateId(), name: l1Name.trim(),
      color: CATEGORY_COLORS[items.length % CATEGORY_COLORS.length],
      assignee: l1Assignee.trim(), status: l1Status, children: [],
    });
    setL1Name(""); setL1Assignee(""); setL1Status("planned");
  };

  const handleSubmitL2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!l2ParentId || !l2Name.trim() || !l2StartM || !l2EndM) return;
    const [sy, sm] = l2StartM.split("-").map(Number);
    const [ey, em] = l2EndM.split("-").map(Number);
    onAddLevel2(l2ParentId, {
      id: generateId(), parentId: l2ParentId, name: l2Name.trim(),
      startDate: formatWDate({ year: sy, month: sm, week: l2StartW }),
      endDate: formatWDate({ year: ey, month: em, week: l2EndW }),
      assignee: l2Assignee.trim(), status: l2Status, showOnLevel1: l2ShowOnLevel1,
    });
    setL2Name(""); setL2StartM(""); setL2StartW(1); setL2EndM(""); setL2EndW(4);
    setL2Assignee(""); setL2Status("planned"); setL2ShowOnLevel1(false);
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C] outline-none bg-white";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 mb-4">과제 추가</h3>

      {/* Level 탭 */}
      <div className="flex rounded-lg border border-gray-100 p-0.5 mb-5 bg-gray-50">
        {([1, 2] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLevel(l)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              level === l ? "bg-white text-[#00733C] shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}>
            Lv{l} {l === 1 ? "그룹 과제" : "세부 과제"}
          </button>
        ))}
      </div>

      {level === 1 && (
        <form onSubmit={handleSubmitL1} className="space-y-3">
          <Field label="그룹명">
            <input value={l1Name} onChange={(e) => setL1Name(e.target.value)}
              placeholder="예: MES, CMMS, NIR..." className={inputCls} required />
          </Field>
          <Field label="담당자">
            <input value={l1Assignee} onChange={(e) => setL1Assignee(e.target.value)}
              placeholder="담당자명 (선택)" className={inputCls} />
          </Field>
          <Field label="상태">
            <StatusSelect value={l1Status} onChange={setL1Status} />
          </Field>
          <p className="text-[10px] text-gray-400 pb-1">※ 일정 범위는 세부 과제 기준으로 자동 계산됩니다.</p>
          <SubmitBtn>그룹 과제 추가</SubmitBtn>
        </form>
      )}

      {level === 2 && (
        <form onSubmit={handleSubmitL2} className="space-y-3">
          <Field label="상위 그룹 (Lv1)">
            <select value={l2ParentId} onChange={(e) => setL2ParentId(e.target.value)} className={inputCls} required>
              <option value="">선택하세요</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {items.length === 0 && <p className="text-[11px] text-amber-500 mt-1">먼저 Lv1 그룹 과제를 추가하세요.</p>}
          </Field>
          <Field label="세부 과제명">
            <input value={l2Name} onChange={(e) => setL2Name(e.target.value)}
              placeholder="예: URS 작성, 업체 선정..." className={inputCls} required />
          </Field>

          {/* 시작일: 월 + 주 */}
          <Field label="시작일">
            <div className="space-y-1.5">
              <input type="month" value={l2StartM} onChange={(e) => setL2StartM(e.target.value)} className={inputCls} required />
              <WeekPicker value={l2StartW} onChange={setL2StartW} />
            </div>
          </Field>

          {/* 종료일: 월 + 주 */}
          <Field label="종료일">
            <div className="space-y-1.5">
              <input type="month" value={l2EndM} onChange={(e) => setL2EndM(e.target.value)} className={inputCls} required />
              <WeekPicker value={l2EndW} onChange={setL2EndW} />
            </div>
          </Field>

          <Field label="담당자">
            <input value={l2Assignee} onChange={(e) => setL2Assignee(e.target.value)}
              placeholder="담당자명 (선택)" className={inputCls} />
          </Field>
          <Field label="상태">
            <StatusSelect value={l2Status} onChange={setL2Status} />
          </Field>

          <label className="flex items-start gap-2.5 cursor-pointer group pt-1">
            <input type="checkbox" checked={l2ShowOnLevel1} onChange={(e) => setL2ShowOnLevel1(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#00733C] cursor-pointer" />
            <div>
              <span className="text-xs font-medium text-gray-700 group-hover:text-[#00733C] transition-colors">
                Lv1 차트에 과제명 표시
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">Lv1 타임라인 바에 마일스톤으로 함께 표시됩니다.</p>
            </div>
          </label>

          <SubmitBtn>세부 과제 추가</SubmitBtn>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function WeekPicker({ value, onChange }: { value: number; onChange: (w: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4].map((w) => (
        <button key={w} type="button" onClick={() => onChange(w)}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all ${
            value === w
              ? "bg-[#00733C] text-white border-[#00733C] shadow-sm"
              : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
          }`}>
          {w}W
        </button>
      ))}
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as TaskStatus)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C] outline-none bg-white">
      <option value="planned">예정</option>
      <option value="in-progress">진행중</option>
      <option value="completed">완료</option>
      <option value="critical">핵심 마일스톤</option>
    </select>
  );
}

function SubmitBtn({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit"
      className="w-full bg-[#00733C] hover:bg-[#005a2e] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1">
      {children}
    </button>
  );
}
