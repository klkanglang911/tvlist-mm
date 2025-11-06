import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "电视直播源管理系统",
  description: "专业的直播源管理工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
