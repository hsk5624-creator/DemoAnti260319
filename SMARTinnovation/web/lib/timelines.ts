export interface TimelineMeta {
  id: string;
  name: string;
  createdAt: string; // ISO string
}

const META_KEY = "smart-timelines-meta";

// 기존 "smart-timeline-v3" 데이터를 자동으로 마이그레이션하기 위한 ID
export const LEGACY_TIMELINE_ID = "manufacturing";

export function loadTimelines(): TimelineMeta[] {
  if (typeof window === "undefined") return defaultList();
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const list = JSON.parse(raw) as TimelineMeta[];
      if (list.length > 0) return list;
    }
  } catch {}
  return defaultList();
}

export function saveTimelines(list: TimelineMeta[]): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(list));
  } catch {}
}

function defaultList(): TimelineMeta[] {
  return [
    {
      id: LEGACY_TIMELINE_ID,
      name: "제조혁신 타임라인",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

export function generateTimelineId(): string {
  return `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
