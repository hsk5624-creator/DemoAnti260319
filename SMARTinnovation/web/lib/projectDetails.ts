import { supabase } from "./supabase";

export interface CustomField {
  key: string;
  value: string;
}

export interface ProjectDetailData {
  description: string;       // 프로젝트 개요
  bom: string;               // BOM 정보
  batchSize: string;         // 배치사이즈
  targetProduct: string;     // 대상 제품
  customFields: CustomField[]; // 사용자 정의 필드
}

export interface ProjectDetail {
  id?: number;
  timelineId: string;
  level1Id: string;
  data: ProjectDetailData;
  updatedAt?: string;
}

export const EMPTY_DETAIL_DATA: ProjectDetailData = {
  description: "",
  bom: "",
  batchSize: "",
  targetProduct: "",
  customFields: [],
};

export async function loadProjectDetails(timelineId: string): Promise<ProjectDetail[]> {
  const { data, error } = await supabase
    .from("project_details")
    .select("*")
    .eq("timeline_id", timelineId);

  if (error) {
    console.warn("project_details 테이블 없음 또는 오류:", error.message);
    return [];
  }
  return (data ?? []).map(row => ({
    id: row.id,
    timelineId: row.timeline_id,
    level1Id: row.level1_id,
    data: row.data ?? EMPTY_DETAIL_DATA,
    updatedAt: row.updated_at,
  }));
}

export async function saveProjectDetail(
  timelineId: string,
  level1Id: string,
  detailData: ProjectDetailData,
): Promise<void> {
  await supabase.from("project_details").upsert(
    {
      timeline_id: timelineId,
      level1_id: level1Id,
      data: detailData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "timeline_id,level1_id" },
  );
}

export async function deleteProjectDetail(timelineId: string, level1Id: string): Promise<void> {
  await supabase
    .from("project_details")
    .delete()
    .eq("timeline_id", timelineId)
    .eq("level1_id", level1Id);
}
