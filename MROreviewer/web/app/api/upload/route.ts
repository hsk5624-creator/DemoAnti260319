import fs from "fs";
import path from "path";
import { getDataDir, invalidateCache } from "@/lib/dataStore";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return Response.json({ error: "파일이 없습니다" }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase();
    if (ext !== ".xls" && ext !== ".xlsx") {
      return Response.json({ error: "xls 또는 xlsx 파일만 업로드 가능합니다" }, { status: 400 });
    }

    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const savePath = path.join(dataDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(savePath, buffer);

    invalidateCache();

    return Response.json({ ok: true, name: file.name });
  } catch (e) {
    console.error("[upload]", e);
    return Response.json({ error: "업로드 실패" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { name } = await request.json() as { name: string };
    if (!name) return Response.json({ error: "name required" }, { status: 400 });

    const dataDir = getDataDir();
    const target = path.join(dataDir, name);

    // 이력 데이터(2024/2025)는 삭제 금지
    if (name.includes("2024") || name.includes("2025")) {
      return Response.json({ error: "기준 이력 파일은 삭제할 수 없습니다" }, { status: 403 });
    }

    if (!fs.existsSync(target)) {
      return Response.json({ error: "파일이 없습니다" }, { status: 404 });
    }

    fs.unlinkSync(target);
    invalidateCache();

    return Response.json({ ok: true });
  } catch (e) {
    console.error("[delete]", e);
    return Response.json({ error: "삭제 실패" }, { status: 500 });
  }
}
