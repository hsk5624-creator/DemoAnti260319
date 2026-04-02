import fs from "fs";
import path from "path";
import { MRORecord, parseExcelFile } from "./parseExcel";

const DATA_DIR = path.resolve(process.cwd(), "data");

// 전체 레코드 캐시 (프로세스 내 메모리)
let _cache: MRORecord[] | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 30_000; // 30초 캐시

export function getDataDir(): string {
  return DATA_DIR;
}

/** data 폴더의 모든 xls/xlsx 파일을 읽어 MRORecord 배열 반환 */
export function loadAllRecords(forceReload = false): MRORecord[] {
  const now = Date.now();
  if (_cache && !forceReload && now - _cacheTime < CACHE_TTL_MS) return _cache;

  if (!fs.existsSync(DATA_DIR)) {
    _cache = [];
    _cacheTime = now;
    return _cache;
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => (f.endsWith(".xls") || f.endsWith(".xlsx")) && !f.includes("2024"));

  const all: MRORecord[] = [];
  for (const f of files) {
    try {
      const records = parseExcelFile(path.join(DATA_DIR, f)).filter((r) => r.year !== 2024);
      all.push(...records);
    } catch (e) {
      console.error(`[dataStore] Failed to parse ${f}:`, e);
    }
  }

  _cache = all;
  _cacheTime = now;
  return _cache;
}

/** 캐시 무효화 (파일 업로드 후 호출) */
export function invalidateCache() {
  _cache = null;
  _cacheTime = 0;
}

/** 중복 없는 상품명 목록 반환 */
export function getAllProductNames(): string[] {
  const records = loadAllRecords();
  return [...new Set(records.map((r) => r.productName).filter(Boolean))].sort();
}

/** data 폴더의 파일 목록 반환 (2026년 파일 구분 포함) */
export function getFileList(): { name: string; isHistory: boolean }[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => (f.endsWith(".xls") || f.endsWith(".xlsx")) && !f.includes("2024"))
    .map((name) => ({
      name,
      isHistory: name.includes("2025"),
    }));
}
