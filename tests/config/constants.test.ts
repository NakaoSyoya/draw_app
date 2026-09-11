import { describe, expect, it } from "vitest";
import {
  BRUSH_DEFAULT,
  BRUSH_MAX,
  BRUSH_MIN,
  BYTES_PER_PIXEL,
  EXPORT_MIME,
  FILL_TOLERANCE,
  HISTORY_DEPTH,
  HISTORY_MAX_BYTES,
  MAX_CANVAS_DIMENSION,
  OPACITY_DEFAULT,
  TEXT_SIZE_DEFAULT,
} from "@/config/constants";
import { PRESETS } from "@/config/presets";

describe("ブラシの太さ設定", () => {
  it("最小値は 1px 以上（0 以下だと線が描画されない）", () => {
    expect(BRUSH_MIN).toBeGreaterThanOrEqual(1);
  });

  it("最小値が最大値より小さい（スライダーの範囲が成立する）", () => {
    expect(BRUSH_MIN).toBeLessThan(BRUSH_MAX);
  });

  it("既定値が最小値〜最大値の範囲内にある", () => {
    expect(BRUSH_DEFAULT).toBeGreaterThanOrEqual(BRUSH_MIN);
    expect(BRUSH_DEFAULT).toBeLessThanOrEqual(BRUSH_MAX);
  });
});

describe("不透明度の既定値", () => {
  it("0〜1 の割合で表現される（0〜100 のパーセント値ではない）", () => {
    expect(OPACITY_DEFAULT).toBeGreaterThanOrEqual(0);
    expect(OPACITY_DEFAULT).toBeLessThanOrEqual(1);
  });
});

describe("塗りつぶしの許容差", () => {
  it("8bit チャンネルの差分として 0〜255 の範囲にある", () => {
    expect(FILL_TOLERANCE).toBeGreaterThanOrEqual(0);
    expect(FILL_TOLERANCE).toBeLessThanOrEqual(255);
  });
});

describe("テキストの既定フォントサイズ", () => {
  it("正の値である", () => {
    expect(TEXT_SIZE_DEFAULT).toBeGreaterThan(0);
  });
});

describe("キャンバス寸法の上限", () => {
  it("1px 以上である", () => {
    expect(MAX_CANVAS_DIMENSION).toBeGreaterThanOrEqual(1);
  });
});

describe("履歴（Undo/Redo）の設定", () => {
  it("最低 1 ステップは戻れる深さがある", () => {
    expect(HISTORY_DEPTH).toBeGreaterThanOrEqual(1);
  });

  it("SPEC §6.4 のとおり 20 ステップ", () => {
    expect(HISTORY_DEPTH).toBe(20);
  });

  it("最大サイズのプリセット 1 枚分のスナップショットが必ず収まる（収まらないと Undo が一度も機能しない）", () => {
    const largestSnapshotBytes = Math.max(
      ...PRESETS.map((preset) => preset.width * preset.height * BYTES_PER_PIXEL),
    );

    expect(HISTORY_MAX_BYTES).toBeGreaterThanOrEqual(largestSnapshotBytes);
  });
});

describe("書き出し形式", () => {
  it("SPEC §6.5 のとおり PNG 固定", () => {
    expect(EXPORT_MIME).toBe("image/png");
  });
});
