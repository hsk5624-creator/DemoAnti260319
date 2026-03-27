"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DeptStat } from "@/lib/analyze";

interface Props { data: DeptStat[] }

const COLORS = [
  "#00733C","#33996a","#66b393","#99ccbb","#006633",
  "#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFmt = (v: any, _: any, p: any) => [
  `${Number(v).toLocaleString()}원 (${p?.payload?.count ?? 0}건)`,
  p?.name ?? "",
];

export default function DepartmentChart({ data }: Props) {
  if (!data.length) return <p className="text-gray-400 text-sm">데이터 없음</p>;

  const pieData = data.slice(0, 10).map((d) => ({
    name: `[${d.plant}] ${d.department}`,
    value: d.totalAmount,
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={pieData} dataKey="value" nameKey="name" cx="45%" cy="50%"
          outerRadius={100} innerRadius={50} paddingAngle={2}>
          {pieData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
          formatter={tooltipFmt}
        />
        <Legend wrapperStyle={{ color: "#6b7280", fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
