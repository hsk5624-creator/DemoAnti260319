'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { MonthlyPoint, fmt } from '@/lib/aggregate';

interface Props {
  data: MonthlyPoint[];
  currentMonth: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const plan = payload.find((p: any) => p.dataKey === 'cumulPlan');
  const actual = payload.find((p: any) => p.dataKey === 'cumulActual');
  const planVal: number = plan?.value ?? 0;
  const actualVal: number = actual?.value ?? null;
  const diff = actualVal != null ? actualVal - planVal : null;
  const rate = planVal && actualVal != null ? (actualVal / planVal) * 100 : null;

  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs space-y-1 shadow-xl">
      <p className="font-semibold text-slate-200">{label} 누적</p>
      <p className="text-slate-400">
        누적 계획: <span className="text-blue-300">{fmt(planVal)}</span>
      </p>
      {actualVal != null && (
        <>
          <p className="text-slate-400">
            누적 실적: <span className="text-emerald-300">{fmt(actualVal)}</span>
          </p>
          <p className="text-slate-400">
            차이:{' '}
            <span className={diff! > 0 ? 'text-red-400' : 'text-blue-400'}>
              {diff! > 0 ? '+' : ''}{fmt(diff!)}
            </span>
          </p>
          <p className="text-slate-400">
            집행률: <span className="text-white font-semibold">{rate!.toFixed(1)}%</span>
          </p>
        </>
      )}
    </div>
  );
}

export default function CumulativeChart({ data, currentMonth }: Props) {
  if (!data.length) return null;

  const currentPoint = data.find((d) => d.month === currentMonth);
  const planVal = currentPoint?.cumulPlan ?? 0;
  const actualVal = currentPoint?.cumulActual ?? 0;
  const diff = actualVal - planVal;
  const rate = planVal ? (actualVal / planVal) * 100 : 0;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">월간 누적 계획 vs 실적</h2>
          <p className="text-xs text-slate-500 mt-0.5">연간 사업계획 기준 누적 집계</p>
        </div>
        {currentPoint && (
          <div className="text-right">
            <p className="text-xs text-slate-400">
              {currentMonth}월 기준 &nbsp;·&nbsp;
              누적 계획 <span className="text-blue-300">{fmt(planVal, true)}</span>
              &nbsp;vs&nbsp;
              누적 실적 <span className="text-emerald-300">{fmt(actualVal, true)}</span>
            </p>
            <p className={`text-sm font-bold mt-0.5 ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
              {diff > 0 ? '▲' : '▼'} {fmt(Math.abs(diff), true)} &nbsp;·&nbsp; 집행률 {rate.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => fmt(v, true)}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => value === 'cumulPlan' ? '누적 계획' : '누적 실적'}
              wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
            />
            <ReferenceLine
              x={`${currentMonth}월`}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: '현재', position: 'top', fill: '#f59e0b', fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="cumulPlan"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#60a5fa' }}
              name="cumulPlan"
            />
            <Line
              type="monotone"
              dataKey="cumulActual"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ r: 3, fill: '#34d399' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              name="cumulActual"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
