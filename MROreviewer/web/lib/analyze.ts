import { MRORecord } from "./parseExcel";

// ─── 타입 정의 ──────────────────────────────────────────────

export interface MonthlyPoint {
  label: string;   // "2024-01" 형식
  year: number;
  month: number;
  totalAmount: number;
  totalQuantity: number;
  count: number;   // 구매 건수
  avgUnitPrice: number;
}

export interface PricePoint {
  label: string;   // 주문일
  unitPrice: number;
  amount: number;
  quantity: number;
  department: string;
  orderDate: string;
  year: number;
  month: number;
}

export interface DeptStat {
  department: string;  // 부서명 (>> 뒤 부분)
  plant: string;       // 공장명
  totalAmount: number;
  count: number;
}

export interface FreqStat {
  year: number;
  month: number;
  label: string;
  count: number;
  totalAmount: number;
}

export interface PurchaseEvent {
  orderDate: string;   // YYYY.MM.DD
  timestamp: number;   // ms
  quantity: number;
  amount: number;
  unitPrice: number;
  year: number;
  spec: string;
  department: string;
  orderType: "normal" | "advance"; // 일반발주(2*) / 선발주(7*)
}

export interface Year2026Highlight {
  orderDate: string;
  orderNumber: string;
  quantity: number;
  amount: number;
  unitPrice: number;
  department: string;
  requester: string;
  manufacturer: string;
  purchaseReason: string;
  spec: string;
  flags: Flag[];
}

export interface Flag {
  type: "price_spike" | "quantity_spike" | "new_item" | "freq_spike";
  label: string;
  severity: "danger" | "warning" | "info";
  detail: string;
}

export interface ProductAnalysis {
  productName: string;
  totalRecords: number;
  historyRecords: number;   // 2024+2025
  records2026: number;

  // A) 연도별/월별 금액 추이
  monthlyTrend: MonthlyPoint[];

  // B) 단가 변동
  priceHistory: PricePoint[];
  priceStats: {
    min: number; max: number; avg: number;
    minHistory: number; maxHistory: number; avgHistory: number;
  };

  // C) 부서/공장 분포
  deptStats: DeptStat[];

  // D) 구매 빈도 (타임라인용 raw 이벤트)
  purchaseEvents: PurchaseEvent[];
  freqStats: FreqStat[];
  avgMonthlyFreq: number;          // 과거 월평균 구매 건수
  avgMonthlyQty: number;           // 과거 월평균 구매 수량(개)
  avgHistoryQtyPerPurchase: number; // 과거 건당 평균 수량
  avgIntervalDays: number; // 과거 평균 구매 간격(일), 0=계산불가
  lastPurchaseDate: string;// 마지막 구매일 (YYYY.MM.DD)

  // E) 2026 하이라이트
  highlights2026: Year2026Highlight[];

  // F) 유사 상품명은 API에서 별도 처리

  // 규격 목록 (dept 필터 적용 후, spec 필터 적용 전)
  uniqueSpecs: string[];
  selectedSpecs: string[]; // 현재 적용된 규격 필터 목록 (없으면 [])
}

// ─── 헬퍼 ──────────────────────────────────────────────────

function parseDept(raw: string): { plant: string; department: string } {
  // "(주)셀트리온제약 청주공장>>바이오생산1팀" 형식
  const parts = raw.split(">>");
  if (parts.length >= 2) {
    const plantPart = parts[0].trim();
    const plant = plantPart.includes("청주") ? "청주공장" :
                  plantPart.includes("진천") ? "진천공장" : plantPart;
    return { plant, department: parts[parts.length - 1].trim() };
  }
  return { plant: raw, department: raw };
}

function unitPrice(r: MRORecord): number {
  if (r.quantity <= 0) return r.amount;
  return Math.round(r.amount / r.quantity);
}

function monthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ─── 핵심 분석 함수 ─────────────────────────────────────────

export type OrderType = "all" | "normal" | "advance";

export function analyzeProduct(
  productName: string,
  records: MRORecord[],
  deptFilter?: string | string[],  // 단일 full 문자열 or 배열(담당/본부 필터), undefined = 전체
  specFilter?: string[],           // 규격 exact match 목록, undefined = 전체
  orderType?: OrderType            // 발주유형: all=전체, normal=일반(2), advance=선발주(7)
): ProductAnalysis {
  const byName = records.filter((r) => r.productName === productName);
  const byDept = !deptFilter || (Array.isArray(deptFilter) && deptFilter.length === 0)
    ? byName
    : Array.isArray(deptFilter)
      ? byName.filter((r) => deptFilter.includes(r.department))
      : byName.filter((r) => r.department === deptFilter);

  // 발주유형 필터
  const byOrder = orderType === "normal"
    ? byDept.filter((r) => r.orderNumber.startsWith("2"))
    : orderType === "advance"
      ? byDept.filter((r) => r.orderNumber.startsWith("7"))
      : byDept;

  // 규격 목록은 dept+발주유형 필터 적용 후, spec 필터 적용 전에 수집
  // orderDate가 있는 레코드만 포함 (구매 이력이 없는 규격은 제외)
  const uniqueSpecs = [...new Set(
    byOrder.filter((r) => r.orderDate).map((r) => r.spec).filter(Boolean)
  )].sort();

  const all = specFilter && specFilter.length > 0
    ? byOrder.filter((r) => specFilter.includes(r.spec))
    : byOrder;

  const history = all.filter((r) => r.year === 2024 || r.year === 2025);
  const curr2026 = all.filter((r) => r.year === 2026);

  // ── A) 월별 추이 ──
  const monthMap = new Map<string, MonthlyPoint>();
  for (const r of all) {
    if (!r.year || !r.month) continue;
    const key = monthLabel(r.year, r.month);
    const existing = monthMap.get(key);
    const up = unitPrice(r);
    if (existing) {
      existing.totalAmount += r.amount;
      existing.totalQuantity += r.quantity;
      existing.count += 1;
      existing.avgUnitPrice = existing.totalQuantity > 0
        ? Math.round(existing.totalAmount / existing.totalQuantity) : up;
    } else {
      monthMap.set(key, {
        label: key, year: r.year, month: r.month,
        totalAmount: r.amount, totalQuantity: r.quantity, count: 1,
        avgUnitPrice: up,
      });
    }
  }
  const monthlyTrend = [...monthMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  // ── B) 단가 이력 ──
  const priceHistory: PricePoint[] = all
    .filter((r) => r.orderDate)
    .map((r) => ({
      label: r.orderDate,
      unitPrice: unitPrice(r),
      amount: r.amount,
      quantity: r.quantity,
      department: parseDept(r.department).department,
      orderDate: r.orderDate,
      year: r.year,
      month: r.month,
    }))
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate));

  const historyPrices = history.map(unitPrice).filter((p) => p > 0);
  const allPrices = all.map(unitPrice).filter((p) => p > 0);
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

  const priceStats = {
    min: allPrices.length ? Math.min(...allPrices) : 0,
    max: allPrices.length ? Math.max(...allPrices) : 0,
    avg: avg(allPrices),
    minHistory: historyPrices.length ? Math.min(...historyPrices) : 0,
    maxHistory: historyPrices.length ? Math.max(...historyPrices) : 0,
    avgHistory: avg(historyPrices),
  };

  // ── C) 부서 분포 ──
  const deptMap = new Map<string, DeptStat>();
  for (const r of all) {
    const { plant, department } = parseDept(r.department);
    const key = `${plant}__${department}`;
    const existing = deptMap.get(key);
    if (existing) {
      existing.totalAmount += r.amount;
      existing.count += 1;
    } else {
      deptMap.set(key, { plant, department, totalAmount: r.amount, count: 1 });
    }
  }
  const deptStats = [...deptMap.values()].sort((a, b) => b.totalAmount - a.totalAmount);

  // ── D) 구매 빈도 ──
  const freqMap = new Map<string, FreqStat>();
  for (const r of all) {
    if (!r.year || !r.month) continue;
    const key = monthLabel(r.year, r.month);
    const existing = freqMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalAmount += r.amount;
    } else {
      freqMap.set(key, { year: r.year, month: r.month, label: key, count: 1, totalAmount: r.amount });
    }
  }
  const freqStats = [...freqMap.values()].sort((a, b) => a.label.localeCompare(b.label));

  // Raw 구매 이벤트 (타임라인용) - 날짜순 정렬
  function parseTimestamp(dateStr: string): number {
    const m = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
    if (!m) return 0;
    return new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime();
  }

  const purchaseEvents: PurchaseEvent[] = all
    .filter((r) => r.orderDate)
    .map((r) => ({
      orderDate: r.orderDate,
      timestamp: parseTimestamp(r.orderDate),
      quantity: r.quantity,
      amount: r.amount,
      unitPrice: unitPrice(r),
      year: r.year,
      spec: r.spec,
      department: parseDept(r.department).department,
      orderType: r.orderNumber.startsWith("7") ? "advance" as const : "normal" as const,
    }))
    .filter((e) => e.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  // 평균 구매 간격 (역사 데이터 기준, 같은 날 복수 구매는 1회로 합산)
  const historyDates = [...new Set(
    purchaseEvents.filter((e) => e.year !== 2026).map((e) => e.orderDate)
  )].sort();
  let avgIntervalDays = 0;
  if (historyDates.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < historyDates.length; i++) {
      const diff = (parseTimestamp(historyDates[i]) - parseTimestamp(historyDates[i - 1]))
        / (1000 * 60 * 60 * 24);
      if (diff > 0) intervals.push(diff);
    }
    if (intervals.length > 0)
      avgIntervalDays = Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
  }

  const lastPurchaseDate = purchaseEvents.length
    ? purchaseEvents[purchaseEvents.length - 1].orderDate
    : "";

  // 과거(2024~2025) 기간 내 구매가 있었던 월의 개수 / 전체 24개월
  const historyMonths = 24;
  const historyFreqMonths = freqStats.filter((f) => f.year !== 2026);
  const avgMonthlyFreq = historyFreqMonths.length > 0
    ? historyFreqMonths.reduce((s, f) => s + f.count, 0) / historyMonths
    : 0;

  // 과거 월평균 수량 (개수 기준)
  const historyTotalQty = history.reduce((s, r) => s + r.quantity, 0);
  const avgMonthlyQty = historyTotalQty > 0
    ? Math.round((historyTotalQty / historyMonths) * 10) / 10
    : 0;

  // 과거 건당 평균 수량 (수량 비교 기준)
  const avgHistoryQtyPerPurchase = history.length > 0
    ? Math.round(historyTotalQty / history.length)
    : 0;

  // ── E) 2026 이상징후 분석 ──
  const highlights2026: Year2026Highlight[] = curr2026.map((r) => {
    const up = unitPrice(r);
    const flags: Flag[] = [];

    // 신규 품목 여부
    if (history.length === 0) {
      flags.push({
        type: "new_item",
        label: "신규 품목",
        severity: r.amount >= 500_000 ? "warning" : "info",
        detail: "2024~2025년 구매 이력 없음",
      });
    } else {
      // 단가 급등
      if (priceStats.avgHistory > 0 && up > priceStats.avgHistory * 1.5) {
        const ratio = Math.round((up / priceStats.avgHistory - 1) * 100);
        flags.push({
          type: "price_spike",
          label: "단가 급등",
          severity: up > priceStats.avgHistory * 2 ? "danger" : "warning",
          detail: `과거 평균단가 ${priceStats.avgHistory.toLocaleString()}원 대비 +${ratio}%`,
        });
      }

      // 수량 급증: 해당 월의 수량 vs 과거 월평균
      const historyTotalQty = history.reduce((s, h) => s + h.quantity, 0);
      const avgMonthlyQty = historyTotalQty / historyMonths;
      if (avgMonthlyQty > 0 && r.quantity > avgMonthlyQty * 3) {
        const ratio = Math.round(r.quantity / avgMonthlyQty * 100);
        flags.push({
          type: "quantity_spike",
          label: "수량 급증",
          severity: "warning",
          detail: `과거 월평균 ${avgMonthlyQty.toFixed(1)}개 대비 ${ratio}% (${r.quantity}개)`,
        });
      }

      // 빈도 급증: 2026년 구매 월수 vs 과거 비율
      const months2026Bought = new Set(curr2026.map((x) => x.month)).size;
      const historyMonthsBought = historyFreqMonths.length;
      const historyMonthlyRate = historyMonthsBought / 24;
      if (historyMonthlyRate < 0.17 && months2026Bought >= 2) {
        // 과거에 연 2회 이하로 사던 품목인데 2026년에 2회 이상
        flags.push({
          type: "freq_spike",
          label: "구매 빈도 증가",
          severity: "info",
          detail: `과거 연평균 ${(historyMonthlyRate * 12).toFixed(1)}회 → 2026년 ${months2026Bought}회`,
        });
      }
    }

    return {
      orderDate: r.orderDate,
      orderNumber: r.orderNumber,
      quantity: r.quantity,
      amount: r.amount,
      unitPrice: up,
      department: parseDept(r.department).department,
      requester: r.requester,
      manufacturer: r.manufacturer,
      purchaseReason: r.purchaseReason,
      spec: r.spec,
      flags,
    };
  }).sort((a, b) => a.orderDate.localeCompare(b.orderDate));

  return {
    productName,
    totalRecords: all.length,
    historyRecords: history.length,
    records2026: curr2026.length,
    monthlyTrend,
    priceHistory,
    priceStats,
    deptStats,
    freqStats,
    avgMonthlyFreq,
    avgMonthlyQty,
    avgHistoryQtyPerPurchase,
    highlights2026,
    uniqueSpecs,
    selectedSpecs: specFilter ?? [],
    purchaseEvents,
    avgIntervalDays,
    lastPurchaseDate,
  };
}
