import type { Metadata } from "next";
import "./globals.css";
import AntdRegistry from "./AntdRegistry";
import ClientLayout from "./components/ClientLayout";

export const metadata: Metadata = {
  title: "AI 对话助手",
  description: "智能对话助手",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body style={{ height: "100%", margin: 0, overflow: "hidden" }}>
        <AntdRegistry>
          <ClientLayout>{children}</ClientLayout>
        </AntdRegistry>
      </body>
    </html>
  );
}
