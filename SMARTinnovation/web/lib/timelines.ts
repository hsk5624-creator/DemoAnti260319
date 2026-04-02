import { supabase } from "./supabase";

export interface TimelineMeta {
  id: string;
  name: string;
  createdAt: string;
  editPassword?: string;
  lastEditedAt?: string;
  editingBy?: string;
  editingSince?: string;
}

export const LEGACY_TIMELINE_ID = "manufacturing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMeta(row: any): TimelineMeta {
  return {
    id:           row.id,
    name:         row.name,
    createdAt:    row.created_at,
    editPassword: row.edit_password ?? undefined,
    lastEditedAt: row.last_edited_at ?? undefined,
    editingBy:    row.editing_by ?? undefined,
    editingSince: row.editing_since ?? undefined,
  };
}

export async function loadTimelines(): Promise<TimelineMeta[]> {
  const { data } = await supabase
    .from("timelines")
    .select("*")
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) {
    // 기본 타임라인 생성
    await supabase.from("timelines").upsert(
      { id: LEGACY_TIMELINE_ID, name: "제조혁신 타임라인", created_at: "2026-01-01T00:00:00.000Z" },
      { onConflict: "id" }
    );
    const { data: d2 } = await supabase.from("timelines").select("*").order("created_at", { ascending: true });
    return (d2 ?? []).map(rowToMeta);
  }

  return data.map(rowToMeta);
}

export async function createTimeline(meta: Pick<TimelineMeta, "id" | "name" | "createdAt" | "editPassword">): Promise<void> {
  await supabase.from("timelines").insert({
    id:            meta.id,
    name:          meta.name,
    created_at:    meta.createdAt,
    edit_password: meta.editPassword ?? null,
  });
}

export async function updateTimelineName(id: string, name: string): Promise<void> {
  await supabase.from("timelines").update({ name }).eq("id", id);
}

export async function updateTimelineEditPassword(id: string, password: string | undefined): Promise<void> {
  await supabase.from("timelines").update({ edit_password: password ?? null }).eq("id", id);
}

export async function deleteTimeline(id: string): Promise<void> {
  await supabase.from("timelines").delete().eq("id", id);
}

// ── 편집 잠금 ──────────────────────────────────────────────────────────
const LOCK_TIMEOUT_MIN = 30;

export async function acquireEditLock(
  timelineId: string,
  sessionId: string
): Promise<{ ok: boolean; editingBy?: string }> {
  const { data } = await supabase
    .from("timelines")
    .select("editing_by, editing_since")
    .eq("id", timelineId)
    .single();

  if (data?.editing_by && data.editing_by !== sessionId) {
    const elapsed = (Date.now() - new Date(data.editing_since).getTime()) / 60000;
    if (elapsed < LOCK_TIMEOUT_MIN) {
      return { ok: false, editingBy: data.editing_by };
    }
  }

  await supabase.from("timelines").update({
    editing_by:    sessionId,
    editing_since: new Date().toISOString(),
  }).eq("id", timelineId);

  return { ok: true };
}

export async function releaseEditLock(timelineId: string, sessionId: string): Promise<void> {
  await supabase.from("timelines")
    .update({ editing_by: null, editing_since: null })
    .eq("id", timelineId)
    .eq("editing_by", sessionId);
}

export async function renewEditLock(timelineId: string, sessionId: string): Promise<void> {
  await supabase.from("timelines")
    .update({ editing_since: new Date().toISOString() })
    .eq("id", timelineId)
    .eq("editing_by", sessionId);
}

// ── 타임라인 데이터 (L1/L2/L3 JSON) ───────────────────────────────────
export async function loadTimelineData(timelineId: string): Promise<unknown[] | null> {
  const { data } = await supabase
    .from("timeline_data")
    .select("data")
    .eq("timeline_id", timelineId)
    .single();
  return data?.data ?? null;
}

export async function saveTimelineData(timelineId: string, items: unknown[]): Promise<void> {
  await supabase.from("timeline_data").upsert(
    { timeline_id: timelineId, data: items, updated_at: new Date().toISOString() },
    { onConflict: "timeline_id" }
  );
  await supabase.from("timelines")
    .update({ last_edited_at: new Date().toISOString() })
    .eq("id", timelineId);
}

// ── 세션 ID (편집 잠금 식별자) ─────────────────────────────────────────
export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let sid = sessionStorage.getItem("si-session-id");
  if (!sid) {
    sid = `usr-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("si-session-id", sid);
  }
  return sid;
}

export function generateTimelineId(): string {
  return `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
