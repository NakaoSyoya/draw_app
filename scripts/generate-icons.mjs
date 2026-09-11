/**
 * PWA アイコンを生成する。
 *
 * 外部の素材を持ち込まず、コードで描いて PNG を書き出す（SPEC §16 #10）。
 * ビルド時のみに使うスクリプトで、アプリの実行時には関係しない。
 *
 *   node scripts/generate-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const INK = "#2563eb";
const PAPER = "#ffffff";

/**
 * アイコンの絵柄: 白い紙の上に、青い筆跡が一本走っている。
 *
 * @param {number} size 一辺のピクセル数
 * @param {boolean} maskable 端が切り取られる前提で内側に余白を取るか
 */
function drawIcon(size, maskable) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // maskable は円形などに切り抜かれるため、絵柄を中央 80% に収める。
  const safe = maskable ? size * 0.1 : 0;
  const inner = size - safe * 2;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);

  if (!maskable) {
    // 通常アイコンは紙の縁を描いて「キャンバス」らしく見せる。
    ctx.strokeStyle = "#d4d4d4";
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.strokeRect(
      ctx.lineWidth / 2,
      ctx.lineWidth / 2,
      size - ctx.lineWidth,
      size - ctx.lineWidth,
    );
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = inner * 0.13;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(safe + inner * 0.2, safe + inner * 0.68);
  ctx.quadraticCurveTo(
    safe + inner * 0.38,
    safe + inner * 0.2,
    safe + inner * 0.55,
    inner * 0.5 + safe,
  );
  ctx.quadraticCurveTo(
    safe + inner * 0.7,
    safe + inner * 0.76,
    safe + inner * 0.82,
    safe + inner * 0.34,
  );
  ctx.stroke();

  return canvas.encode("png");
}

const ICONS = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
];

await mkdir(OUTPUT_DIR, { recursive: true });

for (const { file, size, maskable } of ICONS) {
  const png = await drawIcon(size, maskable);
  await writeFile(join(OUTPUT_DIR, file), png);
  console.log(`${file} (${size}x${size}${maskable ? ", maskable" : ""}) ${png.length} bytes`);
}
