import Link from 'next/link';

const DASHBOARDS = [
  {
    href: '/budget',
    icon: '💰',
    title: '제조부문 운영예산 대시보드',
    titleEn: 'Operations Budget Dashboard',
    description: '연간 사업계획 대비 예산 집행 현황을 조직별·계정별로 모니터링합니다.',
    tags: ['집행률', '계획대비', '조직별 현황', '계정별 차트'],
    color: 'blue',
    ready: true,
  },
  {
    href: '/sales',
    icon: '📈',
    title: '제조부문 매출 대시보드',
    titleEn: 'Sales Dashboard',
    description: '제조부문 매출 목표 대비 실적 및 추이를 확인합니다.',
    tags: ['매출실적', '목표달성률', '월별 추이'],
    color: 'emerald',
    ready: true,
  },
  {
    href: '/utilization',
    icon: '🏭',
    title: '제조부문 가동률 대시보드',
    titleEn: 'Utilization Dashboard',
    description: '설비 및 라인별 가동률 현황과 비가동 원인을 분석합니다.',
    tags: ['가동률', '비가동 분석', '설비별 현황'],
    color: 'violet',
    ready: false,
  },
];

const COLOR_MAP: Record<string, { border: string; iconBg: string; tag: string; badge: string }> = {
  blue:    { border: 'hover:border-blue-500/60',   iconBg: 'bg-blue-500/10',   tag: 'bg-blue-500/10 text-blue-300',   badge: 'bg-blue-500/20 text-blue-300' },
  emerald: { border: 'hover:border-emerald-500/60', iconBg: 'bg-emerald-500/10', tag: 'bg-emerald-500/10 text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  violet:  { border: 'hover:border-violet-500/60',  iconBg: 'bg-violet-500/10',  tag: 'bg-violet-500/10 text-violet-300',  badge: 'bg-violet-500/20 text-violet-300' },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-4">
          <h1 className="text-lg font-bold text-white">제조부문 경영 대시보드</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manufacturing Management Dashboard</p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 tracking-wide uppercase">대시보드 선택</h2>
          <p className="text-xs text-slate-600 mt-1">원하는 대시보드를 선택하세요</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DASHBOARDS.map((d) => {
            const c = COLOR_MAP[d.color];
            return (
              <Link
                key={d.href}
                href={d.href}
                className={`group bg-slate-800 border border-slate-700 ${c.border} rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:bg-slate-750 hover:shadow-xl hover:-translate-y-0.5`}
              >
                {/* 아이콘 + 상태 */}
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center text-2xl`}>
                    {d.icon}
                  </div>
                  {d.ready ? (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>운영중</span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-500">준비중</span>
                  )}
                </div>

                {/* 제목 */}
                <div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors leading-snug">
                    {d.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{d.titleEn}</p>
                </div>

                {/* 설명 */}
                <p className="text-sm text-slate-400 leading-relaxed flex-1">{d.description}</p>

                {/* 태그 */}
                <div className="flex flex-wrap gap-1.5">
                  {d.tags.map((tag) => (
                    <span key={tag} className={`text-[11px] px-2 py-0.5 rounded-full ${c.tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 진입 링크 */}
                <div className="flex items-center justify-end text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                  {d.ready ? '대시보드 열기' : '준비 중'} →
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
