import type { NextConfig } from "next";

/**
 * このアプリは完全クライアントサイド。API ルート / Server Actions / SSR を持たないため、
 * `output: "export"` で純粋な静的サイト（out/）としてビルドする。
 * これにより Vercel 上で Serverless / Edge Functions が一切生成されず、
 * Function 実行課金の対象が発生しない（運用コスト 0 の担保）。
 */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  // next/image の最適化はサーバー処理を伴うため無効化（静的エクスポートの要件でもある）。
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
