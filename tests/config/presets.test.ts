import { describe, expect, it } from "vitest";
import { MAX_CANVAS_DIMENSION } from "@/config/constants";
import { PRESETS } from "@/config/presets";

describe("キャンバスのプリセット", () => {
  it("少なくとも 1 つ定義されている（新規作成ダイアログが空にならない）", () => {
    expect(PRESETS.length).toBeGreaterThan(0);
  });

  it("id が一意である（選択結果を id で解決できる）", () => {
    const ids = PRESETS.map((preset) => preset.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("すべての label が空文字でない", () => {
    for (const preset of PRESETS) {
      expect(preset.label.trim()).not.toBe("");
    }
  });

  it("すべての幅・高さが 1px 以上 MAX_CANVAS_DIMENSION 以下に収まる", () => {
    for (const preset of PRESETS) {
      expect(preset.width).toBeGreaterThanOrEqual(1);
      expect(preset.height).toBeGreaterThanOrEqual(1);
      expect(preset.width).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
      expect(preset.height).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
    }
  });

  it("すべての幅・高さが整数（ピクセル数として端数を持たない）", () => {
    for (const preset of PRESETS) {
      expect(Number.isInteger(preset.width)).toBe(true);
      expect(Number.isInteger(preset.height)).toBe(true);
    }
  });

  it("正方形・横長・縦長がそれぞれ 1 つ以上ある（SPEC §6.1 の選択肢を満たす）", () => {
    const square = PRESETS.filter((preset) => preset.width === preset.height);
    const landscape = PRESETS.filter((preset) => preset.width > preset.height);
    const portrait = PRESETS.filter((preset) => preset.width < preset.height);

    expect(square.length).toBeGreaterThan(0);
    expect(landscape.length).toBeGreaterThan(0);
    expect(portrait.length).toBeGreaterThan(0);
  });
});
