"use client";
import { useState } from "react";
import {
  ComposedChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { PurchaseEvent } from "@/lib/analyze";
import { ReviewItem } from "@/lib/reviewTypes";

interface Props {
  events: PurchaseEvent[];
  avgIntervalDays: number;
  lastPurchaseDate: string;
  review?: ReviewItem | null;
  excludedMonths?: Set<string>;
  onToggleMonth?: (key: string) => void;
  onResetExcluded?: () => void;
}

function parseTs(dateStr: string): number {
  const m = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return 0;
  return new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime();
}

function monthKey(year: number, month: number) {
  return `${year}.${String(month).padStart(2, "0")}`;
}

function tickLabel(key: string) {
  const [y, m] = key.split(".");
  if (m === "01") return `'${y.slice(2)}.01`;
  return m;
}

interface Bucket {
  key: string;
  year: number;
  month: number;
  normalQty: number;
  advanceQty: number;
  totalQty: number;
  reviewQty: number;  // 검토 중인 건 수량 (오늘 달에만)
  count: number;
  amount: number;
  hasPurchase: boolean;
}

function buildBuckets(
  events: PurchaseEvent[],
  todayTs: number,
  expectedNextTs: number | null,
  showNormal: boolean,
  showAdvance: boolean,
  reviewQty: number,
): Bucket[] {
  if (!events.length) return [];

  // 체크박스 필터 적용
  const filtered = events.filter((e) =>
    (showNormal && e.orderType === "normal") ||
    (showAdvance && e.orderType === "advance")
  );

  const map = new Map<string, { normalQty: number; advanceQty: number; count: number; amount: number }>();
  for (const e of filtered) {
    const d = new Date(e.timestamp);
    const k = monthKey(d.getFullYear(), d.getMonth() + 1);
    const ex = map.get(k);
    if (ex) {
      if (e.orderType === "normal") ex.normalQty += e.quantity;
      else ex.advanceQty += e.quantity;
      ex.count += 1;
      ex.amount += e.amount;
    } else {
      map.set(k, {
        normalQty: e.orderType === "normal" ? e.quantity : 0,
        advanceQty: e.orderType === "advance" ? e.quantity : 0,
        count: 1,
        amount: e.amount,
      });
    }
  }

  // 전체 이벤트 기준으로 범위 계산 (필터와 무관하게)
  const firstD = new Date(events[0].timestamp);
  const endD = new Date(Math.max(todayTs, expectedNextTs ?? 0));
  endD.setMonth(endD.getMonth() + 2);

  const todayKey_ = monthKey(new Date(todayTs).getFullYear(), new Date(todayTs).getMonth() + 1);

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
      normalQty: data?.normalQty ?? 0,
      advanceQty: data?.advanceQty ?? 0,
      totalQty: (data?.normalQty ?? 0) + (data?.advanceQty ?? 0),
      reviewQty: k === todayKey_ ? reviewQty : 0,
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

function calcAvgInterval(events: PurchaseEvent[], excluded: Set<string>): number {
  const histEvents = events.filter((e) => {
    const d = new Date(e.timestamp);
    const k = monthKey(d.getFullYear(), d.getMonth() + 1);
    return e.year !== 2026 && !excluded.has(k);
  });
  const dates = [...new Set(histEvents.map((e) => e.orderDate))].sort();
  if (dates.length < 2) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const diff = (parseTs(dates[i]) - parseTs(dates[i - 1])) / 86400000;
    if (diff > 0) intervals.push(diff);
  }
  return intervals.length > 0
    ? Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length)
    : 0;
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
          {d.normalQty > 0 && (
            <div className="text-gray-600">일반발주: <span className="font-medium">{d.normalQty}개</span></div>
          )}
          {d.advanceQty > 0 && (
            <div className="text-gray-600">선발주: <span className="font-medium">{d.advanceQty}개</span></div>
          )}
          <div className="text-gray-600">합계: <span className="font-medium">{d.totalQty}개 · {d.count}건</span></div>
          <div className="text-gray-600">금액: <span className="font-medium">{d.amount.toLocaleString()}원</span></div>
        </>
      ) : (
        <div className="text-gray-400">구매 없음</div>
      )}
      {d.reviewQty > 0 && (
        <div className="text-red-600 font-semibold border-t border-gray-100 pt-0.5 mt-0.5">
          검토 중: {d.reviewQty}개
        </div>
      )}
    </div>
  );
}

export default function FrequencyChart({ events, avgIntervalDays, lastPurchaseDate, review, excludedMonths: excludedMonthsProp, onToggleMonth, onResetExcluded }: Props) {
  const [showNormal, setShowNormal] = useState(true);
  const [showAdvance, setShowAdvance] = useState(true);

  const excludedMonths = excludedMonthsProp ?? new Set<string>();
  const toggleMonth = onToggleMonth ?? (() => {});

  if (!events.length) return <p className="text-gray-400 text-sm">데이터 없음</p>;

  const hasNormal = events.some((e) => e.orderType === "normal");
  const hasAdvance = events.some((e) => e.orderType === "advance");

  const todayTs = Date.now();
  const lastTs = lastPurchaseDate ? parseTs(lastPurchaseDate) : 0;
  const daysSinceLast = lastTs ? Math.floor((todayTs - lastTs) / (1000 * 60 * 60 * 24)) : null;

  const localAvgIntervalDays = excludedMonths.size > 0
    ? calcAvgInterval(events, excludedMonths)
    : avgIntervalDays;

  const expectedNextTs = lastTs && localAvgIntervalDays > 0
    ? lastTs + localAvgIntervalDays * 24 * 60 * 60 * 1000
    : null;

  const buckets = buildBuckets(events, todayTs, expectedNextTs, showNormal, showAdvance, review?.quantity ?? 0);
  const purchaseMonths = buckets.filter((b) => b.hasPurchase);
  const todayKey = tsToMonthKey(todayTs);
  const expectedKey = expectedNextTs ? tsToMonthKey(expectedNextTs) : null;
  const isTooEarly = daysSinceLast !== null && localAvgIntervalDays > 0 && daysSinceLast < localAvgIntervalDays * 0.8;

  const totalPurchaseDays = [...new Set(
    events
      .filter((e) =>
        (showNormal && e.orderType === "normal") ||
        (showAdvance && e.orderType === "advance")
      )
      .map((e) => e.orderDate)
  )].length;

  // 예상 다음 구매가 차트 범위 밖인지 확인
  const expectedOutOfRange = expectedKey && !buckets.some((b) => b.key === expectedKey);

  return (
    <div className="space-y-4">
      {/* 범례 + 체크박스 */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        {/* 발주유형 체크박스 */}
        {hasNormal && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showNormal}
              onChange={(e) => setShowNormal(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#00733C] rounded"
            />
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#00733C" }} />
            <span className={showNormal ? "text-gray-700 font-medium" : "text-gray-400"}>일반발주</span>
          </label>
        )}
        {hasAdvance && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAdvance}
              onChange={(e) => setShowAdvance(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#f59e0b] rounded"
            />
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#f59e0b" }} />
            <span className={showAdvance ? "text-gray-700 font-medium" : "text-gray-400"}>선발주</span>
          </label>
        )}

        {review && review.quantity > 0 && (
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
          <Legend content={() => null} />

          {/* 일반발주 (하단) */}
          {showNormal && (
            <Bar
              dataKey="normalQty"
              stackId="qty"
              fill="#00733C"
              opacity={0.85}
              maxBarSize={28}
              radius={showAdvance ? [0, 0, 0, 0] : [3, 3, 0, 0]}
              name="일반발주"
            >
              {buckets.map((b) => (
                <Cell key={b.key} opacity={excludedMonths.has(b.key) ? 0.15 : 0.85} />
              ))}
            </Bar>
          )}

          {/* 선발주 (상단) */}
          {showAdvance && (
            <Bar
              dataKey="advanceQty"
              stackId="qty"
              fill="#f59e0b"
              opacity={0.85}
              maxBarSize={28}
              radius={review?.quantity ? [0, 0, 0, 0] : [3, 3, 0, 0]}
              name="선발주"
            >
              {buckets.map((b) => (
                <Cell key={b.key} opacity={excludedMonths.has(b.key) ? 0.15 : 0.85} />
              ))}
            </Bar>
          )}

          {/* 검토 중인 건 (최상단, 빨간 테두리) */}
          {review && review.quantity > 0 && (
            <Bar
              dataKey="reviewQty"
              stackId="qty"
              fill="rgba(220,38,38,0.25)"
              stroke="#dc2626"
              strokeWidth={1.5}
              maxBarSize={28}
              radius={[3, 3, 0, 0]}
              name="검토 중"
            />
          )}

          {/* 현재 (빨간선) */}
          <ReferenceLine
            x={todayKey}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{ value: "▼ 현재", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }}
          />

          {/* 예상 다음 구매 시점 */}
          {expectedKey && !expectedOutOfRange && (
            <ReferenceLine
              x={expectedKey}
              stroke="#00733C"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: expectedKey === todayKey
                  ? `◀ 예상(이번달)`
                  : `▼ 예상(${avgIntervalDays}일)`,
                fill: "#00733C",
                fontSize: 10,
                position: expectedKey === todayKey ? "insideTopLeft" : "insideTopLeft",
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 월별 집계 제외 체크박스 */}
      {purchaseMonths.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs">
          <span className="text-gray-400 mr-1 shrink-0">집계 제외:</span>
          {purchaseMonths.map((b) => {
            const excluded = excludedMonths.has(b.key);
            return (
              <label
                key={b.key}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border cursor-pointer select-none transition-colors ${
                  excluded
                    ? "bg-gray-100 border-gray-300 text-gray-400"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!excluded}
                  onChange={() => toggleMonth(b.key)}
                  className="w-3 h-3 accent-[#00733C]"
                />
                <span className={excluded ? "line-through" : ""}>{b.key}</span>
              </label>
            );
          })}
          {excludedMonths.size > 0 && onResetExcluded && (
            <button
              onClick={onResetExcluded}
              className="ml-1 px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            >
              초기화
            </button>
          )}
        </div>
      )}

      {/* 예상 다음 구매가 차트 범위 밖일 때 안내 */}
      {expectedOutOfRange && expectedNextTs && (
        <div className="text-xs bg-green-50 border border-[#b3d9c6] rounded-lg px-3 py-2 text-[#00733C] flex items-center gap-2">
          <span>▶</span>
          <span>
            예상 다음 구매: <strong>{new Date(expectedNextTs).toLocaleDateString("ko-KR")}</strong>
            {" "}(평균 주기 {avgIntervalDays}일) — 차트 범위 밖
          </span>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
          <div className="text-gray-400 mb-0.5">총 구매 횟수</div>
          <div className="font-semibold text-gray-700">{totalPurchaseDays}회</div>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
          <div className="text-gray-400 mb-0.5">평균 구매 주기</div>
          <div className="font-semibold text-gray-700">
            {localAvgIntervalDays > 0 ? `약 ${localAvgIntervalDays}일` : "—"}
          </div>
          {excludedMonths.size > 0 && (
            <div className="text-[10px] text-amber-500 mt-0.5">{excludedMonths.size}개월 제외됨</div>
          )}
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
      {review && localAvgIntervalDays > 0 && daysSinceLast !== null && (
        <div className={`text-xs rounded-xl px-4 py-3 border ${
          isTooEarly
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-green-50 border-green-200 text-[#00733C]"
        }`}>
          {isTooEarly
            ? `⚠ 마지막 구매 후 ${daysSinceLast}일 경과 — 평균 주기(${localAvgIntervalDays}일)의 ${Math.round(daysSinceLast / localAvgIntervalDays * 100)}% 시점입니다. 조기 구매일 수 있습니다.`
            : `✅ 마지막 구매 후 ${daysSinceLast}일 경과 — 평균 주기(${localAvgIntervalDays}일) 이상 경과하여 정상 범위입니다.`
          }
        </div>
      )}
    </div>
  );
}
