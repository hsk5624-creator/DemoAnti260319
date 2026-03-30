"use client";

import { ReviewItem } from "@/lib/reviewTypes";
import { ProductAnalysis } from "@/lib/analyze";

interface Props {
  review: ReviewItem;
  analysis: ProductAnalysis;
}

type Level = "ok" | "info" | "warning" | "danger";

const STYLE: Record<Level, { color: string; bg: string; border: string; icon: string }> = {
  ok:      { color: "text-[#00733C]", bg: "bg-green-50",  border: "border-green-200",  icon: "✅" },
  info:    { color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-200",  icon: "🟡" },
  warning: { color: "text-orange-600",bg: "bg-orange-50", border: "border-orange-200", icon: "⚠️" },
  danger:  { color: "text-red-600",   bg: "bg-red-50",    border: "border-red-200",    icon: "🔴" },
};

function worstLevel(levels: Level[]): Level {
  if (levels.includes("danger"))  return "danger";
  if (levels.includes("warning")) return "warning";
  if (levels.includes("info"))    return "info";
  return "ok";
}

function parseTs(dateStr: string): number {
  const m = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return 0;
  return new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime();
}

// 비율 기반 수평 게이지 바 (과거 평균 = 50%)
function RatioBar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio * 50, 100);
  const color = ratio > 1.5 ? "#ef4444" : ratio > 1.1 ? "#f59e0b" : "#00733C";
  return (
    <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden mt-2">
      <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10" style={{ left: "50%" }} />
      <div className="absolute top-0 bottom-0 rounded-full transition-all"
        style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
      <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-medium z-20">
        <span className="text-gray-600">과거평균</span>
        <span style={{ color }}>검토 중</span>
      </div>
    </div>
  );
}

// 구매 주기 진행 게이지 바 (avgInterval = 100%)
function TimingBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 120);
  const color = pct >= 80 ? "#00733C" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden mt-2">
      {/* 80% 마커 (권장 구매 시작 기준) */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10" style={{ left: "80%" }} />
      <div className="absolute top-0 bottom-0 rounded-full transition-all"
        style={{ width: `${Math.min(clamped, 100)}%`, background: color, opacity: 0.7 }} />
      <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-medium z-20">
        <span className="text-gray-600">0</span>
        <span style={{ color }}>{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

export default function ReviewComparison({ review, analysis }: Props) {
  const { priceStats, avgHistoryQtyPerPurchase, avgIntervalDays, lastPurchaseDate } = analysis;

  // ── 단가 비교 ──────────────────────────────
  const priceLevel: Level = (() => {
    if (priceStats.avgHistory <= 0) return "ok";
    const ratio = review.unitPrice / priceStats.avgHistory;
    if (ratio > 2.0) return "danger";
    if (ratio > 1.5) return "warning";
    if (ratio > 1.1) return "info";
    return "ok";
  })();
  const priceRatio = priceStats.avgHistory > 0 ? review.unitPrice / priceStats.avgHistory : null;
  const priceDiffPct = priceRatio != null ? Math.round((priceRatio - 1) * 100) : null;

  // ── 수량 비교 ──────────────────────────────
  const qtyLevel: Level = (() => {
    if (avgHistoryQtyPerPurchase <= 0) return "ok";
    const ratio = review.quantity / avgHistoryQtyPerPurchase;
    if (ratio > 2.0) return "danger";
    if (ratio > 1.5) return "warning";
    if (ratio > 1.1) return "info";
    return "ok";
  })();
  const qtyRatio = avgHistoryQtyPerPurchase > 0 ? review.quantity / avgHistoryQtyPerPurchase : null;
  const qtyDiffPct = qtyRatio != null ? Math.round((qtyRatio - 1) * 100) : null;

  // ── 구매 시점 비교 ─────────────────────────
  const lastTs = lastPurchaseDate ? parseTs(lastPurchaseDate) : 0;
  const daysSinceLast = lastTs > 0
    ? Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24))
    : null;
  const cyclePct = (daysSinceLast != null && avgIntervalDays > 0)
    ? Math.round(daysSinceLast / avgIntervalDays * 100)
    : null;
  const timingLevel: Level = (() => {
    if (cyclePct == null) return "ok"; // 계산 불가 → 중립
    if (cyclePct >= 80)  return "ok";
    if (cyclePct >= 50)  return "info";
    if (cyclePct >= 30)  return "warning";
    return "danger";
  })();
  const timingMsg = (() => {
    if (cyclePct == null) return "구매 주기 정보 없음";
    if (cyclePct >= 100) return `평균 주기(${avgIntervalDays}일) 경과 — 적기`;
    if (cyclePct >= 80)  return `평균 주기의 ${cyclePct}% 경과 — 정상 범위`;
    if (cyclePct >= 50)  return `평균 주기의 ${cyclePct}% 경과 — 다소 이름`;
    if (cyclePct >= 30)  return `평균 주기의 ${cyclePct}% 경과 — 조기 구매 주의`;
    return `평균 주기의 ${cyclePct}% 경과 — 매우 이른 구매`;
  })();

  // ── 종합 판정 ──────────────────────────────
  const overallLevel = worstLevel([priceLevel, qtyLevel, timingLevel]);
  const overallStyle = STYLE[overallLevel];

  // 판정 이유 요약
  const reasons: string[] = [];
  if (priceDiffPct != null && priceDiffPct > 10) reasons.push(`단가 +${priceDiffPct}%`);
  if (qtyDiffPct != null && qtyDiffPct > 10)    reasons.push(`수량 +${qtyDiffPct}%`);
  if (cyclePct != null && cyclePct < 80)         reasons.push(`구매주기 ${cyclePct}%`);
  const overallMsg =
    overallLevel === "ok"      ? "단가·수량·구매 시점 모두 이력 기준 적정 수준입니다." :
    overallLevel === "info"    ? `주의 필요 항목: ${reasons.join(", ")}` :
    overallLevel === "warning" ? `경고 — 재검토 권장: ${reasons.join(", ")}` :
                                 `위험 — 면밀한 검토 필요: ${reasons.join(", ")}`;

  return (
    <div className="space-y-3">
      {/* 종합 판정 배너 */}
      <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${overallStyle.bg} ${overallStyle.border}`}>
        <span className="text-2xl">{overallStyle.icon}</span>
        <div>
          <div className={`font-semibold text-sm ${overallStyle.color}`}>
            종합 판정: {overallLevel === "ok" ? "적정" : overallLevel === "info" ? "주의" : overallLevel === "warning" ? "경고" : "위험"}
          </div>
          <div className="text-gray-500 text-xs mt-0.5">{overallMsg}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 단가 비교 */}
        {priceRatio != null ? (
          <div className={`rounded-xl p-4 border ${STYLE[priceLevel].bg} ${STYLE[priceLevel].border}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium">단가 비교</span>
              <span className={`text-xs font-bold ${STYLE[priceLevel].color}`}>
                {STYLE[priceLevel].icon} {priceDiffPct! > 0 ? `+${priceDiffPct}%` : `${priceDiffPct}%`}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-gray-400 text-xs">검토 중</div>
                <div className={`font-bold text-base ${STYLE[priceLevel].color}`}>
                  {review.unitPrice.toLocaleString()}원
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-xs">과거 평균</div>
                <div className="text-gray-600 font-semibold text-sm">
                  {priceStats.avgHistory.toLocaleString()}원
                </div>
              </div>
            </div>
            <RatioBar ratio={priceRatio} />
            <div className="mt-1.5 text-xs text-gray-400">
              범위: {priceStats.minHistory.toLocaleString()} ~ {priceStats.maxHistory.toLocaleString()}원
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-4 border bg-gray-50 border-gray-200">
            <div className="text-xs text-gray-400">단가</div>
            <div className="text-gray-700 font-bold text-base mt-1">{review.unitPrice.toLocaleString()}원</div>
            <div className="text-gray-400 text-xs mt-1">이력 없음 (신규 품목)</div>
          </div>
        )}

        {/* 수량 비교 */}
        {qtyRatio != null ? (
          <div className={`rounded-xl p-4 border ${STYLE[qtyLevel].bg} ${STYLE[qtyLevel].border}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium">수량 비교</span>
              <span className={`text-xs font-bold ${STYLE[qtyLevel].color}`}>
                {STYLE[qtyLevel].icon} {qtyDiffPct! > 0 ? `+${qtyDiffPct}%` : `${qtyDiffPct}%`}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-gray-400 text-xs">검토 중</div>
                <div className={`font-bold text-base ${STYLE[qtyLevel].color}`}>
                  {review.quantity.toLocaleString()}개
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-xs">과거 건당 평균</div>
                <div className="text-gray-600 font-semibold text-sm">
                  {avgHistoryQtyPerPurchase.toLocaleString()}개/건
                </div>
              </div>
            </div>
            <RatioBar ratio={qtyRatio} />
          </div>
        ) : (
          <div className="rounded-xl p-4 border bg-gray-50 border-gray-200">
            <div className="text-xs text-gray-400">수량</div>
            <div className="text-gray-700 font-bold text-base mt-1">{review.quantity.toLocaleString()}개</div>
            <div className="text-gray-400 text-xs mt-1">과거 이력 없음</div>
          </div>
        )}

        {/* 구매 시점 비교 */}
        {cyclePct != null ? (
          <div className={`rounded-xl p-4 border ${STYLE[timingLevel].bg} ${STYLE[timingLevel].border}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium">구매 시점</span>
              <span className={`text-xs font-bold ${STYLE[timingLevel].color}`}>
                {STYLE[timingLevel].icon} 주기의 {cyclePct}%
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-gray-400 text-xs">경과일</div>
                <div className={`font-bold text-base ${STYLE[timingLevel].color}`}>
                  {daysSinceLast}일
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-xs">평균 주기</div>
                <div className="text-gray-600 font-semibold text-sm">
                  {avgIntervalDays}일
                </div>
              </div>
            </div>
            <TimingBar pct={cyclePct} />
            <div className="mt-1.5 text-xs text-gray-400">{timingMsg}</div>
          </div>
        ) : (
          <div className="rounded-xl p-4 border bg-gray-50 border-gray-200">
            <div className="text-xs text-gray-400">구매 시점</div>
            <div className="text-gray-400 text-xs mt-2">주기 계산 불가<br />(이력 1건 이하)</div>
          </div>
        )}
      </div>

      {/* 총금액 메모 */}
      <div className="text-xs text-gray-400 text-right">
        검토 총금액: <span className="font-semibold text-gray-600">{review.amount.toLocaleString()}원</span>
        &nbsp;·&nbsp; 수량: <span className="font-semibold text-gray-600">{review.quantity.toLocaleString()}</span>
        &nbsp;·&nbsp; 단가: <span className="font-semibold text-gray-600">{review.unitPrice.toLocaleString()}원</span>
      </div>
    </div>
  );
}
