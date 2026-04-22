import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PPQR Agent",
  description: "PPQR 자동 데이터 매핑 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
