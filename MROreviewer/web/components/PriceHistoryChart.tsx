"use client";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { PricePoint } from "@/lib/analyze";
import { ReviewItem } from "@/lib/reviewTypes";

interface Props {
  data: PricePoint[];
  avgHistory: number;
  review?: ReviewItem | null;
}

const fmtKRW = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` :
  v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFmt = (v: any) => [`${Number(v).toLocaleString()}원`, "단가"];

// 검토 중 마커: 커스텀 다이아몬드 심볼
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReviewDot = (props: any) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  const size = 12;
  return (
    <g>
      <polygon
        points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
        fill="#dc2626"
        stroke="#fff"
        strokeWidth={2}
      />
    </g>
  );
};

export default function PriceHistoryChart({ data, avgHistory, review }: Props) {
  if (!data.length && !review) return <p className="text-gray-400 text-sm">데이터 없음</p>;

  const history = data.filter((d) => d.year !== 2026);
  const curr = data.filter((d) => d.year === 2026);

  // 검토 중인 건을 차트 마지막 위치에 가상의 x값으로 배치
  const reviewData = review
    ? [{ orderDate: "검토중", unitPrice: review.unitPrice }]
    : [];

  // Y축 최대값: 데이터 + 검토단가 + 기준선(150%/200%) 모두 포함
  const candidates = [
    ...data.map((d) => d.unitPrice),
    review?.unitPrice ?? 0,
    avgHistory * 2,    // 200% 기준선
  ].filter(Boolean);
  const yMax = candidates.length ? Math.max(...candidates) * 1.2 : undefined;

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="orderDate" type="category" tick={{ fill: "#6b7280", fontSize: 10 }}
            interval="preserveStartEnd" />
          <YAxis dataKey="unitPrice" tickFormatter={fmtKRW} tick={{ fill: "#6b7280", fontSize: 11 }}
            domain={[0, yMax ?? "auto"]} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            formatter={tooltipFmt}
          />
          <Legend wrapperStyle={{ color: "#6b7280", fontSize: 12 }} />

          {/* 기준선들 */}
          {avgHistory > 0 && (
            <ReferenceLine y={avgHistory} stroke="#94a3b8" strokeDasharray="4 2"
              label={{ value: `과거평균 ${fmtKRW(avgHistory)}`, fill: "#94a3b8", fontSize: 11, position: "insideTopRight" }} />
          )}
          {avgHistory > 0 && (
            <ReferenceLine y={avgHistory * 1.5} stroke="#f59e0b" strokeDasharray="4 2"
              label={{ value: "⚠ 150%", fill: "#d97706", fontSize: 10, position: "insideTopRight" }} />
          )}
          {avgHistory > 0 && (
            <ReferenceLine y={avgHistory * 2} stroke="#ef4444" strokeDasharray="4 2"
              label={{ value: "🔴 200%", fill: "#dc2626", fontSize: 10, position: "insideTopRight" }} />
          )}

          {/* 검토 중 단가 수평선 */}
          {review && (
            <ReferenceLine y={review.unitPrice} stroke="#dc2626" strokeWidth={2} strokeDasharray="6 3"
              label={{ value: `검토중 ${fmtKRW(review.unitPrice)}`, fill: "#dc2626", fontSize: 11, fontWeight: 700, position: "insideBottomRight" }} />
          )}

          <Scatter name="2024~2025" data={history} fill="#00733C" opacity={0.6} />
          <Scatter name="2026" data={curr} fill="#f59e0b" opacity={0.9} />
          {reviewData.length > 0 && (
            <Scatter name="검토 중" data={reviewData} fill="#dc2626" shape={<ReviewDot />} />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
