"use client";

interface Props {
  specs: string[];
}

export default function SpecInfo({ specs }: Props) {
  if (!specs.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-4 rounded-full bg-[#00733C] inline-block" />
        <h3 className="text-gray-700 font-semibold text-sm">
          규격 정보
          <span className="ml-2 text-gray-400 font-normal text-xs">{specs.length}개 규격 발견</span>
        </h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {specs.map((spec) => (
          <span
            key={spec}
            title={spec}
            className="px-3 py-1.5 rounded-lg text-xs bg-gray-50 text-gray-500 border border-gray-200 break-all"
          >
            {spec}
          </span>
        ))}
      </div>
      <p className="text-gray-400 text-xs mt-3 leading-relaxed">
        동일 상품명에 여러 규격이 존재합니다. 구매 시 규격을 확인하세요.
      </p>
    </div>
  );
}
