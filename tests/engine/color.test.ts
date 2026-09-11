import { describe, expect, it } from "vitest";
import {
  colorDistance,
  compositeOver,
  parseHexColor,
  toHexColor,
  withOpacity,
} from "@/engine/color";
import type { Rgba } from "@/engine/types";

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const RED: Rgba = { r: 255, g: 0, b: 0, a: 255 };
const FULLY_TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

describe("parseHexColor", () => {
  it("#RRGGBB を不透明な RGBA に変換する", () => {
    expect(parseHexColor("#ff8800")).toEqual({ r: 255, g: 136, b: 0, a: 255 });
  });

  it("#RGB の短縮形を各桁 2 倍に展開する", () => {
    expect(parseHexColor("#f80")).toEqual({ r: 255, g: 136, b: 0, a: 255 });
  });

  it("黒と白を正しく変換する", () => {
    expect(parseHexColor("#000000")).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    expect(parseHexColor("#ffffff")).toEqual(WHITE);
  });

  it("大文字と小文字を区別しない", () => {
    expect(parseHexColor("#FF8800")).toEqual(parseHexColor("#ff8800"));
  });

  it.each(["", "#", "#12", "#1234", "#12345", "#1234567", "#gggggg", "ff8800", "xyz"])(
    "不正な入力 %o は例外を投げる",
    (input) => {
      expect(() => parseHexColor(input)).toThrow(/hex/i);
    },
  );
});

describe("toHexColor", () => {
  it("RGBA を #rrggbb 形式（小文字）に変換する", () => {
    expect(toHexColor({ r: 255, g: 136, b: 0, a: 255 })).toBe("#ff8800");
  });

  it("1 桁の成分をゼロ埋めする", () => {
    expect(toHexColor({ r: 0, g: 10, b: 5, a: 255 })).toBe("#000a05");
  });

  it("アルファは表現に含めない（半透明でも同じ #rrggbb になる）", () => {
    expect(toHexColor({ r: 255, g: 0, b: 0, a: 0 })).toBe("#ff0000");
  });

  it("parseHexColor と往復しても値が変わらない", () => {
    expect(parseHexColor(toHexColor(RED))).toEqual(RED);
    expect(toHexColor(parseHexColor("#3a7bd5"))).toBe("#3a7bd5");
  });

  it("成分が数値でない場合は 00 として扱い、例外を投げない", () => {
    expect(toHexColor({ r: Number.NaN, g: 255, b: 0, a: 255 })).toBe("#00ff00");
  });

  it("範囲外の成分は 0〜255 にクランプされる", () => {
    expect(toHexColor({ r: 300, g: -20, b: 128, a: 255 })).toBe("#ff0080");
  });
});

describe("withOpacity", () => {
  it("不透明度 1 で完全不透明になる", () => {
    expect(withOpacity(RED, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  it("不透明度 0 で完全透明になる", () => {
    expect(withOpacity(RED, 0)).toEqual({ r: 255, g: 0, b: 0, a: 0 });
  });

  it("不透明度 0.5 でアルファが 128 になる", () => {
    expect(withOpacity(RED, 0.5)).toEqual({ r: 255, g: 0, b: 0, a: 128 });
  });

  it("RGB 成分は変化しない", () => {
    const result = withOpacity({ r: 12, g: 34, b: 56, a: 255 }, 0.25);

    expect(result.r).toBe(12);
    expect(result.g).toBe(34);
    expect(result.b).toBe(56);
  });

  it("範囲外の不透明度は 0〜1 にクランプされる", () => {
    expect(withOpacity(RED, 1.5).a).toBe(255);
    expect(withOpacity(RED, -0.5).a).toBe(0);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "数値でない不透明度 %o は完全透明として扱い、例外を投げない",
    (opacity) => {
      expect(withOpacity(RED, opacity).a).toBe(0);
    },
  );
});

describe("compositeOver（source-over 合成）", () => {
  it("不透明な色を重ねると下地が完全に隠れる", () => {
    expect(compositeOver(RED, WHITE)).toEqual(RED);
  });

  it("完全透明な色を重ねても下地は変わらない", () => {
    expect(compositeOver(FULLY_TRANSPARENT, WHITE)).toEqual(WHITE);
  });

  it("不透明度 50% の赤を白の上に重ねると (255, 127, 127, 255) になる", () => {
    expect(compositeOver(withOpacity(RED, 0.5), WHITE)).toEqual({
      r: 255,
      g: 127,
      b: 127,
      a: 255,
    });
  });

  it("不透明度 50% の赤を完全透明の上に重ねると色は保たれアルファだけ残る", () => {
    expect(compositeOver(withOpacity(RED, 0.5), FULLY_TRANSPARENT)).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 128,
    });
  });

  it("完全透明どうしの合成でも NaN にならず完全透明を返す（ゼロ除算の境界）", () => {
    expect(compositeOver(FULLY_TRANSPARENT, FULLY_TRANSPARENT)).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    });
  });
});

describe("colorDistance（最大チャンネル差）", () => {
  it("同じ色の距離は 0", () => {
    expect(colorDistance(RED, RED)).toBe(0);
  });

  it("1 チャンネルだけ違う場合はその差を返す", () => {
    expect(
      colorDistance({ r: 100, g: 100, b: 100, a: 255 }, { r: 100, g: 100, b: 116, a: 255 }),
    ).toBe(16);
  });

  it("複数チャンネルが違う場合は最大の差を返す", () => {
    expect(colorDistance({ r: 10, g: 50, b: 10, a: 255 }, { r: 20, g: 10, b: 10, a: 255 })).toBe(
      40,
    );
  });

  it("アルファの差も距離に含める", () => {
    expect(colorDistance({ r: 0, g: 0, b: 0, a: 255 }, FULLY_TRANSPARENT)).toBe(255);
  });
});
