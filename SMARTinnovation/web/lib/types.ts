export type TaskStatus = "planned" | "in-progress" | "completed" | "critical";

// 날짜 형식: "YYYY-MM-W1" ~ "YYYY-MM-W4"
export interface WDate { year: number; month: number; week: number; }

export function parseWDate(s: string): WDate {
  if (!s) return { year: new Date().getFullYear(), month: 1, week: 1 };
  const parts = s.split("-W");
  const [year, month] = parts[0].split("-").map(Number);
  return { year, month, week: Number(parts[1]) || 1 };
}

export function formatWDate(wd: WDate): string {
  return `${wd.year}-${String(wd.month).padStart(2, "0")}-W${wd.week}`;
}

export function wdateToIndex(wd: WDate, base: WDate): number {
  return (wd.year - base.year) * 48 + (wd.month - base.month) * 4 + (wd.week - base.week);
}

export function todayWDate(): WDate {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, week: Math.min(4, Math.ceil(d.getDate() / 7)) };
}

export interface Level2Item {
  id: string;
  parentId: string;
  name: string;
  startDate: string;      // "YYYY-MM-W1" 형식
  endDate: string;        // "YYYY-MM-W1" 형식
  assignee: string;
  status: TaskStatus;
  showOnLevel1?: boolean;
}

export interface PhaseSegment {
  name: string;
  startDate: string;   // YYYY-MM-Wn
  endDate: string;
}

export interface Level1Item {
  id: string;
  name: string;
  color: string;
  assignee: string;
  status: TaskStatus;
  phases?: PhaseSegment[];
  children: Level2Item[];
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  planned: "#94a3b8",
  "in-progress": "#00733C",
  completed: "#00733C",
  critical: "#ef4444",
};

export const CATEGORY_COLORS = [
  "#00733C", "#2563eb", "#7c3aed", "#e11d48",
  "#ea580c", "#0891b2", "#4f46e5", "#be123c",
  "#15803d", "#b45309",
];

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function getLevel1Range(item: Level1Item): { start: string; end: string } | null {
  if (item.children.length === 0) return null;
  let start = item.children[0].startDate;
  let end = item.children[0].endDate;
  for (const c of item.children) {
    if (c.startDate < start) start = c.startDate;
    if (c.endDate > end) end = c.endDate;
  }
  return { start, end };
}
