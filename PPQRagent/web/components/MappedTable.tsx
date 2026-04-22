"use client";

type Source = { file: string; sheet: string; row: number };
type TableRow = { data: Record<string, string>; sources: Source[]; review_required: boolean; review_reason: string };
type TableData = { id: string; title: string; columns: string[]; rows: TableRow[] };

interface Props {
  table: TableData;
  onSelectSource: (s: Source) => void;
  selectedSource: Source | null;
}

export default function MappedTable({ table, onSelectSource, selectedSource }: Props) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead className="sticky top-0 z-10">
        <tr className="bg-slate-900">
          {table.columns.map(col => (
            <th key={col} className="px-3 py-2 text-left text-slate-300 font-semibold border-b border-slate-600 whitespace-nowrap">
              {col}
            </th>
          ))}
          <th className="px-3 py-2 text-left text-slate-300 font-semibold border-b border-slate-600 w-20">출처</th>
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, i) => {
          const isSelected = selectedSource && row.sources.some(
            s => s.file === selectedSource.file && s.row === selectedSource.row
          );
          const rowBg = row.review_required
            ? "bg-amber-950/30 hover:bg-amber-950/50"
            : "hover:bg-slate-700/40";
          const border = isSelected ? "outline outline-1 outline-[#00733C]" : "";

          return (
            <tr key={i} className={`border-b border-slate-700/50 ${rowBg} ${border} transition-colors`}>
              {table.columns.map(col => (
                <td key={col} className="px-3 py-2 text-slate-200 align-top">
                  <div className="flex items-start gap-1">
                    {col === table.columns[0] && row.review_required && (
                      <span className="text-amber-400 shrink-0" title={row.review_reason}>⚠</span>
                    )}
                    <span className="leading-relaxed">{row.data[col] ?? ""}</span>
                  </div>
                  {col === table.columns[0] && row.review_required && (
                    <p className="text-amber-500/80 text-[10px] mt-0.5 leading-tight">{row.review_reason}</p>
                  )}
                </td>
              ))}
              {/* 출처 버튼 */}
              <td className="px-2 py-2 align-top">
                <div className="flex flex-col gap-1">
                  {row.sources.map((src, si) => (
                    <button
                      key={si}
                      onClick={() => onSelectSource(src)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors text-left truncate max-w-[80px]
                        ${selectedSource?.file === src.file && selectedSource?.row === src.row
                          ? "text-white"
                          : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"}`}
                      style={selectedSource?.file === src.file && selectedSource?.row === src.row
                        ? { background: "var(--brand)", borderColor: "var(--brand)" } : {}}
                      title={`${src.file} 행${src.row}`}
                    >
                      행{src.row}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
