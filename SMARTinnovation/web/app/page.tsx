"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  loadTimelines, saveTimelines, generateTimelineId,
  TimelineMeta,
} from "@/lib/timelines";
import { isLandingAuthed, setLandingAuthed, isEditAuthed, setEditAuthed } from "@/lib/auth";
import PasswordModal from "@/components/PasswordModal";

export default function LandingPage() {
  const router = useRouter();

  // 인증 상태 (SSR 안전하게 useEffect에서만 읽음)
  const [authed,    setAuthed]    = useState(false);
  const [authReady, setAuthReady] = useState(false);   // 마운트 후 체크 완료 여부

  // 편집 진입 비밀번호 모달
  const [editPwTarget, setEditPwTarget] = useState<TimelineMeta | null>(null);

  const [timelines,     setTimelines]     = useState<TimelineMeta[]>([]);
  const [creating,      setCreating]      = useState(false);
  const [newName,       setNewName]       = useState("");
  const [deleteTarget,  setDeleteTarget]  = useState<TimelineMeta | null>(null);

  useEffect(() => {
    const ok = isLandingAuthed();
    setAuthed(ok);
    setAuthReady(true);
    if (ok) setTimelines(loadTimelines());
  }, []);

  function handleLandingAuth() {
    setLandingAuthed();
    setAuthed(true);
    setTimelines(loadTimelines());
  }

  function handleCreate() {
    if (!newName.trim()) return;
    const id = generateTimelineId();
    const meta: TimelineMeta = { id, name: newName.trim(), createdAt: new Date().toISOString() };
    const updated = [...timelines, meta];
    saveTimelines(updated);
    setTimelines(updated);
    setNewName("");
    setCreating(false);
    router.push(`/timeline/${id}?edit=1`);
  }

  function handleDelete(tl: TimelineMeta) {
    const updated = timelines.filter(t => t.id !== tl.id);
    saveTimelines(updated);
    try { localStorage.removeItem(`smart-timeline-data-${tl.id}`); } catch {}
    setTimelines(updated);
    setDeleteTarget(null);
  }

  function handleEditAuth(tl: TimelineMeta) {
    // 이미 이 세션에서 편집 인증됐으면 바로 이동
    if (isEditAuthed()) {
      router.push(`/timeline/${tl.id}?edit=1`);
    } else {
      setEditPwTarget(tl);
    }
  }

  function handleEditPwSuccess() {
    setEditAuthed();
    const tl = editPwTarget!;
    setEditPwTarget(null);
    router.push(`/timeline/${tl.id}?edit=1`);
  }

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return ""; }
  };

  // 마운트 전엔 아무것도 렌더링하지 않음 (sessionStorage hydration mismatch 방지)
  if (!authReady) return null;

  // ── 비밀번호 게이트 ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#00733C] flex flex-col items-center justify-center">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">SMART Innovation</h1>
          <p className="text-green-200 text-sm mt-1">로드맵 타임라인 대시보드</p>
        </div>
        <PasswordModal
          title="접속 비밀번호 입력"
          description="이 대시보드는 인증된 사용자만 접근할 수 있습니다"
          onSuccess={handleLandingAuth}
        />
      </div>
    );
  }

  // ── 랜딩 페이지 본문 ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-[#00733C] text-white shadow-lg">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">SMART Innovation</h1>
            <p className="text-green-200 text-xs mt-0.5">로드맵 타임라인 대시보드</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* 섹션 헤더 */}
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

        {/* 타임라인 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {timelines.map(tl => (
            <div key={tl.id} className="group relative bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-green-300 transition-all">

              {/* 삭제 버튼 (우상단) */}
              <button
                onClick={e => { e.stopPropagation(); setDeleteTarget(tl); }}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 z-10">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* 카드 본문 — 클릭 시 조회 모드 */}
              <div
                className="p-5 cursor-pointer"
                onClick={() => router.push(`/timeline/${tl.id}`)}>
                <div className="w-10 h-10 rounded-xl bg-[#00733C]/10 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00733C" strokeWidth={2}>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18M8 14h2m4 0h2M8 18h2m4 0h2" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1 truncate pr-6">{tl.name}</h3>
                <p className="text-xs text-gray-400 mb-4">{fmt(tl.createdAt)}</p>

                {/* 모드 안내 배지 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    조회
                  </span>
                </div>
              </div>

              {/* 편집 모드 진입 버튼 — 카드 하단 */}
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
      </main>

      {/* 새 타임라인 생성 모달 */}
      {creating && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setCreating(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">새 타임라인 만들기</h3>
            <input
              autoFocus
              type="text"
              placeholder="타임라인 이름 (예: 2026 제조혁신)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 font-medium">취소</button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#00733C] text-white text-sm font-bold hover:bg-[#005a2e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">만들기</button>
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
              <button
                onClick={() => handleDelete(deleteTarget)}
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
          onSuccess={handleEditPwSuccess}
          onCancel={() => setEditPwTarget(null)}
        />
      )}
    </div>
  );
}
