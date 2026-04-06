/**
 * 대한민국 법정공휴일
 * - 고정 공휴일: 매년 동일한 양력 날짜
 * - 음력 공휴일: 연도별 양력 날짜 하드코딩 (2024~2027)
 *
 * 필요 시 LUNAR_HOLIDAYS에 연도를 추가하면 됩니다.
 */

export interface Holiday {
  name: string;
  isLunar?: boolean; // 음력 기반 여부
}

/** 고정 공휴일 (MM-DD → name) */
const FIXED: Record<string, string> = {
  "01-01": "신정",
  "03-01": "삼일절",
  "05-05": "어린이날",
  "06-06": "현충일",
  "08-15": "광복절",
  "10-03": "개천절",
  "10-09": "한글날",
  "12-25": "크리스마스",
};

/** 음력 기반 공휴일 (YYYY-MM-DD → name) */
const LUNAR: Record<string, string> = {
  // 2024
  "2024-02-09": "설날 연휴",
  "2024-02-10": "설날",
  "2024-02-11": "설날 연휴",
  "2024-02-12": "설날 대체공휴일",
  "2024-05-15": "부처님오신날",
  "2024-09-16": "추석 연휴",
  "2024-09-17": "추석",
  "2024-09-18": "추석 연휴",

  // 2025
  "2025-01-28": "설날 연휴",
  "2025-01-29": "설날",
  "2025-01-30": "설날 연휴",
  "2025-05-06": "부처님오신날 대체공휴일",
  "2025-10-05": "추석 연휴",
  "2025-10-06": "추석",
  "2025-10-07": "추석 연휴",
  "2025-03-03": "삼일절 대체공휴일",

  // 2026
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-02": "삼일절 대체공휴일",
  "2026-05-24": "부처님오신날",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",

  // 2027
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-05-13": "부처님오신날",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
};

/**
 * 날짜 문자열 "YYYY-MM-DD"가 공휴일이면 이름을 반환, 아니면 null
 */
export function getHoliday(dateStr: string): string | null {
  if (LUNAR[dateStr]) return LUNAR[dateStr];
  const mmdd = dateStr.slice(5); // "MM-DD"
  return FIXED[mmdd] ?? null;
}

/**
 * 년/월의 공휴일 집합 반환: day(1-based) → holiday name
 */
export function getMonthHolidays(year: number, month: number): Map<number, string> {
  const result = new Map<number, string>();
  const days = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  for (let d = 1; d <= days; d++) {
    const dd = String(d).padStart(2, "0");
    const name = getHoliday(`${year}-${mm}-${dd}`);
    if (name) result.set(d, name);
  }
  return result;
}
