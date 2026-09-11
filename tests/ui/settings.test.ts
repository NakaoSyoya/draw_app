import { describe, expect, it } from "vitest";
import {
  BRUSH_MAX,
  BRUSH_MIN,
  FILL_TOLERANCE,
  OPACITY_DEFAULT,
  TEXT_SIZE_DEFAULT,
} from "@/config/constants";
import { DEFAULT_UI_SETTINGS, toDrawingSettings, type UiSettings } from "@/ui/settings";

function settings(overrides: Partial<UiSettings> = {}): UiSettings {
  return { ...DEFAULT_UI_SETTINGS, ...overrides };
}

describe("DEFAULT_UI_SETTINGS", () => {
  it("設定ファイルの既定値をそのまま使う", () => {
    expect(DEFAULT_UI_SETTINGS.opacity).toBe(OPACITY_DEFAULT);
    expect(DEFAULT_UI_SETTINGS.fontSize).toBe(TEXT_SIZE_DEFAULT);
    expect(DEFAULT_UI_SETTINGS.brushWidth).toBeGreaterThanOrEqual(BRUSH_MIN);
    expect(DEFAULT_UI_SETTINGS.brushWidth).toBeLessThanOrEqual(BRUSH_MAX);
  });

  it("既定値から描画設定を作れる（起動時に例外にならない）", () => {
    expect(() => toDrawingSettings(DEFAULT_UI_SETTINGS)).not.toThrow();
  });
});

describe("toDrawingSettings", () => {
  it("HEX の色を RGBA に変換する", () => {
    expect(toDrawingSettings(settings({ colorHex: "#ff8800", opacity: 1 })).color).toEqual({
      r: 255,
      g: 136,
      b: 0,
      a: 255,
    });
  });

  it("不透明度を色のアルファに反映する", () => {
    expect(toDrawingSettings(settings({ colorHex: "#ff0000", opacity: 0.5 })).color).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 128,
    });
  });

  it("不透明度 0 でも RGB は保たれる", () => {
    expect(toDrawingSettings(settings({ colorHex: "#ff0000", opacity: 0 })).color).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 0,
    });
  });

  it.each([
    [BRUSH_MIN - 5, BRUSH_MIN],
    [BRUSH_MAX + 50, BRUSH_MAX],
    [0, BRUSH_MIN],
  ])("範囲外のブラシ太さ %i を %i にクランプする", (input, expected) => {
    expect(toDrawingSettings(settings({ brushWidth: input })).brushWidth).toBe(expected);
  });

  it("範囲内のブラシ太さはそのまま使う", () => {
    expect(toDrawingSettings(settings({ brushWidth: 12 })).brushWidth).toBe(12);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "数値でないブラシ太さ %o は既定値に戻す（入力欄を空にしても壊れない）",
    (width) => {
      expect(toDrawingSettings(settings({ brushWidth: width })).brushWidth).toBe(
        DEFAULT_UI_SETTINGS.brushWidth,
      );
    },
  );

  it("塗りトグルとフォントサイズをそのまま渡す", () => {
    const drawing = toDrawingSettings(settings({ filled: true, fontSize: 48 }));

    expect(drawing.filled).toBe(true);
    expect(drawing.fontSize).toBe(48);
  });

  it("塗りつぶしの許容差は設定ファイルの値を使う（UI からは変更しない）", () => {
    expect(toDrawingSettings(settings()).fillTolerance).toBe(FILL_TOLERANCE);
  });
});
