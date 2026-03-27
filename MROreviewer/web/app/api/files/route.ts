import { getFileList } from "@/lib/dataStore";

export async function GET() {
  return Response.json(getFileList());
}
