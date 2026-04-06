"use client";

import { useState, useEffect, useRef } from "react";
import { checkPassword } from "@/lib/auth";

interface Props {
  title?: string;
  description?: string;
  onSuccess: (editorName?: string) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  showName?: boolean;        // 편집자 이름 입력 필드 표시 여부
  defaultName?: string;      // 이전에 입력한 이름 기본값
  checkFn?: (pw: string) => boolean;
}

export default function PasswordModal({
  title = "비밀번호 입력",
  description,
  onSuccess,
  onCancel,
  showCancel = false,
  showName = false,
  defaultName = "",
  checkFn,
}: Props) {
  const [pw,    setPw]    = useState("");
  const [name,  setName]  = useState(defaultName);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const nameRef  = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 이름 필드가 있으면 이름부터, 없으면 비밀번호부터 포커스
    if (showName && !defaultName) {
      nameRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, []);

  function handleSubmit() {
    const verify = checkFn ?? checkPassword;
    if (verify(pw)) {
      setError(false);
      onSuccess(showName ? name.trim() : undefined);
    } else {
      setError(true);
      setShake(true);
      setPw("");
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-xs p-7 ${shake ? "animate-shake" : ""}`}>
        {/* 자물쇠 아이콘 */}
        <div className="w-12 h-12 rounded-2xl bg-[#00733C]/10 flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00733C" strokeWidth={2.2}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>

        <h2 className="text-base font-bold text-gray-900 text-center mb-1">{title}</h2>
        {description && (
          <p className="text-xs text-gray-500 text-center mb-4">{description}</p>
        )}

        {/* 편집자 이름 */}
        {showName && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">편집자 이름</label>
            <input
              ref={nameRef}
              type="text"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") inputRef.current?.focus(); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200"
            />
          </div>
        )}

        {/* 비밀번호 */}
        <div className={showName ? "mt-3" : "mt-4"}>
          {showName && (
            <label className="block text-xs font-medium text-gray-500 mb-1">편집 비밀번호</label>
          )}
          <input
            ref={inputRef}
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false); }}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors
              ${error
                ? "border-red-400 bg-red-50 focus:ring-1 focus:ring-red-300"
                : "border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200"}`}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1.5 text-center">비밀번호가 올바르지 않습니다</p>
        )}

        <div className="mt-4 flex gap-2">
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 font-medium">
              취소
            </button>
          )}
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl bg-[#00733C] text-white text-sm font-bold hover:bg-[#005a2e] transition-colors">
            확인
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.45s ease-in-out; }
      `}</style>
    </div>
  );
}
