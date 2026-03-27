"use client";
import { Year2026Highlight, Flag } from "@/lib/analyze";

interface Props { data: Year2026Highlight[] }

const severityStyle: Record<Flag["severity"], string> = {
  danger:  "bg-red-50 text-red-700 border border-red-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  info:    "bg-gray-50 text-gray-600 border border-gray-200",
};

const severityIcon: Record<Flag["severity"], string> = {
  danger: "🔴", warning: "🟡", info: "ℹ️",
};

export default function Highlights2026({ data }: Props) {
  if (!data.length) {
    return (
      <div className="text-gray-400 text-sm flex items-center gap-2">
        <span>✅</span> 2026년 구매 건 없음
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((h, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
          {/* 헤더 */}
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <span className="text-gray-500 text-xs">{h.orderDate}</span>
              <span className="text-gray-400 text-xs ml-3">{h.orderNumber}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {h.flags.length === 0 && (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1">
                  ✅ 이상 없음
                </span>
              )}
              {h.flags.map((f, fi) => (
                <span key={fi} className={`text-xs rounded-full px-3 py-1 ${severityStyle[f.severity]}`}>
                  {severityIcon[f.severity]} {f.label}
                </span>
              ))}
            </div>
          </div>

          {/* 상세 수치 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <div className="text-gray-400 text-xs mb-0.5">수량</div>
              <div className="text-gray-900 font-semibold">{h.quantity.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <div className="text-gray-400 text-xs mb-0.5">총금액</div>
              <div className="text-gray-900 font-semibold">{h.amount.toLocaleString()}원</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <div className="text-gray-400 text-xs mb-0.5">단가</div>
              <div className="text-gray-900 font-semibold">{h.unitPrice.toLocaleString()}원</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <div className="text-gray-400 text-xs mb-0.5">부서</div>
              <div className="text-gray-900 font-semibold text-xs leading-tight">{h.department}</div>
            </div>
          </div>

          {/* 부가 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
            <div><span className="text-gray-400">제조사: </span>{h.manufacturer || "-"}</div>
            <div><span className="text-gray-400">주문자: </span>{h.requester || "-"}</div>
            {h.spec && (
              <div className="sm:col-span-2 truncate">
                <span className="text-gray-400">규격: </span>
                <span title={h.spec}>{h.spec.slice(0, 100)}{h.spec.length > 100 ? "…" : ""}</span>
              </div>
            )}
            {h.purchaseReason && (
              <div className="sm:col-span-2">
                <span className="text-gray-400">구매사유: </span>{h.purchaseReason}
              </div>
            )}
          </div>

          {/* 플래그 설명 */}
          {h.flags.length > 0 && (
            <div className="space-y-1">
              {h.flags.map((f, fi) => (
                <div key={fi} className={`text-xs rounded-lg px-3 py-2 ${severityStyle[f.severity]}`}>
                  <span className="font-semibold">{severityIcon[f.severity]} {f.label}:</span> {f.detail}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
