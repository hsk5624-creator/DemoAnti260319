import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseSalesBuffer } from '@/lib/parseSalesBuffer';
import { SalesFileMeta } from '@/lib/salesTypes';

const DATA_DIR = path.resolve(process.cwd(), '..', 'data', '매출');

function parseFileNameDate(name: string): SalesFileMeta {
  const match = name.match(/\((\d{2})\.(\d{2})\.(\d{2})/);
  if (match) {
    return {
      name,
      label: `${match[1]}.${match[2]}.${match[3]}`,
      refYear:  2000 + parseInt(match[1]),
      refMonth: parseInt(match[2]),
      refDay:   parseInt(match[3]),
    };
  }
  return { name, label: name.replace(/\.[^/.]+$/, ''), refYear: 0, refMonth: 0, refDay: 0 };
}

/** 파일 목록만 반환 (XLSX 파싱 없음 → 빠름) */
export async function GET() {
  try {
    if (!fs.existsSync(DATA_DIR)) return NextResponse.json([]);
    const fileNames = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.xlsx'));
    const metas: SalesFileMeta[] = fileNames.map(parseFileNameDate).filter((m) => m.refYear > 0);
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
    const fileName = files.find((f) => {
      const m = f.match(/\((\d{2})\.(\d{2})\.(\d{2})/);
      return m ? `${m[1]}.${m[2]}.${m[3]}` === label : false;
    });
    if (!fileName) return NextResponse.json({ error: 'file not found' }, { status: 404 });

    const buffer = fs.readFileSync(path.join(DATA_DIR, fileName));
    const salesFile = parseSalesBuffer(buffer.buffer as ArrayBuffer, fileName);
    return NextResponse.json(salesFile);
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
    const target = files.find((f) => {
      const m = f.match(/\((\d{2})\.(\d{2})\.(\d{2})/);
      return m ? `${m[1]}.${m[2]}.${m[3]}` === label : false;
    });
    if (!target) return NextResponse.json({ error: 'file not found' }, { status: 404 });

    fs.unlinkSync(path.join(DATA_DIR, target));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
}
