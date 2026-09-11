/**
 * サービスワーカーを `public/sw.js` に束ねる。
 *
 * Next.js のビルドとは独立した小さな手順にしてある。
 * フレームワークのプラグインに依存しないため、`output: "export"` の構成でも
 * 確実に静的ファイルとして出力される。
 *
 *   node scripts/build-sw.mjs
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(ROOT, "src", "pwa", "sw.ts");
const OUTPUT = join(ROOT, "public", "sw.js");

/**
 * キャッシュ世代の識別子。
 * サービスワーカーのソースが変わったときだけ変わるようにして、
 * 中身が同じなら不要なキャッシュ破棄が起きないようにする。
 */
async function computeVersion() {
  const sources = await Promise.all(
    [ENTRY, join(ROOT, "src", "pwa", "strategy.ts")].map((file) => readFile(file)),
  );

  return createHash("sha256").update(Buffer.concat(sources)).digest("hex").slice(0, 12);
}

const version = await computeVersion();

await build({
  entryPoints: [ENTRY],
  outfile: OUTPUT,
  bundle: true,
  format: "iife",
  target: "es2022",
  minify: true,
  define: { __SW_VERSION__: JSON.stringify(version) },
  logLevel: "warning",
});

console.log(`public/sw.js を生成しました (version: ${version})`);
