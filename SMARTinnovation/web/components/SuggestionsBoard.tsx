"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Suggestion {
  id: number;
  title: string;
  content: string;
  author: string;
  status: "접수" | "검토중" | "완료" | "보류";
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  "접수":   "bg-blue-50 text-blue-600 border-blue-200",
  "검토중": "bg-yellow-50 text-yellow-600 border-yellow-200",
  "완료":   "bg-green-50 text-green-600 border-green-200",
  "보류":   "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LIST = ["접수", "검토중", "완료", "보류"] as const;

interface Props {
  timelineId: string;
  editMode: boolean;
}

export default function SuggestionsBoard({ timelineId, editMode }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);

  // 작성 폼
  const [formOpen,  setFormOpen]  = useState(false);
  const [title,     setTitle]     = useState("");
  const [content,   setContent]   = useState("");
  const [author,    setAuthor]    = useState("");
  const [formErr,   setFormErr]   = useState("");

  // 상세 보기
  const [selected, setSelected] = useState<Suggestion | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, [timelineId]);

  async function fetchSuggestions() {
    setLoading(true);
    const { data } = await supabase
      .from("suggestions")
      .select("*")
      .eq("timeline_id", timelineId)
      .order("created_at", { ascending: false });
    setSuggestions((data as Suggestion[]) ?? []);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) { setFormErr("제목과 내용을 입력해주세요"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("suggestions").insert({
      timeline_id: timelineId,
      title:   title.trim(),
      content: content.trim(),
      author:  author.trim() || "익명",
      status:  "접수",
    });
    if (error) { setFormErr("저장 실패: " + error.message); setSubmitting(false); return; }
    setTitle(""); setContent(""); setAuthor(""); setFormErr("");
    setFormOpen(false);
    setSubmitting(false);
    fetchSuggestions();
  }

  async function handleStatusChange(id: number, status: string) {
    await supabase.from("suggestions").update({ status }).eq("id", id);
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: status as Suggestion["status"] } : s));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as Suggestion["status"] } : null);
  }

  async function handleDelete(id: number) {
    await supabase.from("suggestions").delete().eq("id", id);
    setSuggestions(prev => prev.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">개선제안 게시판</h2>
          <p className="text-xs text-gray-400 mt-0.5">아이디어와 개선사항을 자유롭게 제안해주세요</p>
        </div>
        <button
          onClick={() => { setFormOpen(true); setFormErr(""); }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00733C] text-white text-xs font-semibold hover:bg-[#005a2e] transition-colors shadow-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          제안하기
        </button>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-16 text-sm text-gray-400">불러오는 중...</div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-sm text-gray-400 font-medium">아직 제안이 없습니다</p>
          <p className="text-xs text-gray-300 mt-1">첫 번째 개선제안을 남겨보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map(s => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-green-300 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status]}`}>
                    {s.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 truncate">{s.title}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">{s.content}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-400">{s.author}</p>
                <p className="text-[10px] text-gray-300">{fmt(s.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 작성 모달 */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setFormOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-gray-900 mb-4">개선제안 작성</h3>
            <label className="text-xs font-medium text-gray-500 mb-1 block">제목 *</label>
            <input
              autoFocus
              type="text"
              placeholder="제안 제목을 입력해주세요"
              value={title}
              onChange={e => { setTitle(e.target.value); setFormErr(""); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 mb-3"
            />
            <label className="text-xs font-medium text-gray-500 mb-1 block">내용 *</label>
            <textarea
              placeholder="구체적인 내용을 작성해주세요"
              value={content}
              onChange={e => { setContent(e.target.value); setFormErr(""); }}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 mb-3 resize-none"
            />
            <label className="text-xs font-medium text-gray-500 mb-1 block">작성자 <span className="text-gray-400 font-normal">(선택)</span></label>
            <input
              type="text"
              placeholder="이름 또는 닉네임 (미입력 시 익명)"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 mb-4"
            />
            {formErr && <p className="text-xs text-red-500 mb-2">{formErr}</p>}
            <div className="flex gap-2">
              <button onClick={() => setFormOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 font-medium">취소</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-[#00733C] text-white text-sm font-bold hover:bg-[#005a2e] disabled:opacity-50 transition-colors">
                {submitting ? "저장 중..." : "제출"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[selected.status]} mr-2`}>
                  {selected.status}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-2">{selected.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selected.author} · {fmt(selected.created_at)}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="text-gray-300 hover:text-gray-500 text-xl leading-none ml-3">×</button>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-3 mb-4">
              {selected.content}
            </p>

            {/* 편집 모드: 상태 변경 + 삭제 */}
            {editMode && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">상태 변경</p>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {STATUS_LIST.map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selected.id, st)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all
                        ${selected.status === st
                          ? STATUS_STYLES[st] + " ring-1 ring-offset-1 ring-current"
                          : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300"}`}>
                      {st}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { if (confirm("이 제안을 삭제할까요?")) handleDelete(selected.id); }}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors">
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
