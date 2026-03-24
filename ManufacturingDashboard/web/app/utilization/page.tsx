'use client';

import Link from 'next/link';

export default function UtilizationDashboard() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
            ← 홈
          </Link>
          <div className="w-px h-4 bg-slate-600" />
          <div>
            <h1 className="text-base font-bold text-white">제조부문 가동률 대시보드</h1>
            <p className="text-xs text-slate-400">Manufacturing Utilization Dashboard</p>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-6xl">🏭</div>
        <h2 className="text-xl font-semibold text-slate-300">준비 중입니다</h2>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          가동률 현황 대시보드를 구성 중입니다.<br />
          곧 업데이트될 예정입니다.
        </p>
        <Link
          href="/"
          className="mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          ← 홈으로 돌아가기
        </Link>
      </main>
    </div>
  );
}
