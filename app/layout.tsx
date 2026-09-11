import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistrar } from "@/pwa/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "お絵描き",
  description: "ブラウザで完結する自分用スケッチ・ラフ描きアプリ",
  applicationName: "お絵描き",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
