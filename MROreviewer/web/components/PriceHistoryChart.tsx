"use client";
import {
  ComposedChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
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

function monthKey(year: number, month: number) {
  return `${year}.${String(month).padStart(2, "0")}`;
}

function tickLabel(key: string) {
  const [y, m] = key.split(".");
  if (m === "01") return `'${y.slice(2)}.01`;
  return m;
}

function parseTs(dateStr: string): number {
  const m = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return 0;
  return new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime();
}

// 전체 월 범위 생성 (x축 뼈대용 — 빈 달 포함)
function buildMonthRange(data: PricePoint[]): string[] {
  if (!data.length) return [];
  const ts = data.map((d) => parseTs(d.orderDate)).filter(Boolean);
  ts.push(Date.now());
  const minD = new Date(Math.min(...ts));
  const maxD = new Date(Math.max(...ts));
  maxD.setMonth(maxD.getMonth() + 1);

  const keys: string[] = [];
  const cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
  const end = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
  while (cur <= end) {
    keys.push(monthKey(cur.getFullYear(), cur.getMonth() + 1));
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs space-y-0.5">
      <div className="font-semibold text-gray-700">{d.orderDate || d.label}</div>
      <div className="text-gray-600">단가: <span className="font-medium">{Number(d.unitPrice).toLocaleString()}원</span></div>
      {d.quantity > 0 && <div className="text-gray-600">수량: <span className="font-medium">{d.quantity}개</span></div>}
      {d.department && <div className="text-gray-500">{d.department}</div>}
    </div>
  );
}

// 검토 중 마커: 커스텀 다이아몬드 심볼
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReviewDot = (props: any) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  const size = 12;
  return (
    <polygon
      points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
      fill="#dc2626"
      stroke="#fff"
      strokeWidth={2}
    />
  );
};

export default function PriceHistoryChart({ data, avgHistory, review }: Props) {
  if (!data.length && !review) return <p className="text-gray-400 text-sm">데이터 없음</p>;

  // 각 데이터 포인트에 월 키 추가
  const history = data
    .filter((d) => d.year !== 2026)
    .map((d) => ({
      ...d,
      mk: monthKey(d.year, d.month),
    }));
  const curr = data
    .filter((d) => d.year === 2026)
    .map((d) => ({
      ...d,
      mk: monthKey(d.year, d.month),
    }));

  // 오늘 월 키
  const now = new Date();
  const todayMk = monthKey(now.getFullYear(), now.getMonth() + 1);

  // x축 전체 월 범위 (빈 달 포함)
  const monthRange = buildMonthRange(data);

  // 검토 중인 건: 오늘 달에 배치
  const reviewData = review
    ? [{ label: "검토중", orderDate: "", mk: todayMk, unitPrice: review.unitPrice, quantity: 0, department: "" }]
    : [];

  // Y축 최대값: 모든 데이터 + 기준선 포함
  const candidates = [
    ...data.map((d) => d.unitPrice),
    review?.unitPrice ?? 0,
    avgHistory * 2,
  ].filter(Boolean);
  const yMax = candidates.length ? Math.max(...candidates) * 1.15 : undefined;

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

          {/* x축: 월별 전체 범위 */}
          <XAxis
            dataKey="mk"
            type="category"
            allowDuplicatedCategory={false}
            ticks={monthRange}
            tickFormatter={tickLabel}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            interval={0}
            height={28}
          />
          <YAxis
            dataKey="unitPrice"
            tickFormatter={fmtKRW}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            domain={[0, yMax ?? "auto"]}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* 기준선 */}
          {avgHistory > 0 && (
            <ReferenceLine y={avgHistory} stroke="#94a3b8" strokeDasharray="4 2"
              label={{ value: `과거평균 ${fmtKRW(avgHistory)}`, fill: "#94a3b8", fontSize: 10, position: "insideTopRight" }} />
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

          {/* 현재 세로선 */}
          <ReferenceLine x={todayMk} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2"
            label={{ value: "▼ 현재", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }} />

          <Scatter name="2024~2025" data={history} dataKey="unitPrice" fill="#00733C" opacity={0.7} />
          <Scatter name="2026" data={curr} dataKey="unitPrice" fill="#f59e0b" opacity={0.9} />
          {reviewData.length > 0 && (
            <Scatter name="검토 중" data={reviewData} dataKey="unitPrice" fill="#dc2626" shape={<ReviewDot />} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
