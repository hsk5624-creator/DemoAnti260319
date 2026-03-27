"use client";

import { useState, useEffect } from "react";
import { ReviewItem } from "@/lib/reviewTypes";

interface Props {
  onChange: (item: ReviewItem | null) => void;
}

export default function ReviewInput({ onChange }: Props) {
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");  // 단가

  useEffect(() => {
    const q = parseFloat(qty.replace(/,/g, ""));
    const p = parseFloat(price.replace(/,/g, ""));
    if (q > 0 && p > 0) {
      onChange({ quantity: q, amount: Math.round(q * p), unitPrice: Math.round(p) });
    } else {
      onChange(null);
    }
  }, [qty, price, onChange]);

  const totalAmount = (() => {
    const q = parseFloat(qty.replace(/,/g, ""));
    const p = parseFloat(price.replace(/,/g, ""));
    if (q > 0 && p > 0) return Math.round(q * p);
    return null;
  })();

  return (
    <div className="bg-green-50 border border-[#b3d9c6] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-4 rounded-full bg-[#00733C] inline-block" />
        <h3 className="text-gray-700 font-semibold text-sm">검토 중인 구매 건 입력</h3>
        {(qty || price) && (
          <button
            onClick={() => { setQty(""); setPrice(""); }}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
          >
            × 초기화
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* 수량 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">수량</label>
          <input
            type="text"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm
              text-gray-900 placeholder-gray-400 focus:outline-none
              focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C] text-right"
          />
        </div>

        {/* 단가 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">단가 (원)</label>
          <input
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm
              text-gray-900 placeholder-gray-400 focus:outline-none
              focus:border-[#00733C] focus:ring-1 focus:ring-[#00733C] text-right"
          />
        </div>

        {/* 총금액 (자동 계산) */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">총금액 (자동 계산)</label>
          <div className={`w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-right border
            ${totalAmount
              ? "bg-white border-[#00733C] text-[#00733C]"
              : "bg-gray-50 border-gray-200 text-gray-400"
            }`}>
            {totalAmount ? `${totalAmount.toLocaleString()}원` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
