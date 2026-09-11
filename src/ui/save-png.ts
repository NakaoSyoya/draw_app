import { putPixels } from "@/canvas/renderer";
import { EXPORT_MIME } from "@/config/constants";
import type { PixelBuffer } from "@/engine/types";

/**
 * Blob をローカルにダウンロードさせる。
 * サーバーへは一切送らない（`a[download]` によるブラウザ標準の保存）。
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * ピクセルバッファを PNG にして保存する。
 *
 * 一時キャンバスに載せてからエンコードする。表示用のキャンバスを直接使わないのは、
 * 書き出し内容（背景を白に合成済み）と画面の状態を切り離すため。
 */
export function savePng(buffer: PixelBuffer, filename: string): void {
  const canvas = document.createElement("canvas");
  canvas.width = buffer.width;
  canvas.height = buffer.height;

  const ctx = canvas.getContext("2d");
  if (ctx === null) return;

  putPixels(ctx, buffer);
  canvas.toBlob((blob) => {
    if (blob === null) return;

    downloadBlob(blob, filename);
  }, EXPORT_MIME);
}
