"use client";
import {
  ComposedChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { PurchaseEvent } from "@/lib/analyze";
import { ReviewItem } from "@/lib/reviewTypes";

interface Props {
  events: PurchaseEvent[];
  avgIntervalDays: number;
  lastPurchaseDate: string;
  review?: ReviewItem | null;
}

const YEAR_COLOR: Record<number, string> = {
  2024: "#86c9a8",
  2025: "#00733C",
  2026: "#f59e0b",
};

function parseTs(dateStr: string): number {
  const m = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return 0;
  return new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime();
}

function monthKey(year: number, month: number) {
  return `${year}.${String(month).padStart(2, "0")}`;
}

// 축 표시용: 1월이면 "'YY.01", 나머지는 "MM"
function tickLabel(key: string) {
  const [y, m] = key.split(".");
  if (m === "01") return `'${y.slice(2)}.01`;
  return m;
}

interface Bucket {
  key: string;        // "2024.01" — 유니크 (x축 dataKey)
  year: number;
  month: number;
  qty: number;
  count: number;
  amount: number;
  hasPurchase: boolean;
}

function buildBuckets(events: PurchaseEvent[], todayTs: number, expectedNextTs: number | null): Bucket[] {
  if (!events.length) return [];

  const map = new Map<string, { qty: number; count: number; amount: number }>();
  for (const e of events) {
    const d = new Date(e.timestamp);
    const k = monthKey(d.getFullYear(), d.getMonth() + 1);
    const ex = map.get(k);
    if (ex) { ex.qty += e.quantity; ex.count += 1; ex.amount += e.amount; }
    else map.set(k, { qty: e.quantity, count: 1, amount: e.amount });
  }

  const firstD = new Date(events[0].timestamp);
  const endD = new Date(Math.max(todayTs, expectedNextTs ?? 0));
  endD.setMonth(endD.getMonth() + 2);

  const buckets: Bucket[] = [];
  const cur = new Date(firstD.getFullYear(), firstD.getMonth(), 1);
  const end = new Date(endD.getFullYear(), endD.getMonth(), 1);

  while (cur <= end) {
    const y = cur.getFullYear();
    const mo = cur.getMonth() + 1;
    const k = monthKey(y, mo);
    const data = map.get(k);
    buckets.push({
      key: k,
      year: y,
      month: mo,
      qty: data?.qty ?? 0,
      count: data?.count ?? 0,
      amount: data?.amount ?? 0,
      hasPurchase: !!data,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return buckets;
}

function tsToMonthKey(ts: number) {
  const d = new Date(ts);
  return monthKey(d.getFullYear(), d.getMonth() + 1);
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
          <div className="text-gray-600">수량: <span className="font-medium">{d.qty}개</span></div>
          <div className="text-gray-600">건수: <span className="font-medium">{d.count}건</span></div>
          <div className="text-gray-600">금액: <span className="font-medium">{d.amount.toLocaleString()}원</span></div>
        </>
      ) : (
        <div className="text-gray-400">구매 없음</div>
      )}
    </div>
  );
}

export default function FrequencyChart({ events, avgIntervalDays, lastPurchaseDate, review }: Props) {
  if (!events.length) return <p className="text-gray-400 text-sm">데이터 없음</p>;

  const todayTs = Date.now();
  const lastTs = lastPurchaseDate ? parseTs(lastPurchaseDate) : 0;
  const daysSinceLast = lastTs ? Math.floor((todayTs - lastTs) / (1000 * 60 * 60 * 24)) : null;
  const expectedNextTs = lastTs && avgIntervalDays > 0
    ? lastTs + avgIntervalDays * 24 * 60 * 60 * 1000
    : null;

  const buckets = buildBuckets(events, todayTs, expectedNextTs);
  const todayKey = tsToMonthKey(todayTs);
  const expectedKey = expectedNextTs ? tsToMonthKey(expectedNextTs) : null;
  const isTooEarly = daysSinceLast !== null && avgIntervalDays > 0 && daysSinceLast < avgIntervalDays * 0.8;

  const totalPurchaseDays = [...new Set(events.map((e) => e.orderDate))].length;

  return (
    <div className="space-y-4">
      {/* 범례 */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {[2024, 2025, 2026].map((y) =>
          buckets.some((b) => b.year === y && b.hasPurchase) ? (
            <span key={y} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: YEAR_COLOR[y] }} />
              {y}년
            </span>
          ) : null
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
        <ComposedChart data={buckets} margin={{ top: 24, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical />
          <XAxis
            dataKey="key"
            tickFormatter={tickLabel}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            interval={0}
            height={28}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            width={36}
            label={{ value: "수량", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="qty" maxBarSize={28} radius={[3, 3, 0, 0]}>
            {buckets.map((b, i) => (
              <Cell
                key={i}
                fill={b.hasPurchase ? (YEAR_COLOR[b.year] ?? "#86c9a8") : "transparent"}
                opacity={b.hasPurchase ? 0.85 : 0}
              />
            ))}
          </Bar>

          {/* 현재 (빨간선) */}
          <ReferenceLine
            x={todayKey}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{ value: "▼ 현재", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }}
          />

          {/* 예상 다음 구매 시점 */}
          {expectedKey && expectedKey !== todayKey && (
            <ReferenceLine
              x={expectedKey}
              stroke="#00733C"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: `▼ 예상(${avgIntervalDays}일)`,
                fill: "#00733C",
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
          <div className="text-gray-400 mb-0.5">총 구매 횟수</div>
          <div className="font-semibold text-gray-700">{totalPurchaseDays}회</div>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
          <div className="text-gray-400 mb-0.5">평균 구매 주기</div>
          <div className="font-semibold text-gray-700">
            {avgIntervalDays > 0 ? `약 ${avgIntervalDays}일` : "—"}
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
          <div className="text-gray-400 mb-0.5">마지막 구매</div>
          <div className="font-semibold text-gray-700">{lastPurchaseDate || "—"}</div>
        </div>
        <div className={`rounded-xl px-3 py-2.5 border ${
          isTooEarly ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"
        }`}>
          <div className="text-gray-400 mb-0.5">마지막 구매 후 경과</div>
          <div className={`font-semibold ${isTooEarly ? "text-amber-600" : "text-gray-700"}`}>
            {daysSinceLast !== null
              ? `${daysSinceLast}일${avgIntervalDays > 0 ? ` (주기의 ${Math.round(daysSinceLast / avgIntervalDays * 100)}%)` : ""}`
              : "—"
            }
          </div>
          {isTooEarly && <div className="text-amber-500 mt-0.5">⚠ 평균 주기 미달</div>}
        </div>
      </div>

      {/* 검토 중인 구매 건 판정 */}
      {review && avgIntervalDays > 0 && daysSinceLast !== null && (
        <div className={`text-xs rounded-xl px-4 py-3 border ${
          isTooEarly
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-green-50 border-green-200 text-[#00733C]"
        }`}>
          {isTooEarly
            ? `⚠ 마지막 구매 후 ${daysSinceLast}일 경과 — 평균 주기(${avgIntervalDays}일)의 ${Math.round(daysSinceLast / avgIntervalDays * 100)}% 시점입니다. 조기 구매일 수 있습니다.`
            : `✅ 마지막 구매 후 ${daysSinceLast}일 경과 — 평균 주기(${avgIntervalDays}일) 이상 경과하여 정상 범위입니다.`
          }
        </div>
      )}
    </div>
  );
}
