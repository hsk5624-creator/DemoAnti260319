"use client";

import { useState, useEffect, useCallback } from "react";

interface Post {
  id: number;
  author_name: string;
  title: string;
  content: string;
  created_at: string;
  page: string;
}

interface Comment {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
}

interface Props {
  page: string;       // "budget" | "sales" | "utilization"
  pageLabel: string;  // "운영예산" | "매출" | "가동률"
  open: boolean;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default function SuggestionBoard({ page, pageLabel, open, onClose }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  // 글 작성
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 상세 보기
  const [selected, setSelected] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suggestions?page=${page}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  const fetchComments = useCallback(async (postId: number) => {
    try {
      const res = await fetch(`/api/suggestions/${postId}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPosts();
      setWriting(false);
      setSelected(null);
    }
  }, [open, fetchPosts]);

  async function handleSubmitPost() {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, title: title.trim(), content: content.trim() }),
      });
      setTitle("");
      setContent("");
      setWriting(false);
      fetchPosts();
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  async function handleSubmitComment() {
    if (!commentText.trim() || !selected) return;
    setCommentSubmitting(true);
    try {
      await fetch(`/api/suggestions/${selected.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      setCommentText("");
      fetchComments(selected.id);
    } catch { /* ignore */ }
    setCommentSubmitting(false);
  }

  async function handleDeletePost(postId: number) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/suggestions/${postId}`, { method: "DELETE" });
    setSelected(null);
    fetchPosts();
  }

  async function handleDeleteComment(commentId: number) {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await fetch(`/api/suggestions/comments/${commentId}`, { method: "DELETE" });
    if (selected) fetchComments(selected.id);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            {(writing || selected) && (
              <button
                onClick={() => { setWriting(false); setSelected(null); }}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                ←
              </button>
            )}
            <h2 className="text-sm font-bold text-white">
              {writing ? "제안 작성" : selected ? selected.title : `개선 제안 — ${pageLabel}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* --- 글 작성 모드 --- */}
          {writing && !selected && (
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="개선 제안 내용을 작성해주세요"
                rows={6}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setWriting(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitPost}
                  disabled={submitting || !title.trim() || !content.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  {submitting ? "등록 중..." : "등록"}
                </button>
              </div>
            </div>
          )}

          {/* --- 글 상세 + 댓글 --- */}
          {selected && !writing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-medium text-slate-300">{selected.author_name}</span>
                    <span>{timeAgo(selected.created_at)}</span>
                  </div>
                  <button
                    onClick={() => handleDeletePost(selected.id)}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                  >
                    삭제
                  </button>
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-xs font-semibold text-slate-400 mb-3">
                  댓글 {comments.length > 0 && <span className="text-blue-400 ml-1">{comments.length}</span>}
                </h3>
                <div className="space-y-3 mb-4">
                  {comments.length === 0 && (
                    <p className="text-xs text-slate-500">아직 댓글이 없습니다.</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="bg-slate-700/30 rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-slate-300">{c.author_name}</span>
                          <span className="text-slate-500">{timeAgo(c.created_at)}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>

                {/* 댓글 입력 */}
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                    placeholder="댓글을 입력하세요"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-700/50 border border-slate-600 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={commentSubmitting || !commentText.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    등록
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- 글 목록 --- */}
          {!writing && !selected && (
            <div className="space-y-2">
              {loading ? (
                <p className="text-xs text-slate-500 text-center py-8">불러오는 중...</p>
              ) : posts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">아직 등록된 제안이 없습니다.</p>
              ) : (
                posts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelected(p); fetchComments(p.id); }}
                    className="w-full text-left bg-slate-700/30 hover:bg-slate-700/60 rounded-xl px-4 py-3 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-slate-200 truncate">{p.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{p.author_name}</span>
                      <span>{timeAgo(p.created_at)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 하단 - 글쓰기 버튼 */}
        {!writing && !selected && (
          <div className="px-5 py-3 border-t border-slate-700">
            <button
              onClick={() => setWriting(true)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              제안 작성하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
