import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseUtilizationBuffer } from '@/lib/parseUtilizationBuffer';

const DATA_DIR = path.resolve(process.cwd(), '..', 'data', '가동률');

function parseFileLabel(name: string): string {
  const m = name.match(/(\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1].slice(2)}.${m[2]}.${m[3]}`;
  return name.replace(/\.[^/.]+$/, '');
}

/** 파일 목록 메타데이터만 반환 (XLSX 파싱 없음 → 빠름) */
export async function GET() {
  try {
    if (!fs.existsSync(DATA_DIR)) return NextResponse.json([]);
    const fileNames = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.xlsx'));
    const metas = fileNames.map((name) => ({ name, label: parseFileLabel(name) }));
    return NextResponse.json(metas);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

/** 특정 label의 파일을 파싱해서 반환 (온디맨드) */
export async function POST(req: Request) {
  try {
    const { label } = await req.json() as { label: string };
    if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 });

    if (!fs.existsSync(DATA_DIR)) return NextResponse.json({ error: 'no data dir' }, { status: 404 });
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.xlsx'));
    const fileName = files.find((f) => parseFileLabel(f) === label);
    if (!fileName) return NextResponse.json({ error: 'file not found' }, { status: 404 });

    const buffer = fs.readFileSync(path.join(DATA_DIR, fileName));
    const file = parseUtilizationBuffer(buffer.buffer as ArrayBuffer, fileName);
    return NextResponse.json(file);
  } catch {
    return NextResponse.json({ error: 'parse failed' }, { status: 500 });
  }
}

/** 파일 삭제 */
export async function DELETE(req: Request) {
  try {
    const { label } = await req.json() as { label: string };
    if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 });

    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.xlsx'));
    const target = files.find((f) => parseFileLabel(f) === label);
    if (!target) return NextResponse.json({ error: 'file not found' }, { status: 404 });

    fs.unlinkSync(path.join(DATA_DIR, target));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
}
