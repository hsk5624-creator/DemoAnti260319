"use client";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { MonthlyPoint, PurchaseEvent } from "@/lib/analyze";
import { ReviewItem } from "@/lib/reviewTypes";

interface Props {
  data: MonthlyPoint[];
  events: PurchaseEvent[];
  review?: ReviewItem | null;
  avgIntervalDays?: number;
  lastPurchaseDate?: string;
}

const BAR_COLOR: Record<number, string> = { 2024: "#86c9a8", 2025: "#00733C", 2026: "#f59e0b" };

const fmtKRW = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` :
  v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v);

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// 축 표시: 1월이면 "'YY.01", 나머지는 "MM"
function tickLabel(key: string) {
  const [y, m] = key.split("-");
  if (m === "01") return `'${y.slice(2)}.01`;
  return m;
}

interface Bucket {
  key: string;         // "2024-01" — 유니크 (x축 dataKey)
  year: number;
  month: number;
  totalAmount: number;
  reviewAmount: number; // 검토 중인 건 금액 (오늘 달에만)
  count: number;
  hasPurchase: boolean;
}

function parseTs(dateStr: string): number {
  const m = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return 0;
  return new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime();
}

function buildBuckets(
  data: MonthlyPoint[],
  events: PurchaseEvent[],
  expectedNextTs: number | null,
  reviewAmount: number,
): Bucket[] {
  const map = new Map<string, MonthlyPoint>();
  for (const d of data) map.set(d.label, d);

  // 범위: 이벤트 첫 달 ~ max(오늘, 예상다음구매)+2달
  const allTs = events.map((e) => e.timestamp);
  allTs.push(Date.now());
  if (expectedNextTs) allTs.push(expectedNextTs);
  const minD = new Date(Math.min(...allTs));
  const maxD = new Date(Math.max(...allTs));
  maxD.setMonth(maxD.getMonth() + 2);

  const now = new Date();
  const todayKey_ = monthKey(now.getFullYear(), now.getMonth() + 1);

  const buckets: Bucket[] = [];
  const cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
  const end = new Date(maxD.getFullYear(), maxD.getMonth(), 1);

  while (cur <= end) {
    const y = cur.getFullYear();
    const mo = cur.getMonth() + 1;
    const k = monthKey(y, mo);
    const d = map.get(k);
    buckets.push({
      key: k,
      year: y,
      month: mo,
      totalAmount: d?.totalAmount ?? 0,
      reviewAmount: k === todayKey_ ? reviewAmount : 0,
      count: d?.count ?? 0,
      hasPurchase: !!d,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return buckets;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as Bucket | undefined;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs space-y-0.5">
      <div className="font-semibold text-gray-700">{d.key}</div>
      {d.hasPurchase ? (
        <>
          <div className="text-gray-600">총금액: <span className="font-medium">{d.totalAmount.toLocaleString()}원</span></div>
          <div className="text-gray-600">구매건수: <span className="font-medium">{d.count}건</span></div>
        </>
      ) : (
        <div className="text-gray-400">구매 없음</div>
      )}
      {d.reviewAmount > 0 && (
        <div className="text-red-600 font-semibold border-t border-gray-100 pt-0.5 mt-0.5">
          검토 중: {d.reviewAmount.toLocaleString()}원
        </div>
      )}
    </div>
  );
}

export default function AmountTrendChart({ data, events, review, avgIntervalDays, lastPurchaseDate }: Props) {
  if (!data.length) return <p className="text-gray-400 text-sm">데이터 없음</p>;

  // 예상 다음 구매 시점
  const lastTs = lastPurchaseDate ? parseTs(lastPurchaseDate) : 0;
  const expectedNextTs = lastTs && avgIntervalDays && avgIntervalDays > 0
    ? lastTs + avgIntervalDays * 24 * 60 * 60 * 1000
    : null;
  const expectedKey = expectedNextTs
    ? monthKey(new Date(expectedNextTs).getFullYear(), new Date(expectedNextTs).getMonth() + 1)
    : null;

  const buckets = buildBuckets(data, events, expectedNextTs, review?.amount ?? 0);

  // 과거 월평균 금액 (구매 있는 달만)
  const historyData = buckets.filter((b) => b.year !== 2026 && b.hasPurchase);
  const avgHistoryAmount = historyData.length
    ? historyData.reduce((s, b) => s + b.totalAmount, 0) / historyData.length
    : 0;

  // 오늘이 속한 월 (유니크 key)
  const now = new Date();
  const todayKey = monthKey(now.getFullYear(), now.getMonth() + 1);

  return (
    <div className="space-y-3">
      {/* 범례 */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {[2024, 2025, 2026].map((y) =>
          buckets.some((b) => b.year === y && b.hasPurchase) ? (
            <span key={y} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: BAR_COLOR[y] }} />
              {y}년
            </span>
          ) : null
        )}
        <span className="flex items-center gap-1">
          <span className="w-6 border-t-2 border-[#00733C] inline-block" />
          총금액
        </span>
        {review && review.amount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block border-2 border-red-500" style={{ background: "rgba(220,38,38,0.25)" }} />
            <span className="text-red-600 font-medium">검토 중</span>
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <span className="w-6 border-t-2 border-dashed border-red-500 inline-block" />
          현재
        </span>
        {expectedKey && (
          <span className="flex items-center gap-1">
            <span className="w-6 border-t-2 border-dashed border-[#00733C] inline-block" />
            예상 다음 구매
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart data={buckets} margin={{ top: 24, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical />
          <XAxis
            dataKey="key"
            tickFormatter={tickLabel}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            interval={0}
            height={28}
          />
          <YAxis
            yAxisId="count"
            allowDecimals={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            width={30}
            label={{ value: "건수", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
          />
          <YAxis
            yAxisId="amount"
            orientation="right"
            tickFormatter={fmtKRW}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            label={{ value: "금액", angle: 90, position: "insideRight", fill: "#9ca3af", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* 과거 월평균 기준선 */}
          {avgHistoryAmount > 0 && (
            <ReferenceLine
              yAxisId="amount"
              y={avgHistoryAmount}
              stroke="#94a3b8"
              strokeDasharray="4 2"
              label={{ value: `과거월평균 ${fmtKRW(avgHistoryAmount)}`, fill: "#94a3b8", fontSize: 10, position: "insideTopLeft" }}
            />
          )}

          {/* 검토 중인 건의 금액 기준선 */}
          {review && review.amount > 0 && (
            <ReferenceLine
              yAxisId="amount"
              y={review.amount}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{ value: `검토중 ${fmtKRW(review.amount)}`, fill: "#dc2626", fontSize: 11, fontWeight: 700, position: "insideTopRight" }}
            />
          )}

          {/* 현재 시점 (빨간 세로선) */}
          <ReferenceLine
            x={todayKey}
            yAxisId="amount"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{ value: "▼ 현재", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }}
          />

          {/* 예상 다음 구매 시점 */}
          {expectedKey && (
            <ReferenceLine
              x={expectedKey}
              yAxisId="amount"
              stroke="#00733C"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: expectedKey === todayKey
                  ? `◀ 예상(이번달)`
                  : `▼ 예상(${avgIntervalDays}일)`,
                fill: "#00733C",
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />
          )}

          <Bar dataKey="count" yAxisId="count" maxBarSize={28} radius={[3, 3, 0, 0]}>
            {buckets.map((b, i) => (
              <Cell
                key={i}
                fill={b.hasPurchase ? (BAR_COLOR[b.year] ?? "#86c9a8") : "transparent"}
                opacity={b.hasPurchase ? 0.85 : 0}
              />
            ))}
          </Bar>
          {/* 검토 중인 건 금액 막대 (오늘 달, 빨간 테두리) */}
          {review && review.amount > 0 && (
            <Bar
              dataKey="reviewAmount"
              yAxisId="amount"
              maxBarSize={20}
              fill="rgba(220,38,38,0.2)"
              stroke="#dc2626"
              strokeWidth={1.5}
              radius={[3, 3, 0, 0]}
              name="검토 중"
            />
          )}

          <Line
            dataKey="totalAmount"
            yAxisId="amount"
            type="monotone"
            stroke="#00733C"
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
