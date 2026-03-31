"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Phase = "idle" | "slide-out" | "splash" | "reveal" | "wave-out";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setJustRegistered(new URLSearchParams(window.location.search).get("registered") === "1");
    }
  }, []);

  // 애니메이션 시퀀스
  useEffect(() => {
    if (phase === "slide-out") {
      // 300ms 후 스플래시 시작
      const t1 = setTimeout(() => setPhase("splash"), 300);
      return () => clearTimeout(t1);
    }
    if (phase === "splash") {
      // 500ms 후 텍스트 등장
      const t2 = setTimeout(() => setPhase("reveal"), 500);
      return () => clearTimeout(t2);
    }
    if (phase === "reveal") {
      // 1400ms 후 wave-out 시작
      const t3 = setTimeout(() => setPhase("wave-out"), 1400);
      return () => clearTimeout(t3);
    }
    if (phase === "wave-out") {
      // 애니메이션 시작과 동시에 페이지 이동 — 다크 fill이 화면을 덮는 동안 백그라운드에서 로드
      router.push("/");
      router.refresh();
    }
  }, [phase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
      } else {
        setUserName(data.name ?? "");
        setPhase("slide-out");
      }
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden relative flex items-center justify-center px-4">

      {/* ── 블루 스플래시 원 ──────────────────────────────── */}
      <div
        className="pointer-events-none fixed rounded-full bg-blue-600"
        style={{
          width: "120vmax",
          height: "120vmax",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${phase === "splash" || phase === "reveal" || phase === "wave-out" ? 1 : 0})`,
          transition: phase === "splash"
            ? "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)"
            : "none",
          zIndex: 20,
        }}
      />

      {/* ── 대시보드 색 wave-out (중앙에서 퍼지는 물결 효과) ── */}
      {phase === "wave-out" && (
        <>
          {/* 물결 링 3개 — fill 보다 앞서 퍼지며 파도 느낌 */}
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`pointer-events-none fixed rounded-full animate-dark-ripple-${n}`}
              style={{
                width: "140vmax",
                height: "140vmax",
                backgroundColor: "#1e293b",
                top: "50%",
                left: "50%",
                zIndex: 40,
              }}
            />
          ))}
          {/* 메인 다크 fill — 화면 전체를 덮음 */}
          <div
            className="pointer-events-none fixed rounded-full animate-dark-fill-expand"
            style={{
              width: "140vmax",
              height: "140vmax",
              backgroundColor: "#0f172a",
              top: "50%",
              left: "50%",
              zIndex: 41,
            }}
          />
        </>
      )}

      {/* ── 로그인 폼 ────────────────────────────────────── */}
      <div
        className="w-full max-w-sm relative"
        style={{
          transform: phase === "idle" ? "translateX(0)" : "translateX(-120vw)",
          transition: phase === "slide-out"
            ? "transform 0.4s cubic-bezier(0.55, 0, 1, 0.45)"
            : "none",
          zIndex: 10,
        }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">제조경영 대시보드</h1>
          <p className="text-sm text-slate-400 mt-1">계속하려면 로그인하세요</p>
        </div>

        {justRegistered && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 mb-4 text-center">
            회원가입이 완료되었습니다. 로그인해주세요.
          </div>
        )}

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">이메일</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">비밀번호</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-500"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:text-blue-300/50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
            회원가입
          </Link>
        </p>
      </div>

      {/* ── 스플래시 위에 뜨는 환영 텍스트 ─────────────────── */}
      <div
        className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ zIndex: 30 }}
      >
        {/* 아이콘 */}
        <div
          style={{
            opacity: phase === "reveal" ? 1 : 0,
            transform: phase === "reveal" ? "translateY(0) scale(1)" : "translateY(40px) scale(0.8)",
            transition: phase === "reveal"
              ? "opacity 0.5s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "none",
          }}
        >
          <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-6 mx-auto backdrop-blur-sm">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        {/* 환영 텍스트 */}
        <div
          style={{
            opacity: phase === "reveal" ? 1 : 0,
            transform: phase === "reveal" ? "translateY(0)" : "translateY(30px)",
            transition: phase === "reveal"
              ? "opacity 0.5s ease-out 0.15s, transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1) 0.15s"
              : "none",
            textAlign: "center",
          }}
        >
          <h2 className="text-3xl font-bold text-white">
            {userName ? `${userName}님,` : ""}
          </h2>
          <h2 className="text-3xl font-bold text-white mt-1">환영합니다</h2>
          <p
            className="text-blue-200 text-sm mt-3"
            style={{
              opacity: phase === "reveal" ? 1 : 0,
              transition: phase === "reveal" ? "opacity 0.5s ease-out 0.5s" : "none",
            }}
          >
            제조부문 경영 대시보드로 이동합니다
          </p>
        </div>

        {/* 하단 진행 바 */}
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40 h-0.5 bg-white/20 rounded-full overflow-hidden"
          style={{
            opacity: phase === "reveal" ? 1 : 0,
            transition: phase === "reveal" ? "opacity 0.3s ease-out 0.4s" : "none",
          }}
        >
          <div
            className="h-full bg-white rounded-full"
            style={{
              width: phase === "reveal" ? "100%" : "0%",
              transition: phase === "reveal" ? "width 1.5s ease-in-out 0.5s" : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
