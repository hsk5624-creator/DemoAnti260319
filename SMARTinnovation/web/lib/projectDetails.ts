import { supabase } from "./supabase";

export interface CustomField {
  key: string;
  value: string;
}

export type TableRow = string[];

export interface TableData {
  headers: string[];
  rows: TableRow[];
}

export function emptyTable(headers: string[]): TableData {
  return { headers, rows: [Array(headers.length).fill("")] };
}

export interface BomData {
  productTable: TableData;   // 제품코드 표
  materialTable: TableData;  // 자재코드 표
}

export interface ProjectDetailData {
  description: string;
  bom: BomData;
  batchSize: TableData;
  targetProduct: string;
  customFields: CustomField[];
}

export interface ProjectDetail {
  id?: number;
  timelineId: string;
  level1Id: string;
  data: ProjectDetailData;
  updatedAt?: string;
}

export const EMPTY_BOM: BomData = {
  productTable:  emptyTable(["제품코드", "제품명", "비고"]),
  materialTable: emptyTable(["구분", "자재코드", "자재명", "제조사", "비고"]),
};

export const EMPTY_DETAIL_DATA: ProjectDetailData = {
  description: "",
  bom: EMPTY_BOM,
  batchSize: emptyTable(["구분", "배치번호", "배치사이즈"]),
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
