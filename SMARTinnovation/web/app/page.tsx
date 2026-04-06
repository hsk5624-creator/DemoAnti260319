"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  loadTimelines, createTimeline, updateTimelineName, deleteTimeline,
  generateTimelineId, TimelineMeta,
} from "@/lib/timelines";
import {
  isLandingAuthed, setLandingAuthed, isEditAuthed, setEditAuthed,
  checkTimelineEditPassword, getEditorName, setEditorName,
} from "@/lib/auth";
import PasswordModal from "@/components/PasswordModal";

export default function LandingPage() {
  const router = useRouter();

  const [authed,    setAuthed]    = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [tlLoading, setTlLoading] = useState(false);

  const [editPwTarget, setEditPwTarget] = useState<TimelineMeta | null>(null);

  const [timelines,     setTimelines]     = useState<TimelineMeta[]>([]);
  const [creating,      setCreating]      = useState(false);
  const [newName,       setNewName]       = useState("");
  const [newEditPw,     setNewEditPw]     = useState("");
  const [deleteTarget,  setDeleteTarget]  = useState<TimelineMeta | null>(null);
  const [renameTarget,  setRenameTarget]  = useState<TimelineMeta | null>(null);
  const [renameName,    setRenameName]    = useState("");

  useEffect(() => {
    const ok = isLandingAuthed();
    setAuthed(ok);
    setAuthReady(true);
    if (ok) fetchTimelines();
  }, []);

  async function fetchTimelines() {
    setTlLoading(true);
    const list = await loadTimelines();
    setTimelines(list);
    setTlLoading(false);
  }

  function handleLandingAuth() {
    setLandingAuthed();
    setAuthed(true);
    fetchTimelines();
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const id   = generateTimelineId();
    const meta: TimelineMeta = {
      id,
      name:      newName.trim(),
      createdAt: new Date().toISOString(),
      ...(newEditPw.trim() ? { editPassword: newEditPw.trim() } : {}),
    };
    await createTimeline(meta);
    setNewName(""); setNewEditPw(""); setCreating(false);
    setTimelines(prev => [...prev, meta]);
    router.push(`/timeline/${id}?edit=1`);
  }

  async function handleDelete(tl: TimelineMeta) {
    await deleteTimeline(tl.id);
    setTimelines(prev => prev.filter(t => t.id !== tl.id));
    setDeleteTarget(null);
  }

  function handleRenameOpen(tl: TimelineMeta) {
    setRenameTarget(tl);
    setRenameName(tl.name);
  }

  async function handleRenameConfirm() {
    if (!renameTarget || !renameName.trim()) return;
    await updateTimelineName(renameTarget.id, renameName.trim());
    setTimelines(prev => prev.map(t => t.id === renameTarget.id ? { ...t, name: renameName.trim() } : t));
    setRenameTarget(null);
  }

  function handleEditAuth(tl: TimelineMeta) {
    if (isEditAuthed()) {
      router.push(`/timeline/${tl.id}?edit=1`);
    } else {
      setEditPwTarget(tl);
    }
  }

  function handleEditPwSuccess(editorName?: string) {
    setEditAuthed();
    if (editorName) setEditorName(editorName);
    const tl = editPwTarget!;
    setEditPwTarget(null);
    router.push(`/timeline/${tl.id}?edit=1`);
  }

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return ""; }
  };

  const fmtDateTime = (iso: string) => {
    try { return new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  if (!authReady) return null;

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#00733C] flex flex-col items-center justify-center">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">프로젝트 타임라인 관리 시스템</h1>
          <p className="text-green-200 text-sm mt-1">시스템 문의 : 운영지원팀 김형수 대리(내선 2239)</p>
        </div>
        <PasswordModal
          title="접속 비밀번호 입력"
          description="이 대시보드는 인증된 사용자만 접근할 수 있습니다"
          onSuccess={handleLandingAuth}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#00733C] text-white shadow-lg">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">프로젝트 타임라인 관리 시스템</h1>
            <p className="text-green-200 text-xs mt-0.5">시스템 문의 : 운영지원팀 김형수 대리(내선 2239)</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">타임라인 목록</h2>
            <p className="text-sm text-gray-500 mt-0.5">카드 클릭 → 조회 &nbsp;·&nbsp; 🔑 버튼 클릭 → 편집 모드</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00733C] text-white text-sm font-semibold hover:bg-[#005a2e] transition-colors shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            새 타임라인
          </button>
        </div>

        {tlLoading ? (
          <div className="text-center py-20 text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {timelines.map(tl => (
              <div key={tl.id} className="group relative bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-green-300 transition-all">

                {/* 우상단 액션 버튼 */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                  <button
                    onClick={e => { e.stopPropagation(); handleRenameOpen(tl); }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-400 hover:bg-blue-50 transition-all"
                    title="이름 수정">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(tl); }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                    title="삭제">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* 카드 본문 */}
                <div className="p-5 cursor-pointer" onClick={() => router.push(`/timeline/${tl.id}`)}>
                  <div className="w-10 h-10 rounded-xl bg-[#00733C]/10 flex items-center justify-center mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00733C" strokeWidth={2}>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18M8 14h2m4 0h2M8 18h2m4 0h2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1 truncate pr-14">{tl.name}</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    {tl.lastEditedAt
                      ? <span>마지막 편집 {fmtDateTime(tl.lastEditedAt)}</span>
                      : <span>생성일 {fmtDate(tl.createdAt)}</span>
                    }
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      조회
                    </span>
                    {tl.editingBy && (
                      <span className="text-[10px] font-medium text-orange-500 bg-orange-50 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
                        {(() => {
                          const name = tl.editingBy.replace(/\s*\([^)]+\)$/, "").trim();
                          const isSessionId = !name || /^usr-/.test(name);
                          return `${isSessionId ? "(이름없음)" : name} 편집중`;
                        })()}
                      </span>
                    )}
                    {tl.editPassword && (
                      <span className="text-[10px] font-medium text-indigo-400 bg-indigo-50 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        별도 비번
                      </span>
                    )}
                  </div>
                </div>

                {/* 편집 모드 진입 */}
                <div className="border-t border-gray-100 px-5 py-2.5">
                  <button
                    onClick={e => { e.stopPropagation(); handleEditAuth(tl); }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg py-1.5 transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    편집 모드로 진입
                  </button>
                </div>
              </div>
            ))}

            {timelines.length === 0 && (
              <div
                onClick={() => setCreating(true)}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-green-300 hover:bg-green-50/30 transition-all min-h-[140px]">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 font-medium">첫 타임라인 만들기</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 새 타임라인 생성 모달 */}
      {creating && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setCreating(false); setNewName(""); setNewEditPw(""); } }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">새 타임라인 만들기</h3>
            <label className="text-xs font-medium text-gray-500 mb-1 block">타임라인 이름</label>
            <input
              autoFocus type="text" placeholder="예: 2026 제조혁신"
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setCreating(false); setNewName(""); setNewEditPw(""); } }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 mb-4"
            />
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              편집 비밀번호 <span className="text-gray-400 font-normal">(선택 · 미입력 시 전역 비밀번호 사용)</span>
            </label>
            <input
              type="password" placeholder="이 타임라인만의 편집 비밀번호"
              value={newEditPw} onChange={e => setNewEditPw(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setCreating(false); setNewName(""); setNewEditPw(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 font-medium">취소</button>
              <button onClick={handleCreate} disabled={!newName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#00733C] text-white text-sm font-bold hover:bg-[#005a2e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* 이름 수정 모달 */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setRenameTarget(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">타임라인 이름 수정</h3>
            <input
              autoFocus type="text" value={renameName}
              onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleRenameConfirm(); if (e.key === "Escape") setRenameTarget(null); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setRenameTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 font-medium">취소</button>
              <button onClick={handleRenameConfirm} disabled={!renameName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#00733C] text-white text-sm font-bold hover:bg-[#005a2e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">타임라인 삭제</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-semibold text-gray-800">"{deleteTarget.name}"</span>을 삭제하면 모든 데이터가 사라집니다. 계속할까요?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 font-medium">취소</button>
              <button onClick={() => handleDelete(deleteTarget)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 편집 모드 비밀번호 모달 */}
      {editPwTarget && (
        <PasswordModal
          title="편집 모드 진입"
          description={`"${editPwTarget.name}" 편집 권한을 확인합니다`}
          showCancel
          showName
          defaultName={getEditorName()}
          checkFn={pw => checkTimelineEditPassword(pw, editPwTarget.editPassword)}
          onSuccess={handleEditPwSuccess}
          onCancel={() => setEditPwTarget(null)}
        />
      )}
    </div>
  );
}
