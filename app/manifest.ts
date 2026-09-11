import type { MetadataRoute } from "next";
import { messages } from "@/ui/messages";

// `output: "export"` ではメタデータルートも静的に出力する必要がある。
export const dynamic = "force-static";

/**
 * PWA マニフェスト。
 * ライトテーマ固定なので `theme_color` は白、起動時の背景はアプリの地色に合わせる。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: messages.app.title,
    short_name: messages.app.title,
    description: "ブラウザで完結する自分用スケッチ・ラフ描きアプリ",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#f5f5f5",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
