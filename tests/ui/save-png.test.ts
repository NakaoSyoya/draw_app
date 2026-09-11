import { createCanvas, loadImage } from "@napi-rs/canvas";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readPixels } from "@/canvas/renderer";
import { EXPORT_MIME } from "@/config/constants";
import type { PixelBuffer } from "@/engine/types";
import { savePng } from "@/ui/save-png";
import { BLACK, bufferFromMap, pixelAt, RED, WHITE } from "../helpers/pixels";

/**
 * `savePng` の検証。
 *
 * キャンバスと PNG エンコードは `@napi-rs/canvas` の実装をそのまま使い、
 * 書き出した PNG を読み戻してピクセルを確認する。
 * 差し替えるのは `document.createElement` と `URL` の 2 メソッド
 * ＝「ブラウザのダウンロード契機」だけ（`CLAUDE.md` のテスト方針）。
 */

interface Recorded {
  readonly anchor: { href: string; download: string; clicks: number };
  readonly blobs: Blob[];
  readonly revoked: string[];
}

function stubDownload(): Recorded {
  const recorded: Recorded = {
    anchor: { href: "", download: "", clicks: 0 },
    blobs: [],
    revoked: [],
  };

  vi.stubGlobal("document", {
    createElement(tag: string) {
      if (tag === "canvas") return createCanvas(1, 1);
      if (tag === "a") {
        return {
          href: "",
          download: "",
          click() {
            recorded.anchor.href = this.href;
            recorded.anchor.download = this.download;
            recorded.anchor.clicks += 1;
          },
        };
      }
      throw new Error(`想定外の要素です: ${tag}`);
    },
  });

  // URL クラス自体は差し替えず、静的メソッドだけを観測する。
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    recorded.blobs.push(blob as Blob);
    return `blob:test/${recorded.blobs.length}`;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => {
    recorded.revoked.push(url);
  });

  return recorded;
}

/** `toBlob` はコールバックで返るため、ダウンロードが起きるまで待つ。 */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const PALETTE = { W: WHITE, R: RED, B: BLACK };

describe("savePng", () => {
  it("指定したファイル名でダウンロードを 1 回だけ起こす", async () => {
    const recorded = stubDownload();

    savePng(bufferFromMap(["WR", "BW"], PALETTE), "drawing-20260911-120000.png");
    await flush();

    expect(recorded.anchor.clicks).toBe(1);
    expect(recorded.anchor.download).toBe("drawing-20260911-120000.png");
    expect(recorded.anchor.href.startsWith("blob:")).toBe(true);
  });

  it("使い終わったオブジェクト URL を解放する（メモリを残さない）", async () => {
    const recorded = stubDownload();

    savePng(bufferFromMap(["W"], PALETTE), "drawing.png");
    await flush();

    expect(recorded.revoked).toHaveLength(1);
  });

  it("PNG として書き出す", async () => {
    const recorded = stubDownload();

    savePng(bufferFromMap(["WR"], PALETTE), "drawing.png");
    await flush();

    const blob = recorded.blobs[0];
    if (blob === undefined) throw new Error("Blob が作られませんでした");

    const bytes = new Uint8Array(await blob.arrayBuffer());
    // PNG のシグネチャ（\x89PNG\r\n\x1a\n）で始まる。
    expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(EXPORT_MIME).toBe("image/png");
  });

  it("書き出した PNG を読み戻すと元のピクセルと一致する", async () => {
    const recorded = stubDownload();
    const buffer: PixelBuffer = bufferFromMap(["WRB", "BWR"], PALETTE);

    savePng(buffer, "drawing.png");
    await flush();

    const blob = recorded.blobs[0];
    if (blob === undefined) throw new Error("Blob が作られませんでした");

    const image = await loadImage(Buffer.from(await blob.arrayBuffer()));
    const canvas = createCanvas(buffer.width, buffer.height);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    ctx.drawImage(image as unknown as CanvasImageSource, 0, 0);

    const restored = readPixels(ctx, { width: buffer.width, height: buffer.height });
    expect(pixelAt(restored, 0, 0)).toEqual(WHITE);
    expect(pixelAt(restored, 1, 0)).toEqual(RED);
    expect(pixelAt(restored, 2, 0)).toEqual(BLACK);
    expect(pixelAt(restored, 0, 1)).toEqual(BLACK);
    expect(pixelAt(restored, 1, 1)).toEqual(WHITE);
    expect(pixelAt(restored, 2, 1)).toEqual(RED);
  });
});
