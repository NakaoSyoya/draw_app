/**
 * ビルド成果物が外部オリジンを参照していないことを検査する。
 *
 * このアプリは「実行時にネットワーク通信をしない」ことを前提に、
 * コスト 0 とオフライン動作を成り立たせている（CLAUDE.md「コスト 0 の制約」）。
 * 外部 CDN のスクリプトやフォントが紛れ込むと、その前提が静かに崩れる。
 *
 *   node scripts/check-no-external-refs.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "out");
const SCANNED_EXTENSIONS = new Set([".html", ".js", ".css", ".webmanifest", ".json"]);

/** 外部オリジンの URL。プロトコル相対（//example.com）も拾う。 */
const EXTERNAL_URL = /(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#][^\s"'`)]*)?/gi;

/**
 * 実際の通信を起こさない参照は許可する。
 * - `http://www.w3.org/...` は SVG / XML の名前空間（識別子であって取得先ではない）
 * - `https://nextjs.org/...` などはエラーメッセージ中の案内リンク
 * - `schema.org` は構造化データの語彙
 */
const ALLOWED = [
  /^https?:\/\/(?:www\.)?w3\.org\//i,
  /^https?:\/\/schema\.org\//i,
  /^https?:\/\/nextjs\.org\//i,
  /^https?:\/\/react\.dev\//i,
  /^https?:\/\/(?:www\.)?npmjs\.com\//i,
  /^https?:\/\/github\.com\//i,
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

const findings = [];

for await (const file of walk(OUT_DIR)) {
  if (!SCANNED_EXTENSIONS.has(extname(file))) continue;

  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(EXTERNAL_URL)) {
    const url = match[0];
    if (ALLOWED.some((pattern) => pattern.test(url))) continue;

    findings.push(`${relative(ROOT, file)}: ${url}`);
  }
}

if (findings.length > 0) {
  console.error("ビルド成果物に外部オリジンへの参照が含まれています:");
  for (const finding of [...new Set(findings)]) console.error(`  - ${finding}`);
  console.error(
    "\n実行時に外部通信をしない前提が崩れます。参照を取り除くか、意図的なら許可リストに追加してください。",
  );
  process.exit(1);
}

console.log("外部オリジンへの参照はありません。");
