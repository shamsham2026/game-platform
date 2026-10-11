import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "課練遊 — 個人化練習遊戲",
  description: "以班別學號進入，按進度與掌握度推薦課題，隨機出題持續練習。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
