import { describe, expect, it } from "vitest";
import { EXPORT_EXTENSION, EXPORT_MIME } from "@/config/constants";
import { compositeOver } from "@/engine/color";
import { buildExportFilename, flattenOntoWhite } from "@/engine/export";
import type { Rgba } from "@/engine/types";
import { BLACK, bufferFromMap, pixelAt, RED, TRANSPARENT, WHITE } from "../helpers/pixels";

const HALF_RED: Rgba = { r: 255, g: 0, b: 0, a: 128 };

describe("buildExportFilename", () => {
  it("ローカル時刻から drawing-YYYYMMDD-HHmmss.png を作る", () => {
    // 2026-09-10 19:05:03（ローカル時刻）。月は 0 始まりなので 8 = 9 月。
    expect(buildExportFilename(new Date(2026, 8, 10, 19, 5, 3))).toBe(
      "drawing-20260910-190503.png",
    );
  });

  it("1 桁の月・日・時・分・秒をゼロ埋めする", () => {
    expect(buildExportFilename(new Date(2026, 0, 2, 3, 4, 5))).toBe("drawing-20260102-030405.png");
  });

  it("年末の 23:59:59 を正しく整形する", () => {
    expect(buildExportFilename(new Date(2026, 11, 31, 23, 59, 59))).toBe(
      "drawing-20261231-235959.png",
    );
  });

  it("真夜中 00:00:00 を正しく整形する", () => {
    expect(buildExportFilename(new Date(2026, 5, 1, 0, 0, 0))).toBe("drawing-20260601-000000.png");
  });

  it("拡張子が書き出し形式の設定と一致する", () => {
    const filename = buildExportFilename(new Date(2026, 8, 10, 19, 5, 3));

    expect(filename.endsWith(`.${EXPORT_EXTENSION}`)).toBe(true);
    expect(EXPORT_MIME).toBe(`image/${EXPORT_EXTENSION}`);
  });
});

describe("flattenOntoWhite", () => {
  it("完全透明なピクセルは不透明な白になる", () => {
    const buffer = bufferFromMap(["T"], { T: TRANSPARENT });

    const result = flattenOntoWhite(buffer);

    expect(pixelAt(result, 0, 0)).toEqual(WHITE);
  });

  it("不透明度 50% の赤は (255, 127, 127, 255) になる", () => {
    const buffer = bufferFromMap(["H"], { H: HALF_RED });

    const result = flattenOntoWhite(buffer);

    expect(pixelAt(result, 0, 0)).toEqual({ r: 255, g: 127, b: 127, a: 255 });
  });

  it("すでに不透明なピクセルは変化しない", () => {
    const buffer = bufferFromMap(["RB", "BW"], { R: RED, B: BLACK, W: WHITE });

    const result = flattenOntoWhite(buffer);

    expect(pixelAt(result, 0, 0)).toEqual(RED);
    expect(pixelAt(result, 1, 0)).toEqual(BLACK);
    expect(pixelAt(result, 0, 1)).toEqual(BLACK);
    expect(pixelAt(result, 1, 1)).toEqual(WHITE);
  });

  it("すべてのピクセルが不透明（アルファ 255）になる", () => {
    const buffer = bufferFromMap(["TH", "RT"], { T: TRANSPARENT, H: HALF_RED, R: RED });

    const result = flattenOntoWhite(buffer);

    for (let y = 0; y < result.height; y++) {
      for (let x = 0; x < result.width; x++) {
        expect(pixelAt(result, x, y).a).toBe(255);
      }
    }
  });

  it("compositeOver で白の上に重ねた結果と一致する", () => {
    const samples: Rgba[] = [
      TRANSPARENT,
      HALF_RED,
      RED,
      BLACK,
      { r: 12, g: 200, b: 90, a: 64 },
      { r: 12, g: 200, b: 90, a: 200 },
    ];
    const palette = Object.fromEntries(samples.map((color, index) => [String(index), color]));
    const buffer = bufferFromMap([samples.map((_, index) => String(index)).join("")], palette);

    const result = flattenOntoWhite(buffer);

    samples.forEach((sample, index) => {
      expect(pixelAt(result, index, 0)).toEqual(compositeOver(sample, WHITE));
    });
  });

  it("元のバッファを変更しない", () => {
    const buffer = bufferFromMap(["T"], { T: TRANSPARENT });

    flattenOntoWhite(buffer);

    expect(pixelAt(buffer, 0, 0)).toEqual(TRANSPARENT);
  });

  it("寸法を保ったまま新しいバッファを返す", () => {
    const buffer = bufferFromMap(["TT", "TT", "TT"], { T: TRANSPARENT });

    const result = flattenOntoWhite(buffer);

    expect(result.data).not.toBe(buffer.data);
    expect(result.width).toBe(2);
    expect(result.height).toBe(3);
  });
});
