"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("비밀번호가 올바르지 않습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          {/* 로고 */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#00733C] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">MRO 구매 검토 시스템</h1>
            <p className="text-gray-400 text-xs mt-1">접근 권한이 필요합니다</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoFocus
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm
                  text-gray-900 placeholder-gray-400 focus:outline-none
                  focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C]"
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-[#00733C] hover:bg-[#005a2e] disabled:bg-gray-300
                text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {loading ? "확인 중..." : "로그인"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-300 text-xs mt-6">셀트리온제약</p>
      </div>
    </div>
  );
}
