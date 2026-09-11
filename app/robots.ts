import type { MetadataRoute } from "next";

// `output: "export"` ではメタデータルートも静的に出力する必要がある。
export const dynamic = "force-static";

/**
 * 公開サイトとしての `robots.txt`。
 * 1 ページしかなく、隠したい情報も持たないため全面的に許可する。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
  };
}
