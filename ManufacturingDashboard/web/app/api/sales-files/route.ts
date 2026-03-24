import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseSalesBuffer } from '@/lib/parseSalesBuffer';

const DATA_DIR = path.resolve(process.cwd(), '..', 'data', '매출');

export async function GET() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      return NextResponse.json([]);
    }

    const fileNames = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.xlsx'));
    const results = [];

    for (const fileName of fileNames) {
      try {
        const filePath = path.join(DATA_DIR, fileName);
        const buffer = fs.readFileSync(filePath);
        const salesFile = parseSalesBuffer(buffer.buffer as ArrayBuffer, fileName);
        if (salesFile.rows.length > 0) {
          results.push(salesFile);
        }
      } catch {
        // Skip files that fail to parse
      }
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
