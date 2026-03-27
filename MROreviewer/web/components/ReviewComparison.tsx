"use client";

import { ReviewItem } from "@/lib/reviewTypes";
import { ProductAnalysis } from "@/lib/analyze";

interface Props {
  review: ReviewItem;
  analysis: ProductAnalysis;
}

interface CompareResult {
  ratio: number;         // review / history (1.0 = 동일)
  diffPct: number;       // (ratio - 1) * 100
  level: "ok" | "info" | "warning" | "danger";
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}

function getLevel(ratio: number): CompareResult["level"] {
  if (ratio <= 1.1)  return "ok";
  if (ratio <= 1.5)  return "info";
  if (ratio <= 2.0)  return "warning";
  return "danger";
}

const STYLE = {
  ok:      { color: "text-[#00733C]", bg: "bg-green-50",  border: "border-green-200", icon: "✅" },
  info:    { color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-200", icon: "🟡" },
  warning: { color: "text-orange-600",bg: "bg-orange-50", border: "border-orange-200",icon: "⚠️" },
  danger:  { color: "text-red-600",   bg: "bg-red-50",    border: "border-red-200",   icon: "🔴" },
};

function compareValue(reviewVal: number, historyAvg: number, label: string): (CompareResult & { reviewVal: number; historyAvg: number; label: string }) | null {
  if (historyAvg <= 0) return null;
  const ratio = reviewVal / historyAvg;
  const diffPct = Math.round((ratio - 1) * 100);
  const level = getLevel(ratio);
  return { ratio, diffPct, level, label, reviewVal, historyAvg, ...STYLE[level] };
}

function Bar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio * 50, 100); // 과거평균=50%, 200%=100%
  const histPct = 50;
  const reviewColor = ratio > 1.5 ? "#ef4444" : ratio > 1.1 ? "#f59e0b" : "#00733C";

  return (
    <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden mt-2">
      {/* 과거 평균 마커 */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10" style={{ left: `${histPct}%` }} />
      {/* 검토 중인 값 바 */}
      <div className="absolute top-0 bottom-0 rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: reviewColor, opacity: 0.7 }} />
      {/* 라벨 */}
      <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-medium z-20">
        <span className="text-gray-600">과거평균</span>
        <span style={{ color: reviewColor }}>검토 중</span>
      </div>
    </div>
  );
}

export default function ReviewComparison({ review, analysis }: Props) {
  const { priceStats, avgHistoryQtyPerPurchase } = analysis;

  const priceComp = compareValue(review.unitPrice, priceStats.avgHistory, "단가");
  // 수량: 과거 건당 평균 수량과 비교
  const qtyComp = avgHistoryQtyPerPurchase > 0
    ? compareValue(review.quantity, avgHistoryQtyPerPurchase, "수량")
    : null;

  // 종합 판정: 더 심한 쪽 기준
  const levels: CompareResult["level"][] = [
    priceComp?.level ?? "ok",
    qtyComp?.level ?? "ok",
  ];
  const overallLevel: CompareResult["level"] =
    levels.includes("danger") ? "danger" :
    levels.includes("warning") ? "warning" :
    levels.includes("info") ? "info" : "ok";
  const overallStyle = STYLE[overallLevel];

  const overallMsg: Record<CompareResult["level"], string> = {
    ok:      "이력 기준 적정 수준입니다.",
    info:    "이력 대비 다소 높습니다. 추가 확인을 권장합니다.",
    warning: "이력 대비 상당히 높습니다. 사유를 검토하세요.",
    danger:  "이력 대비 크게 높습니다. 면밀한 검토가 필요합니다.",
  };

  return (
    <div className="space-y-3">
      {/* 종합 판정 배너 */}
      <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${overallStyle.bg} ${overallStyle.border}`}>
        <span className="text-2xl">{overallStyle.icon}</span>
        <div>
          <div className={`font-semibold text-sm ${overallStyle.color}`}>
            종합 판정: {overallLevel === "ok" ? "적정" : overallLevel === "info" ? "주의" : overallLevel === "warning" ? "경고" : "위험"}
          </div>
          <div className="text-gray-500 text-xs mt-0.5">{overallMsg[overallLevel]}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 단가 비교 */}
        {priceComp ? (
          <div className={`rounded-xl p-4 border ${priceComp.bg} ${priceComp.border}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium">단가 비교</span>
              <span className={`text-xs font-bold ${priceComp.color}`}>
                {priceComp.icon} {priceComp.diffPct > 0 ? `+${priceComp.diffPct}%` : `${priceComp.diffPct}%`}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-gray-400 text-xs">검토 중인 단가</div>
                <div className={`font-bold text-base ${priceComp.color}`}>
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
            <Bar ratio={priceComp.ratio} />
            <div className="mt-1.5 text-xs text-gray-400">
              과거 범위: {priceStats.minHistory.toLocaleString()} ~ {priceStats.maxHistory.toLocaleString()}원
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
        {qtyComp ? (
          <div className={`rounded-xl p-4 border ${qtyComp.bg} ${qtyComp.border}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium">수량 비교</span>
              <span className={`text-xs font-bold ${qtyComp.color}`}>
                {qtyComp.icon} {qtyComp.diffPct > 0 ? `+${qtyComp.diffPct}%` : `${qtyComp.diffPct}%`}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-gray-400 text-xs">검토 중인 수량</div>
                <div className={`font-bold text-base ${qtyComp.color}`}>
                  {review.quantity.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-xs">과거 건당 평균</div>
                <div className="text-gray-600 font-semibold text-sm">
                  {avgHistoryQtyPerPurchase.toLocaleString()}개/건
                </div>
              </div>
            </div>
            <Bar ratio={qtyComp.ratio} />
          </div>
        ) : (
          <div className="rounded-xl p-4 border bg-gray-50 border-gray-200">
            <div className="text-xs text-gray-400">수량</div>
            <div className="text-gray-700 font-bold text-base mt-1">{review.quantity.toLocaleString()}</div>
            <div className="text-gray-400 text-xs mt-1">과거 이력 없음</div>
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
